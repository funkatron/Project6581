# Pitch envelope integration plan

## Scope and timing

The existing `src/pitch-envelope.js` implements geometry only. Keep it independent of audio scheduling. Apply modulation in the audio worklet using the rendered sample-frame counter, not `setTimeout`, animation frames, or main-thread wall time. A note-on event establishes an envelope origin in audio frames; compute elapsed milliseconds from `(currentFrame - noteOnFrame) * 1000 / sampleRate`. For sample-accurate updates, compute the envelope value at each rendered frame, or use bounded register updates with a documented maximum timing error and audible tests.

**Status (2026-11-07):** Audio path, controller hooks, worklet protocol, and audition UI are implemented. Preset schema and factory drum refresh remain future PRs per ROADMAP.

## Voice ownership

Each sounding SID voice must retain its base note frequency, envelope start frame, active note identity, and current envelope definition. Convert semitone offset to frequency ratio `2 ** (offset / 12)` and apply it to the base note *before* SID frequency-register quantization. Clamp to representable SID frequency and document saturation. Never compound successive offsets on the previously modulated register value.

On retrigger, reset the origin to the new note-on frame. On note-off, retain the envelope phase while the voice releases unless the voice is actually retired. On Stop All, clear active envelope state and cancel pending updates, including arpeggiator events. Ensure stale note-offs cannot terminate newer retriggered notes.

## Polyphony and unison

Keep independent envelope origins for independently triggered notes. Unison voices should share a musical note's pitch-envelope phase but retain their own detune ratios; apply pitch envelope and detune relative to the same base note, without cross-voice state leakage. Document behavior when the SID engine has fewer physical oscillators than requested voices.

## Compatibility

Disabled envelopes must remain neutral and should not change the current audio path. Existing factory/user presets and imported presets without a pitch envelope must load unchanged. Introduce schema changes only with explicit defaulting, validation, and round-trip tests. No UI or percussion preset changes until the audio path is verified.

## Completion checks

- [x] Audio-thread scheduling uses sample frames and is independent of UI thread load.
- [x] Frequency conversion, SID register saturation, and sample-rate behavior are tested.
- [x] Retrigger, note-off, Stop All, and stale event ordering are tested (controller + worklet; Stop All via `panic()` → slot stops).
- [x] Unison detune and simultaneous notes remain independent (controller retune tests).
- [x] Existing presets and imported legacy presets remain compatible (no pitch field in v3; audition excluded).
- [ ] Browser listening checks include Safari/iPad, especially kick transients and Stop All.
- [ ] CI and Copilot review feedback are checked before marking ready.

See also `docs/pitch-envelope.md`.

No merge or deployment is implied by this plan.
