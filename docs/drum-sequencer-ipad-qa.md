# Drum sequencer — iPad verification

Device checklist for the **DRUM SEQ** tab, **DRUM** generator LED, groove I/O, and SID 4 engine. Automated tests cover data validation and static markup; **each unchecked box below still requires a physical iPad session** (or explicit desktop stand-in noted in your session note).

See [ipad-safari-automation-map.md](ipad-safari-automation-map.md) for CI coverage. Run `npm test` before device testing.

**Desktop drum WAVs (optional):** CI can record reference grooves for listening — [drum-audio-ci.md](drum-audio-ci.md) (download artifacts; no Mac required for capture).

## Environments

- [ ] iPad Safari portrait — open **DRUM SEQ** tab; grid scrolls horizontally without trapping vertical page scroll.
- [ ] iPad Safari landscape — row labels and step numbers remain readable; cells are at least ~40px touch targets.
- [ ] Factory build ID recorded in session notes.

## Drum-only preview

- [ ] With Root Arp and Game Arp **off** and **no keys held**, tap **▶ Preview** on DRUM SEQ (or **DRUM** LED). Pattern advances with visible playhead.
- [ ] Stop with **■ Stop** or **DRUM** LED; playhead clears and drum hits release.
- [ ] **Stop all** in the header stops drum transport even when keyboard/arps were also running.

## Keyboard + drums in parallel

- [ ] Enable drum preview; play live keyboard notes. Drums follow their grid; keyboard notes use normal routing (not transposing the drum pattern).
- [ ] Master BPM sync: drum **Sync** on — changing Master BPM scales drum step rate without silencing melodic layers.
- [ ] Load a melodic factory preset with drums in the preset grid; recall restores pattern + kit with transport **stopped**.

## Grid and kit

- [ ] Tap cells on/off; mis-taps are rare on portrait for all four lanes.
- [ ] Lane **Level** sliders change balance; resting a finger on a slider opens no help.
- [ ] Long-press a step cell opens **Drum step cell** help without toggling the cell.
- [ ] Tap **?** on the voice-allocation hint or long-press a **lane name** opens kick / hat / flex lane help; main topic **Drum voice allocation (SID 4)** matches kick+sn priority and CH xor OH behavior.

## Groove files

- [ ] **Export groove…** downloads `.6581drum.json`; re-import restores pattern + kit.
- [ ] Import with optional `drumEngine` updates SID 4 card settings; SID 1–3 unchanged.

## SID 4 and mix

- [ ] On **DRUM SEQ** (SID 4 card below the grid), **Boost** Off / +6 / +12 changes drum bus level on the chip meter; default +6 is audible against a busy lead preset.
- [ ] Prefer +6 with layered unison; verify +12 does not clip the master bus on a factory groove + lead preset (owner policy).

## Drum LFO (D3c)

- [ ] Enable **Drum LFO** on DRUM SEQ; cutoff or volume motion affects **SID 4** hits and card, not engines 1–3.
- [ ] Save preset, reload — `sound.drumLfo` returns with the same motion.

## Worklet drum timing (Prefs, experimental)

Open **Prefs** (⚙) → **Drum timing** → tick **Worklet drum timing**. The status line should read *On: the audio engine plays the drums*.

- [ ] Start the drum preview: the groove sounds the same as with the setting off (same kit, levels, hat choke, mute/solo).
- [ ] Play the keyboard with **Game Arp** on during the preview, ~60 s, no app switching: no late or skipped drum hits.
- [ ] Tap grid cells with the preview stopped and running: each tap sounds once.
- [ ] Change **BPM** and **Rate** while running: the groove continues from the same step.
- [ ] Untick the setting while running: drums carry on (now from the page timer) without a stuck note.
- [ ] Reload: the setting is remembered.
- [ ] **Audio timing** shows `Drum timing: worklet plays the drums` and the drum shadow line `worklet played N hits` with no `worklet skipped`. Export diagnostics and attach.

## Help

- [ ] Section **?** on DRUM STEP SEQUENCER opens overview help and focuses the tab.
- [ ] **DRUM** LED long-press opens generator help; a tap on **▶ Preview** or **■ Stop** opens no help; a long press opens **Drum transport** help without starting or stopping.

## Session log template

Record: iPad model, iPadOS/Safari version, Project6581 build stamp, orientation, pass/fail per section, and link to any exported groove or preset used.