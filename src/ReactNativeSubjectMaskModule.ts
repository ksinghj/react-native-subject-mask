import { NativeModule, requireNativeModule } from 'expo';

declare class ReactNativeSubjectMaskModule extends NativeModule<Record<never, never>> {
  isSupported(): boolean;
}

export default requireNativeModule<ReactNativeSubjectMaskModule>('ReactNativeSubjectMask');
