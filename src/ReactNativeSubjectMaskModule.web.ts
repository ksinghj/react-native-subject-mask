import { registerWebModule, NativeModule } from 'expo';

class ReactNativeSubjectMaskModule extends NativeModule<Record<never, never>> {
  isSupported(): boolean {
    return false;
  }
}

export default registerWebModule(ReactNativeSubjectMaskModule, 'ReactNativeSubjectMaskModule');
