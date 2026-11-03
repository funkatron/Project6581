# Live SID engine integration

## Goal
Route the touch keyboard, arpeggiator, and all voice/filter controls through a cycle-clocked reSIDfp 6581/8580 instance. SID-file playback is not the instrument's primary function.

## Required engine boundary
A purpose-built WebAssembly wrapper around libresidfp must expose:
- `create(model, sampleRate, clockRate)`, `destroy()`, `reset()`
- `write(register, value, cycleOffset)` for all 0x00–0x18 SID registers
- `render(frameCount)` to clock the chip and return PCM
- `setModel(6581|8580)`, filter model configuration

**Do not use the existing libsidplayfp-wasm SidAudioEngine for live notes:** it wraps a C64 tune player, not an interactive register-writing SID chip.

## Real-time scheduling
- Run rendering in an AudioWorklet on iPad Safari, using locally hosted WASM (no CDN at playback time).
- Send note and parameter changes over the AudioWorklet message port with timestamps or sample offsets.
- Keep rendering free of allocations and async work; avoid ScriptProcessorNode.
- Maintain three independent SID voice slots, not three voices per pressed key.
- SID clock: PAL 985248 Hz by default; derive oscillator frequency register as round(frequency * 2^24 / clock).
- Translate ADSR into SID 4-bit rate/sustain fields using the actual SID tables; avoid treating it as arbitrary seconds.
- Pulse width is a 12-bit register, not a generic oscillator duty-cycle curve.
- Implement ring modulation, sync, test bit, gate retrigger, and shared filter routing.

## Verification checklist
- [ ] Confirm a build of libresidfp compiled to WebAssembly and check GPL-2.0-or-later obligations.
- [ ] Automated register-write tests for pitch, ADSR, gate, pulse width, filter and model selection.
- [ ] Compare PCM against native libresidfp for fixed register traces.
- [ ] Test keyboard, multi-touch note allocation, arpeggiator, latch, and stop-all.
- [ ] Test iPad Safari audio unlock, background/foreground lifecycle, and worklet performance.
- [ ] Preserve current Web Audio engine as an explicitly labeled fallback until native parity passes.
- [ ] Verify Pages deployment separately from GitHub commit/CI status.

## Current state
Web Audio prototype only. The live reSIDfp WASM wrapper and its integration are **not yet implemented**.
