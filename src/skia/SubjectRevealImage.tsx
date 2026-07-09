import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { DimOverlay } from './DimOverlay';
import { makeFittedOutlinePath, SubjectOutline } from './SubjectOutline';
import type { SubjectLiftResult } from '../ReactNativeSubjectMask.types';
import { aspectFitRect } from '../aspectFit';

export type SubjectRevealImageProps = {
  /** Output of `isolateSubject` / `useSubjectLift`. */
  result: SubjectLiftResult;
  /**
   * Desired end state. Flipping to true plays the full reveal (trace → glow →
   * dim); flipping to false fades the dim back out.
   */
  dimmed: boolean;
  style?: StyleProp<ViewStyle>;
  /** Outline stroke color. Default white. */
  outlineColor?: string;
  /** Outline stroke width in px. Default 3. */
  outlineWidth?: number;
  /** Glow color; defaults to `outlineColor`. */
  glowColor?: string;
  /** Glow blur radius in px. Default 12; 0 disables the glow pass. */
  glowRadius?: number;
  /** Scrim color over the background. Default black. */
  dimColor?: string;
  /** How dark the background gets at full dim, 0–1. Default 0.55. */
  dimOpacity?: number;
  /** Outline trace duration, ms. Default 600. */
  traceDurationMs?: number;
  /** One glow pulse leg, ms (a pulse is up+down). Default 350. */
  glowPulseDurationMs?: number;
  /** Number of pulse legs (2 = one full pulse). Default 2; 0 skips the glow. */
  glowPulseCount?: number;
  /** Dim fade-in duration, ms. Default 400. */
  dimInDurationMs?: number;
  /** Outline fade-out duration (runs with the dim fade-in), ms. Default 350. */
  outlineFadeDurationMs?: number;
  /** Dim fade-out duration when `dimmed` flips to false, ms. Default 350. */
  dimOutDurationMs?: number;
};

/**
 * Drop-in "lift subject" reveal, mirroring Photos: renders the image, traces
 * the subject's outline with a glow, then dims the background around the
 * subject. All inputs come from `isolateSubject`; all rendering is Skia, all
 * animation Reanimated. For custom choreography, compose `SubjectOutline` and
 * `DimOverlay` yourself instead.
 */
export function SubjectRevealImage({
  result,
  dimmed,
  style,
  outlineColor = 'white',
  outlineWidth = 3,
  glowColor,
  glowRadius = 12,
  dimColor = 'black',
  dimOpacity = 0.55,
  traceDurationMs = 600,
  glowPulseDurationMs = 350,
  glowPulseCount = 2,
  dimInDurationMs = 400,
  outlineFadeDurationMs = 350,
  dimOutDurationMs = 350,
}: SubjectRevealImageProps) {
  const photo = useImage(result.imageUri);
  const mask = useImage(result.dimMaskUri);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const fitRect = aspectFitRect(result.imageWidth / result.imageHeight, canvasSize);

  const outlinePath = useMemo(() => {
    if (!result.outlineSvg) return null;
    return makeFittedOutlinePath(result.outlineSvg, fitRect);
  }, [result.outlineSvg, fitRect.x, fitRect.y, fitRect.width, fitRect.height]);

  const outlineTrim = useSharedValue(0);
  const outlineGlow = useSharedValue(0);
  const outlineOpacity = useSharedValue(1);
  const dim = useSharedValue(0);

  useEffect(() => {
    if (dimmed) {
      outlineTrim.value = 0;
      outlineGlow.value = 0;
      outlineOpacity.value = 1;
      outlineTrim.value = withTiming(1, {
        duration: traceDurationMs,
        easing: Easing.inOut(Easing.ease),
      });
      if (glowPulseCount > 0) {
        outlineGlow.value = withDelay(
          traceDurationMs,
          withRepeat(
            withTiming(1, { duration: glowPulseDurationMs, easing: Easing.inOut(Easing.ease) }),
            glowPulseCount,
            true
          )
        );
      }
      const dimStart = traceDurationMs + glowPulseDurationMs * glowPulseCount;
      dim.value = withDelay(
        dimStart,
        withTiming(1, { duration: dimInDurationMs, easing: Easing.out(Easing.ease) })
      );
      outlineOpacity.value = withDelay(
        dimStart,
        withTiming(0, { duration: outlineFadeDurationMs })
      );
    } else {
      dim.value = withTiming(0, { duration: dimOutDurationMs, easing: Easing.inOut(Easing.ease) });
      outlineTrim.value = 0;
      outlineGlow.value = 0;
      outlineOpacity.value = 1;
    }
  }, [
    dimmed,
    traceDurationMs,
    glowPulseDurationMs,
    glowPulseCount,
    dimInDurationMs,
    outlineFadeDurationMs,
    dimOutDurationMs,
    dim,
    outlineTrim,
    outlineGlow,
    outlineOpacity,
  ]);

  const scrimOpacity = useDerivedValue(() => dim.value * dimOpacity);

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {canvasSize.width > 0 && canvasSize.height > 0 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          {photo ? (
            <SkiaImage
              image={photo}
              x={fitRect.x}
              y={fitRect.y}
              width={fitRect.width}
              height={fitRect.height}
              fit="fill"
            />
          ) : null}
          {mask ? (
            <DimOverlay mask={mask} fitRect={fitRect} opacity={scrimOpacity} color={dimColor} />
          ) : null}
          {outlinePath ? (
            <SubjectOutline
              path={outlinePath}
              trim={outlineTrim}
              opacity={outlineOpacity}
              glowOpacity={outlineGlow}
              color={outlineColor}
              glowColor={glowColor}
              strokeWidth={outlineWidth}
              glowRadius={glowRadius}
            />
          ) : null}
        </Canvas>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
