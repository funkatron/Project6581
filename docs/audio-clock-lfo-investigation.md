# Audio-clock LFO scheduling: investigation notes

Status: **architecture inspection complete; device measurements and prototype pending.** This is not a claim of improved sound or timing.

## Current path

1. Main-thread `setInterval(updateModulation, 1000/60)` drives LFO sampling.
2. `performance.now()` supplies elapsed time; each LFO's continuous waveform is evaluated at that timestamp.
3. Changing a slider or rate sends SID register writes, batched into one worklet message per JavaScript turn.
4. The reSIDfp `AudioWorkletProcessor` applies queued writes at the beginning of each 128-frame render block. At 48 kHz each block is approximately 2.67 ms.

**Risks:** Browser timer jitter and background throttling can cause uneven parameter changes. The fastest 1/32 synced rate at 120 BPM is 16 Hz, giving only about 3.75 main-thread updates per cycle. At 240 BPM it is 32 Hz, exceeding the 30 Hz Nyquist frequency of nominal 60 Hz updates. Multiple SID chips multiply register writes.

## Bounded experiment

- **Baseline:** Instrument callback intervals (median, p95, p99 and missed 16.67 ms intervals), worklet message batches, and CPU overhead. Repeat with LFO 1–3 and with foreground, UI load and Safari background/foreground transitions.
- **Prototype:** Calculate phase from `currentFrame / sampleRate` in the existing AudioWorklet; apply register changes at a bounded sub-block or block cadence, with parameters and tempo updated via messages. Keep the existing reSIDfp WASM unchanged during the experiment.
- **Compare:** Clock consistency, audible stepping/zipper noise, message volume, audio glitch/dropout rate, and CPU usage at 1, 2, 3 SID chips on iPad Safari and desktop.
- **Behavior:** Explicitly test phase continuity when tempo/rate changes, reset, sample-and-hold boundaries, simultaneous targets, and pause/resume. The current `time * rate` calculation can jump phase on a tempo change, so the prototype should use accumulated phase increments instead.
- **Decision:** Retain the main-thread 60 Hz fallback until a measured improvement exists and no new glitches, stuck notes, or material battery/CPU costs appear.

## Constraints

Do not relocate synthesis or change chip authenticity. The main thread should continue to own UI inputs; an audio-clock scheduler should only own timing and resolved modulation. Keep combined and per-SID control routing explicit for future independent chip configuration. New audio scheduling, if justified, deserves a **separate PR** with measurements.

Related: [iPad Safari release verification](ipad-safari-qa.md) and [roadmap](../ROADMAP.md).
