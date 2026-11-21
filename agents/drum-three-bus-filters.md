# Three drum bus filters (SID 4)

**Status:** Shipped on PR #185 branch.

## Model

- **Hardware truth:** One MOS 6581 filter per chip. SID 4 remains the only drum chip.
- **Logical engines:** `sound.drumBuses[0..2]` — kick, snare, hat (CH/OH).
- **Playback:** `triggerDrumLane` calls `drumSlotFilterRegisters` with the lane’s bus filter and voice slot (`drum-voice-policy.js`).
- **UI:** Kick / Snare / Hat tabs select which bus the **SID 4** card edits.

## Defaults (owner audition)

| Bus | Cutoff | Res | Mode | Notes |
| --- | --- | --- | --- | --- |
| Kick | 2138 Hz | 11% | LP | Low Thud Kick ADSR |
| Snare | 4200 Hz | 14% | BP | Starting point |
| Hat | 1894 Hz | 0% | HP | CH pitch +48 st |

Chip-level **boost** (+24 dB) and **pan** stay on `engines[3]`.

## Not in scope

- Three physical SID chips for drums (would consume melodic engines 1–3).
- Simultaneous different filter states on overlapping voices (last note-on wins until next hit).