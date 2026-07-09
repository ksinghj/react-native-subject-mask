import {
  BlurMask,
  Canvas,
  Group,
  Image as SkiaImage,
  Mask,
  Path,
  Rect as SkiaRect,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
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
import type { SubjectLiftResult } from 'react-native-subject-mask';

import { aspectFitRect } from './aspectFit';

// Reveal choreography, mirroring Photos' "lift subject": trace the outline,
// pulse its glow twice, then fade the outline out as the background dims.
const OUTLINE_TRACE_MS = 600;
const GLOW_PULSE_MS = 350; // one leg; ×2 legs via autoreverse
const DIM_IN_MS = 400;
const OUTLINE_FADE_MS = 350;
const DIM_OUT_MS = 350;
/** How dark the background gets at full dim. */
const DIM_MAX_OPACITY = 0.55;
const OUTLINE_STROKE_WIDTH = 3;
const GLOW_BLUR_RADIUS = 12;

type Props = {
  result: SubjectLiftResult;
  /**
   * Desired end state. Flipping to true plays the full reveal (trace → glow →
   * dim); flipping to false fades the dim back out.
   */
  dimmed: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A photo with its subject "lifted": renders the image, a background dim
 * masked to spare the subject, and the subject's outline traced with a glow.
 * All inputs come from `isolateSubject`.
 */
export function SubjectRevealImage({ result, dimmed, style }: Props) {
  const photo = useImage(result.imageUri);
  const mask = useImage(result.dimMaskUri);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const fitRect = aspectFitRect(result.imageWidth / result.imageHeight, canvasSize);

  // The outline arrives normalized (0...1); scale it into the letterboxed
  // rect once here — not via a scaled <Group>, which would also scale
  // strokeWidth by the same few-hundred-x factor.
  const outlinePath = useMemo(() => {
    if (!result.outlineSvg || fitRect.width <= 0 || fitRect.height <= 0) return null;
    const path = Skia.Path.MakeFromSVGString(result.outlineSvg);
    if (!path) return null;
    const matrix = Skia.Matrix();
    matrix.translate(fitRect.x, fitRect.y);
    matrix.scale(fitRect.width, fitRect.height);
    path.transform(matrix);
    return path;
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
        duration: OUTLINE_TRACE_MS,
        easing: Easing.inOut(Easing.ease),
      });
      outlineGlow.value = withDelay(
        OUTLINE_TRACE_MS,
        withRepeat(
          withTiming(1, { duration: GLOW_PULSE_MS, easing: Easing.inOut(Easing.ease) }),
          2,
          true
        )
      );
      const dimStart = OUTLINE_TRACE_MS + GLOW_PULSE_MS * 2;
      dim.value = withDelay(
        dimStart,
        withTiming(1, { duration: DIM_IN_MS, easing: Easing.out(Easing.ease) })
      );
      outlineOpacity.value = withDelay(dimStart, withTiming(0, { duration: OUTLINE_FADE_MS }));
    } else {
      dim.value = withTiming(0, { duration: DIM_OUT_MS, easing: Easing.inOut(Easing.ease) });
      outlineTrim.value = 0;
      outlineGlow.value = 0;
      outlineOpacity.value = 1;
    }
  }, [dimmed, dim, outlineTrim, outlineGlow, outlineOpacity]);

  const dimOpacity = useDerivedValue(() => dim.value * DIM_MAX_OPACITY);

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
                color="black"
                opacity={dimOpacity}
              />
            </Mask>
          ) : null}
          {outlinePath ? (
            <Group opacity={outlineOpacity}>
              {/* Glow underlay: same trimmed path, blurred, opacity pulsed. */}
              <Path
                path={outlinePath}
                style="stroke"
                strokeWidth={OUTLINE_STROKE_WIDTH}
                strokeCap="round"
                strokeJoin="round"
                color="white"
                start={0}
                end={outlineTrim}
                opacity={outlineGlow}>
                <BlurMask blur={GLOW_BLUR_RADIUS} style="solid" />
              </Path>
              <Path
                path={outlinePath}
                style="stroke"
                strokeWidth={OUTLINE_STROKE_WIDTH}
                strokeCap="round"
                strokeJoin="round"
                color="white"
                start={0}
                end={outlineTrim}
              />
            </Group>
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
