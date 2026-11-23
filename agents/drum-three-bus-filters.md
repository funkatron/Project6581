# Three drum bus filters (SID 4)

**Status:** Shipped on PR #185 branch.

## Model

- **Hardware truth:** One MOS 6581 filter and one stereo pan per chip.
- **Drum chips:** SID 4 kick (`engines[3]`), SID 5 snare (`engines[4]`), SID 6 cymbals (`engines[5]`, CH/OH share that chip).
- **Playback:** `triggerDrumLane` writes that chip’s filter and gates voice 0 on that chip only.
- **UI:** Kick / Snare / Hat tabs each mount that chip’s engine card. Pan on one tab does not move the others.

## Defaults (owner audition)

| Bus | Cutoff | Res | Mode | Notes |
| --- | --- | --- | --- | --- |
| Kick | 2138 Hz | 11% | LP | Low Thud Kick ADSR |
| Snare | 4200 Hz | 14% | BP | Starting point |
| Hat | 1894 Hz | 0% | HP | CH pitch +48 st |

Each drum chip has its own **boost** (default +24 dB) and **pan**.

## Not in scope

- Using melodic SID 1–3 as drum chips.
- Playing closed hat and open hat at the same time (they share SID 6).