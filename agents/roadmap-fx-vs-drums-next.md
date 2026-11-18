# FX bus vs drum sequencer — where to go next

Owner asked to **look at** one of these after scale lock, pitch-envelope drums, and UI epic follow-up.

## FX section (master post-SID bus)

| | |
| --- | --- |
| **User value** | Polish on pads/leads; glue and motion without more factory presets |
| **Technical home** | JS/worklet after reSIDfp mix (see `roadmap-owner-backlog-fx-drums.md`); **no WASM** for first slice |
| **First slice** | Toggle-able **master compress** + wet/dry meter; one knob “punch” |
| **Risk** | Latency/CPU in AudioWorklet; must not alter note-on register path |
| **iPad gate** | A/B on Galway epic pad + drum hits for level pumping |

## Drum sequencer

| | |
| --- | --- |
| **User value** | Rhythmic patterns distinct from **Game Arp** melody steps; fits C64 drum row metaphor |
| **Technical home** | New ARP-tab panel or sub-mode; triggers short drum presets / noise hits on a **grid clock** |
| **First slice** | 8-step row, one engine, maps to existing **Drums** category one-shots; no new synthesis |
| **Risk** | Voice budget vs layer stacks; must share panic/Stop All with keyboard + Game Arp |
| **iPad gate** | Portrait grid + latch; confirm no conflict with Root/Game composable modes |

## Recommendation for a spike PR

1. **Drum sequencer** if the goal is *new playing workflow* (composition).  
2. **FX bus** if the goal is *make current presets sit better* (especially drums + PWM).

Neither blocks the other; ship as separate `cursor/*-fa36` branches. Say which spike you want first and we open a design PR with HTML/CSS stub only.