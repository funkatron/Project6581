# Drum per-slot voice and filter routing (prep)

## Behavior

- **Physical slots:** SID 4 voices 0/1/2 = kick bus, snare bus, hat bus (`drum-voice-policy.js`).
- **Voice registers:** Each `triggerDrumLane` still calls `noteOn` on the assigned slot with that lane’s factory voice (ADSR, wave, pulse, pitch envelope) via `drumLaneTimbre`.
- **Filter (shared):** One SID 4 filter (`engines[3].filter`, routing **7**) for all drum voices—set on the SID 4 engine card, not per bus. Drum preview applies the engine filter once per step.
- **Engine card LFO (UI clock):** `updateModulation` skips `updateSidFilter` for chip 3 so the SID 4 engine slider/LFO path does not stomp per-hit drum filters.
- **Engine card LFO (audio clock):** `residfp-worklet.js` skips filter register writes for chip 3 so highpass on the drum engine card does not stomp kick lowpass every block.

## Limits (authentic SID)

One filter block per chip: all three drum voices share it (authentic SID). Per-bus filter UI was removed to avoid misleading per-lane cutoff edits; lane `filter` patches in presets are legacy and not applied at playback.

## Follow-ups

1. On `stopDrumOwner`, refresh filter routing for still-active drum lanes.
2. Drum-only LFO targets in the worklet (optional drum bus modulation without melodic filter stomp).
3. UI: per-slot drum voice cards instead of single `engines[3]` + lane preset only.