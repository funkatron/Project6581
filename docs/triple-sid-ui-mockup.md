# Triple SID UI mockup (design gate)

**Status:** Draft for review — **no engine implementation until this layout is approved.**

Annotations reference Commodore 64C enclosure styling already in [`src/studio-core.css`](../src/studio-core.css) and [`src/seq-ui.css`](../src/seq-ui.css).

## Sound tab — master + engines

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ SYNTH (tab)                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│ SOUND                                                                    │
│ Voice allocation (MASTER — unchanged semantics)                            │
│  Assign [Poly ▾]   Voices [6 ▾]   Unison [2 ▾]                           │
│  Detune [────────●────────] 12¢                                        │
│  Up to 3 notes · 6 oscillators  (Voices max **9** = 3 per SID chip)        │
├─────────────────────────────────────────────────────────────────────────┤
│ SID engines                                    [ + Add SID ] (max 3)      │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─ SID 1 ──────────────────────────────────────────────────────────────┐ │
│ │ ▓▓▓ Rainbow VU ▓▓▓   MOS [6581 ▾]   [× Remove] (if allowed)         │ │
│ │ Pan  L [──────●──] R    Vol [────●──]  Cutoff [──●────]  Res [─●──]   │ │
│ │ Filter [Low-pass ▾]                                                   │ │
│ │ ── Voice ──  On ☑  Wave [Pulse ▾]  ADSR / PWM (existing voice grid)  │ │
│ │ Pitch envelope (compact graph, same as today)                        │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─ SID 2 ── (visible when Voices≥4 or manually added) ────────────────┐ │
│ │ … same structure, independent values …                              │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ (SID 3 card when Voices≥7 or manually added; Voices **9** uses all HW)   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Rainbow meter:** vertical strip beside the title — fixed C64 stripe order (red → orange → yellow → green → cyan → blue → violet). Fill height tracks per-chip peak (0–100%). Meters stay visible when card body is collapsed on narrow screens.

**Pan:** bipolar **L ← ● → R** under each engine header (not stereo spread of one voice — **per-engine bus pan** before the master mix).

## ARP / SEQ tab — generator routing (new)

Placed above latch / Game Arp / Root Arp blocks so routing is set before enabling generators.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ ARP / SEQ (tab)                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ Note routing (MASTER)                                                    │
│  Keyboard      → [ SID 1 ▾ | SID 2 | SID 3 | All enabled | Layer* ]     │
│  Root Arp      → [ SID 1 ▾ | SID 2 | SID 3 | All enabled | Layer* ]     │
│  Game Arp      → [ SID 1 ▾ | SID 2 | SID 3 | All enabled | Layer* ]     │
│  * Layer = one note dispatched to each selected engine (default All)     │
├─────────────────────────────────────────────────────────────────────────┤
│ Latch …  Game Arp …  Root Arp …  (existing controls below)               │
└─────────────────────────────────────────────────────────────────────────┘
```

| Source | Default | Meaning |
|--------|---------|---------|
| Keyboard | All enabled | Physical keys play through each enabled engine (separate voices per engine budget). |
| Root Arp | All enabled | Root-arp pattern notes use same routing; `play(note,'arp')` tagged with engine set. |
| Game Arp | SID 1 | Game phrase on primary SID by default; user can move to 2/3 or All for thickness. |

**Ownership:** Each `play`/`stop` source becomes `engineMask + source` so panic, latch, and preset load clear the right stacks.

## LFOs tab — engine target + audio clock

LFO **rates** follow the **audio engine clock** (worklet), not the main-thread 60 Hz timer. Sliders still show base + effective values.

```text
 LFO 1   On ☑  …  Target [Cutoff ▾]  Engines [All ▾ | SID 1 | SID 2 | SID 3]
         (effective value updates from audio thread, throttled for display)
```

## Master output strip (footer or header adjunct)

Optional read-only **master peak** remains; per-engine peaks live on cards only.

## Viewport notes

| Viewport | Behavior |
|----------|----------|
| iPad portrait | Engine cards stack; meter + pan + model stay in header row; voice ADSR collapsible details. |
| iPad landscape | Up to 2 columns of engine cards if width ≥ 900px. |
| Desktop | Three columns only if ≥ 1200px; otherwise wrap like landscape. |

## Voice budget (plan decision)

- **Global max = 9** when all three engines are enabled (3×3 hardware voices), replacing the old **8** cap.
- **Dynamic cap:** `maxVoices = 3 × enabledEngineCount` — **1 engine → 3**, **2 → 6**, **3 → 9**. The Voices select only offers **1…maxVoices**; lowering engine count **clamps** Voices and Unison like today.
- **You cannot run Voices 7–8 with only two engines** (hardware stops at 6); **Voices 8 requires three engines** (uses chip 0–2 slots, not necessarily all 9).
- **Unison** max remains ≤ Voices.
- **Poly** max distinct notes = `floor(Voices ÷ Unison)`.
- **Preset v5:** `instrument.voiceCount` **1–9**; on load, clamp to current `maxVoices` if user disabled an engine.
- **Tests (PR 2):** cap per enabled count, clamp on remove engine, 9-voice poly with 3 engines.

## Approval checklist

- [ ] Panel visibility (auto floor + Add/remove) matches expectation
- [ ] Rainbow meter placement and stripe styling
- [ ] Per-engine pan control placement
- [ ] Separate Keyboard / Root Arp / Game Arp routing defaults
- [ ] Density acceptable on iPad portrait with 3 full engines
- [ ] Ready to implement PR sequence in parent plan