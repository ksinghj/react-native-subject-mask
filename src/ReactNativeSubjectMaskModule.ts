import { NativeModule, requireNativeModule } from 'expo';

import { SubjectLiftOptions, SubjectLiftResult } from './ReactNativeSubjectMask.types';

declare class ReactNativeSubjectMaskModule extends NativeModule<Record<never, never>> {
  isSupported(): boolean;
  isolateSubject(imageUri: string, options?: SubjectLiftOptions): Promise<SubjectLiftResult>;
}

export default requireNativeModule<ReactNativeSubjectMaskModule>('ReactNativeSubjectMask');
