import ReactNativeSubjectMaskModule from './ReactNativeSubjectMaskModule';

export * from './ReactNativeSubjectMask.types';

/**
 * Whether subject lifting is available on this device.
 * `true` only on iOS 17+; always `false` on Android (v1) and web.
 */
export function isSupported(): boolean {
  return ReactNativeSubjectMaskModule.isSupported();
}

export default ReactNativeSubjectMaskModule;
