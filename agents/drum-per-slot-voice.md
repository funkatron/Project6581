# Drum per-slot voice and filter routing (prep)

## Behavior

- **Physical slots:** SID 4 voices 0/1/2 = kick bus, snare bus, hat bus (`drum-voice-policy.js`).
- **Voice registers:** Each `triggerDrumLane` still calls `noteOn` on the assigned slot with that lane’s factory voice (ADSR, wave, pulse, pitch envelope) via `drumLaneTimbre`.
- **Filter (no chip-wide stomp):** Lane filter is applied with **routing scoped to one voice** (`drum-slot-filter.js`), not `routing: 7` on every hit. Kick lowpass no longer overwrites the hat path when snare triggers next on the same step.
- **Engine card LFO (UI clock):** `updateModulation` skips `updateSidFilter` for chip 3 so the SID 4 engine slider/LFO path does not stomp per-hit drum filters.
- **Engine card LFO (audio clock):** `residfp-worklet.js` skips filter register writes for chip 3 so highpass on the drum engine card does not stomp kick lowpass every block.

## Limits (authentic SID)

One filter block per chip: simultaneous voices cannot each use a different cutoff. **Preview** applies filter once per step (`drum-step-filter.js`): kick lane wins cutoff/mode; only that voice is routed through the filter and sn/hat on the same step play **direct**. Grid solo still sets the tapped lane’s filter. Full reconcile across overlapping steps (hat on step 2 while kick decays from step 1) is future work.

## Follow-ups

1. On `stopDrumOwner`, refresh filter routing for still-active drum lanes.
2. Drum-only LFO targets in the worklet (optional drum bus modulation without melodic filter stomp).
3. UI: per-slot drum voice cards instead of single `engines[3]` + lane preset only.