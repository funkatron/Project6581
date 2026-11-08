# Live SID engine integration

## Goal

Route the touch keyboard, arpeggiators, presets, and all voice/filter controls through **cycle-accurate reSIDfp** emulation (MOS 6581 or 8580). **Interactive register writes** are the primary mode; HVSC `.sid` tune playback is a separate roadmap investigation, not the live instrument.

## Current state (implemented)

| Layer | Location | Role |
| --- | --- | --- |
| WASM bridge | `native/sid_bridge.cpp` | Three `reSIDfp::SID` instances, mixed with headroom |
| Build | `scripts/build-residfp.sh` | Emscripten compile; artifact `dist/residfp.wasm` |
| Audio thread | `src/residfp-worklet.js` | Load WASM, queue register writes, render PCM, pitch envelopes, recording |
| Main thread bootstrap | `src/create-residfp-audio.js` | `AudioContext`, worklet module, WASM fetch/compile, diagnostics |
| Register semantics | `src/sid-registers.js` | MIDI note → SID frequency, ADSR tables, gate, pulse width |
| Polyphony | `src/unison-sid-controller.js` | Up to eight oscillators across three chips; voice assign + unison |
| Write batching | `src/sid-write-batcher.js` | Coalesce port messages; immediate flush on note-on |
| Lifecycle | `src/sid-audio-lifecycle.js` | Bounded `AudioContext.close()` for startup retry |

There is **no** silent Web Audio oscillator fallback. If WASM download, compile, or `sid_init` fails, the UI reports the error and offers **Retry SID** / **Enable audio** as appropriate.

**Do not** use libsidplayfp-wasm `SidAudioEngine` for live keys: that stack targets C64 tune players, not per-register interactive chips.

## WASM boundary (actual exports)

From `native/sid_bridge.cpp`:

- `sid_init(model, sample_rate)` — `model` 6581 or 8580; PAL clock **985248 Hz** inside `setSamplingParameters`
- `sid_write(reg, value)` — global register `0x00–0x5F` (three chips in `0x20`-byte banks)
- `sid_render(frames)` — mix three chips into mono `int16` PCM (max 4096 frames per call)
- `sid_pcm_ptr()` — pointer into mixed buffer for the worklet
- `sid_reset()` — reset all chips; worklet also clears pitch-envelope state on `{type:'reset'}`
- `sid_init_stage()`, `sid_init_error()` — staged init diagnostics for failed startup

GPL-2.0-or-later applies via libresidfp; see repository README and build workflow obligations.

## Real-time scheduling (as built)

- Rendering runs in an **`AudioWorklet`** (`residfp-processor`); WASM is passed in from the main thread (no fetch on the audio thread).
- Note and parameter changes use `AudioWorkletNode.port.postMessage`; batched `writes` arrays reduce per-turn traffic.
- **Pitch envelopes** (audition path) schedule in the worklet from `currentFrame`, not main-thread timers.
- **LFO modulation** still uses a main-thread ~60 Hz timer driving register updates; audio-clock LFO is a separate roadmap item (`docs/audio-clock-lfo-investigation.md`).
- Three physical SID chips are shared for **up to eight oscillators** (unison/polyphony), not three isolated instruments in the UI.

SID-specific rules enforced in JS:

- Frequency register: `round(hz * 2^24 / clock)` with clamp `0–65535`
- ADSR mapped through hardware rate/sustain tables in `sid-registers.js`
- Pulse width is 12-bit SID semantics; PWM sweeps the stored center width

Ring mod, sync, and test bit are not exposed in the current UI; gate retrigger and filter routing follow standard voice register layout.

## Pitch envelope (audio path)

When `settings.pitchEnvelope.enabled` is true, `UnisonSidController` invokes `startPitchEnvelope` / `retunePitchEnvelope` / `stopPitchEnvelope` on the audio handle (`create-residfp-audio.js`). The worklet applies semitone offsets against a **base frequency register** at render-block granularity (typically 128 frames). See `docs/pitch-envelope.md` and `agents/pitch-envelope-integration.md`.

Preset schema **v3 does not** persist pitch envelopes yet; the Sound tab provides an **audition-only** sweep control.

## Verification checklist

| Item | Status |
| --- | --- |
| libresidfp built to WASM in CI (`build-residfp.yml`) + smoke test | Automated |
| Register-write tests (pitch, ADSR, gate, filter, polyphony, unison) | Automated (`test/*`) |
| PCM golden compare vs native libresidfp for fixed traces | Not automated |
| Keyboard, multi-touch allocation, arpeggiators, latch, stop-all | Partially automated; device QA pending |
| iPad Safari unlock, lifecycle, worklet performance | Device QA (`docs/ipad-safari-qa.md`) |
| Explicit labeled fallback synth | **Intentionally not implemented** |
| GitHub Pages deployment vs CI | Separate manual verification |

Automated coverage mapping: `docs/ipad-safari-automation-map.md`.

## Related documents

- [README](../README.md) — user-facing audio path diagram
- [ROADMAP](../ROADMAP.md) — latency, multi-SID UI, MIDI, PWA
- [SID startup investigation](sid-startup-investigation.md)
- [Audio-clock LFO investigation](audio-clock-lfo-investigation.md)
