# Project6581 documentation

Central index for maintainer and device-verification docs. User-facing synth help lives in the [README](../README.md).

**Last synced with `main`:** 2026-11-16

## Product and releases

| Doc | Purpose |
| --- | --- |
| [versioning.md](versioning.md) | App semver floor, commit-derived stamps, preset schema version |
| [../ROADMAP.md](../ROADMAP.md) | Priorities, milestones, completion checklists |

## Audio engine and behavior

| Doc | Purpose |
| --- | --- |
| [live-sid-engine.md](live-sid-engine.md) | WASM + AudioWorklet architecture |
| [pitch-envelope.md](pitch-envelope.md) | Per-note pitch sweeps (worklet path, presets) |
| [latency-investigation.md](latency-investigation.md) | Input-to-buffer diagnostics (not speaker latency) |
| [audio-clock-lfo-investigation.md](audio-clock-lfo-investigation.md) | Future LFO scheduling research |
| [sid-startup-investigation.md](sid-startup-investigation.md) | Startup lifecycle evidence and limits |

## UI, presets, and verification

| Doc | Purpose |
| --- | --- |
| [ipad-safari-qa.md](ipad-safari-qa.md) | Manual device checklist (required for audio claims) |
| [ipad-safari-automation-map.md](ipad-safari-automation-map.md) | What CI/browser smoke can vs cannot cover |
| [c64-factory-bank.md](c64-factory-bank.md) | Factory sound bank notes and audition status |
| [triple-sid-ui-mockup.md](triple-sid-ui-mockup.md) | Triple-SID design reference (implementation status) |
| [interface-refinement-plan.md](interface-refinement-plan.md) | Control-width and LFO-tab layout plan |
| [voice-allocation-layout.md](voice-allocation-layout.md) | Voice Assign / Unison UI spec |

## Agent notes

Implementation handoffs live under [`../agents/`](../agents/). They are not user-facing release docs.