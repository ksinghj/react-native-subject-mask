import { registerWebModule, NativeModule } from 'expo';

import { SubjectLiftOptions, SubjectLiftResult } from './ReactNativeSubjectMask.types';

class ReactNativeSubjectMaskModule extends NativeModule<Record<never, never>> {
  isSupported(): boolean {
    return false;
  }

  async isolateSubject(
    _imageUri: string,
    _options?: SubjectLiftOptions
  ): Promise<SubjectLiftResult> {
    const error = new Error('Subject lifting is not supported on web') as Error & {
      code: string;
    };
    error.code = 'ERR_UNSUPPORTED';
    throw error;
  }
}

export default registerWebModule(ReactNativeSubjectMaskModule, 'ReactNativeSubjectMaskModule');
