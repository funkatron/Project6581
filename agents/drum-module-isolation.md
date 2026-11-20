# Drum sequencer as an isolated module

## Problem

SID 4 (drum chip) still shares studio infrastructure with melodic SIDs 1–3: global LFO rows, audio-clock filter stomp, preset performance blobs, and modulation UI loops. That coupling caused real bugs (e.g. LFO Apply **All** affecting drum filter/envelope, engine-card highpass stomping kick lowpass in the worklet).

## Target mental model

Treat **Drum Seq** as a mini-app inside Project6581:

| Concern | Melodic SIDs 1–3 | Drum SID 4 |
| --- | --- | --- |
| LFO sources | LFO 1–3 (`engines`: `1`/`2`/`3` or `all`) | Drum LFO only (`engines`: `4`, `sound.drumLfo`) |
| Voice / pattern | Arp, keyboard, MIDI | 6×16 grid, voice policy, drum kit |
| Preset slice | `performance` voices + engines | `drumSequence`, `drumKit`, `drumEngine`, `drumLfo` |
| Automation | `studioTrace` keyboard/arp | `drum:*` sources + `?testHooks=1` grid API |

`lfosForEngine()` now treats `engines: 'all'` as melodic chips **only** (indexes 0–2). Chip 3 accepts only `engines: '4'`.

## Agent / CI interaction

1. Open `index.html?testHooks=1`, unlock audio (keyboard tap or `#sidUnlock`).
2. `globalThis.__project6581Test`:
   - `loadDrumSequence(seq)` / `getDrumSequence()` / `setDrumCell(lane, step, on, {audition})`
   - `drumPreview(true|false)`, `auditionDrumLane('kick')`, `capturePcmWav(ms)` → `{bytes, sampleRate}`
   - `exportStudioTrace()`, `listDrumNoteOns()`
3. Batch WAV: `npm run drum-audio:record` (Puppeteer + fixtures) or hooks `capturePcmWav` from an in-browser agent.

## Simplification backlog (needs approval before large refactors)

1. ~~**Stop running `updateModulation` filter paths for chip 3**~~ — filter stomp skipped for chip 3 in UI-clock path; see [drum-per-slot-voice.md](./drum-per-slot-voice.md). Envelope/pulse LFO on chip 3 may still need narrowing.
2. ~~**Worklet**: keep drum chip out of global audio-clock filter writes**~~ — shipped for chip 3 filter registers; drum-specific LFO in worklet still open.
3. **Optional split**: `src/drum-studio/` façade that owns sequence, kit, performance clock, and SID 4 I/O; `sid-studio.js` wires tabs only.
4. **Level / headroom**: revisit +18 dB drum gain and multi-voice policy against a dedicated drum bus meter (see roadmap).

## Regression checks

- `test/lfo-modulation.test.js` — Apply All does not reach chip 3.
- `test/studio-test-hooks.test.js` — grid programming API.
- `npm run drum-audio:record` — PCM fixtures unchanged timbre-wise after LFO isolation.
- iPad: single kick cell auditions with snare column empty; global LFO depth does not wobble drum volume/filter.