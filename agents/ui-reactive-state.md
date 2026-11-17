# Lightweight UI state pattern

Project6581 stays vanilla JS. When the same boolean or enum appears in more than one place (Play panel, keyboard chrome, presets), use a **small state slice** instead of duplicating DOM reads.

## Building blocks

1. **`src/ui-control.js`** — `setControlChecked(input, checked, { emitChange })` for any programmatic toggle write.
2. **Slice module** (example: `performance-arp-state.js`) — in-memory truth, `set(patch)`, `subscribe(fn)`, sync to known control ids, `applyFromPreset` / snapshot helpers as needed.
3. **Views** — mirror controls call `set()`; decorative UI (keyboard LEDs) only `subscribe()` and repaint.

## Rules

- Do **not** assign `.checked =` on bound controls outside `ui-control.js` / the slice’s `syncDom`.
- Side effects (restart arp clocks, preset dirty, etc.) stay on existing `change` handlers until a slice owns that effect graph.
- Add a focused test file per slice; grep tests can guard against raw `.checked =` on slice ids.

## When to add a slice

- Two or more UI surfaces show the same flag, or preset/panic/transport paths can desync mirrors.
- Not required for one-off checkboxes with a single listener.

Future candidates: routing selects, layer mutes, diagnostics toggles, engine enable matrix.