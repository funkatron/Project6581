# Project6581: Cursor handoff, SID startup and preset/model-switch latency

**Prepared:** 2026-11-14  
**Repository:** https://github.com/funkatron/Project6581  
**Working PR:** https://github.com/funkatron/Project6581/pull/74  
**Branch:** `perf/cache-sid-wasm-by-build`  
**Last known diagnostic commit:** `9aef778ed459746c7e6a8a58ffceca8cf833114c`  
**Status:** Investigation open. **Do not merge or deploy without explicit authorization.**

## 1. Mission

Investigate and fix intermittent, substantial audible latency in Project6581 on **iPad Safari**, especially when the user imports/selects a custom preset, changes SID chip models (6581/8580), and starts playback by touching the on-screen keyboard rather than tapping **Enable Audio** first.

The user has observed roughly **500 ms or greater** delay from keyboard touch to audible sound in the problematic state. Importantly, **switching back to 6581 after latency appears does not necessarily clear it**. The user suspects the sequence of loading a preset and switching models is part of the trigger. Do not reduce the reproduction to simply applying equivalent settings directly in code.

The principal objective is to distinguish:

- audio-context suspended/interrupted/running transitions and trusted gesture activation;
- preset import, selection and application, including whether they cause an audio-engine/model restart;
- 6581 -> 8580 -> 6581 transitions and whether a delayed state persists;
- input event -> JS note dispatch -> AudioWorklet acknowledgment -> actual first nonzero audio samples -> physical speaker latency;
- sequencer rhythm/envelope effects that can be mistaken for latency;
- possible WASM loading/retry problems, which are related but not automatically the same issue.

## 2. User-observed reproduction (highest-priority evidence)

**Good path:** User taps **Enable Audio**, then switches to **8580** and uses their preset; keyboard and sequencer playback have normal perceived latency.

**Bad path:** User does not explicitly tap **Enable Audio** first, instead loads/uses the **FNK Deep Bass** preset (8580), changes SID model as needed, and begins playing by tapping the on-screen keyboard. Audible latency can exceed approximately 500 ms. Switching the chip selection back to **6581** has not reliably removed that delay.

The exact user sequence needs to be preserved and tested as separate variants because the timing of preset selection versus engine initialization may matter:

1. Fresh iPad Safari page, no explicit audio unlock; **Import...** the actual JSON preset using the UI; select it in **My presets**; confirm 8580; tap keyboard.
2. Fresh page; explicitly **Enable Audio**; then import/select same preset, switch to 8580 if necessary, tap keyboard.
3. From the bad state, switch **8580 -> 6581**, play again, and check whether delay persists.
4. Compare preset **import and selection** against a pre-existing saved preset selected through the UI, and against settings applied without preset UI, to isolate the import/selection effects.
5. Compare cold starts, retries, and a second fresh page load. Avoid using a previous run's already-running AudioContext as a valid cold-start test.

These are hypotheses/reproduction candidates, **not confirmed deterministic steps**. User experience is the primary symptom; headless WebKit is not a full replacement for iPad Safari.

## 3. Exact preset: FNK Deep Bass

The user supplied a genuine preset file named `project6581-fnk-deep-bass 3.json`. It is available as a conversation attachment; for the Cursor agent, **ask the user to put the file in the workspace if it is not already accessible**, or copy the accompanying JSON separately. Do not silently substitute a hand-built approximation for the primary regression fixture.

- File format: `type: "project6581-preset"`, `version: 4`, preset name `FNK Deep Bass`.
- SID: **8580**.
- Voice: square/pulse; attack 0, decay 1.36, sustain 0, release 0.01; pulse 76, PWM depth 7, PWM rate 2.7; pitch envelope disabled.
- Instrument: **8 voices, 8 unison, legato, detune 7**.
- Filter: low-pass, cutoff 1230, resonance 100, volume 80.
- Three enabled, tempo-synced sine LFOs: cutoff depth 0.14 division 0.5; pulse depth 0.38 division 4; decay depth 0.6 division 0.25.
- Performance: 86 BPM; regular arpeggiator disabled, latch true; **game sequencer enabled**, custom 16 steps, rate 4, all gates true, duration 75%; pitch offsets `[0,-7,-6,0,0,4,0,-5,0,3,7,12,1,3,-12,-2]`.

**Caution:** The sequencer is enabled and `keyDown()` can trigger `restartGenerators()` -> `gameTick()` -> `play(note,'game')`. A note's worklet acknowledgment may therefore be logged as source **`game`**, not `keyboard`, even though a physical keyboard touch initiated it. The short release and sequencer gating can also complicate perceptual onset measurements. Do not change the preset when testing the primary scenario; use separate control cases if needed.

## 4. Current PR and relevant code

PR #74 initially addresses versioned **reSIDfp WASM caching**, deduplicated fetches, retry/timeout eviction, and safe copies of transferable WASM bytes for worklets. This may improve model-switch startup but does **not** establish a fix for the audible latency.

Relevant files/functions to inspect on the PR branch:

- `index.html`: `startSid()`, `unlockSidAudio()`, `updateSidActivation()`, `play()`, `keyDown()`, `restartGenerators()`, `gameTick()`, `renderKeyboard()`, preset import `#presetFile` change handler, preset selection/application, model switch `#chip` handler, `updateAudioTimingReport()`, `sidEventLog`.
- `src/create-residfp-audio.js`: WASM caching, AudioWorklet creation, note trace and timing callbacks.
- `src/unison-sid-controller.js`: note-on/off and voice allocation.
- `src/preset-library.js`: preset validation/import/export and persistence.
- `scripts/browser-smoke.mjs`: existing browser smoke tests.
- `scripts/browser-startup-latency.mjs`: newly introduced experimental WebKit/Chromium diagnostic, **currently flawed; see below**.
- `.github/workflows/startup-latency.yml`: diagnostic workflow triggered by pushes to the PR branch.
- `.github/workflows/browser-smoke.yml`: optional broader smoke suite.
- Tests: `test/sid-wasm-cache.test.mjs`, `test/sid-audio-factory-cache.test.mjs`, `test/sid-startup.test.js`, `test/sid-event-log.test.js`.

Important existing behavior:

- `startSid()` creates `new AudioContext({latencyHint:'interactive'})` and invokes `context.resume()` before awaiting modules.
- `unlockSidAudio()` invokes `context.resume()` when suspended/interrupted. A capturing `document` listener calls it on `pointerdown` and `keydown`; **Enable Audio** invokes it explicitly.
- Keyboard pointer handler calls `traceInput(..., () => keyDown(note))`; sequencer-enabled `keyDown()` may restart the generator and issue a note immediately.
- `play()` uses `sidController.noteOn()`, `sidAudio.beginNoteTrace()` / `endNoteTrace()`, and `sidAudio.noteDispatched()`.
- `updateAudioTimingReport()` explicitly warns that note-dispatch-to-worklet ack is a **processing** measurement, not physical speaker latency.

## 5. CI chronology and evidence

GitHub Actions links:

- First experimental run, failed on startup wait: https://github.com/funkatron/Project6581/actions/runs/43303057136
- Revised preset-import run, **passed**, but audio was already running in both branches: https://github.com/funkatron/Project6581/actions/runs/43342615011
- Forced-suspension run, failed because Playwright tried to check hidden diagnostics checkbox: https://github.com/funkatron/Project6581/actions/runs/43353475397
- **Most recent run**, failed on Enable Audio button click: https://github.com/funkatron/Project6581/actions/runs/43353715121

At last check (2026-11-14), latest `Register tests` for commit `9aef778` **passed**, while `SID startup latency diagnostic` **failed**.

**Most recent run, keyboard-first path:**

- Imported/selected preset through UI; chip reported 8580; SID active.
- Explicit test-induced suspension verified: `state: suspended`, LED `ready`, status `SID ready · tap Enable audio to resume.`
- After opening the Audio timing panel and checking logging, **before the keyboard touch**, captured `state: running`. This invalidates the claim that the keyboard was responsible for resuming the context.
- After touch, context running; 1 key press; 90 recent register writes; audio peak **0.22%**; note-dispatch-to-worklet ack **9.0 ms** (`game` source); browser base latency 2.9 ms, output latency reported 0.0 ms.
- Those measurements do **not** prove the absence of 500ms audible latency.

**Most recent run, Enable Audio first path:**

- Imported/selected preset; chip 8580; SID active.
- Explicit suspension verified.
- `locator.click` on `#sidUnlock` timed out after 30 seconds, likely because the preceding diagnostics interaction had already resumed the context and the button was no longer visible/actionable. The logs do not prove this cause conclusively; inspect Playwright call log and actual button state.

**Earlier passing run:**

- Both branches loaded 8580 and produced audio peak ~22%, but both contexts were already running before keyboard touch. Initialization times ~683ms and ~765ms are **engine initialization**, not key-to-speaker latency.

## 6. Immediate fixes to the test harness

1. **Move diagnostics setup before forced suspension.** Open `<details id="audioTimingDetails">` and check `#sidEventLogging` while context is running, then call `AudioContext.suspend()` and assert `state === 'suspended'` **immediately before** the intended activation gesture. Do not interact with the page between this assertion and the target gesture, except for required test instrumentation that cannot activate audio.
2. **Explicit path guards.** For keyboard-first, verify context suspended immediately before the real `page.touchscreen.tap(...)` on the visible keyboard key. For Enable Audio first, verify context suspended and `#sidUnlock` visible/actionable immediately before `locator.click()`. Capture whether and when context changes to running. Fail with actionable snapshots if a prerequisite isn't met; do not wait 30 seconds for a hidden button.
3. **Preserve exact UI workflow.** Use Playwright `setInputFiles()` on `#presetFile` with the actual version-4 JSON bytes, click the imported preset in My presets, wait for model transition and SID ready, record timestamps. Current script synthesizes a preset object via `defaultPresetSettings()`; this is an approximation and may differ in nested defaults, LFO, arp, and sequencer validation. Replace primary test fixture with the exact file and keep synthetic settings as a secondary control.
4. **Add model-switch sequences.** Capture model/context/attempt identifiers and timestamps before and after `6581 -> 8580 -> 6581`, and test if bad-state latency persists. Verify that a model switch doesn't leave a stale AudioContext, controller, or worklet, and that each new engine is ready before note tests.
5. **Improve failure artifacts.** On any failure, attach screenshots, DOM states, visible button state, page errors, console errors, complete startup logs, event logs, and a Playwright trace. Make diagnostic failure messages identify the precise unmet prerequisite.

## 7. Measurements needed for credible diagnosis

For every run, record monotonic timestamps for:

- initial page load, first SID engine ready, model-change request and completion;
- preset file import start/end, preset selection start/end, any model restart caused by preset application;
- context creation, state transitions, context IDs, `resume()` call/resolution, first running time;
- pointerdown (trusted gesture), `keyDown()`, generator restart, `play()`, `noteOn()`, register dispatch, worklet receipt, first rendered non-silent sample/block;
- audio peak evolution during the first 1-2 seconds after the touch.

Enable existing `sidEventLog` and audio-timing instrumentation; prefer extending it in small, tested increments. Distinguish event time in main-thread clock from audio sample/frame clock. Where possible, add **offline/sample-level** or worklet-side output capture to establish time-to-first-nonzero sample without claiming physical speaker latency. Actual iPad speaker/Bluetooth timing requires on-device observation or an externally synchronized recording.

Use multiple runs, report median and outliers, and record exact browser, OS, SID model, preset name, build SHA, AudioContext `baseLatency`/`outputLatency`, and context state. Browser/WebKit automation is a **proxy**, not proof of Safari behaviour on physical iPad.

## 8. Copilot reviews and CI discipline

Two earlier Copilot threads on PR #74 concerned (1) stuck WASM shared promise on timeout/retry and (2) concurrent factory fetches requiring independent transferable copies and failure recovery. Both threads were **outdated** at the last review, though shown unresolved; inspect the latest review state and verify actual tests, not just thread age. Check new Copilot reviews after any code changes.

Keep changes focused and testable. Do not mask a genuine regression with increased timeouts. Do not merge, tag, or deploy without explicit authorization. Before a release, use meaningful semantic version milestones rather than bumping on each commit; keep build timestamp/SHA separate. Ensure repo has `AGENTS.md` and use `agents/` for broader agent docs.

## 9. Suggested Cursor execution plan

- [ ] Read `AGENTS.md`, PR #74 diff, recent CI logs, Copilot reviews, and exact preset JSON.
- [ ] Fix test setup order and button visibility guards; run locally in WebKit and Chromium.
- [ ] Use the **exact** preset through the import/selection UI, preserving 8580 and sequencer settings.
- [ ] Add model switch and persistence cases (6581 -> 8580 -> 6581).
- [ ] Collect trustworthy first-note timings and worklet output-onset evidence; avoid conflating initialization with latency.
- [ ] Reproduce the delay or explicitly document inability to reproduce, including test coverage and limitations.
- [ ] Only after evidence identifies a root cause, implement the smallest audio fix with regression coverage.
- [ ] Push to PR #74, inspect CI and Copilot review, summarize evidence and outstanding uncertainty. **Do not merge.**

## 10. Definition of done for this investigation

- [ ] The automated test genuinely compares suspended-context keyboard activation and explicit Enable Audio activation, with guards proving each precondition.
- [ ] Exact user preset is imported and selected through the UI; model switches are covered.
- [ ] Diagnostic logs permit input, dispatch, worklet and first-rendered-audio timing comparisons, with physical latency caveat.
- [ ] CI passes consistently without hiding flaky or timed-out steps.
- [ ] If a code fix is proposed, its mechanism is supported by measured evidence and a regression test.
- [ ] Copilot feedback is checked and PR remains open for user approval.

## 11. Cursor kickoff prompt

> Take over Project6581 PR #74 on branch `perf/cache-sid-wasm-by-build`. Read this handoff and the exact `FNK Deep Bass` version-4 preset. Prioritize investigating iPad Safari latency triggered by **importing/selecting the preset, switching SID models, and playing without explicitly pressing Enable Audio**. The current Playwright diagnostic is invalid because the diagnostics UI can resume the context before the keyboard gesture; fix the setup and prove both paths start suspended. Reproduce the full UI path, including 8580 -> 6581 persistence, capture detailed event and audio-onset diagnostics, check CI and Copilot reviews, and make only evidence-supported production changes. Continue autonomously, use small testable commits, and do not merge or deploy without my approval.


## Included original preset file

This handoff bundle includes **`project6581-fnk-deep-bass 3.json`**, the user's original exported preset, unchanged. Use this exact file via the application’s **Import…** control and then select **FNK Deep Bass** under **My presets**. Do not substitute a programmatically reconstructed preset for the primary reproduction. Compare (a) keyboard-first activation after import and model switch to 8580 and (b) explicit Enable Audio before playing, then switch back to 6581 and check whether the latency persists. Keep audio-context state and actual note-to-output timing separate from SID initialization duration.
