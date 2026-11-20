# Drum kit design with one SID 4 filter

## Architecture

- **One** analog filter on SID 4 (`routing: 7`) driven by `engines[3].filter` (SID 4 card).
- **Per-lane factory presets** supply **oscillator + ADSR (+ pitch envelope)** only. Lane `filter` patches in saved kits are legacy; playback ignores them.
- **Lane level** (0–100) scales per-lane loudness via voice sustain shaping in `drumLaneTimbre` until a dedicated voice-gain path exists.

## Default kit bus (factory)

| Control | Starting value | Rationale |
| --- | --- | --- |
| Mode | Low-pass | Kick body + shared muffling of hats (authentic single-filter compromise). |
| Cutoff | ~1.8 kHz | Enough sub/low for kick; hats stay short-noise clicks, not bright HP wash. |
| Resonance | ~12–14% | Light punch on kick/snare transients. |
| Volume | ~80% | Headroom with +6 dB drum boost default. |

**Brighter kits:** raise cutoff toward 3–4 kHz on SID 4. **Kick-heavy:** 900 Hz–1.2 kHz, accept duller hats.

## Factory lane timbres (voice-only intent)

| Lane | Preset | Voice focus |
| --- | --- | --- |
| Kick | `low-thud-kick` | Triangle + pitch drop; long decay through LP bus. |
| Snare | `noise-snare` | Short noise burst; body from bus resonance, not per-voice HP. |
| CH | `closed-noise-hat` | Very short noise decay. |
| OH | `open-noise-hat` | Longer noise decay; brightness from length, not HP. |

Do **not** design lanes assuming per-voice high-pass or band-pass; tune length, noise vs triangle, and pitch envelope instead.

## CI / regression

`record-and-analyze` fixtures assume the **default drum engine low-pass bus**, not per-lane filter modes from factory JSON.