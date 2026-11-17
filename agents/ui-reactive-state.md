# Lightweight UI state pattern

Project6581 stays vanilla JS. When the same value appears in more than one place (Play panel, keyboard chrome, presets, worklet config), use a **small state slice** instead of duplicating DOM reads.

## Building blocks

1. **`ui-control.js`** (when merged) — `setControlChecked()` for programmatic toggle writes.
2. **Slice module** — in-memory truth, `set(patch)`, `subscribe(fn)`, sync to known control ids, `applyFromPreset` / snapshot helpers. Example: `performance-arp-state.js` (PR #134).
3. **Coordinator** — `sid-studio.js` (or a thin `studio-coordinator.js`) batches preset apply, panic, and audio pushes after slices update.
4. **Views** — call `slice.set()`; mirrors only `subscribe()` and repaint.

## Rules

- No raw `.checked =` / `.value =` on slice-bound controls outside the slice / `ui-control`.
- Serializable settings belong in slices; runtime audio (`arp.held`, voice owners) stays outside presets.
- Side effects can stay on DOM `change` handlers during migration; prefer one coordinator call after batch `applyFromPreset`.

## Domain map (rollout order)

| Domain | Slice candidate | Notes |
| --- | --- | --- |
| Performance arp/latch | `performance-arp-state` | Shipped in #134 |
| Routing | `performance-routing-state` | Preset + panic |
| Instrument | `instrument-state` | voiceCount, unison, assign, detune |
| Engines ×3 | `engines-state` | Already `engines[]`; formalize panel sync |
| LFOs | `lfo-state` | Today `lfoState[]` + `updateModulation`; UI loop separate |
| Game sequence | `game-sequence-state` | `seqState` |
| Editor chrome | low priority | tabs, keyboard octave |

## LFO presentation (not a slice bug)

LFO **settings** live in `lfoState`. **Presentation** (`presentModulatedSlider`, worklet `modulation-display`) must target engine panel markup (including `.param-row` filter sliders). Envelope/detune animation uses `syncModulationUiLoop()` with `updateModulation({ uiOnly: true })` so the worklet is not reconfigured every frame.

## When to add a slice

Two or more writers/readers, preset fields, or visible mirrors that desync. Single-control, single-listener cases can stay local.

Future candidates: routing selects, layer mutes, diagnostics toggles, per-engine enable matrix.
