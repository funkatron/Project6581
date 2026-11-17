# Stable layout (owner priority)

Project6581 is a **tool**, not a flowing document. Users build muscle memory; **showing or hiding a control must not move neighbors**.

## Rules for agents

1. **Do not use `display: none`, the `hidden` attribute, or `label[hidden]`** to toggle controls that share a panel with other instruments the user keeps reaching for — unless the entire region is optional chrome (dialogs, tab panels, export links).
2. **Prefer `layout-inert`** (`src/ui-layout.js`): the element **keeps its box** in the grid/flex; it becomes non-interactive (`inert`, `aria-hidden`, `visibility: hidden` or dimmed via `.layout-inert--dim`).
3. **Tab panels** may still use `hidden` — only one major workspace is visible; that is navigation, not conditional instrument rows.
4. **Decorative-only** overlays (modulation band, modulated readout line, spinners) may use `hidden` when they do not affect row geometry.
5. When adding new conditional rows (waveform-gated PWM, sync-gated arp BPM, envelope editors), **reserve the row** in markup/CSS up front; toggle inert state instead of mounting/unmounting.

## Current adoption

| Area | Pattern |
| --- | --- |
| SID pulse/PWM rows | `layout-inert` on `param-row` when wave ≠ square |
| Arp local BPM | `layout-inert` on `.arp-local-bpm` when arp sync on |
| LFO sync → rate UI | full `renderLfos()` rebuild (exception; LFO tab-only) |

Future: pitch-envelope custom panel, seq steps, preset export — audit when touched.