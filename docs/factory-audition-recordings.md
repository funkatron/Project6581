# Factory audition recordings

**Why the agent did not ship audio with Step D by default:** batch capture needs **reSIDfp WASM**, a real **Chrome/Chromium** with `MediaRecorder`, and several minutes of automated UI driving. The roadmap treated iPad listening as owner-driven; we had no checked-in script until now. Tuning changed parameters in code — **your ears** (or these files) are how you verify them.

## Formats

| Format | When to use | Browser |
| --- | --- | --- |
| **WAV** | Lossless, works everywhere Project6581 records | Chrome, Edge, Firefox, Safari |
| **M4A** | Smaller files, same in-app AAC path as the header recorder | Safari/iPad natively; Chromium only if `MediaRecorder` reports `audio/mp4` support |

The app’s recorder (header **● Record** → **■ Stop & save**) is the same path this script uses — not a microphone.

## Batch script

Prereqs: `dist/residfp.wasm` (build with `npm run build:wasm`, or download from [GitHub Pages](https://funkatron.github.io/Project6581/dist/residfp.wasm)), Chrome at `/usr/bin/google-chrome` or set `CHROME_PATH`.

```bash
# WAV (recommended for CI / Linux)
node scripts/factory-audition-record.mjs --format wav --out ./artifacts/factory-audition

# M4A (try on Mac Safari manually, or Chrome if supported)
node scripts/factory-audition-record.mjs --format m4a --out ./artifacts/factory-audition

# Subset while iterating
node scripts/factory-audition-record.mjs --format m4a --ids low-thud-kick,low-tom,noise-snare --out ./artifacts/drums
```

Output: one `&lt;preset-id&gt;.wav` or `.m4a` per factory sound plus `manifest.json` (note list, byte sizes, whether M4A was supported).

Phrases follow [factory-audition-matrix.js](../src/factory-audition-matrix.js); layer/legacy presets without matrix rows use category defaults.

## Drum sequence grooves

```bash
npm run drum-audio:record -- --out ./artifacts/drum-audio
npm run drum-audio:analyze -- --manifest ./artifacts/drum-audio/manifest.json
```

Uses `index.html?testHooks=1` and fixtures under `test/fixtures/drum-audio/`. Profiles are tuned in **A4** after listening to real captures — synthetic thresholds may be too strict for live WAV until then.

## iPad (your M4A case)

1. Open Project6581 on **GitHub Pages** or local HTTPS.
2. Set **Format → M4A** in the header (only shown when the browser supports it).
3. Load each factory preset, play the matrix phrase, **Record** → **Stop & save**, send clips to Files.

Automated batch on iPad is not scripted here; use the desktop script for a full set, or M4A on device for format you care about.

## Roadmap

Step **D** iPad checkbox stays open until you file listening notes. These recordings are evidence, not a substitute for speaker/headphone judgment on your hardware.