# Drum per-slot voice and filter routing (prep)

## Behavior

- **Physical slots:** SID 4 voices 0/1/2 = kick bus, snare bus, hat bus (`drum-voice-policy.js`).
- **Voice registers:** Each `triggerDrumLane` still calls `noteOn` on the assigned slot with that lane’s factory voice (ADSR, wave, pulse, pitch envelope) via `drumLaneTimbre`.
- **Filter (no chip-wide stomp):** Lane filter is applied with **routing scoped to one voice** (`drum-slot-filter.js`), not `routing: 7` on every hit. Kick lowpass no longer overwrites the hat path when snare triggers next on the same step.
- **Engine card LFO (UI clock):** `updateModulation` skips `updateSidFilter` for chip 3 so the SID 4 engine slider/LFO path does not stomp per-hit drum filters.
- **Engine card LFO (audio clock):** `residfp-worklet.js` skips filter register writes for chip 3 so highpass on the drum engine card does not stomp kick lowpass every block.

## Limits (authentic SID)

One filter block per chip: simultaneous voices that share the filter path still share cutoff/mode. Routing-only-per-slot means other sounding voices may be **direct** while the new hit uses the filter path. Full reconcile on note-off (re-apply filters for remaining slots) is future work.

## Follow-ups

1. On `stopDrumOwner`, refresh filter routing for still-active drum lanes.
2. Drum-only LFO targets in the worklet (optional drum bus modulation without melodic filter stomp).
3. UI: per-slot drum voice cards instead of single `engines[3]` + lane preset only.