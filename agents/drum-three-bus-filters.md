# Three drum bus filters (SID 4)

**Status:** Shipped on PR #185 branch.

## Model

- **Hardware truth:** One MOS 6581 filter and one stereo pan per chip.
- **Drum chips:** SID 4 kick (`engines[3]`), SID 5 snare (`engines[4]`), SID 6 cymbals (`engines[5]`, CH/OH share that chip).
- **Playback:** `triggerDrumLane` writes that chip’s filter and gates voice 0 on that chip only.
- **UI:** Kick / Snare / Hat tabs each mount that chip’s engine card. Pan on one tab does not move the others.

## Defaults (owner audition, 2026-11-24)

| Bus | Chip | Volume | Cutoff | Res | Mode | Lanes (level · pitch · voice) |
| --- | --- | --- | --- | --- | --- | --- |
| Kick | SID 4 | 100% | 2583 Hz | 100% | LP | Kick 100 · +48 st · decay 0, sustain 0, pitch env off |
| Snare | SID 5 | 73% | 1273 Hz | 93% | BP | Sn 70 · +48 st · decay 0.16 s, sustain 0, pitch env off |
| Hat | SID 6 | 100% | 5958 Hz | 23% | HP | CH 20 · +36 st · decay 0.07 s; OH 20 · +36 st |

All three drum chips default to the **8580** (`DRUM_CHIP_MODEL`), whatever model the melodic chips use. Each has its own **boost** (default +24 dB) and **pan** (default centre). Saved kits without hat pitch offsets still load at +48 st.

## Not in scope

- Using melodic SID 1–3 as drum chips.
- Playing closed hat and open hat at the same time (they share SID 6).