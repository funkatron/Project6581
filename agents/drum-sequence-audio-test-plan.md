# Plan: automated drum-sequence play + listen tests

**Status:** **A1–A3** shipped (record + analyze CLI). **A4** tune profiles from real WASM captures; **A5** optional GHA.

**Goal:** Run a **known drum pattern** through the real **reSIDfp → AudioWorklet** path, capture audio, and **fail CI** when lanes sound wrong (e.g. CH step emits kick-like low thump) or when transport/timing drifts.

**Non-goals (v1):** Subjective “sounds good” scoring, iPad Safari in CI, full 6-lane factory timbre matrix, or replacing owner iPad listening.

**Context:** Today `npm test` covers grid data, groove I/O, lane slots, and studio **trace** lines — not PCM. [docs/ipad-safari-automation-map.md](../docs/ipad-safari-automation-map.md) marks drum clock and timbre as **Manual**. [scripts/factory-audition-record.mjs](../scripts/factory-audition-record.mjs) already proves **Chrome + static server + Puppeteer + MediaRecorder** for factory one-shots.

---

## 1. What “listen” means in automation

Use **objective checks** on decoded WAV (48 kHz mono/stereo from the app recorder):

| Check | Detects |
| --- | --- |
| **Energy envelope per 1/16 step** | Silent steps, double-fires, wrong step count in one bar |
| **Low-band vs high-band ratio per step** | Kick/sn on low-heavy steps vs CH on noise-hat steps |
| **Spectral centroid (or band-pass RMS)** | Lane swaps (kick timbre on hat steps) |
| **Peak timing vs expected grid** | Clock/sync bugs (compare onset times to `stepMilliseconds`) |
| **Optional golden fingerprint** | Regressions after WASM/ADSR/filter changes (stored hashes, not committed WAV blobs) |

Thresholds live in **fixture metadata** (expected profile per reference groove), not magic numbers in the test body.

**Human listening** stays optional: attach artifacts under `/opt/cursor/artifacts/` on failure, or `npm run drum-audio:record` for local A/B.

---

## 2. Architecture (three layers)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer A — Logic (existing)                                   │
│ drum-step-sequencer, drum-performance, unison slot tests      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Layer B — Deterministic drive + trace (shipped)              │
│ Test hooks OR Playwright clicks → studioTrace assertions       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Layer C — Audio capture + analysis (A3–A5)                    │
│ Puppeteer/Playwright → record WAV → decode → analyze          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Reference fixtures

`test/fixtures/drum-audio/`:

| File | Purpose |
| --- | --- |
| `ch-only-16.json` | 16 steps, **CH row only** |
| `kick-four-on-floor.json` | Kick 1/5/9/13 |
| `four-on-floor.json` | Kick four + CH off-beats (voice/filter stress) |
| `profiles/*.json` | Per-fixture analysis expectations |

## 4. Test hooks

`index.html?testHooks=1` → `globalThis.__project6581Test` (see `src/studio-test-hooks.js`).

## 5–6. Capture and analysis

```bash
node scripts/drum-sequence-audition-record.mjs --out artifacts/drum-audio
node scripts/drum-sequence-audition-analyze.mjs --manifest artifacts/drum-audio/manifest.json
```

Analysis: `src/drum-audio-analysis.js`; unit tests in `test/drum-audio-analysis.test.js`.

## 9. Phased delivery

| Phase | Status |
| --- | --- |
| **A1** | Done |
| **A2** | Done (`scripts/drum-sequence-trace-smoke.mjs`) |
| **A3** | Record script |
| **A4** | Tune profiles from real WAV |
| **A5** | Optional GHA job |

*Full risks, CI, and success criteria: see git history of this file.*