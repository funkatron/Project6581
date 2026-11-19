# Plan: automated drum-sequence play + listen tests

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
│ Layer B — Deterministic drive + trace (new, fast, no audio) │
│ Test hooks OR Playwright clicks → studioTrace assertions       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Layer C — Audio capture + analysis (new, CI optional/slow)    │
│ Puppeteer/Playwright → record WAV → decode → analyze          │
└─────────────────────────────────────────────────────────────┘
```

- **Layer A:** Keep extending; does not replace C.
- **Layer B:** Cheap regression net before every merge; catches “wrong `drum:*` source” without WASM in default `npm test`.
- **Layer C:** The user-facing “play and listen” automation; runs on schedule or when `dist/residfp.wasm` / drum code changes.

---

## 3. Reference fixtures

Add `test/fixtures/drum-audio/`:

| File | Purpose |
| --- | --- |
| `ch-only-16.json` | 16 steps, **CH row only** (factory kit default levels) |
| `kick-four-on-floor.json` | Kick 1/5/9/13 |
| `four-on-floor.json` | Kick + CH eighths (stress 3 voices + filter) |
| `profiles/*.json` | Per-fixture analysis expectations (onset count, low/high ratio windows, max centroid on CH-only steps) |

Groove shape matches `validateDrumSequence` / `.6581drum.json` so the same files work for UI import tests and audio runs.

---

## 4. Test hooks (minimize flaky UI)

**Problem:** Driving 16×6 cells via Puppeteer is slow and brittle (help gesture, scroll).

**Proposal:** Gated hook surface (only when `location.search` includes `testHooks=1` or `import.meta` build flag):

```js
// sid-studio.js (sketch)
globalThis.__project6581Test = {
  ready: () => Boolean(sidController),
  loadDrumSequence: (seq) => { … render drum panel … },
  drumPreview: (on) => on ? drumStart() : drumStop(),
  masterBpm: (n) => { … },
  panic: () => …,
  exportTrace: () => diagnosticsSnapshot().studioTrace,
};
```

Playwright waits on `__project6581Test.ready()` then calls hooks — same registers and clocks as production, fewer DOM steps.

**Security:** Hooks no-op on production GitHub Pages unless `testHooks=1`; document in `docs/` that this is for automation only.

---

## 5. Capture script (Layer C driver)

**New:** `scripts/drum-sequence-audition-record.mjs` (sibling to `factory-audition-record.mjs`).

Flow per fixture:

1. Start static server (reuse `startStaticServer` + COOP/COEP).
2. Launch Chromium (`puppeteer-core` / align with `.github/workflows/browser-smoke.yml`).
3. Open `index.html?testHooks=1`.
4. `waitSidReady` (reuse).
5. Init SID if needed; set master BPM **120**; drum rate **1/16**, sync on.
6. `loadDrumSequence(fixture)` → `drumPreview(true)`.
7. Record **2 bars** (32 steps @ 1/16 = 2 s @ 120 BPM) via header recorder (**WAV** only in CI).
8. Write `artifacts/drum-audio/<fixture-id>.wav` + `manifest.json`.

CLI:

```bash
node scripts/drum-sequence-audition-record.mjs --fixtures test/fixtures/drum-audio --out artifacts/drum-audio
node scripts/drum-sequence-audition-analyze.mjs --manifest artifacts/drum-audio/manifest.json
```

---

## 6. Analysis module (pure Node, unit-testable)

**New:** `src/drum-audio-analysis.js` (or `scripts/lib/drum-audio-analysis.mjs` if we want zero `src/` surface until stable).

Responsibilities:

- Parse WAV (reuse patterns from `test/sid-recorder.test.js` if present, or minimal 16-bit PCM reader).
- Slice timeline into step windows using **known BPM, rate, bars recorded**.
- Per window: RMS, RMS below 200 Hz vs above 2 kHz (simple biquad or FFT via small dependency — prefer **no native deps**; start with time-domain IIR).
- Compare to fixture `profiles/*.json`; return `{ pass, failures[], metrics }`.

**Unit tests:** `test/drum-audio-analysis.test.js` feeds **synthetic sine + noise WAV** bytes (generated in test) so analysis runs in default `npm test` without WASM.

---

## 7. CI integration

| Job | When | Command |
| --- | --- | --- |
| **Default PR** | Every push | `npm test` (includes analysis unit tests, no WASM) |
| **Drum audio** | Optional workflow or `workflow_dispatch` | `npm run build:wasm` → record script → analyze → upload WAV on failure |

Prereqs mirror factory audition: `dist/residfp.wasm`, Chromium, ~2–3 min per run for 3–4 fixtures.

**Pass criteria for first CI milestone:** `ch-only-16` passes centroid/ratio gates; `kick-four-on-floor` fails if CH row accidentally enabled (regression guard).

Do **not** block every PR on Layer C until flake rate is measured (target: &lt;1% over 20 runs).

---

## 8. Mapping to roadmap / docs

| Artifact | Update |
| --- | --- |
| [docs/ipad-safari-automation-map.md](../docs/ipad-safari-automation-map.md) | Drum rows: “lane timbre CH vs kick” → **Partial (audio CI)** |
| [docs/drum-sequencer-ipad-qa.md](../docs/drum-sequencer-ipad-qa.md) | Link: “Desktop audio regression: `npm run test:drum-audio`” |
| [docs/factory-audition-recordings.md](../docs/factory-audition-recordings.md) | Short pointer to drum script |
| ROADMAP drum § | Checkbox: automated groove audition (desktop) |

iPad listening checkboxes **remain** until owner signs off; automation is **evidence**, not a substitute for speaker judgment.

---

## 9. Phased delivery

| Phase | Deliverable | Effort shape |
| --- | --- | --- |
| **D-A1** | Fixtures + `profiles` schema + analysis unit tests (synthetic WAV) | Small; no browser |
| **D-A2** | `__project6581Test` hooks + Playwright smoke: load fixture, preview, trace shows N `drum:ch` onsets | Small |
| **D-A3** | `drum-sequence-audition-record.mjs` + manual `npm run drum-audio:record` | Medium; needs WASM |
| **D-A4** | Analyze script wired; golden thresholds tuned from real captures | Medium; iterate thresholds |
| **D-A5** | Optional GHA job + artifact upload on failure | Small |
| **D-A6** | Extend matrix: parallel keyboard + game arp (out of scope until drum-only green) | Large |

**Dependency order:** A1 → A2 → A3 → A4 → A5. Merge A1–A2 early for fast feedback; A3+ behind explicit “run drum audio” label.

---

## 10. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| MediaRecorder / worklet timing flake | Fixed BPM; record ≥2 bars; discard first bar for analysis |
| Threshold too tight after intentional timbre change | Versioned `profiles` + documented “refresh goldens” command |
| CI time / WASM build | Optional workflow; cache `dist/residfp.wasm` artifact |
| False pass (trace OK, audio wrong) | Layer C required for timbre; trace-only in A2 |
| Shared SID filter colors all lanes | Separate test: CH-only fixture sensitive to filter stomp; document in profile |

---

## 11. Success criteria

**Done when:**

1. One command records and analyzes **CH-only** and **kick-four-on-floor** grooves.
2. Introducing a deliberate bug (e.g. force all lanes to `low-thud-kick`) **fails** analysis.
3. `ipad-safari-automation-map.md` and this plan are linked from the drum QA doc.
4. PR template lists **automated drum audio** separately from **iPad verified**.

---

## 12. Open decisions (owner)

1. **CI blocking:** Optional job only vs required on `main` after soak.
2. **Golden storage:** JSON metrics only vs short committed reference WAV (large).
3. **Hooks on Pages:** Query param only vs separate `test.html` entry.

---

*Draft for agent/owner review. Implementation PRs should stay slice-sized per [agents/roadmap-drum-sequencer-ui.md](roadmap-drum-sequencer-ui.md).*