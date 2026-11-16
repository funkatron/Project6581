# Live SID engine integration

## Goal

Route the touch keyboard, arpeggiators, presets, and all voice/filter controls through **cycle-accurate reSIDfp** emulation (MOS 6581 or 8580). **Interactive register writes** are the primary mode; HVSC `.sid` tune playback is a separate roadmap investigation, not the live instrument.

## Current state (implemented)

| Layer | Location | Role |
| --- | --- | --- |
| WASM bridge | `native/sid_bridge.cpp` | Three `reSIDfp::SID` instances; panned stereo mix + per-chip peak meters |
| Build | `scripts/build-residfp.sh` | Emscripten compile; artifact `dist/residfp.wasm` |
| Audio thread | `src/residfp-worklet.js` | WASM render, write queue, pitch envelopes, LFO filter path, PCM recording |
| Main thread bootstrap | `src/create-residfp-audio.js` | `AudioContext`, worklet module, WASM fetch/compile, diagnostics |
| Register semantics | `src/sid-registers.js` | MIDI note → SID frequency, ADSR tables, gate, pulse width |
| Polyphony | `src/unison-sid-controller.js` | Up to **nine** oscillators (slots `0–8` → chips `0–2`, voices `0–2` each) |
| Engine state | `src/sid-engines.js` | Default per-chip settings, **routing** helpers (`sid1`…`layer`) |
| Studio glue | `src/sid-studio.js` | Keys, arps, three `engines[]`, layer play/stop, modulation |
| Write batching | `src/sid-write-batcher.js` | Coalesce port messages; immediate flush on note-on |
| Lifecycle | `src/sid-audio-lifecycle.js` | Bounded `AudioContext.close()` for startup retry |

There is **no** silent Web Audio oscillator fallback. If WASM download, compile, or `sid_init` fails, the UI reports the error and offers **Retry SID** / **Enable audio** as appropriate.

**Do not** use libsidplayfp-wasm `SidAudioEngine` for live keys: that stack targets C64 tune players, not per-register interactive chips.

## Three chips and voice budget

```text
Chip 0 (SID 1)  voices 0,1,2  ─┐
Chip 1 (SID 2)  voices 3,4,5  ├─ UnisonSidController slot map (up to 9 slots)
Chip 2 (SID 3)  voices 6,7,8  ─┘
```

- **`engines[0..2]`** hold independent model, pan, filter, and voice settings (preset v5).
- **`UnisonSidController.buildSlotMap(chipMask)`** chooses which physical slots participate. With `chipMask=[0,1,2]`, slots fill chip order until the **Voices** budget is reached.
- **`sid_set_chip_model(chip, model)`** and **`sid_set_pan(chip, percent)`** in WASM configure chips without reinitializing siblings.

## Note routing (keyboard, Root Arp, Game Arp)

Presets and the UI store routing under `performance.routing`:

| Route | `routeMask` | Playback behavior |
| --- | --- | --- |
| `sid1` / `sid2` / `sid3` | one chip index | Notes use that chip's slot map only |
| `all` | `[0,1,2]` | Shared voice pool across enabled chips (same as multi-chip mask) |
| `layer` | `[0,1,2]` | **One stack per enabled chip** for the same MIDI note (see below) |

`src/sid-studio.js`:

- **`play` / `stop`** read the route for the event source (`keyboard`, `arp`, `game`, or `key:<note>`).
- **`layer`:** calls `playOne` / per-chip `stop` with owner keys `source@0`, `source@1`, `source@2` so release on one chip does not steal another.
- **`playOne`:** passes `chipMask` into `sidController.noteOn`; per-engine **voice enable** skips disabled cards.

Layer factory presets set `routing: { keyboard: 'layer', arp: 'layer', game: 'sid1' }`. Independent layer voice ownership is tightened in [PR #94](https://github.com/funkatron/Project6581/pull/94).

## WASM boundary (actual exports)

From `native/sid_bridge.cpp`:

- `sid_init(model, sample_rate)` — legacy all-chips-same-model bootstrap
- `sid_set_chip_model(chip, model)` — per-chip 6581/8580
- `sid_set_pan(chip, panPercent)` — stereo pan for that chip's contribution
- `sid_write(reg, value)` — global register `0x00–0x5F` (three chips in `0x20`-byte banks)
- `sid_render(frames)` — mix three chips into stereo `int16` PCM (max 4096 frames per call)
- `sid_pcm_ptr()` — pointer into mixed buffer for the worklet
- `sid_reset()` — reset all chips; worklet also clears pitch-envelope state on `{type:'reset'}`
- `sid_init_stage()`, `sid_init_error()` — staged init diagnostics for failed startup

GPL-2.0-or-later applies via libresidfp; see repository README and build workflow obligations.

## Real-time scheduling (as built)

- Rendering runs in an **`AudioWorklet`** (`residfp-processor`); WASM is passed in from the main thread (no fetch on the audio thread).
- Note and parameter changes use `AudioWorkletNode.port.postMessage`; batched `writes` arrays reduce per-turn traffic (`sid-write-batcher.js`).
- **Pitch envelopes** schedule in the worklet from `currentFrame` (see [pitch-envelope.md](pitch-envelope.md)).
- **LFO (hybrid):**
  - With **`useAudioClockLfo=true`** (current default), **cutoff, resonance, and volume** for each chip are modulated inside `applyAudioClockModulation()` every render quantum; the worklet posts **`modulation-display`** for slider visualization.
  - **ADSR, pulse width, PWM, and detune** targets are applied on the main thread in `updateModulation()` via `modulation.modulate()` → `UnisonSidController` register helpers, using wall-clock phase for LFO waves. Extending audio-thread coverage is [roadmap](audio-clock-lfo-investigation.md) work.
- LFOs can target **all engines** or a single SID (`lfos[].engines`: `'all'|'1'|'2'|'3'`).

SID-specific rules enforced in JS:

- Frequency register: `round(hz * 2^24 / clock)` with clamp `0–65535`
- ADSR mapped through hardware rate/sustain tables in `sid-registers.js`
- Pulse width is 12-bit SID semantics; PWM sweeps the stored center width

Ring mod, sync, and test bit are not exposed in the current UI; gate retrigger and filter routing follow standard voice register layout.

## Pitch envelope (audio path)

When `voice.pitchEnvelope.enabled` is true, `UnisonSidController` invokes worklet start/stop/retune hooks. Preset **v5** stores the envelope on each engine's `voice` block; imports from v3/v4 default it off.

## Presets and engine snapshot

- **v5** `sound.engines[]` + `performance.routing` + global `lfos[]` and performance arp/seq state.
- Loading applies all three engines, chip models, pans, and routes; may call `ensureSidModel` when the primary chip model changes.

## Verification checklist

| Item | Status |
| --- | --- |
| libresidfp built to WASM in CI (`build-residfp.yml`) + smoke test | Automated |
| Register-write tests (pitch, ADSR, gate, filter, polyphony, unison, routing, engines) | Automated (`test/*`) |
| PCM golden compare vs native libresidfp for fixed traces | Not automated |
| Keyboard, multi-touch allocation, arpeggiators, latch, layer routing, stop-all | Partially automated; device QA pending |
| iPad Safari unlock, lifecycle, worklet performance | Device QA ([ipad-safari-qa.md](ipad-safari-qa.md)) |
| Explicit labeled fallback synth | **Intentionally not implemented** |
| GitHub Pages deployment vs CI | Separate manual verification |

Automated coverage mapping: [ipad-safari-automation-map.md](ipad-safari-automation-map.md).

## Related documents

- [README](../README.md) — user-facing audio path diagram
- [ROADMAP](../ROADMAP.md) — latency, MIDI, PWA, factory bank
- [SID startup investigation](sid-startup-investigation.md)
- [Audio-clock LFO investigation](audio-clock-lfo-investigation.md)
- [Triple SID UI mockup](triple-sid-ui-mockup.md)