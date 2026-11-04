# Project6581 roadmap

## Current regression hardening

- [x] Add register-level tests for independent note allocation across three SID chips, deterministic oldest-voice stealing, Unison transitions, and panic/release.
- [x] Correct whole-note synchronized LFO rate conversion; 4/1, 2/1, and 1/1 correspond to 16, 8, and 4 beats per cycle.
- [x] Improve iPad panel-width-responsive LFO controls and suppress duplicate key release after pointer capture ends.
- [x] Run CI on the regression PR: 35 tests passed, zero failures (2026-11-04).
- [ ] Complete real iPad Safari audio/layout verification using [the device checklist](docs/ipad-safari-qa.md); a code review alone cannot complete this step.
- [x] Confirm the GitHub Pages deployment of PRs #39 and #40 (commit `ec25e9c`, November 4, 2026).

The [audio-clock investigation](docs/audio-clock-lfo-investigation.md) identifies current scheduling risks and a bounded measurement/prototype plan. No replacement of the current LFO timer is authorized by regression tests alone. Spectrum analyzer, oscilloscope, spectrogram, and independently configurable SID chips remain separate roadmap items.

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

- [x] Provide **LFO 1**, **LFO 2**, and **LFO 3**, each with independent enable, rate, depth, and waveform controls (initial live filter/pulse routing; pending CI and device verification).
- [x] Implement and test the pure waveform evaluation and modulation-routing core (PR in progress; not connected to audio/UI).
- [ ] Offer selectable modulation waveforms: sine, triangle, sawtooth, square, and sample-and-hold/random. These are modulation shapes, not additional SID audio oscillator waveforms.
- [x] Route three LFOs to 11 continuous sound parameters: cutoff, resonance, volume, pulse width, Unison detune, ADSR, PWM depth and PWM rate. Implement live SID register updates and preserve the base values. Exclude discrete waveform, chip, Unison mode, and voice-count controls.
- [ ] Permit multiple LFOs to target the same parameter with predictable summation, clamping, and clear display of the base value versus modulation.
- [ ] Ensure modulation updates do not permanently overwrite manually selected slider values.
- [ ] Respect waveform-dependent controls: pulse-related modulation should have no audible effect unless the Pulse waveform is active.
- [ ] Keep the interface usable on iPad, with compact routing controls and no unnecessary panel scrolling.
- [ ] Complete final CI and iPad Safari validation of live ADSR/detune/PWM modulation, including simultaneous modulation, register-write frequency, voice releases, stop/reset and high-rate performance. Pure waveforms, timing and register-level paths have automated tests; evaluate AudioWorklet-rate scheduling where browser timers introduce audible stepping.

**Completion condition:** Three LFOs can run simultaneously, independently modulate selected sliders, and stop cleanly without changing saved base control values or compromising SID playback.

## Planned: composable Arpeggiator and Game Arp

**Goal:** Make Game Arp a reusable pattern triggered at a root pitch, while the regular Arpeggiator independently selects and advances that root. The two features should work together rather than being mutually exclusive.

**Signal flow:**

```text
Held / latched keyboard notes
           |
           v
Arpeggiator (optional)  -> chooses the current root note
           |
           v
Game Arp (optional)     -> applies pattern intervals to that root
           |
           v
SID playback + highlighted keyboard keys
```

- [ ] Define each mode explicitly: **both off** plays direct notes; **Game Arp only** plays the selected pattern from the held/latched root; **Arpeggiator only** cycles the held/latched notes directly; **both on** cycles roots using the Arpeggiator while Game Arp plays its chosen interval pattern relative to each root.
- [ ] Give **Arpeggiator** responsibility for note ordering (Up, Down, Up/Down, Random), latch, and the active root. Give **Game Arp** responsibility for the triggered pattern (Action, Adventure, Arcade, etc.) and its internal note offsets. Neither should silently turn the other off.
- [ ] Keep a clear musical distinction between **root-change rate** and **pattern-step rate**, with coherent BPM synchronization. Define whether a root change preserves the current pattern phase or restarts the pattern; prefer predictable musical timing and verify it for both fast and slow rates.
- [ ] Make first key press trigger the pattern immediately, without waiting for a timer tick. Handle additional held notes, releases, latch transitions and switching either feature on/off without stuck notes or duplicate gate writes.
- [ ] Apply existing MIDI range limits and any future scale-lock policy to the **final sounding pitch**, not merely the root, so combined arpeggiation, playback and keyboard illumination agree.
- [ ] Simplify labels and help text so users can understand **“Arpeggiator chooses the root; Game Arp plays the pattern.”** Ensure the controls remain usable on iPad and avoid redundant current-note text above the keyboard.
- [ ] Add deterministic tests of the four mode combinations, independent timing, pattern transitions, changing root while playing, stop/panic, note ownership, and keyboard highlighting.

**Completion checks:** Both generators can run simultaneously; Arpeggiator changes the root of the ongoing Game Arp phrase, each feature retains a clear independent purpose, and no combination produces stuck notes or misleading highlights.

## Planned: modulation-center slider presentation

**Goal:** Make modulation immediately readable without moving control thumbs during playback.

- [ ] Always show each continuous control's current numeric value and unit (e.g. Hz, %, seconds, cents), whether or not an LFO is assigned.
- [ ] Treat the physical slider thumb as the **base/center value** that the user edits. LFOs add modulation around that center without shifting the thumb, changing the saved base value, or hijacking pointer input.
- [ ] Show the instantaneous modulated value through the **colored track fill beneath the stationary thumb**, keeping the base position identifiable. Ensure bipolar movement is understandable above and below the center, including clipping at slider bounds.
- [ ] Preserve an accessible numeric readout of the effective value while retaining the editable center value; choose concise labels so both are understandable without crowded panels.
- [ ] Update appearance as the user changes the center or an LFO's depth/rate/target, and return to the center and ordinary track when modulation is disabled or reassigned.
- [ ] Test simultaneous LFO summation, min/max saturation, changes to base values during modulation, keyboard accessibility, iPad Safari touch controls, and rendering overhead at the current modulation update cadence.
- [ ] Do not use a second moving slider thumb or create additional SID register writes merely to render the effect.

**Completion checks:** The thumb remains fixed at the user-selected modulation center, a colored track visualizes the current modulation, and numeric values remain readable. Touch/keyboard edits and authentic SID playback behave as before.

## Planned: selectable Western scales and scale-constrained playback

**Goal:** Support conventional 12-tone equal-tempered Western musical scales on the keyboard and in all sounding notes, with predictable, opt-in pitch restrictions.

- [ ] Add a **Key** selector (all 12 pitch classes) and a **Scale** selector: Chromatic (default), Major, Natural Minor, Harmonic Minor, Melodic Minor, major-scale modes, Major/Minor Pentatonic, and Blues. Define interval sets explicitly and test their notes in every key.
- [ ] Show in-scale versus out-of-scale keys clearly on the touch keyboard, including black keys and octave changes, without removing note labels or reducing touch targets.
- [ ] Provide an explicit **Scale lock** mode. In Chromatic/off mode all notes remain available; when locked, ensure audible notes belong to the selected scale rather than just changing key colors. Decide and document whether off-scale input is ignored or quantized to the nearest scale tone, with deterministic tie-breaking.
- [ ] Apply the same policy at the final note-selection boundary for physical keyboard input, touch playing, polyphony, Game Arp, regular Arp, and latch/held-note behavior. Quantize any Game Arp pitch offsets after transposition so the sounding notes and highlighted keys agree.
- [ ] Preserve intended octaves and note-off ownership: when multiple pressed keys map to one pitch, releasing one must not silence the other or leave a stuck note.
- [ ] Test all root keys and scale interval sets, negative/positive transpositions, octave crossings, MIDI note boundaries, held/latch transitions, mode switching, and note-highlighting accuracy.
- [ ] Verify responsive and accessible presentation on iPad Safari, with no avoidable audio latency or extra WASM rebuild.

**Completion checks:** A user can select a conventional key/scale and enable scale lock; all keyboard and arpeggiator output then follows that scale, visibly and audibly. Chromatic/default behavior stays unchanged.

## Planned investigation: audio-clock LFO scheduling

**Goal:** Replace main-thread timer-driven SID modulation with timing derived from the audio engine, without increasing audible latency or undermining future multi-SID operation.

- [ ] Measure actual LFO callback jitter, missed updates, and parameter stepping at 60 Hz on iPad Safari and desktop, including under UI load and background/foreground transitions.
- [ ] Inspect AudioWorklet-to-reSIDfp register scheduling and identify the smallest viable audio-thread modulation prototype.
- [ ] Compare CPU load, timing accuracy, audible artifacts, and message overhead for main-thread timers versus audio-clock scheduling across 1–3 SID chips.
- [ ] Define how BPM synchronization, phase continuity, sample-and-hold, multiple modulation targets, and stop/reset work across the thread boundary.
- [ ] Add deterministic timing tests and device-level audio checks before replacing the current 60 Hz fallback.

**Completion checks:** Documented measurements and a bounded implementation plan; no architectural migration until benefits and multi-SID implications are understood.

## Planned: audio visualization instruments

**Goal:** Provide optional, low-overhead visual feedback for authentic SID output, using a recessed hardware-instrument display consistent with the Commodore 64C-inspired interface.

- [ ] Prototype a real-time spectrum analyzer using Web Audio `AnalyserNode` on the existing SID audio output; display frequency versus magnitude, with readable frequency markers and sensible dB scaling.
- [ ] Evaluate a time-domain oscilloscope for examining SID waveforms, pulse-width changes, and envelopes.
- [ ] Explore a scrolling spectrogram for viewing harmonics, filter sweeps, and LFO modulation over time.
- [ ] Keep visualization optional and pause rendering when hidden, backgrounded, or disabled; avoid adding audio latency or disturbing playback.
- [ ] Measure rendering overhead on iPad Safari and desktop, including multi-SID configurations; choose FFT size, refresh rate, and display resolution based on evidence.
- [ ] Consider whether combined output and per-SID views are useful once independent SID chips are supported.
- [ ] Ensure the display is responsive, accessible, and styled as a recessed instrument panel without consuming essential control space.

**Completion checks:** Spectrum visualization accurately follows SID audio, can be disabled without affecting synthesis, and meets device-level performance and usability checks. Oscilloscope and spectrogram are follow-on options, not prerequisites.
