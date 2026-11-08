# Lane C progress

**Scope (revised):** UI refinement and `index.html` modularization. The skipped split PR #4 (`pitch-audition-ui`) is **not** revived here; pitch UI lives on **#67 / #68** (`pitch-envelope-editor` + preset v4). After those merge, remove inline `renderPitchAudition` from `index.html`.

## Started (branch `cursor/ui-lane-c-engine-status-c7a6`)

- **C3 slice:** `src/sid-engine-status-ui.js` — pure LED state, status copy, unlock visibility, latency line
- `index.html` wired to module; behavior unchanged

## Queued

- **C3 continue:** preset modal actions → `src/preset-library-ui.js` (incremental)
- **C1:** control width tokens per `docs/interface-refinement-plan.md`
- **C2:** LFO tab straggler audit (PR #64/#65 baseline)

## Gates

- Tab switch must not reset audio/modulation (regression tests in `editor-tabs.test.js`)
- No WASM rebuild
