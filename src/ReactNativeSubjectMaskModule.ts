import { NativeModule, requireNativeModule } from 'expo';

declare class ReactNativeSubjectMaskModule extends NativeModule<{}> {}

export default requireNativeModule<ReactNativeSubjectMaskModule>('ReactNativeSubjectMask');
