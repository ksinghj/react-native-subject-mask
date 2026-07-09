# react-native-subject-mask

Apple Vision subject lifting for React Native / Expo. Give it a photo, get back
**animation-ready data** — not a baked-in effect:

- **`imageUri`** — an orientation-normalized copy of the image (file:// JPEG)
- **`dimMaskUri`** — a PNG mask with a real alpha channel (alpha 1 = background,
  alpha 0 = subject), ready to mask a dark scrim so the subject stays lit
- **`outlineSvg`** — the subject's outline as an SVG path string, normalized to
  0..1 with a top-left origin, ready for `Skia.Path.MakeFromSVGString`

All animation (shimmer, glow, dim crossfade, ghost overlays) stays in JS with
Skia + Reanimated, where it's fast to iterate. Native code only extracts data.

> **Status: early development.** The native pipeline works on iOS; not yet
> published to npm.

## Platform support

| Platform | Support |
| --- | --- |
| iOS 17+ | ✅ (`VNGenerateForegroundInstanceMaskRequest` + `VNDetectContoursRequest`) |
| iOS < 17 | Compiles; `isSupported()` returns `false` |
| Android | Compiles; `isSupported()` returns `false` (ML Kit Subject Segmentation is a v2 goal) |
| Web | `isSupported()` returns `false` |

Gate the feature at runtime:

```ts
import { isSupported } from 'react-native-subject-mask';

if (isSupported()) {
  // subject lifting available
}
```

## API

```ts
type SubjectLiftOptions = {
  /** Cap the dim mask's longest side, in pixels. Default 2048; 0 disables. */
  maxMaskDimension?: number;
  /** Cap the output image's longest side, in pixels. Default 0 = source resolution. */
  maxImageDimension?: number;
  /** JPEG quality of the output image, 0–1. Default 0.9. */
  imageQuality?: number;
};

type SubjectLiftResult = {
  imageUri: string;          // orientation-normalized copy (file://)
  dimMaskUri: string;        // PNG, alpha 1 = background, 0 = subject (file://)
  outlineSvg: string | null; // SVG path, normalized 0..1, top-left origin
  imageWidth: number;
  imageHeight: number;
};

function isolateSubject(imageUri: string, options?: SubjectLiftOptions): Promise<SubjectLiftResult>;
function isSupported(): boolean;
```

Errors are typed, not half-null results — `isolateSubject` rejects with
`error.code` of `ERR_UNSUPPORTED`, `ERR_IMAGE_LOAD`, or `ERR_NO_SUBJECT`.
`outlineSvg` is `null` only in the narrow case where masking succeeded but
contour tracing failed (dimming still works).

Output files are written to the temporary/caches directory — copy them if you
need persistence.

## Installation

### Expo projects

```sh
npx expo install react-native-subject-mask
```

### Bare React Native projects

Install [`expo-modules-core`](https://docs.expo.dev/bare/installing-expo-modules/)
first, then:

```sh
npm install react-native-subject-mask
npx pod-install
```

## Why data-only?

Vision's mask/contour APIs are the only part that *requires* native code —
everything downstream is paths and compositing, which JS already does well via
Skia. Keeping animation in JS keeps the native surface small and stable while
the "does this look good" iteration happens where iteration is fast. It also
enables uses beyond dim-the-background, like rendering a previous photo's
outline over a live camera preview for consistent posing.

The similarly named
[react-native-subject-lift](https://github.com/baygut/react-native-subject-lift)
returns a subject *cutout*; this module instead returns the dim mask + vector
outline for building animations.

## Development

```sh
npm install
npm run build     # compile TypeScript
cd example && npx expo run:ios
```

## License

MIT
