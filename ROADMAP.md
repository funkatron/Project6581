# Project6581 roadmap

## Priority: reduce keyboard-to-audio latency

**Goal:** Minimize the delay between touch/keyboard press and the first audible SID sample on iPad Safari and desktop browsers. Preserve authentic reSIDfp rendering, without falling back to prototype audio.

### Investigation

- [ ] Measure touch/pointer event to SID register dispatch, AudioWorklet receipt, and first nonzero PCM sample separately.
- [ ] Measure perceived and output latency on iPad Safari, including AudioContext `baseLatency` and `outputLatency` when available.
- [x] Inspect AudioWorklet messaging: each note currently emits multiple register writes. PR #14 batches writes into one message per JavaScript turn.
- [ ] Check buffering, SID envelope attack, and note retrigger behavior.
- [ ] Compare Game Arp's first note with direct keyboard playing and subsequent arp steps.

### Implementation and verification

- [ ] Eliminate avoidable main-thread delays and redundant note-off/note-on cycles. The write batching change is not yet latency-verified.
- [ ] Reduce or bound scheduling latency without introducing clicks, dropouts, or unstable timing.
- [ ] Add regression tests for note dispatch and Game Arp onset.
- [ ] Verify latency improvements with before/after measurements on iPad Safari and desktop.

**Completion condition:** Demonstrated lower median and tail key-to-sound latency under equivalent test conditions, with reliable SID-only audio and no regression in arpeggiator timing.

## Planned: three assignable LFOs

**Goal:** Add three independent low-frequency oscillators for modulation of synthesizer controls while preserving authentic SID audio generation.

- [ ] Provide **LFO 1**, **LFO 2**, and **LFO 3**, each with independent enable, rate, depth, and waveform controls.
- [ ] Offer selectable modulation waveforms: sine, triangle, sawtooth, square, and sample-and-hold/random. These are modulation shapes, not additional SID audio oscillator waveforms.
- [ ] Allow each LFO to target any applicable continuous slider parameter, including filter cutoff, resonance, volume, detune, ADSR, pulse width, PWM depth, and PWM rate.
- [ ] Permit multiple LFOs to target the same parameter with predictable summation, clamping, and clear display of the base value versus modulation.
- [ ] Ensure modulation updates do not permanently overwrite manually selected slider values.
- [ ] Respect waveform-dependent controls: pulse-related modulation should have no audible effect unless the Pulse waveform is active.
- [ ] Keep the interface usable on iPad, with compact routing controls and no unnecessary panel scrolling.
- [ ] Test LFO waveform shapes, timing, routing, combined modulation, and stop/reset behavior; evaluate AudioWorklet-rate scheduling where browser timers would introduce audible stepping.

**Completion condition:** Three LFOs can run simultaneously, independently modulate selected sliders, and stop cleanly without changing saved base control values or compromising SID playback.
