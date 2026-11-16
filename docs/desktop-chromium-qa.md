# Desktop Chromium verification

Baseline checks for **Chrome**, **Edge**, or another Chromium build over **HTTPS** (GitHub Pages or local). iPad Safari remains the primary release target; desktop Chromium is the cross-check for engine bugs vs browser audio-path issues and the first platform for **Web MIDI** (Priority 3).

Record: browser + version, OS, build stamp from footer, audio output route, and whether the tab was fresh vs long-lived.

## Session setup

- [ ] Open Project6581 in a **new tab** (not a restored session) from the production Pages URL.
- [ ] Confirm footer build stamp and `AudioContext` reaches **running** after first key press.
- [ ] Default **6581**, factory preset with moderate polyphony (not layered stress unless testing layer mode).

## Playback and timing

- [ ] Direct keyboard notes: meters/track Activity log show `note-on` / `input` when Diagnostics is open.
- [ ] Compare **Touch → output** footer estimate with perceived attack (no screen recording required for first pass).
- [ ] Game Arp off; then Game Arp on at BPM 120 — first step and steady steps sound even.
- [ ] Stop all clears held notes; no stuck meter levels.

## Layer / unison stress (regression)

- [ ] Layer routing + factory layer preset: **Voices 9**, **Unison** up to budget, poly — no tab freeze when changing Unison.
- [ ] Download diagnostic bundle after stress; Activity log shows studio + note sections.

## Browser audio path (intermittent)

- [ ] If meters align with keys but **speaker output lags**, note `contextState` in diagnostic JSON, try **new tab reload** before filing an engine defect.
- [ ] After backgrounding the tab 30+ seconds, return and play — note suspend/interrupted → running in startup list.

## MIDI (Step E)

- [ ] **ARP / SEQ** tab → Enable MIDI → allow access → select port.
- [ ] USB controller note-on matches on-screen keyboard path (try with arps off first).
- [ ] Channel filter 1–16 vs All; CC64 sustain defers release; **Stop all** clears MIDI notes.

## Completion

File results in the PR or issue for the active roadmap step. Do not mark roadmap latency or MIDI items complete from this list alone until notes are attached.