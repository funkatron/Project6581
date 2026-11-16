# Roadmap Step A — agent Chromium smoke (2026-11-16)

**Environment:** Cloud agent VM, static `python3 -m http.server` from repo root, `curl` + `node --test` (no physical USB audio).

## Automated

- [x] Full `node --test` suite on `main` after roadmap merge (#121).
- [x] `index.html` and module graph load without syntax errors (CI).

## Manual (owner)

- [ ] Run [desktop-chromium-qa.md](../docs/desktop-chromium-qa.md) on **GitHub Pages** in Chrome or Edge.
- [ ] Note whether intermittent output lag (meters on time, sound late) reproduces on desktop or stays iPad/Safari-specific.

Step **B** implementation can proceed while Step A owner notes are pending; mark Step A complete in ROADMAP when the checklist is filed.