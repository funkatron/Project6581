# Owner backlog — FX, drum sequencer, drum boost (2026-11-17)

Captured from owner; tracked in [ROADMAP.md](../ROADMAP.md).

| Item | Summary |
| --- | --- |
| **FX section** | Compressor, distortion, delay, phaser on master/post-SID bus |
| **Drum sequencer** | Grid sequencer for drum hits; not a duplicate of Game Arp melody steps |
| **Drum level boost** | SID 4 post-mix **0 / +6 / +12 dB** (`outputBoostDb`); see drum sequencer plan §6e |
| **+18 dB boost** | Fourth step on SID 4 Boost; clip policy on iPad (ROADMAP drum mix follow-ups) |
| **Snare/clap resonance** | Factory + kit tuning; not a global fudge |
| **Multi-SID drum rack** | Spike: optional SID 5–6 for percussion groups — [drum-architecture-research.md](drum-architecture-research.md) |

No implementation order set; ship in separate PRs after active roadmap steps. Preserve reSIDfp note path; avoid WASM rebuild for FX-only work unless measurement demands it.