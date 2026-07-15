# react-native-subject-mask

Apple Vision subject lifting for React Native / Expo — the Photos-style
"lift subject from background" effect, as **animation-ready data** plus
optional drop-in Skia components.

<p align="center">
  <img src="https://raw.githubusercontent.com/ksinghj/react-native-subject-mask/main/docs/demo.gif" alt="Subject reveal demo: outline traced with a glow, then the background dims around the subject" width="320" />
</p>

```tsx
import { useSubjectLift } from 'react-native-subject-mask';
import { SubjectRevealImage } from 'react-native-subject-mask/skia';

function LiftedPhoto({ uri }: { uri: string }) {
  const { result } = useSubjectLift(uri);
  if (!result) return null;
  return (
    <SubjectRevealImage
      result={result}
      dimmed
      style={{ aspectRatio: result.imageWidth / result.imageHeight }}
    />
  );
}
```

## What it does

`isolateSubject(imageUri)` runs Apple Vision's subject-lift pipeline
(`VNGenerateForegroundInstanceMaskRequest` + `VNDetectContoursRequest`) and
returns data, not a baked-in effect:

- **`imageUri`** — an orientation-normalized copy of the photo (file:// JPEG)
- **`dimMaskUri`** — a PNG whose *alpha channel* is 1 over the background and
  0 over the subject, ready to mask a dark scrim so the subject stays lit
- **`outlineSvg`** — the subject's outline as an SVG path string, normalized
  to 0...1 with a top-left origin, ready for `Skia.Path.MakeFromSVGString`
  (multiple subpaths preserved — islands and holes survive)
- **`subjectUri`** *(opt-in)* — the subject cutout as a transparent PNG, the
  same pixel size as `imageUri`; pass `includeSubjectImage: true` to get it

All animation stays in JS, where it's fast to iterate — and the data opens up
more than dimming: e.g. render a previous photo's outline over a live camera
preview as a ghost overlay for consistent posing.

## Installation

```sh
npx expo install react-native-subject-mask
```

**Bare React Native**: install
[`expo-modules-core`](https://docs.expo.dev/bare/installing-expo-modules/)
first, then `npm install react-native-subject-mask && npx pod-install`.

The core module has **zero dependencies**. The `/skia` components additionally
need `@shopify/react-native-skia` (≥2) and `react-native-reanimated` (≥3.6),
declared as optional peers — skip them if you're building your own visuals.

## Platform support

| Platform | Support |
| --- | --- |
| iOS 17+ | ✅ |
| iOS < 17 | Compiles; `isSupported()` returns `false` |
| Android | Compiles; `isSupported()` returns `false` (ML Kit Subject Segmentation is a v2 goal) |
| Web | `isSupported()` returns `false` |

Gate the feature at runtime with `isSupported()`.

## Drop-in components (`react-native-subject-mask/skia`)

### `<SubjectRevealImage result dimmed />`

Plays the Photos-style reveal: outline traced with a glow, glow pulses, then
the background dims around the subject. Flip `dimmed` to `false` to fade the
dim back out. Everything is a prop:

| Prop | Default | |
| --- | --- | --- |
| `outlineColor` | `'white'` | Outline stroke color |
| `outlineWidth` | `3` | Stroke width, px |
| `glowColor` | = `outlineColor` | Glow color |
| `glowRadius` | `12` | Glow blur radius; `0` disables |
| `dimColor` | `'black'` | Scrim color |
| `dimOpacity` | `0.55` | Background darkness at full dim |
| `revealDelayMs` | `0` | Delay before the reveal starts |
| `traceDurationMs` | `600` | Outline trace |
| `glowPulseDurationMs` | `350` | One pulse leg |
| `glowPulseCount` | `2` | Pulse legs (2 = one full pulse); `0` skips |
| `dimInDurationMs` | `400` | Dim fade-in |
| `outlineFadeDurationMs` | `350` | Outline fade-out (runs with dim-in) |
| `dimOutDurationMs` | `350` | Dim fade-out on `dimmed={false}` |

### Primitives

For custom choreography, compose inside your own Skia `<Canvas>`:

- `<SubjectOutline path trim glowOpacity ... />` — the stroked outline with a
  glow underlay; `trim`, `opacity`, and `glowOpacity` accept Reanimated shared
  values
- `<DimOverlay mask fitRect opacity ... />` — the alpha-masked scrim
- `makeFittedOutlinePath(outlineSvg, fitRect)` — scales the normalized path
  into pixel space (keeping stroke widths sane)

## Data API

```ts
type SubjectLiftOptions = {
  /** Cap the dim mask's longest side, px. Default 2048; 0 disables. */
  maxMaskDimension?: number;
  /** Cap the output image's longest side, px. Default 0 = source resolution. */
  maxImageDimension?: number;
  /** JPEG quality of the output image, 0–1. Default 0.9. */
  imageQuality?: number;
  /** Also produce the subject cutout PNG (`subjectUri`). Default false. */
  includeSubjectImage?: boolean;
};

type SubjectLiftResult = {
  imageUri: string;          // orientation-normalized copy (file://)
  dimMaskUri: string;        // PNG, alpha 1 = background, 0 = subject (file://)
  subjectUri?: string;       // subject cutout PNG, transparent background,
                             // same pixel size as imageUri; only present when
                             // includeSubjectImage was set (file://)
  outlineSvg: string | null; // SVG path, normalized 0..1, top-left origin
  imageWidth: number;
  imageHeight: number;
};

function isolateSubject(imageUri: string, options?: SubjectLiftOptions): Promise<SubjectLiftResult>;
function isSupported(): boolean;

// React sugar: runs isolateSubject when imageUri changes, discards stale results
function useSubjectLift(imageUri: string | null, options?: SubjectLiftOptions):
  { result: SubjectLiftResult | null; error: Error | null; loading: boolean; durationMs: number | null };

// Letterbox math for positioning overlays against a scaledToFit image
function aspectFitRect(imageAspectRatio: number, container: { width: number; height: number }): Rect;
```

Vision always analyzes the full-resolution image; the option caps only affect
what's written out, and the normalized mask/outline stay aligned at any size.

**Errors are typed**, not half-null results — `isolateSubject` rejects with
`error.code` of `ERR_UNSUPPORTED` (Android, iOS < 17), `ERR_IMAGE_LOAD`, or
`ERR_NO_SUBJECT` (show your "make sure you're clearly in frame" UI).
`outlineSvg` is `null` only in the narrow case where masking succeeded but
contour tracing failed — dimming still works.

Output files land in the temporary directory — **copy them if you need
persistence**.

## Design: native extracts, JS animates

Vision's mask/contour APIs are the only part that *requires* native code —
everything downstream is paths and compositing, which Skia already does well
in JS. So the native module returns data, and even the bundled `/skia`
components are plain JS on top of the public API — fork them, restyle them,
or ignore them without touching native code.

The similarly named
[react-native-subject-lift](https://github.com/baygut/react-native-subject-lift)
returns a subject *cutout*; this module returns the dim mask + vector outline
for building animations (plus the cutout, if you opt in with
`includeSubjectImage`).

## Example app

```sh
npm install
npm run build
cd example && npx expo run:ios
```

"Add demo photo" runs the pipeline on a bundled photo; "Pick a photo" uses
your library.

## License

MIT
