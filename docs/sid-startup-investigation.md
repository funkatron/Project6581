# SID startup investigation — issue #58

## Evidence collected November 5, 2026

Environment: ChatGPT Work's remote Chrome browser (not iPad Safari; browser version and physical audio output were not measured).

| Route | Build | Observed result |
| --- | --- | --- |
| Production | v0.1.38, 2026-11-05T21:02:21.620Z | Initial load and reload reached ready while audio was suspended. A native click activated audio; direct keyboard and sequencer produced register writes and nonzero PCM peak reports. |
| PR #56 | v0.1.41, 2026-11-05T21:02:07.484Z | Initial load and reload reached ready while suspended. Keyboard and sequencer controls exercised. Direct-input acknowledgment sample: 51.0 ms. |

Production samples: 50.9 ms direct keyboard acknowledgment; 32.0 and 51.8 ms generated-note acknowledgment. PR #56 also reported 9.2 ms for a generated note. These are individual diagnostic samples, not a benchmark. Browser-reported latency was 10.0 ms base / 0.0 ms output, sampled during initialization. Render cost was **not reported**, against a 2.9 ms block budget. Do not infer adequate render performance from unavailable measurements or physical speaker latency from acknowledgment timing.

The intermittent initialization failure was **not reproduced** in these Chrome visits. No claim is made about audible quality or actual key-to-speaker delay. The modified application still requires browser/preview and iPad verification; the cloud browser could not reach the local server.

## What the code and tests establish

- A suspended context can reach ready in this Chrome environment. The proposed Safari worklet/suspension interaction remains a hypothesis.
- The old timeout catch awaited `audio.close()` before hiding the spinner or exposing retry. A pending browser close could therefore leave the UI loading indefinitely even after the 12-second ready timeout. The regression harness explicitly holds close pending and verifies bounded recovery UI.
- Retry previously created/resumed the context after awaiting dynamic imports. It did not guarantee that resume ran inside the trusted click. The new path creates/resumes before the first await, while the explicit **Enable audio** action can resume an already-created context.
- Old port handlers and asynchronous resume callbacks were not retired explicitly. Cleanup now detaches/closes the port and invalidates callbacks before waiting for context closure.

These are concrete lifecycle weaknesses, **not confirmation of the reported iPad root cause**. A stalled worklet, slow WASM instantiation, and browser suspension/interruption remain distinguishable possibilities.

## Focused changes

1. Worklet acknowledges load receipt, WASM instantiation start/completion, runtime initialization, chip initialization, and success. Failures include the last observed stage and context state. Startup-only events are collected in the existing Audio timing panel with receipt times; no instrumentation was added to `process()`.
2. Context creation/resume occurs synchronously on Retry. **Enable audio** supports suspended/interrupted contexts without creating another engine. Pending startup calls are shared.
3. Cleanup is idempotent and bounded to two seconds. Unclosed contexts block additional contexts and request a page reload. Late callbacks cannot alter the next attempt. Fetch is aborted during disposal; processor errors expose recovery.

The existing 15-second stage deadlines and 12-second readiness deadline remain. Background tabs can throttle timers; no wall-clock deadline is guaranteed while the page's main thread is suspended. Worklet progress times measure **main-thread receipt**, not exact audio-thread execution durations.

Native rendering, note-on batch flushing, and sequencer scheduling are unchanged. No native rebuild is required.

## Automated verification

- `node --test test/sid-startup.test.js`: ten behavioral tests covering success while suspended, synchronous activation, duplicate calls, ready timeout, retry, stale progress/error/resume callbacks, hung/rejected cleanup, early-stage failure, processor crash, port disposal, and worklet acknowledgments.
- `npm test`: 134 passing tests, including existing timing, preset, recording and sequencer regressions.
- Existing preview-assets WASM: `check-wasm-imports.mjs` and `smoke-test-sid.mjs` pass (44.1/48 kHz). No rebuild.

## Remaining device checks

- [ ] Modified preview starts on Chrome and iPad Safari across fresh loads, reloads and background/foreground transitions.
- [ ] During stalled startup, Enable audio resumes the **same** context and progress continues; otherwise the deadline exposes an error and Retry.
- [ ] Repeated Retry taps cause one attempt; successful cleanup precedes each replacement. A cleanup failure asks for reload instead of accumulating contexts.
- [ ] Keyboard with Game Arp/Arp off, then Game Arp Preview, both play and stop responsively before and after recovery.
- [ ] Record iPad model, OS/browser, output route (speakers/wired/Bluetooth/AirPlay), recording state, build, last startup stage and timing panel values.
- [ ] Read Copilot findings and verify CI for the exact final commit before merge.

## Preview workflow

Run **Build PR preview** from `main`, set `pr_number` to this fix's PR number, and choose `publish`. This reuses the native artifact cache, tests the PR, and requests the existing Pages workflow to include the preview. It does not merge the fix. Confirm both workflow runs succeeded before testing the preview. Keep PR #56 unmerged.
