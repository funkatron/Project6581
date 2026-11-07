# Delivery sequence (agreed 2026-11-07)

Order: **A → C → B → D**. Each lane is one or more focused PRs; no factory drum rewrites until pitch audio is iPad-signed-off; latency work waits on user-supplied measurements (lane D).

---

## Lane A — Pitch envelope (user-facing)

**Goal:** Saveable per-sound pitch envelopes; v3 presets still load with envelope off.

### PR A1 — Schema + wiring (no factory edits)

| Task | Detail |
| --- | --- |
| Preset **v4** | Add `sound.voice.pitchEnvelope` using `validatePitchEnvelope()` from `src/pitch-envelope.js` |
| Storage key | `project6581.user-presets.v4` (v3 bank import: map missing field → `DEFAULT_PITCH_ENVELOPE`) |
| Import | Accept v3 single/bank files by upgrading in memory to v4 on import (explicit in validation errors for v1–v2) |
| Playback | `gatherSound` / `currentSidSettings` read from UI state, not separate audition-only path |
| Tests | `preset-library.test.js`: round-trip, v3 upgrade, invalid points, disabled neutral |
| Docs | README preset version line; `docs/pitch-envelope.md` |

**Out of scope A1:** Factory preset JSON changes; kick/tom retune PR.

### PR A2 — Editor UI

| Task | Detail |
| --- | --- |
| Replace audition panel | Compact editor: enable, interpolation, end (hold/zero), 2–4 point editor (ms + semitones), optional presets dropdown (Kick drop, Tom fall, Laser, Off) |
| Touch | iPad-safe targets; numeric readouts; max 16 points (enforce in UI before full multi-point graph) |
| Dirty state | Pitch envelope changes mark preset dirty like other voice fields |
| Module | Keep DOM in `src/pitch-envelope-editor.js`; shrink `index.html` further |

**Gate before A3:** iPad audition of downward sweep, Stop all mid-sweep, poly overlap (`docs/ipad-safari-qa.md` pitch section).

### PR A3 — Factory sounds (follow-up)

Per ROADMAP: revisit **Low Thud Kick** / **Low Tom** only after A2 gate; optional new FX presets; no silent ID renames.

---

## Lane C — UI refinement + extraction

**Goal:** ROADMAP “consistent control widths” + dedicated LFO tab polish; continue modularizing `index.html`.

### PR C1 — Control width audit

- Document tokens in `docs/interface-refinement-plan.md` (or extend existing).
- Align select/slider widths per role; full-width detune row unchanged.
- Tests: extend `keyboard-key-width` / new snapshot CSS assertions where stable.

### PR C2 — LFO tab completion

- Confirm all LFO controls live only under **LFOs** tab on narrow viewports (already partially done; audit Sound tab for stragglers).
- `editor-tabs.test.js` + manual iPad portrait/landscape.

### PR C3 — Extract preset modal + engine status

- `src/preset-modal.js` (open/close, lists, dirty guard hooks).
- `src/sid-engine-status.js` (LED, retry, unlock, progress).
- `preset-integration.test.js` may assert ids in html or move to import graph tests.

**Gate:** Tab switch does not reset audio/modulation phase (ROADMAP checklist).

---

## Lane B — Western scale lock

**Goal:** ROADMAP Priority 2b.

### PR B1 — Core policy module

- `src/scale-lock.js`: keys, scale interval sets, quantize/nearest-tone policy (document tie-breaking).
- Unit tests: all keys, Game Arp offset after transposition, MIDI 0–127 clamp.

### PR B2 — Keyboard + arp integration

- Key coloring (in-scale vs out); **Scale lock** toggle.
- Apply at final note boundary: touch, poly, Game Arp, regular Arp, latch.
- Highlight agrees with sounding pitch.

**Gate:** Chromatic mode unchanged when lock off; device verification section in `ipad-safari-qa.md`.

---

## Lane D — Latency reduction (planned with user data)

**Blocked on:** User-provided iPad measurements / notes (footer **Audio timing**, arp off vs on, recording vs no recording, output route).

When info arrives, record in `docs/latency-investigation.md` with:

| Input | Use |
| --- | --- |
| Dispatch RTT, render avg/max vs block budget | Decide main-thread vs worklet work |
| `baseLatency` / `outputLatency` | Separate buffering from dispatch |
| Perceived vs reference tone | A/V sync vs true onset |
| Screen recording on/off | ROADMAP Nov 5 caveat |

### Candidate PRs (only after triage)

1. **D1 — Instrumentation only** — if gaps in logging.
2. **D2 — Scheduling** — further write batching / redundant note-off removal (no WASM unless proven).
3. **D3 — Render budget** — active-chip-only render (WASM rebuild; envelope tail tests).

Do not start D until user packet is filed.

---

## Parallel / don’t mix in

- **v0.2.0 / #59** — device QA can run alongside A1; does not require A complete.
- **PR #66** — merge when authorized; independent of A branch.
- **MIDI, PWA, multi-SID UI** — after B or explicitly reprioritized.

---

## Next action

Start **Lane A1** on branch `cursor/pitch-envelope-v4-c7a6` when implementation is authorized.
