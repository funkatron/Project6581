# Optional browser smoke testing

The GitHub Actions **Optional browser smoke** workflow can be started from Actions → Run workflow. Marking a draft pull request ready for review runs it once; later commits do not rerun it. It does not run on ordinary commits and does not affect the fast `npm test` suite.

Choose Chromium, WebKit, or both. The workflow starts a local HTTP server, loads the real application in a touch-capable narrow viewport, and checks editor tab visibility, keyboard persistence, keyboard hide/show, repeated 6581 → 8580 → 6581 initialization timing (min/median/max and samples), SID readiness and uncaught page errors. The workflow restores/builds and stamps the actual WASM engine; a missing engine must fail rather than produce a false pass.

**Limits:** Headless WebKit on Linux is not iPad Safari. These tests do not establish SID audio output, audible quality, real speaker latency, Web Audio unlock behavior or device rotation. The workflow is a first bounded browser layer; deterministic offline SID audio rendering and signal metrics should be added in a separate change after the render entry point and expected output are validated. Do not use these checks to claim manual iPad QA has passed.

**Completion checks**
- [x] Manually triggered workflow only
- [x] Chromium and WebKit browser selection
- [x] Tab and keyboard smoke assertions
- [x] Initial Chromium/WebKit workflow verified green on GitHub (run 43137242656)
- [x] Repeated model switches and the 8580 preset picker, with the cached SID binary (run 43662151187)
- [x] A model switch must not fetch `dist/residfp.wasm` again
- [ ] Audio rendering and measurements (follow-up)
- [ ] Physical iPad smoke (still required)
