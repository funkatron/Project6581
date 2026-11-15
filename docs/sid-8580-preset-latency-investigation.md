# SID 8580 preset-loading and latency investigation

## Resolution

Run 43147436271 failed because WebKit closed while `#chip` was switching models. That build fetched and compiled `dist/residfp.wasm` on every switch. The engine now keeps one AudioContext and reuses the compiled binary, and the smoke check fails if a switch fetches the binary again. WebKit completed the same repeated switches on run 43662151187.

## What is established from the code

- A preset that requests a different chip model calls `applyPresetSettings` → `ensureSidModel`. The live engine changes model in place and reuses the cached WASM binary. It does not open a second AudioContext for the switch.
- `startSid` attempts `context.resume()` before its own first `await`. However, `ensureSidModel` **awaits retirement of the old engine first**. On iPad Safari, the new AudioContext can therefore be created after the original preset-selection user activation has expired. This is a plausible explanation for a new engine being initialized but still suspended. **It is not yet confirmed on an iPad.**
- The status UI distinguishes an initialized, suspended SID (`sidLed[data-state="ready"]`) from a running one (`sidLed[data-state="on"]`). A browser smoke must not interpret "ready" as audible playback.
- The prior diagnostic note-to-worklet acknowledgments are not physical key-to-speaker latency measurements.

## Additional performance hypothesis

Earlier builds generated a fresh worklet URL and fetched WASM with `cache: 'no-store'` on every model change, then compiled that binary again. That repeated work is what exhausted WebKit during the smoke loop. The engine now caches the binary for the build and switches the chip without fetching it again.

## Bounded automated reproduction

The optional browser smoke workflow now:
1. Restores the real WASM, stamps the build and serves the application.
2. Exercises tabs and checks SID initialization.
3. Switches 6581 → 8580 → 6581, recording elapsed readiness time and running/suspended LED state.
4. Seeds a valid v4 user preset for 8580, reloads, selects it through the real preset picker, records elapsed readiness time and engine state, then switches back.
5. Runs Chromium and WebKit separately and fails on engine initialization errors.

The test records **initialization time**, not note-on-to-speaker latency. Headless WebKit is not physical iPad Safari. Any transition from a running engine to a suspended engine after a model-changing preset is evidence to investigate, not proof of audible latency.

## Measured baseline (GitHub Actions Ubuntu 24.04, run 43138437023)

| Operation | Chromium | WebKit |
|---|---:|---:|
| 6581 → 8580 (3 samples, median) | 335 ms | 504 ms |
| 8580 → 6581 (4 samples, median) | 332 ms | 505 ms |
| Load 8580 user preset (one sample) | 371 ms | 959 ms |

The full switch samples were Chromium 8580 [335,335,332], 6581 [331,328,332,350]; WebKit 8580 [504,440,506], 6581 [492,529,471,505]. Both browsers passed. These measurements are browser/UI readiness times and cannot establish audible latency. The single user-preset sample per browser does not justify a stable preset-versus-model-switch ratio.

## Repeated-fetch verification and intermittent WebKit failure

Run 43138664993 confirmed **one additional `dist/residfp.wasm` resource fetch on every measured 6581/8580 switch** in both Chromium and WebKit. Chromium passed all switches. WebKit passed several switches, then stalled during a final switch to 8580; the page/context was closed before the readiness wait completed. This is a real automated regression signal, but the available log does not yet distinguish engine stall from browser crash, test timeout or runner resource pressure. Do not infer the exact cause.

The harness logs browser crashes, console errors, and a status/LED/spinner snapshot on timeout. It also requires the initial page to fetch WASM once and each model switch to fetch it zero more times.

## Follow-up after baseline

- If a model-changing preset leaves the new context suspended, investigate an explicit user-activation handoff without weakening the existing cleanup serialization or opening multiple contexts.
- If initialization is slow but the context is running, separate WASM download, instantiation, worklet ready, context close, and render acknowledgment timings.
- Add offline WAV/audio-signal checks for onset, RMS, silence after Stop All and 6581/8580 differences. Keep those distinct from physical speaker timing.
- Retest with actual iPad Safari and record iPadOS, output route, build ID, LED state and timing report.

The repeated WASM compilation was the smoke failure. Audible key-to-speaker timing is still a separate measurement.
