# iPad Safari QA — automation map

Use this with [ipad-safari-qa.md](ipad-safari-qa.md). **Checked boxes in the device plan still require a physical iPad** unless this document marks an item as partially or fully covered by CI.

Legend:

- **Auto** — Node `npm test` or static HTML/CSS assertions
- **Manual** — real iPad Safari (or equivalent) required
- **Partial** — logic covered in CI; touch, audio, or layout not

## Startup and lifecycle (#58)

| QA item (summary) | Coverage | Test / artifact |
| --- | --- | --- |
| Correlated event log fields | Partial | `test/sid-event-log.test.js`, `test/sid-startup.test.js` |
| Bounded context close / retry serialization | Auto | `test/sid-startup.test.js`, `sid-audio-lifecycle.js` |
| Stale callback protection | Auto | `test/sid-startup.test.js` |
| Suspended context / Enable audio UX | Manual | — |
| Perceived latency vs reference tone | Manual | Footer diagnostics only instrument message path |

## Voice assignment and Unison

| QA item | Coverage | Test / artifact |
| --- | --- | --- |
| Poly stack capacity and oldest steal | Auto | `test/unison-sid-controller.test.js`, `test/polyphony-regression.test.js` |
| Mono / Legato / Duo behavior | Auto | `test/unison-sid-controller.test.js` |
| Eight-note chord across chips | Partial | Register tests; no WASM render in CI |
| Stop all releases gates | Partial | Controller panic tests; device audio Manual |

## LFOs

| QA item | Coverage | Test / artifact |
| --- | --- | --- |
| Synced rate table (4/1, 2/1, 1/1, …) | Auto | `test/lfo-modulation.test.js` |
| Routing to 11 targets | Auto | `test/lfo-modulation.test.js`, `test/live-sid-controller.test.js` |
| Stationary thumb track math | Auto | `test/modulation-track.test.js`, `test/modulation-track-ui.test.js` |
| Audible stepping at 60 Hz | Manual | — |
| Background/foreground timing | Manual | — |

## Presets

| QA item | Coverage | Test / artifact |
| --- | --- | --- |
| v3 validation, factory IDs, import/export | Auto | `test/preset-library.test.js`, `test/preset-integration.test.js` |
| Modal layout, Files download, WebKit blob quirks | Manual | — |
| Load while note held | Partial | Integration tests for validate paths; audio Manual |
| Chip model switch pops (FNK Deep Bass) | Manual | — |

## Arpeggiators and Game Arp sequencer

| QA item | Coverage | Test / artifact |
| --- | --- | --- |
| Four composable modes (logic) | Auto | `test/arp-key-integration.test.js`, `test/game-step-sequencer.test.js` |
| Keyboard highlight rules | Auto | `test/arp-key-visual.test.js` |
| Neutral reset steps | Partial | Sequencer defaults in tests; UI Manual |
| 16-step editor touch / scroll | Manual | `test/step-sequencer-ui.test.js` (markup only) |
| Preview + root change | Manual | — |

## Recording

| QA item | Coverage | Test / artifact |
| --- | --- | --- |
| WAV encode path | Auto | `test/sid-recorder.test.js`, `test/recording-integration.test.js` |
| iPad download link / M4A | Manual | — |
| PWM spectral comparison (#45) | Manual | Requires device + exported WAV |

## Pitch envelope (audition)

| QA item | Coverage | Test / artifact |
| --- | --- | --- |
| Worklet sweep timing | Auto | `test/pitch-envelope-worklet.test.js` |
| Unison start/stop/panic | Auto | `test/pitch-envelope-controller.test.js` |
| Kick/tom listening | Manual | Audition UI; no factory preset changes yet |

## Layout and tabs

| QA item | Coverage | Test / artifact |
| --- | --- | --- |
| Editor tab panel visibility | Auto | `test/editor-tabs.test.js` |
| LFO dedicated tab panel exists | Auto | `editor-tabs.test.js`, HTML structure |
| Black key width / touch targets | Partial | `test/keyboard-key-width.test.js` (CSS math); touch Manual |
| Control width consistency audit | Manual | ROADMAP UI refinement |

## CI command

```sh
npm test
```

174 tests (count may change); **passing CI does not satisfy** the release policy at the bottom of `ipad-safari-qa.md`.

## Recording device results

When completing manual rows, append to the QA doc or link a session note with: iPad model, iPadOS/Safari version, build ID, orientation, and pass/fail per section.
