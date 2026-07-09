import { BlurMask, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import type { Rect } from '../aspectFit';

/** Skia components accept plain numbers or Reanimated shared values. */
export type AnimatableNumber = number | SharedValue<number>;

/**
 * Scales a normalized (0...1, top-left origin) outline SVG path into a
 * concrete rect — typically the one from `aspectFitRect`. The path is
 * transformed rather than wrapped in a scaled `<Group>` so stroke widths
 * stay in pixel units.
 */
export function makeFittedOutlinePath(outlineSvg: string, fitRect: Rect): SkPath | null {
  if (fitRect.width <= 0 || fitRect.height <= 0) return null;
  const path = Skia.Path.MakeFromSVGString(outlineSvg);
  if (!path) return null;
  const matrix = Skia.Matrix();
  matrix.translate(fitRect.x, fitRect.y);
  matrix.scale(fitRect.width, fitRect.height);
  return Skia.PathBuilder.MakeFromPath(path).transform(matrix).build();
}

export type SubjectOutlineProps = {
  /** Pixel-space path, e.g. from `makeFittedOutlinePath`. */
  path: SkPath;
  /** Progressive-reveal trim, 0...1. */
  trim?: AnimatableNumber;
  /** Opacity of the whole outline (crisp stroke + glow). */
  opacity?: AnimatableNumber;
  /** Opacity of the blurred glow underlay only. 0 hides the glow. */
  glowOpacity?: AnimatableNumber;
  color?: string;
  /** Glow color; defaults to `color`. */
  glowColor?: string;
  strokeWidth?: number;
  glowRadius?: number;
};

/**
 * The subject outline stroked with an optional glow underlay. Render inside
 * an existing Skia `<Canvas>`. The glow is the same trimmed path drawn
 * blurred underneath, so it traces with the line.
 */
export function SubjectOutline({
  path,
  trim = 1,
  opacity = 1,
  glowOpacity = 0,
  color = 'white',
  glowColor,
  strokeWidth = 3,
  glowRadius = 12,
}: SubjectOutlineProps) {
  return (
    <Group opacity={opacity}>
      <Path
        path={path}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
        color={glowColor ?? color}
        start={0}
        end={trim}
        opacity={glowOpacity}>
        <BlurMask blur={glowRadius} style="solid" />
      </Path>
      <Path
        path={path}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
        color={color}
        start={0}
        end={trim}
      />
    </Group>
  );
}
