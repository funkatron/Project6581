# Optional browser smoke testing

The GitHub Actions **Optional browser smoke** workflow is manually triggered from Actions → Run workflow. It does not run on commits or pull requests and does not affect the fast `npm test` suite.

Choose Chromium, WebKit, or both. The workflow starts a local HTTP server, loads the real application in a touch-capable narrow viewport, and checks editor tab visibility, keyboard persistence, keyboard hide/show and uncaught page errors.

**Limits:** Headless WebKit on Linux is not iPad Safari. These tests do not establish SID audio output, audible quality, real speaker latency, Web Audio unlock behavior or device rotation. The workflow is a first bounded browser layer; deterministic offline SID audio rendering and signal metrics should be added in a separate change after the render entry point and expected output are validated. Do not use these checks to claim manual iPad QA has passed.

**Completion checks**
- [x] Manually triggered workflow only
- [x] Chromium and WebKit browser selection
- [x] Tab and keyboard smoke assertions
- [ ] Workflow run verified green on GitHub
- [ ] Audio rendering and measurements (follow-up)
- [ ] Physical iPad smoke (still required)
