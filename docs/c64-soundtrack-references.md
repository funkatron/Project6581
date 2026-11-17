# C64 soundtrack references (Step D research log)

**Purpose:** Listening and patch-design **references only**. Project6581 factory presets are **original** designs; nothing here claims a note-for-note match or uses ripped game data.

**HVSC paths (PAL 6581 unless noted):**

| Game | HVSC file | Composer(s) | Default subtune | Clock |
| --- | --- | --- | --- | --- |
| [Turrican](https://www.lemon64.com/game/turrican) (1990) | `C64Music/MUSICIANS/V/Vaca_Ramiro/Turrican.sid` | Ramiro Vaca, Chris Hülsbeck, Stefan Hartwig | #1 | PAL |
| [Parallax](https://en.wikipedia.org/wiki/Parallax_(video_game)) (1986) | `C64Music/MUSICIANS/G/Galway_Martin/Parallax.sid` | Martin Galway | #1 (~11:23) | PAL |
| [Commando](https://en.wikipedia.org/wiki/Commando_(video_game)) (1985) | `C64Music/MUSICIANS/H/Hubbard_Rob/Commando.sid` | Rob Hubbard | #1 (~3:56) | PAL |

Metadata sources: [HVSC STIL via 6581.nl](https://6581.nl/), composer interviews quoted in STIL (Galway on Parallax scale; Hubbard on overnight Commando session).

---

## Turrican (`Turrican.sid`, 6 subtunes)

| # | STIL name / author | Length (approx.) | Suggested listen window | Audible traits (subjective) | Factory audition targets |
| --- | --- | --- | --- | --- | --- |
| 1 | Menu / Hartwig (architect intro) | 1:40 | 0:00–0:45 | Square pulse hooks, moderate tempo, game-ui feel | `bright-pulse-lead`, `arcade-lead` |
| 2 | Escape (Vince DiCola cover) | 3:33 | 0:30–1:15 | Wide melodic lead, driving pulse | `heroic-storm-layer` (`complex-layer-turrican`), `filtered-saw-lead` |
| **3** | **The Deep** (Chris Hülsbeck) | 1:39 | **0:00–1:39** | Heroic minor-key theme, stacked saw/pulse, filter motion, “run-and-gun” energy | `complex-layer-turrican`, `nasal-pwm-lead`, `filtered-saw-bass` |
| 4 | ShadowFire excerpt (Hendriks/Gray) | 0:51 | 0:10–0:40 | Tighter action motif | `octave-chase-lead`, Game Arp **adventure** |
| 5 | Turrican level 3-2 (Hülsbeck, Amiga ref) | 0:56 | full | Fast bass under melodic line | `octave-runner-bass`, `pwm-drive-bass` |
| 6 | Transformers fragment | 1:53 | optional | Not primary for bank | — |

**Register notes:** Full subtune emulation is out of scope. Use SID player or HVSC search for isolated voice study; log any observed PWM/filter sweeps in the iPad listening sheet.

---

## Parallax (`Parallax.sid`, 5 subtunes)

| # | Length (approx.) | Suggested listen window | Audible traits (Galway / STIL) | Factory audition targets |
| --- | --- | --- | --- | --- |
| **1** | **11:23** | **0:00–2:30** (intro); **8:00–9:30** (body) | Long “mega” intro; slow-building PWM pads; epic scale; Jarre-influenced spacious chords (composer note) | `slow-glass-pad`, `shimmer-pwm-keys`, `complex-layer-nexus`, `pulsing-pad` |
| 2 | 6:56 | 0:00–1:00 | Secondary in-game theme, more rhythmic | `organ-keys`, `chord-stab-keys` |
| 3–5 | &lt;2 min each | full | Short stingers / loaders | `chip-pluck-keys`, `bell-keys` |

**Design gap:** Slow filter and PWM evolution on iPad should be checked against `filter-motion` and LFO-cutoff presets; no pitch-sweep claim on drums.

---

## Commando (`Commando.sid`, 19 subtunes)

| # | STIL / role | Length (approx.) | Suggested listen window | Audible traits | Factory audition targets |
| --- | --- | --- | --- | --- | --- |
| **1** | Main BGM (arcade “Base” refs in STIL) | **3:56** | **0:00–0:40** (hook); **1:00–1:45** | Punchy square bass, fast melodic figures, tight noise/perc accents in mix | `tight-pulse-bass`, `complex-layer-commando`, `noise-snare`, `low-thud-kick` |
| 2 | Alt loop | 1:01 | 0:00–0:30 | Shorter action loop | `pwm-drive-bass`, Game Arp **action** |
| 3–19 | SFX / jingles | &lt;6 s each | per subtune | Short noise bursts, stab notes | `noise-clap`, `closed-noise-hat`, `open-noise-hat`, `low-tom` |

**Pitch envelope (2026-11-16 tuning):** `low-thud-kick` and `low-tom` use editor **kick** / **tom** templates; iPad listening still required before calling drums validated.

---

## How to use this log

1. Play HVSC subtunes in a reference SID player (or YouTube rip **for your ears only** — do not ship game audio).
2. On iPad or desktop Chromium, load the mapped factory preset and use the phrases in [factory-audition-matrix.js](../src/factory-audition-matrix.js) (`low` / `mid` / `high`).
3. Record **pass / adjust / gap** in [agents/roadmap-step-d-factory.md](../agents/roadmap-step-d-factory.md) owner table; update patch parameters only in a follow-up PR with before/after notes.

**Step D completion:** **Soundtrack-reference research** satisfied here. **Owner iPad listening (2026-11-16):** presets reported sounding fine ([ipad-safari-qa.md](ipad-safari-qa.md) factory listening section). Optional: per-preset matrix rows in [agents/roadmap-step-d-factory.md](../agents/roadmap-step-d-factory.md) for HVSC-close adjustments.