import ExpoModulesCore

internal struct SubjectLiftOptions: Record {
  /// Cap the dim mask's longest side, in pixels. 0 disables downscaling.
  @Field var maxMaskDimension: Double = 2048
  /// Cap the output image's longest side, in pixels. 0 (default) keeps the
  /// source resolution. Vision always runs on the full-resolution image.
  @Field var maxImageDimension: Double = 0
  /// JPEG quality of the output image, 0...1.
  @Field var imageQuality: Double = 0.9
}

public class ReactNativeSubjectMaskModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReactNativeSubjectMask")

    // VNGenerateForegroundInstanceMaskRequest requires iOS 17.
    Function("isSupported") { () -> Bool in
      if #available(iOS 17.0, *) {
        return true
      }
      return false
    }

    // AsyncFunction bodies run on the module's background dispatch queue,
    // keeping Vision/CoreImage work off the main thread.
    AsyncFunction("isolateSubject") { (imageUri: URL, options: SubjectLiftOptions?) -> [String: Any?] in
      guard #available(iOS 17.0, *) else {
        throw UnsupportedException()
      }

      let resolvedOptions = options ?? SubjectLiftOptions()
      let output = try SubjectMasking.isolateSubject(
        imageUrl: imageUri,
        maxMaskDimension: CGFloat(resolvedOptions.maxMaskDimension),
        maxImageDimension: CGFloat(resolvedOptions.maxImageDimension),
        imageQuality: CGFloat(min(max(resolvedOptions.imageQuality, 0), 1))
      )

      return [
        "imageUri": output.imageUri,
        "dimMaskUri": output.dimMaskUri,
        "outlineSvg": output.outlineSvg,
        "imageWidth": output.imageWidth,
        "imageHeight": output.imageHeight,
      ]
    }
  }
}
