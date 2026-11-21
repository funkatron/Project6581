# Slider layout patterns (horizontal, vertical, pop-up)

Owner guidance (2026-11-20): consider **vertical faders** or **pop-ups with vertical faders** in parts of the UI where precision and touch target matter; **not every surface should use them**.

Pair with [ui-stable-layout.md](./ui-stable-layout.md): opening a pop-over must not permanently resize sibling controls; reserve lane-head width or use overlay/focus trap.

---

## Decision guide

| Context | Prefer | Why |
| --- | --- | --- |
| **Fixed-height grid row** (drum lane × step matrix) | **Horizontal** inline fader + numeric readout | Row height is tied to step cells (~38px+); vertical faders need headroom and widen the lane column. DAW analogy: session clip row / compact mixer strip. |
| **Tall column per step** (melodic step sequencer) | **Vertical** range in the column | One control per step; height is the primary axis (Game Arp note sliders). |
| **Param cards** (SID engine, drum bus ADSR, LFO) | **Horizontal** `slider-stack` in `param-row` grid | Matches existing label · track · value columns; consistent with SYNTH / LFO tabs. |
| **Dense toolbar** (master BPM chip, transport) | **Short horizontal** or discrete steps | Space is width-constrained, not height-constrained. |
| **Fine adjustment / iPad thumb** when inline control is cramped | **Pop-up / sheet** with **vertical** fader | Live/Logic-style: tap level → modal or anchored popover with full-height fader; dismiss on release or OK. Does not reflow the grid if overlaid. |
| **Many lanes, one dimension** (future multi-bus EQ) | **Vertical strips in a dedicated mixer panel**, not in the step grid | Keep rhythm editing (grid) separate from mix editing (panel or tab). |

**Rule of thumb:** if the control shares a **horizontal lane** with a matrix of cells, default to **horizontal** unless a pop-up is explicitly requested. If the control owns a **vertical column** or a **card with vertical space**, vertical is appropriate.

---

## In-repo reference implementations

| Surface | Pattern | Files |
| --- | --- | --- |
| Game Arp pitch | Vertical per-step slider (`writing-mode`, tall column) | `seq-ui.css` (`.seq-note`), game step grid |
| SID / drum bus params | Horizontal `slider-stack` + `param-track` | `studio-core.css`, `sid-engine-panels-ui.js`, `drum-slot-voice-ui.js` |
| DRUM SEQ lane level | Voice rail + **horizontal** fader + readout in **38px** lane head | `drum-panel-ui.js`, `seq-ui.css` (`.drum-lane-mixer`) |
| Master BPM | Compact horizontal range in chip | `studio-core.css` (`.master-tempo`) |

---

## DRUM SEQ lane level (why not vertical here)

- Four lanes × 16 steps: lane head must stay **one row tall** with step cells for spatial memory ([ui-stable-layout.md](./ui-stable-layout.md)).
- Level is **per-lane**, not per-step; a vertical fader in the head would either break row alignment or require a much wider lane column.
- **Optional v1.1:** long-press lane head or tap readout → **popover** with vertical fader (0–100) for users who want a taller touch target — overlay only, no grid reflow.

---

## Agents: before adding or moving sliders

1. Classify the surface (grid row, step column, param card, toolbar).
2. Check row/column **min-height/width** in CSS before introducing vertical controls.
3. If vertical is needed in a tight grid, use a **pop-up** rather than stretching the row.
4. Reuse **`slider-stack`** for horizontal tracks; reuse **help + long-press** patterns if the pop-up needs discoverability.
5. Update this doc or the relevant roadmap slice when a new pattern ships (e.g. first vertical pop-up fader).