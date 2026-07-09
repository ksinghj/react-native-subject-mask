import ExpoModulesCore

internal final class UnsupportedException: Exception {
  override var code: String { "ERR_UNSUPPORTED" }
  override var reason: String { "Subject lifting requires iOS 17 or later" }
}

internal final class ImageLoadException: Exception {
  override var code: String { "ERR_IMAGE_LOAD" }
  override var reason: String { "Could not load an image from the given URI" }
}

internal final class NoSubjectException: Exception {
  override var code: String { "ERR_NO_SUBJECT" }
  override var reason: String { "No foreground subject was found in the image" }
}

/// Internal pipeline failure (CoreImage/CoreGraphics rendering) — not part of
/// the documented contract; indicates a bug or an out-of-memory condition.
internal final class MaskRenderException: Exception {
  override var code: String { "ERR_MASK_RENDER" }
  override var reason: String { "Failed to render the subject mask" }
}
