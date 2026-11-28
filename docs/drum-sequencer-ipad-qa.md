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

## Worklet drum timing (Prefs, on by default since 0.28)

Open **Prefs** (⚙) → **Drum timing**: **Worklet drum timing** is ticked unless this browser saved it off. The status line should read *On: the audio engine plays the drums*. Note: iPad Safari's diagnostics export shows a Mac user agent ("Macintosh … Safari") because iPad requests desktop sites by default.

- [ ] Start the drum preview: the groove sounds the same as with the setting off (same kit, levels, hat choke, mute/solo).
- [ ] Play the keyboard with **Game Arp** on during the preview, ~60 s, no app switching: no late or skipped drum hits.
- [ ] Tap grid cells with the preview stopped and running: each tap sounds once.
- [ ] Change **BPM** and **Rate** while running: the groove continues from the same step.
- [ ] Untick the setting while running: drums carry on (now from the page timer) without a stuck note.
- [ ] Reload: the setting is remembered.
- [ ] **Audio timing** shows `Drum timing: worklet plays the drums` and the drum shadow line `worklet played N hits` with no `worklet skipped`. Export diagnostics and attach: `trace.entries` include `drum:*` note-on/off lines with `player: worklet`.

## Worklet note controller (G2, off by default)

Open the studio with `?workletNotes=1` once (the choice is kept in this browser; `?workletNotes=0` turns it off). Nothing should sound different: the worklet now makes the same SID writes the page made, at the start of the next audio block.

- [ ] **Audio timing** shows `Note writes: worklet note controller (N ops, M writes)` with no `errors` or `dropped`.
- [ ] Keyboard in mono, legato, duo and poly, with unison + detune: notes start, release and fall back to held keys as before.
- [ ] Root Arp and Game Arp, with layer routing to SID 2–3: no stuck or missing notes.
- [ ] A preset with a pitch envelope: the sweep sounds as before.
- [ ] Drum preview with **Worklet drum timing** off and on: hits as before.
- [ ] **Stop all**, then play again: no stuck note.
- [ ] Export diagnostics and attach (`environment.timing.noteController`).

## Worklet Game Arp timing (G3, Prefs, off by default)

Open **Prefs** (⚙) → **Game Arp timing** → tick **Worklet Game Arp timing**. The status should read *On: the audio engine plays the Game Arp and writes all notes* (turning it on also turns on the worklet note controller, so held notes are released once).

- [ ] Hold a note with **Game Arp** on: the phrase sounds the same as with the setting off (notes, rests, lengths, scale lock).
- [ ] **Root Arp** on as well: the Root Arp stays silent and transposes the phrase at the phrase start, as before.
- [ ] Routing for the Game Arp: SID 1 / 2 / 3, All, Layer: notes come from the chosen SIDs; turning a SID's voice off silences it there.
- [ ] Change held notes, release all keys (Game Arp stops), press again (restarts); with Root Arp on and Latch off, release the key that is the current root.
- [ ] **▶ Preview** with no keys held plays from the keyboard octave; change octave while previewing.
- [ ] The step highlight, key highlight and status line follow the sound.
- [ ] Drum preview + Game Arp + keyboard, ~60 s, no app switching: no late, doubled or stuck notes.
- [ ] **Audio timing** shows `Game Arp timing: worklet (playing) · N steps, M notes` with no `error` or `skipped` (other than SIDs you turned off), and `Note writes: worklet note controller`. Export diagnostics and attach: `trace.entries` include `game` note-on/off lines with `player: worklet`.
- [ ] Untick the setting while playing: the Game Arp carries on from the page timer without a stuck note.

## Arps and drums in sync (0.30)

Drums on **Sync** (master BPM), arp **Sync** on. Try with Worklet Game Arp timing off, then on.

- [ ] Start the drum preview, then press a key with Game Arp on: the first Game step lands on a drum step (no flam), and stays there for ~60 s.
- [ ] Same with Root Arp on (with and without Game Arp).
- [ ] Hold a key with Game Arp running, then start the drum preview: the first drum hit lands on an arp step.
- [ ] Move master BPM while both run: they stay together after the slider stops.
- [ ] Untick drum **Sync** (local BPM): arps start at once again, no lock (expected).
- [ ] Export diagnostics (Game Arp timing on): Game note-ons sit on the drum grid (the G3 export showed a constant +34.7 ms; expect about 0 ms, within a few ms).

## Game trigger (G4, 0.31)

Root Arp **and** Game Arp on, Root **1/2**, Game **1/16**, an 8- or 16-step phrase, hold a chord (e.g. C E G). Try each with Worklet Game Arp timing off, then on.

- [ ] **Every root step** (default): each half note restarts the phrase at step 1 on the next root (the step highlight jumps back to 1).
- [ ] **New root only**: same while the root changes; hold one key and the whole phrase runs through without restarting.
- [ ] **Phrase start (transpose)**: the phrase runs through; the root changes only when the phrase comes round (as before 0.31).
- [ ] Switch the mode while playing: takes effect on the next Root step, no stuck note.
- [ ] Save a preset with **New root only**, load another, reload it: the mode comes back. Older presets load as **Phrase start**.

## Help

- [ ] Section **?** on DRUM STEP SEQUENCER opens overview help and focuses the tab.
- [ ] **DRUM** LED long-press opens generator help; a tap on **▶ Preview** or **■ Stop** opens no help; a long press opens **Drum transport** help without starting or stopping.

## Session log template

Record: iPad model, iPadOS/Safari version, Project6581 build stamp, orientation, pass/fail per section, and link to any exported groove or preset used.