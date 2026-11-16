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
| `src/pitch-envelope-editor.js` | Graph + breakpoint editing UI |
| `src/pitch-audition-ui.js` | Legacy/simple audition helpers (being modularized) |

Semitone offset applies as `baseFrequency * 2^(offset/12)` before lo/hi register writes. Updates occur at most once per render quantum (~128 samples); document this when judging kick transients.

## User-visible status

- **Per-engine editor** on each SID card: enable sweep, breakpoints (time ms / semitones), interpolation. Applies to **newly triggered** notes on that engine.
- Settings persist in **preset format v5** under each engine's `voice.pitchEnvelope`. Factory sounds default to **disabled** unless designed otherwise.
- **Factory drums** in the core bank remain static-tone approximations until a follow-up preset PR after iPad listening (see ROADMAP).

## Preset / compatibility policy

- Disabled envelopes leave audio unchanged (`DEFAULT_PITCH_ENVELOPE`).
- Import **v3/v4**: migrate to v5 with `pitchEnvelope` off on every engine.
- Import **v5**: full round-trip including routing and three engines.
- Preset schema version is independent of app semver ([versioning.md](versioning.md)).

## Tests (automated)

- `test/pitch-envelope.test.js` — validation and interpolation geometry
- `test/pitch-envelope-frames.test.js` — frame clock and SID frequency quantization
- `test/pitch-envelope-worklet.test.js` — worklet protocol, stop, reset, retune, malformed points
- `test/pitch-envelope-controller.test.js` — unison slot start/stop, panic, detune retune
- `test/preset-library.test.js` — v3/v4/v5 import and export

## Device verification (required before factory drum rollout)

- iPad Safari: fast downward sweep on low pulse/noise kick; Stop all mid-sweep; overlapping poly notes with different sweeps
- Recordings for before/after drum preset changes (separate PR)

Integration checklist: `agents/pitch-envelope-integration.md`.