# Roadmap Step C — four Arp modes (2026-11-16)

**Goal:** Verify composable **Root Arp** + **Game Arp** (four enable combinations) without stuck notes or wrong highlights. iPad Safari is the release gate; CI covers logic and wiring before device sessions.

## Automated (this PR)

- [x] `resolveGameRoot`, `selectRoot`, `patternPitch`, `stepMilliseconds` — `test/arp-composition.test.js`
- [x] Keyboard mode matrix (direct vs generator clocks) — `test/arp-four-modes.test.js`
- [x] Existing wiring/CSS — `test/arp-key-integration.test.js`, `test/arp-key-visual.test.js`, `test/game-step-sequencer.test.js`
- [x] Full `node --test` on branch before merge

## Desktop Chromium (owner optional)

Run [desktop-chromium-qa.md](../docs/desktop-chromium-qa.md) **Arp four modes** section on GitHub Pages: both off, Game only, Root only, both on; distinct Root vs Pattern rates; latch/clear/Stop all.

## iPad Safari (owner)

[ipad-safari-qa.md](../docs/ipad-safari-qa.md) — **Composable Game Arp and Arpeggiator**. Mark Step C complete in ROADMAP only when that subsection is filed with build stamp and orientation notes.