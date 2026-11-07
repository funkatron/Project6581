# Interface refinement implementation plan

Branch: `feature/ui-control-alignment-lfo-tab`

## Scope
- Move the existing three LFO editors from Sound to a dedicated LFOs tab. Reuse the same DOM controls and event handlers rather than duplicating state.
- Normalize comparable control widths and label/value alignment with shared CSS layout rules; retain intentionally full-width sliders.
- Keep the keyboard visible and usable at the bottom on every tab, including portrait iPad.
- Do not change SID synthesis, audio timing, preset schema, or factory sounds.

## Implementation sequence
1. Inspect current tab navigation, LFO editor container, and responsive CSS. Identify the least disruptive DOM relocation and current tab activation semantics.
2. Add the LFOs tab to existing tab navigation, relocate the existing LFO container, and ensure hidden-tab switching does not rebuild controls or restart audio.
3. Introduce shared spacing, control track sizing, and wrap rules across Sound, LFOs, and other tab panels. Check long labels, numeric readouts, and touch targets.
4. Add navigation and persistence regression tests: switching tabs while holding notes, LFO routing and independent values, preset roundtrip, keyboard availability, and no audio reinitialization.
5. Verify CI and Copilot review, then publish a preview for iPad portrait/landscape validation. No merge or deployment without explicit approval.

## Completion checks
- [ ] All three LFOs appear only in the LFOs tab with their existing enable, waveform, sync, rate, depth, target, and value controls.
- [ ] LFOs keep modulating across tab changes and preserve independent settings.
- [ ] Equivalent controls align consistently without clipping or overflow.
- [ ] Keyboard remains accessible at the bottom across tabs.
- [ ] Existing presets and note timing behave unchanged.
- [ ] Automated tests and CI pass; Copilot feedback addressed.
- [ ] iPad portrait and landscape preview verified.

## Separate work
PR #62 documents the factory preset bank and is independent of this UI branch. Check its latest CI and Copilot feedback before any separately authorized merge.
