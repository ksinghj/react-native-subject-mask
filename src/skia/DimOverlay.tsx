import {
  Image as SkiaImage,
  Mask,
  Rect as SkiaRect,
  type SkImage,
} from '@shopify/react-native-skia';

import type { Rect } from '../aspectFit';
import type { AnimatableNumber } from './SubjectOutline';

export type DimOverlayProps = {
  /** The dim mask from `isolateSubject` (alpha 1 = background, 0 = subject). */
  mask: SkImage;
  /** Where the photo sits, e.g. from `aspectFitRect`. */
  fitRect: Rect;
  /** Scrim opacity at this instant — animate this to fade the dim in/out. */
  opacity?: AnimatableNumber;
  color?: string;
};

/**
 * A scrim over the photo's background that spares the subject, driven by the
 * module's dim-mask PNG. Render inside an existing Skia `<Canvas>`, after the
 * photo. The mask's alpha convention drops straight into `mode="alpha"`.
 */
export function DimOverlay({ mask, fitRect, opacity = 1, color = 'black' }: DimOverlayProps) {
  return (
    <Mask
      mode="alpha"
      mask={
        <SkiaImage
          image={mask}
          x={fitRect.x}
          y={fitRect.y}
          width={fitRect.width}
          height={fitRect.height}
          fit="fill"
        />
      }>
      <SkiaRect
        x={fitRect.x}
        y={fitRect.y}
        width={fitRect.width}
        height={fitRect.height}
        color={color}
        opacity={opacity}
      />
    </Mask>
  );
}
