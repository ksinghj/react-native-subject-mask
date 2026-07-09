import { useEffect, useState } from 'react';

import {
  SubjectLiftOptions,
  SubjectLiftResult,
  SubjectMaskErrorCode,
} from './ReactNativeSubjectMask.types';
import ReactNativeSubjectMaskModule from './ReactNativeSubjectMaskModule';

export type SubjectLiftError = Error & { code?: SubjectMaskErrorCode };

export type UseSubjectLiftState = {
  result: SubjectLiftResult | null;
  error: SubjectLiftError | null;
  loading: boolean;
  /** Wall-clock time the last successful isolation took, in ms. */
  durationMs: number | null;
};

type InternalState = UseSubjectLiftState & { key: string | null };

/**
 * Runs `isolateSubject` whenever `imageUri` (or an option) changes.
 * Pass `null` to reset. Stale results from superseded inputs are discarded.
 */
export function useSubjectLift(
  imageUri: string | null | undefined,
  options?: SubjectLiftOptions
): UseSubjectLiftState {
  const { maxMaskDimension, maxImageDimension, imageQuality } = options ?? {};
  const key = imageUri
    ? [imageUri, maxMaskDimension, maxImageDimension, imageQuality].join('|')
    : null;

  const [state, setState] = useState<InternalState>({
    key,
    result: null,
    error: null,
    loading: key != null,
    durationMs: null,
  });

  // Reset synchronously when the input changes (React's documented
  // derive-state-during-render pattern) so consumers never see a stale
  // result paired with a new URI.
  if (state.key !== key) {
    setState({ key, result: null, error: null, loading: key != null, durationMs: null });
  }

  useEffect(() => {
    if (!imageUri || key == null) {
      return;
    }
    let cancelled = false;
    const startedAt = Date.now();
    ReactNativeSubjectMaskModule.isolateSubject(imageUri, {
      maxMaskDimension,
      maxImageDimension,
      imageQuality,
    })
      .then((result) => {
        if (!cancelled) {
          setState({
            key,
            result,
            error: null,
            loading: false,
            durationMs: Date.now() - startedAt,
          });
        }
      })
      .catch((error: SubjectLiftError) => {
        if (!cancelled) {
          setState({ key, result: null, error, loading: false, durationMs: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [imageUri, key, maxMaskDimension, maxImageDimension, imageQuality]);

  return {
    result: state.result,
    error: state.error,
    loading: state.loading,
    durationMs: state.durationMs,
  };
}
