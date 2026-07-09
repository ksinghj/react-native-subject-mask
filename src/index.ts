import { SubjectLiftOptions, SubjectLiftResult } from './ReactNativeSubjectMask.types';
import ReactNativeSubjectMaskModule from './ReactNativeSubjectMaskModule';

export * from './ReactNativeSubjectMask.types';

/**
 * Whether subject lifting is available on this device.
 * `true` only on iOS 17+; always `false` on Android (v1) and web.
 */
export function isSupported(): boolean {
  return ReactNativeSubjectMaskModule.isSupported();
}

/**
 * Runs Apple Vision's subject-lift pipeline on the image at `imageUri`
 * (a file:// URI) and resolves with animation-ready data: an
 * orientation-normalized copy of the image, a dim-mask PNG, and the subject
 * outline as a normalized SVG path.
 *
 * Output files live in the temporary directory — copy them if you need
 * persistence. Rejects with a typed error (`error.code`): `ERR_UNSUPPORTED`,
 * `ERR_IMAGE_LOAD`, or `ERR_NO_SUBJECT`.
 */
export function isolateSubject(
  imageUri: string,
  options?: SubjectLiftOptions
): Promise<SubjectLiftResult> {
  return ReactNativeSubjectMaskModule.isolateSubject(imageUri, options);
}

export default ReactNativeSubjectMaskModule;
