import ExpoModulesCore

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
  }
}
