import CoreImage
import UIKit
import Vision

/// Ports the proven pipeline from ios-vision-playground's ForegroundMasking:
/// VNGenerateForegroundInstanceMaskRequest for the subject mask, then
/// VNDetectContoursRequest over that mask for the vector outline.
@available(iOS 17.0, *)
internal enum SubjectMasking {
  internal struct Output {
    let imageUri: String
    let dimMaskUri: String
    let subjectUri: String?
    let outlineSvg: String?
    let imageWidth: Int
    let imageHeight: Int
  }

  private static let ciContext = CIContext()

  internal static func isolateSubject(
    imageUrl: URL,
    maxMaskDimension: CGFloat,
    maxImageDimension: CGFloat,
    imageQuality: CGFloat,
    includeSubjectImage: Bool
  ) throws -> Output {
    guard let data = try? Data(contentsOf: imageUrl), let image = UIImage(data: data) else {
      throw ImageLoadException()
    }

    // Bake the image's orientation into its pixel data so the mask Vision
    // returns lines up with what's on screen.
    let normalized = image.normalizedOrientation()
    guard let cgImage = normalized.cgImage else {
      throw ImageLoadException()
    }

    let maskRequest = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try handler.perform([maskRequest])

    guard let observation = maskRequest.results?.first,
          !observation.allInstances.isEmpty else {
      throw NoSubjectException()
    }

    // Full-size mask aligned with the original image (not cropped to the
    // subject), so overlays never need to resize or reposition anything.
    let maskPixelBuffer = try observation.generateScaledMaskForImage(
      forInstances: observation.allInstances,
      from: handler
    )
    let rawMaskCIImage = CIImage(cvPixelBuffer: maskPixelBuffer)

    guard let rawMaskCGImage = ciContext.createCGImage(rawMaskCIImage, from: rawMaskCIImage.extent) else {
      throw MaskRenderException()
    }

    let dimMaskCGImage = try makeDimMask(from: rawMaskCIImage, maxDimension: maxMaskDimension)
    let outlinePath = try? extractOutline(fromMask: rawMaskCGImage)

    // Vision ran on the full-resolution image above; the cap only shrinks
    // what gets written out. The mask/outline stay valid because they're
    // normalized and the aspect ratio is preserved.
    let outputImage = normalized.scaledDown(toLongestSide: maxImageDimension)
    guard let outputCGImage = outputImage.cgImage,
          let jpegData = outputImage.jpegData(compressionQuality: imageQuality),
          let pngData = UIImage(cgImage: dimMaskCGImage).pngData() else {
      throw MaskRenderException()
    }

    var subjectUri: String?
    if includeSubjectImage {
      let subjectPngData = try makeSubjectCutout(
        source: cgImage,
        subjectMaskCIImage: rawMaskCIImage,
        maxDimension: maxImageDimension
      )
      subjectUri = try writeToTemp(data: subjectPngData, fileExtension: "png")
    }

    return Output(
      imageUri: try writeToTemp(data: jpegData, fileExtension: "jpg"),
      dimMaskUri: try writeToTemp(data: pngData, fileExtension: "png"),
      subjectUri: subjectUri,
      outlineSvg: outlinePath?.svgPathString(),
      imageWidth: outputCGImage.width,
      imageHeight: outputCGImage.height
    )
  }

  /// Converts the subject mask (bright = subject) into an image whose *alpha
  /// channel* is bright over the background instead — alpha 1 = background,
  /// alpha 0 = subject — so JS can use it directly to mask a dark scrim.
  /// Downscaled so its longest side is at most `maxDimension` (0 disables).
  private static func makeDimMask(from subjectMaskCIImage: CIImage, maxDimension: CGFloat) throws -> CGImage {
    var mask = subjectMaskCIImage
      .applyingFilter("CIColorInvert")
      .applyingFilter("CIMaskToAlpha")

    let longestSide = max(mask.extent.width, mask.extent.height)
    if maxDimension > 0, longestSide > maxDimension {
      mask = mask.applyingFilter("CILanczosScaleTransform", parameters: [
        kCIInputScaleKey: maxDimension / longestSide,
        kCIInputAspectRatioKey: 1.0,
      ])
    }

    guard let cgImage = ciContext.createCGImage(mask, from: mask.extent) else {
      throw MaskRenderException()
    }
    return cgImage
  }

  /// Cuts the subject out of the source image as PNG data with a transparent
  /// background. Scaled with the same `scaledDown` helper as the output image
  /// so its pixel size matches `imageWidth`/`imageHeight` exactly.
  private static func makeSubjectCutout(
    source: CGImage,
    subjectMaskCIImage: CIImage,
    maxDimension: CGFloat
  ) throws -> Data {
    let sourceCI = CIImage(cgImage: source)
    let cutout = sourceCI.applyingFilter("CIBlendWithMask", parameters: [
      kCIInputBackgroundImageKey: CIImage(color: .clear).cropped(to: sourceCI.extent),
      kCIInputMaskImageKey: subjectMaskCIImage,
    ])

    guard let cutoutCGImage = ciContext.createCGImage(cutout, from: cutout.extent) else {
      throw MaskRenderException()
    }
    guard let pngData = UIImage(cgImage: cutoutCGImage)
      .scaledDown(toLongestSide: maxDimension)
      .pngData() else {
      throw MaskRenderException()
    }
    return pngData
  }

  /// Traces the outlines of the (bright) subject blobs in the mask as a
  /// normalized, top-left-origin path. Unlike the playground (largest contour
  /// only), this keeps every top-level contour big enough to matter plus its
  /// child contours, so islands and holes (e.g. arms-on-hips) survive as
  /// separate SVG subpaths.
  private static func extractOutline(fromMask maskCGImage: CGImage) throws -> CGPath {
    let request = VNDetectContoursRequest()
    request.contrastAdjustment = 2.0
    request.detectsDarkOnLight = false // subject is the bright region here
    request.maximumImageDimension = 512

    let handler = VNImageRequestHandler(cgImage: maskCGImage, options: [:])
    try handler.perform([request])

    guard let observation = request.results?.first else {
      throw NoSubjectException()
    }

    // Bounding boxes under 0.5% of the frame are speck noise, not subjects.
    let minBoundingBoxArea: CGFloat = 0.005
    let combined = CGMutablePath()
    for contour in observation.topLevelContours {
      let path = contour.normalizedPath
      guard path.boundingBoxOfPath.area >= minBoundingBoxArea else { continue }
      combined.addPath(path)
      for child in contour.childContours {
        combined.addPath(child.normalizedPath)
      }
    }

    guard !combined.isEmpty else {
      throw NoSubjectException()
    }

    // Vision's normalized space has a bottom-left origin; flip to top-left to
    // match the JS/Skia convention so callers can use it directly.
    var flipToTopLeft = CGAffineTransform(a: 1, b: 0, c: 0, d: -1, tx: 0, ty: 1)
    return combined.copy(using: &flipToTopLeft) ?? combined
  }

  private static func writeToTemp(data: Data, fileExtension: String) throws -> String {
    let directory = FileManager.default.temporaryDirectory
      .appendingPathComponent("subject-mask", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let fileUrl = directory.appendingPathComponent("\(UUID().uuidString).\(fileExtension)")
    try data.write(to: fileUrl)
    return fileUrl.absoluteString
  }
}

private extension CGRect {
  var area: CGFloat { width * height }
}

private extension UIImage {
  /// Downscales so the longest side is at most `maxDimension` pixels,
  /// preserving aspect ratio. 0 (or an already-smaller image) is a no-op.
  func scaledDown(toLongestSide maxDimension: CGFloat) -> UIImage {
    let pixelSize = CGSize(width: size.width * scale, height: size.height * scale)
    let longestSide = max(pixelSize.width, pixelSize.height)
    guard maxDimension > 0, longestSide > maxDimension else { return self }

    let ratio = maxDimension / longestSide
    let targetSize = CGSize(
      width: (pixelSize.width * ratio).rounded(),
      height: (pixelSize.height * ratio).rounded()
    )
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    return UIGraphicsImageRenderer(size: targetSize, format: format).image { _ in
      draw(in: CGRect(origin: .zero, size: targetSize))
    }
  }

  /// Redraws the image so `imageOrientation` is always `.up`, which is what
  /// Vision assumes when handed a bare `CGImage`.
  func normalizedOrientation() -> UIImage {
    guard imageOrientation != .up else { return self }
    let format = UIGraphicsImageRendererFormat()
    format.scale = scale
    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    return renderer.image { _ in
      draw(in: CGRect(origin: .zero, size: size))
    }
  }
}

private extension CGPath {
  /// Serializes the path as an SVG path string (absolute commands), the form
  /// `Skia.Path.MakeFromSVGString` consumes. Coordinates here are normalized
  /// 0...1, so four decimal places keep sub-pixel precision at any render size.
  func svgPathString() -> String {
    var svg = ""
    func format(_ point: CGPoint) -> String {
      String(format: "%.4f %.4f", point.x, point.y)
    }
    applyWithBlock { elementPointer in
      let element = elementPointer.pointee
      switch element.type {
      case .moveToPoint:
        svg += "M\(format(element.points[0]))"
      case .addLineToPoint:
        svg += "L\(format(element.points[0]))"
      case .addQuadCurveToPoint:
        svg += "Q\(format(element.points[0])) \(format(element.points[1]))"
      case .addCurveToPoint:
        svg += "C\(format(element.points[0])) \(format(element.points[1])) \(format(element.points[2]))"
      case .closeSubpath:
        svg += "Z"
      @unknown default:
        break
      }
    }
    return svg
  }
}
