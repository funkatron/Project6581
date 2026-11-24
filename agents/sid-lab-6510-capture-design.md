# 6510 playback engine: register-write capture design

## Decision

Prototype with `libsidplayfp-wasm`, retaining Project6581's existing `reSIDfp` renderer as a separate audio backend. Do not poll `getSidStatus()` for extraction: it is a snapshot, and multiple writes within a playback interval can be lost.

## Current proof of concept

- `scripts/sid-lab-playback-probe.mjs`: loads a tune, chooses a subtune, renders PCM, reports peak and final register snapshots, disposes engine.
- `test/fixtures/sid-lab-tone.js`: original, generated PSID v2 program that writes volume, frequency, ADSR and gate to SID voice 1.
- `test/sid-instrument-lab-real-playback.test.js`: parses the fixture and optionally executes the actual WASM package. **The real playback test skips unless the package is installed.** No copyrighted ROM or tune is checked in.

To exercise locally without changing repository dependencies:

```sh
npm install --no-save --package-lock=false libsidplayfp-wasm
node --test test/sid-instrument-lab-real-playback.test.js
node scripts/sid-lab-playback-probe.mjs /path/to/Commando.sid --seconds 2
```

## Native instrumentation required

The capture hook belongs at the point where the 6510 emulator writes SID registers, before register writes are coalesced, and ideally before they are consumed by the sound-chip implementation.

Emit an event for **every** write:

```json
{"cycle":12345,"chip":0,"register":4,"value":33}
```

Requirements:

1. Capture monotonically ordered C64-cycle timestamps, including multiple writes at the same cycle if possible. Record the emulated clock model and clock frequency.
2. Map primary and additional SID addresses to chip indices, preserving per-chip writes. Capture writes to volume/filter registers, including digi activity.
3. Record the tune's initialization writes, then subsequent play routine / interrupt writes. Avoid silently dropping writes during fast playback.
4. Enforce explicit max cycles, max events, max wall-clock time, cancellation, and bounded memory **inside the execution environment**, not only after collecting a result.
5. Emit a versioned trace with subtune, SID model, PAL/NTSC, clock rate, and any ROM dependency. Keep PCM rendering separate from tracing.
6. Include a small deterministic native test: the original fixture should yield writes to `0xd418`, `0xd400`, `0xd401`, `0xd405`, `0xd406`, `0xd404`, in that order. Then verify a real HVSC tune with user-supplied assets.

## Important fidelity gap

The existing Project6581 bridge calls `sid_render(frames)`, not a cycle-clock API. Its offline trace renderer rounds event cycles to output frames. Thus even exact capture will be **sample-quantized** on replay; waveform/ADSR/filter differences can remain. Compare against libsidplayfp's own PCM, but do not assert bit-exactness until the renderer supports sub-frame write timing and matching machine clock, filter configuration and chip models.

## Licensing and distribution

Both projects use GPL-2.0-or-later. Verify complete corresponding source and notices for distributed WASM. Do not commit copyrighted SID tunes or C64 ROMs. RSID and interrupt-driven tunes may require separately supplied ROMs.

## Next milestone

Implement a forked native trace hook in libsidplayfp or its WASM bridge, with deterministic fixture trace assertions. Only after this works should the trace backend be connected to `captureSidRegisters` and browser workers.
