# Roadmap Step D — factory bank listening (2026-11-16)

**Goal:** Validate the **24 core** C64-inspired factory presets against documented HVSC references; adjust patches from evidence, not duplicate IDs.

## Automated (this PR)

- [x] [docs/c64-soundtrack-references.md](../docs/c64-soundtrack-references.md) — Turrican / Parallax / Commando subtunes, time windows, trait notes
- [x] [src/factory-audition-matrix.js](../src/factory-audition-matrix.js) + `test/factory-audition-matrix.test.js`
- [x] Full `node --test` on branch

## Owner listening sheet

For each preset in `FACTORY_AUDITION_PHRASES`, on **iPad Safari** (primary) or desktop Chromium:

| Preset ID | Reference tag | Low / mid / high tried | Level OK? | Distinct? | Notes |
| --- | --- | --- | --- | --- | --- |
| *(copy rows from matrix)* | | | | | |

File results in PR/issue; patch tweaks only after **adjust** notes. Mark ROADMAP Step D iPad row when [ipad-safari-qa.md](../docs/ipad-safari-qa.md) factory bullets are checked.

## Tuning log (agent, 2026-11-16)

| Preset | Reference | Change summary |
| --- | --- | --- |
| `low-thud-kick` | Commando | Kick pitch template; shorter decay; lower cutoff |
| `low-tom` | Commando | Tom pitch template; shorter decay |
| `noise-snare` | Commando | Tighter HP burst |
| `tight-pulse-bass` | Commando | Shorter square bass envelope |
| `filtered-saw-bass` | Turrican | Deeper resonant saw |
| `nasal-pwm-lead` | Turrican | Slightly brighter band-pass PWM |
| `slow-glass-pad` | Parallax | Slower attack/LFO PWM pad |
| `shimmer-pwm-keys` | Parallax | Slower PWM rate, more depth |

IDs unchanged; user saved copies unaffected.

## Desktop quick pass (optional)

Load presets from browser groups **Bass → Drums**; use phrases from `factory-audition-matrix.js`. Compare `low-thud-kick` / `low-tom` against Commando subtune #1 bass — note pitch-envelope gap in references doc.