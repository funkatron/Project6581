# Roadmap Step G — iPad MIDI route (pinned)

**Status:** **Deferred (owner, 2026-11-17)** — hardware spike not possible yet. **PWA (F)** also deprioritized by owner.

**Planned first spike:** [Web MIDI Browser](https://apps.apple.com/us/app/web-midi-browser/id953846217) + production Project6581 URL + **USB** [Launchkey 37 MK3](https://us.novationmusic.com/products/launchkey-37-mk3) (USB-B → USB-C iPad or powered hub). Turn **off** Launchkey onboard Arp/Scale when testing Project6581 arps.

## Automated / desktop (shipped)

- [x] Web MIDI adapter — `src/midi-input.js`, **Prefs** dialog ([#124](https://github.com/funkatron/Project6581/pull/124)–[#125](https://github.com/funkatron/Project6581/pull/125))
- [ ] Optional owner verify — [desktop-chromium-qa.md](../docs/desktop-chromium-qa.md) **MIDI (Step E)**

## iPad Safari (owner) — not started

- [ ] Web MIDI Browser spike (Launchkey 37 MK3 USB)
- [ ] Document pass/fail in [ipad-safari-qa.md](../docs/ipad-safari-qa.md) or follow-up doc
- [ ] Native shell spike only if browser route fails (inter-app virtual MIDI likely needs native)

## Resume checklist (when owner is ready)

1. Install Web MIDI Browser; open Project6581; Enable audio.
2. Prefs → Enable MIDI → select Novation/Launchkey port; channel **All**.
3. Keys + sustain pedal; Root/Game arp combos; unplug/replug USB; Stop all.
4. Report iPad model, iPadOS, cable/hub, pass/fail.