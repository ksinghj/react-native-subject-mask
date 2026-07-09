export type SubjectLiftOptions = {
  /**
   * Downscale the dim mask so huge photos don't produce huge PNGs.
   * The mask's longest side is capped at this many pixels. Default: 2048.
   */
  maxMaskDimension?: number;
};

export type SubjectLiftResult = {
  /** Orientation-normalized copy of the source image (file:// URI, JPEG). */
  imageUri: string;
  /**
   * Dim mask PNG (file:// URI). Alpha 1 = background, alpha 0 = subject —
   * use it to mask a dark scrim so the subject stays undimmed.
   */
  dimMaskUri: string;
  /**
   * Subject outline as an SVG path string, normalized to 0..1 with a
   * top-left origin (feed to `Skia.Path.MakeFromSVGString` and scale into
   * your aspect-fit rect). `null` if the mask succeeded but contour tracing
   * failed — dimming still works, outline effects won't.
   */
  outlineSvg: string | null;
  /** Pixel width of the normalized image (for aspect-fit math in JS). */
  imageWidth: number;
  /** Pixel height of the normalized image (for aspect-fit math in JS). */
  imageHeight: number;
};

/**
 * Error codes `isolateSubject` can reject with (`error.code`):
 * - `ERR_UNSUPPORTED` — platform can't run subject lifting (Android in v1, iOS < 17).
 * - `ERR_IMAGE_LOAD` — the image at `imageUri` couldn't be loaded.
 * - `ERR_NO_SUBJECT` — Vision found no foreground subject in the image.
 */
export type SubjectMaskErrorCode = 'ERR_UNSUPPORTED' | 'ERR_IMAGE_LOAD' | 'ERR_NO_SUBJECT';
