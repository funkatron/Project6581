# Programmable pitch envelopes

## Purpose

Per-note **frequency sweeps** after note-on (kick drops, tom falls, laser zaps) require changing SID oscillator frequency registers over milliseconds. Static notes and Game Arp step offsets alone cannot reproduce smooth sub-beat pitch trajectories.

## Architecture

```text
Note on (main thread)
  → UnisonSidController.trigger → onPitchStart(slot, note, envelope)
  → create-residfp-audio.startPitchEnvelope → worklet pitch-envelope-start
  → residfp-worklet process(): elapsed ms from currentFrame, write freq lo/hi
Note off / panic → onPitchStop → pitch-envelope-stop
Legato retune → onPitchRetune → pitch-envelope-retune (same audio-frame phase)
```

| Module | Responsibility |
| --- | --- |
| `src/pitch-envelope.js` | Validate envelope shape; `pitchOffsetAt` interpolation (linear / smoothstep curve) |
| `src/pitch-envelope-frames.js` | Frame-clock helpers for tests (`sidFrequencyAtFrame`) |
| `src/residfp-worklet.js` | Audio-thread application; `reset` clears all envelopes |
| `src/unison-sid-controller.js` | Per-slot start/stop/retune hooks when `pitchEnvelope.enabled` |
| `src/pitch-audition-ui.js` | Temporary UI; **not** saved in preset v3 |

Semitone offset applies as `baseFrequency * 2^(offset/12)` before lo/hi register writes. Updates occur at most once per render quantum (~128 samples); document this when judging kick transients.

## User-visible status

- **Audition panel** (Sound tab): Enable sweep, start semitones (−24…+24), duration (10–1000 ms). Applies only to **newly played** notes; excluded from factory/user preset JSON per roadmap.
- **Factory drums** remain static-tone approximations until a follow-up preset PR after full editor + schema work.

## Preset / compatibility policy (planned)

- Disabled or absent `pitchEnvelope` must leave audio unchanged (today: audition defaults to `enabled: false`).
- Future schema bump will default imported v3 presets to envelope off with neutral points.
- No silent overwrite of factory drum IDs until iPad listening validation (see ROADMAP).

## Tests (automated)

- `test/pitch-envelope.test.js` — validation and interpolation geometry
- `test/pitch-envelope-frames.test.js` — frame clock and SID frequency quantization
- `test/pitch-envelope-worklet.test.js` — worklet protocol, stop, reset, retune, malformed points
- `test/pitch-envelope-controller.test.js` — unison slot start/stop, panic, detune retune

## Device verification (required before preset rollout)

- iPad Safari: fast downward sweep on low noise/pulse kick audition; Stop all mid-sweep; overlapping poly notes with different sweeps
- Recordings for before/after drum preset changes (separate PR)

Integration checklist: `agents/pitch-envelope-integration.md`.
