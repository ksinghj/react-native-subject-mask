package expo.modules.subjectmask

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private class UnsupportedException :
  CodedException("ERR_UNSUPPORTED", "Subject lifting is not supported on Android yet", null)

class ReactNativeSubjectMaskModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReactNativeSubjectMask")

    // Subject lifting is iOS-only in v1 (ML Kit Subject Segmentation is a
    // possible v2). Android compiles but reports unsupported.
    Function("isSupported") { false }

    AsyncFunction("isolateSubject") { _: String, _: Map<String, Any?>? ->
      throw UnsupportedException()
      @Suppress("UNREACHABLE_CODE") Unit
    }
  }
}
