# Project6581 roadmap

## Delivery priorities: musical features first

Prioritize features that help people **make, retain, exchange, and perform music**. Keep regression tests proportionate to the feature being shipped; defer extended audio-clock research and large architecture changes unless an observed defect requires them. Work in small, separately reviewable PRs, inspect all Copilot review findings, and verify deployment independently.

**Near-term order:** **1. Factory/user presets and import/export** → **2. Composable Arpeggiator + Game Arp and Western scale lock** → **3. MIDI input/output** → **4. App-like installation and offline access**. WAV/M4A recording and the stationary LFO display are already under development in separate PRs. Independent SID-device support remains **UI-design-first** before modifying the engine.

## Priority 1: factory presets and user preset management

**Goal:** Open Project6581 and immediately select a useful sound, experiment with it, save custom sounds, and move them between devices. This is the highest-priority new feature.

- [x] Create a small **Factory Presets** browser (Bass, Lead, Pluck, Pad and FX) with six original settings. Display unsaved edits clearly.
- [x] Add a separate **My Presets** collection with **Save**, **Save As**, **Rename**, and **Delete**. Factory presets remain read-only.
- [x] Save and restore **all sound and performance settings**: SID model, waveform, ADSR, pulse/PWM, filter, level, unison/polyphony/detune, all three LFOs, master BPM, regular Arp and Game Arp settings. Presets never contain held notes or latches' active note contents, and loading never automatically plays a note.
- [ ] Make loading predictable while a note is sounding: stop/reinitialize only when required, leave no stuck notes, refresh every numeric display, and do not start autoplay unexpectedly.
- [x] Persist user presets locally in browser storage with error reporting. Presets are **not** synchronized across devices.
- [x] **Export** individual presets or a user bank as readable versioned JSON; **import** either with schema/range validation, actionable errors, and confirmation before replacing duplicate names.
- [x] Use a simple **version 2** preset format including Game Arp Pattern rate, with no migration for earlier files. Validate imported content before modifying storage.
- [x] Put preset actions at the top of the Sound tab, preserving keyboard access and avoiding an additional full-size editor.
- [ ] Complete iPad Safari device verification for choose factory → edit → save → reload → export → import → play, including loading a different SID chip model. Unit tests cover validation, persistence, and JSON roundtrips.

**Completion checks:** A new user can load a factory sound in one action. A returning user can save, retrieve, export, and import a custom sound without losing its important settings or needing a server account.

## Priority 2a: composable Arpeggiator and Game Arp

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

- [x] Support four modes: both off (direct notes), Game Arp only (pattern from held/latched root), Arpeggiator only (ordered notes), and both on (ordered roots driving Game Arp).
- [x] Give Arpeggiator responsibility for note ordering, latch and root, and Game Arp responsibility for interval patterns. Both can run together.
- [x] Add independent root-change and pattern-step rates sharing master/local BPM. Root changes preserve the ongoing Game Arp phase until its next pattern tick; selecting a new mode, style or rate restarts the phrase.
- [x] Trigger immediately on first key press, stop on final release when latch is off, and preserve clear-latch/stop behavior. Verify on iPad Safari before claiming device-level reliability.
- [x] Bound the final Game Arp note to MIDI 0–127 and illuminate that actual note. The future scale-lock policy must run after root transposition and pattern offsets.
- [x] Label each role and rate explicitly and avoid a redundant current-note readout above the keyboard. iPad layout verification remains pending.
- [ ] Finish CI and iPad Safari verification of all four modes, independent timing, transitions, latch/stop and keyboard highlights. Pure root/interval and source-wiring regression checks are included.

**Completion checks:** Both generators can run simultaneously; Arpeggiator changes the root of the ongoing Game Arp phrase, each feature retains a clear independent purpose, and no combination produces stuck notes or misleading highlights.

## Priority 2b: selectable Western scales and scale-constrained playback

**Goal:** Support conventional 12-tone equal-tempered Western musical scales on the keyboard and in all sounding notes, with predictable, opt-in pitch restrictions.

- [ ] Add a **Key** selector (all 12 pitch classes) and a **Scale** selector: Chromatic (default), Major, Natural Minor, Harmonic Minor, Melodic Minor, major-scale modes, Major/Minor Pentatonic, and Blues. Define interval sets explicitly and test their notes in every key.
- [ ] Show in-scale versus out-of-scale keys clearly on the touch keyboard, including black keys and octave changes, without removing note labels or reducing touch targets.
- [ ] Provide an explicit **Scale lock** mode. In Chromatic/off mode all notes remain available; when locked, ensure audible notes belong to the selected scale rather than just changing key colors. Decide and document whether off-scale input is ignored or quantized to the nearest scale tone, with deterministic tie-breaking.
- [ ] Apply the same policy at the final note-selection boundary for physical keyboard input, touch playing, polyphony, Game Arp, regular Arp, and latch/held-note behavior. Quantize any Game Arp pitch offsets after transposition so the sounding notes and highlighted keys agree.
- [ ] Preserve intended octaves and note-off ownership: when multiple pressed keys map to one pitch, releasing one must not silence the other or leave a stuck note.
- [ ] Test all root keys and scale interval sets, negative/positive transpositions, octave crossings, MIDI note boundaries, held/latch transitions, mode switching, and note-highlighting accuracy.
- [ ] Verify responsive and accessible presentation on iPad Safari, with no avoidable audio latency or extra WASM rebuild.

**Completion checks:** A user can select a conventional key/scale and enable scale lock; all keyboard and arpeggiator output then follows that scale, visibly and audibly. Chromatic/default behavior stays unchanged.

## Priority 3: MIDI input and output

**Goal:** Perform Project6581 from external MIDI controllers and optionally route its generated music into another instrument or DAW.

- [ ] Support **MIDI input** (device/channel choice, note-on/note-off, velocity where musically appropriate, sustain pedal CC64, panic/all-notes-off). Correctly handle disconnects and prevent stuck notes.
- [ ] Optionally map external MIDI CC messages to selected sliders and LFO destinations. Include **MIDI Learn** with visible mapping, conflict handling and saved mapping preferences.
- [ ] Support **MIDI output** of played keyboard notes and optionally post-arpeggiator generated notes. Make the distinction explicit; send corresponding note-off messages, including on Stop All and mode changes.
- [ ] Add separate input/output enable toggles, port selectors and a clear indication of device connection. Avoid MIDI feedback loops when the same instrument or virtual port is selected for both.
- [ ] Define MIDI timing/clock sync as a follow-on slice. Do not couple initial note input/output to a speculative AudioWorklet scheduling rewrite.
- [ ] Check platform support and permissions at runtime. Browser MIDI APIs, particularly on mobile Safari, cannot be assumed universally available; provide a clear unsupported state and evaluate a native-app path where needed.
- [ ] Test note ownership, velocity ranges, disconnection, channel filtering, MIDI output routing, arp/latch changes and Stop All. Validate at least one physical controller when possible.

**Completion checks:** Where supported, an external MIDI keyboard can play the SID synth reliably, and an enabled MIDI output sends deliberate notes with matching note-offs. Unsupported environments clearly explain limitations rather than showing inert controls.

## Priority 4: package Project6581 as an application

**Goal:** Make the synthesizer feel like an installable music application on iPad and desktop while retaining the browser version.

- [ ] Begin with a **Progressive Web App**: manifest, app icon, standalone/home-screen display, clear install guidance, responsive safe-area layout, and an update/version indicator.
- [ ] Cache the **app shell, JS, and reSIDfp WASM** for genuine offline use after first successful install. Keep cache invalidation and deployment updates predictable; never serve an incompatible cached JS/WASM pair.
- [ ] Ensure local user presets, imported banks, and saved recordings are easy to find, export and retain. Explain browser storage clearing and backup limitations.
- [ ] Review app-like interaction details: startup/loading feedback, keyboard always accessible, clear unsaved-preset state, consistent navigation, touch targets and transport controls.
- [ ] Evaluate **native wrappers** only where they deliver tangible benefits, especially reliable MIDI access on iPad, file import/export, audio sessions and background handling. Compare an iOS shell with desktop packaging before choosing a framework. Do not replace the existing lightweight web deployment by default.
- [ ] Test offline launch, version upgrades, WAV/M4A sharing, iPad Files import/export and recovery after a suspended/resumed app session.

**Completion checks:** Project6581 can be launched from a home screen or desktop as a focused standalone experience and used offline, while retaining consistent audio, user presets and the existing public web URL.

## In development: record the SID output (WAV and M4A)

**Goal:** Let musicians record what they actually hear from the emulated SID and export a useful audio file without a microphone or external software.

- [x] Add Record / Stop & save with a persistent downloadable file link.
- [x] Capture true reSIDfp PCM in bounded AudioWorklet chunks and encode 16-bit mono WAV using the actual AudioContext sample rate.
- [x] Offer M4A (native browser AAC in an MP4 container) only where supported; do not mislabel WebM or AAC as MP3.
- [x] Limit recording to three minutes and preserve playback and existing LFO/arp behavior.
- [ ] Confirm recording and downloading on iPad Safari, including alternate-app return, short captures, and memory use.
- [ ] Consider optional MP3 conversion only after core WAV/M4A operation is validated. Avoid a large encoder dependency for the initial recording feature.
- [ ] Export matched before/after PWM recordings and use their spectra and waveforms to diagnose [the reported weak PWM effect](https://github.com/funkatron/Project6581/issues/45).

**Completion checks:** A user can record and download a valid WAV, and an M4A where native browser support exists. CI success alone is not an iPad audio verification.

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

## Planned: voice allocation controls (design approval before implementation)

**Design proposal:** [Voice allocation layout](docs/voice-allocation-layout.md). Use the ARP 2600 app screenshot for functions only, retaining Project6581's existing Sound-tab design. **Spread is explicitly excluded**, at the user's request.

- [x] Plan a compact **Voice Assign** selector: **Mono, Legato, Duo, Poly**.
- [x] Define **Voices** (1–8 total hardware oscillators) separately from **Unison** (1–Voices stacked layers per note), with **Detune** in cents.
- [x] Specify a compact, wrapping inline group of **content-sized** Voice Assign, Voices and Unison selectors with **Detune on a full-width row**, retaining the current Sound tab, iPad/desktop keyboard visibility, and accessible touch targets.
- [x] Document the desired allocation, note ownership, clipping/voice limits, legato envelope behavior, and preset/LFO interactions without changing the audio engine.
- [ ] Obtain UI/interaction approval **before implementation**. No UI styling, voice allocator, native mixer, tests, or preset format changes in this design-only slice.
- [ ] Implement in a future bounded PR, preserving the current interface and checking Copilot reviews and actual iPad playback.

**Scope decision:** No stereo Spread, panning, or stereo output work for this milestone. The separate future **up-to-three-independent-SID-devices** UI milestone remains distinct.

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
