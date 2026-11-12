# SID 8580 preset-loading and latency investigation

## What is established from the code

- A preset that requests a different chip model calls `applyPresetSettings` → `ensureSidModel`. The current engine is retired, its AudioContext is closed, and `startSid` constructs a new AudioContext and reinitializes the reSIDfp worklet/WASM. This is a full restart, not an in-place chip-model change.
- `startSid` attempts `context.resume()` before its own first `await`. However, `ensureSidModel` **awaits retirement of the old engine first**. On iPad Safari, the new AudioContext can therefore be created after the original preset-selection user activation has expired. This is a plausible explanation for a new engine being initialized but still suspended. **It is not yet confirmed on an iPad.**
- The status UI distinguishes an initialized, suspended SID (`sidLed[data-state="ready"]`) from a running one (`sidLed[data-state="on"]`). A browser smoke must not interpret "ready" as audible playback.
- The prior diagnostic note-to-worklet acknowledgments are not physical key-to-speaker latency measurements.

## Additional performance hypothesis

Every call to `createReSidFpAudio` currently generates a fresh `Date.now()` URL query for the worklet and WASM, fetches WASM with `cache: 'no-store'`, and invokes `WebAssembly.compile(bytes)`. Consequently, switching SID models repeatedly can repeat network retrieval, worklet module loading and WASM compilation even though the binary is unchanged. This is a concrete source of *avoidable initialization work*, not evidence of note-to-speaker latency.

Potential optimization after timing baselines: cache the fetched/compiled WASM module by build ID and reuse a stable worklet URL per build where supported, while keeping a new AudioContext/worklet processor for each model and preserving current cleanup/rollback behavior. Measure cold versus warm switch timings first; avoid changing the production engine in this testing PR.

## Bounded automated reproduction

The optional browser smoke workflow now:
1. Restores the real WASM, stamps the build and serves the application.
2. Exercises tabs and checks SID initialization.
3. Switches 6581 → 8580 → 6581, recording elapsed readiness time and running/suspended LED state.
4. Seeds a valid v4 user preset for 8580, reloads, selects it through the real preset picker, records elapsed readiness time and engine state, then switches back.
5. Runs Chromium and WebKit separately and fails on engine initialization errors.

The test records **initialization time**, not note-on-to-speaker latency. Headless WebKit is not physical iPad Safari. Any transition from a running engine to a suspended engine after a model-changing preset is evidence to investigate, not proof of audible latency.

## Follow-up after baseline

- If a model-changing preset leaves the new context suspended, investigate an explicit user-activation handoff without weakening the existing cleanup serialization or opening multiple contexts.
- If initialization is slow but the context is running, separate WASM download, instantiation, worklet ready, context close, and render acknowledgment timings.
- Add offline WAV/audio-signal checks for onset, RMS, silence after Stop All and 6581/8580 differences. Keep those distinct from physical speaker timing.
- Retest with actual iPad Safari and record iPadOS, output route, build ID, LED state and timing report.

No audio-path behavior change is justified until a reproducible baseline exists.
