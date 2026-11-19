# Drum audio regression (CI)

You do **not** need a desktop to capture drum groove WAVs. GitHub Actions runs the same path as local `npm run drum-audio:record`.

## When it runs

Workflow **Drum sequence audio** (`.github/workflows/drum-audio.yml`):

- **Manual:** Actions → *Drum sequence audio* → **Run workflow**
- **Automatic:** Pull requests that touch drum fixtures, drum scripts, SID4 voice code, or related tests

## What you get

On each run, download artifact **`drum-audio-<run-id>`** (14-day retention):

- `ch-only-16.wav`, `kick-four-on-floor.wav`
- `manifest.json` (BPM, rates, byte sizes)

Open WAVs on iPad via Files after downloading from the PR check or Actions run.

## Local (optional)

Same commands as CI:

```bash
npm run build:wasm
npm run drum-audio:record -- --out artifacts/drum-audio
npm run drum-audio:analyze -- --manifest artifacts/drum-audio/manifest.json
```

Requires Chromium (`CHROME_PATH` if not default).

## Profiles

Thresholds live in `test/fixtures/drum-audio/profiles/`. CI records **2 bars** but analyzes the **second bar** (`skipFirstBar`) so transport warms up before measurement. Tune profiles after intentional timbre changes.