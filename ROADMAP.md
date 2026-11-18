# Project6581 roadmap

> **Doc sync (2026-11-16):** Triple SID engine cards, preset format **v5**, layer routing, pitch-envelope audio path, footer **Diagnostics** (studio trace + unified **Activity log** ([#120](https://github.com/funkatron/Project6581/pull/120))), and layered **Unison/voice-budget** hardening are on `main`. Remaining gaps below are verification, polish, and net-new milestones—not unshipped core engine work unless marked *planned*. See [docs/README.md](docs/README.md).

## Delivery priorities: musical features first

Prioritize features that help people **make, retain, exchange, and perform music**. Keep regression tests proportionate to the feature being shipped; defer extended audio-clock research and large architecture changes unless an observed defect requires them. Work in small, separately reviewable PRs, inspect all Copilot review findings, and verify deployment independently.

**Near-term order:** **1. Factory/user presets and import/export** (polish + iPad verification) → **2. Composable Arpeggiator + Game Arp** (device checks) **and Western scale lock** ([#130](https://github.com/funkatron/Project6581/pull/130)) → **3. MIDI input on iPad and desktop** → **4. App-like installation and offline access**. **Owner backlog (planned, not scheduled):** dedicated **FX** section (compressor, distortion, delay, phaser), a **drum sequencer**, and a **toggle-able drum level boost** so noise/drum hits sit with PWM-heavy sounds. WAV/M4A recording and stationary-thumb LFO display are **shipped**; iPad validation remains. Triple-SID **UI, routing, and layer per-chip voice ownership** are **shipped** on `main` ([#94](https://github.com/funkatron/Project6581/pull/94)); confirm layer mutes on iPad still open.

### How we execute: one roadmap step at a time

Finish the **active step** (code, doc, or device verification) in a single focused PR before starting the next. Mark roadmap checkboxes only when that step’s **completion checks** are met—not when CI alone passes. Cross-browser work uses [desktop-chromium-qa.md](docs/desktop-chromium-qa.md) on desktop and [ipad-safari-qa.md](docs/ipad-safari-qa.md) on iPad unless the step says otherwise.

| Step | Focus | Primary doc / section |
| --- | --- | --- |
| **A** | Desktop **Chromium** baseline (timing, layer/unison smoke, diagnostic export) | [desktop-chromium-qa.md](docs/desktop-chromium-qa.md), [Latency](#priority-reduce-keyboard-to-audio-latency) |
| **B** | **Preset workflow** iPad verification + load-while-playing polish | [Priority 1](#priority-1-factory-presets-and-user-preset-management) |
| **C** | **Arp + Game Arp** four-mode iPad verification | [Priority 2a](#priority-2a-composable-arpeggiator-and-game-arp) |
| **D** | **Factory bank** listening pass (C64 references + audition) | [Priority 1 follow-up](#priority-1-follow-up-c64-game-inspired-factory-sounds) |
| **E** | **Web MIDI** note input on desktop HTTPS | [Priority 3](#priority-3-midi-input-on-ipad-and-desktop) |
| **F** | **PWA** shell (install, offline WASM/JS pairs, version indicator) | [Priority 4](#priority-4-package-project6581-as-an-application) |
| **G** | **iPad MIDI** route decision (MIDI browser vs native shell) | Priority 3 + Priority 4 |
| *later* | Western scale lock ([#130](https://github.com/funkatron/Project6581/pull/130)), master **FX** bus, **drum sequencer**, drum level boost, `.sid` player, visualization, audio-clock LFO migration | Sections below |

**Active step:** *Owner choice* — **Step C** iPad composable arp verified ([#128](https://github.com/funkatron/Project6581/pull/128)); **Step D** factory bank listening verified on iPad (owner, 2026-11-17). **Step G** (iPad MIDI) and **Step F** (PWA) pinned by owner (2026-11-17); resume in [agents/roadmap-step-g-midi.md](agents/roadmap-step-g-midi.md).

**Deferred (owner, 2026-11-16):** Step **A** [desktop-chromium-qa.md](docs/desktop-chromium-qa.md) and Step **B** iPad load-while-playing / full preset workflow pass—may return before a release milestone. Step **B** code shipped in [#122](https://github.com/funkatron/Project6581/pull/122).

**Deferred (owner, 2026-11-17):** Step **G** Launchkey 37 MK3 + Web MIDI Browser USB spike; Step **F** PWA (low upside vs Safari for current use).

## Release milestones (v0.2.0+)

- [x] Agree that the expanded feature set merits **v0.2.0** rather than continuing the 0.1.x series indefinitely.
- [x] Ship **v0.2.0** scope on `main`: triple SID panels, routing, preset **v5**, startup recovery, timing diagnostics (see [docs/versioning.md](docs/versioning.md)).
- [x] Record **v0.3.0** release floor: per-engine modulation targets and live per-chip settings.
- [ ] Bump `package.json` / `BASELINE` to match commit-derived **0.4.0** (or next milestone) when explicitly authorized, with device-validation notes for layer presets (including post-#94 layer mutes).
- [x] Commit-derived version stamper aligned with milestone floors; ordinary builds use timestamps + SHAs for exact identification.
- [ ] Check CI, Copilot reviews, release notes, and production deployment separately before calling a milestone *released* to users.

## SID initialization recovery (#58) — shipped; verification open

- [x] Characterize production and PR #56 startup in Work's remote Chrome; both reach ready while suspended. The intermittent iPad failure remains unconfirmed.
- [x] Add startup-stage acknowledgments, explicit audio activation, bounded cleanup, serialized retry and stale-callback protection without changing note scheduling or native WASM.
- [x] Add opt-in correlated input/register/render event logging, bounded local capture, and copyable diagnostic reports.
- [x] Footer **Diagnostics** workspace: download bundle, unified **Activity log** (studio trace + note events), live refresh while open ([#118](https://github.com/funkatron/Project6581/pull/118)–[#120](https://github.com/funkatron/Project6581/pull/120)).
- [x] Add behavioral lifecycle regression coverage; see [evidence and limits](docs/sid-startup-investigation.md).
- [ ] Verify the modified preview and iPad Safari startup/recovery, direct keys, sequencer, and actual perceived latency.
- [x] Merge startup recovery to `main`; factory preset work landed separately.
- [ ] Re-verify on current production after major UI changes (triple SID, layer routing).

## Planned UI refinement: consistent control widths and dedicated LFO tab

**Goal:** Make the synth's controls easier to scan and use across desktop and iPad, while giving modulation its own focused workspace. This is **layout and navigation only** — three LFOs, routing, and stationary-thumb visualization are already shipped ([LFO modulation](#lfo-modulation-shipped-layout-and-device-verification-open)).

- [ ] Audit control widths and alignment across the existing tabs: sliders, selects, buttons, numeric readouts, labels and grouped controls. Identify where controls that serve the same role have inconsistent widths.
- [ ] Establish reusable sizing rules for comparable controls and shared spacing/alignment tokens. Keep full-width sliders full-width where appropriate, and allow compact selectors to wrap consistently rather than forcing every control to the same pixel width.
- [ ] Verify that labels, values and control tracks align predictably, with adequate inner padding, no clipped text, and accessible touch targets at iPad portrait/landscape and desktop widths.
- [ ] Move **LFO 1–3** from the Sound tab into a dedicated **LFOs** tab. Preserve every existing waveform, rate, sync, depth, routing and enable control, including visible current values and independent settings for each LFO.
- [ ] Keep the keyboard available at the bottom, preserve current tab/keyboard behavior, and avoid unnecessary scrolling or losing access to the sound controls.
- [ ] Ensure tab changes do not restart audio, reset modulation phase, alter preset state, or introduce note latency. Existing presets must still restore all three LFO configurations.
- [ ] Add focused layout/navigation regression checks, then inspect the result on a real iPad in portrait and landscape. Check Copilot reviews before merging.

**Completion checks:** Controls of the same type look consistently sized and aligned; all three LFOs are accessible from their own tab; audio, modulation, presets and keyboard interaction behave exactly as before.

## Priority 1: factory presets and user preset management

**Goal:** Open Project6581 and immediately select a useful sound, experiment with it, save custom sounds, and move them between devices. This is the highest-priority new feature.

- [x] Create a small **Factory Presets** browser (Bass, Lead, Pluck, Pad and FX) with six original settings. Display unsaved edits clearly.
- [x] Add a separate **My Presets** collection with **Save**, **Save As**, **Rename**, and **Delete**. Factory presets remain read-only.
- [x] Save and restore **all sound and performance settings**: SID model, waveform, ADSR, pulse/PWM, filter, level, unison/polyphony/detune, all three LFOs, master BPM, regular Arp and Game Arp settings. Presets never contain held notes or latches' active note contents, and loading never automatically plays a note.
- [x] Make loading predictable while a note is sounding: **panic only when** routing, voice budget, mode, per-engine enable, or chip model changes (`presetLoadRequiresSilence`); always reset arp/seq state; user message on load. Device pass deferred per owner.
- [x] Persist user presets locally in browser storage with error reporting. Presets are **not** synchronized across devices.
- [x] **Export** individual presets or a user bank as readable versioned JSON; **import** either with schema/range validation, actionable errors, and confirmation before replacing duplicate names.
- [x] Use a simple **version 2** preset format including Game Arp Pattern rate, with no migration for earlier files. Validate imported content before modifying storage.
- [x] Put preset actions at the top of the Sound tab, preserving keyboard access and avoiding an additional full-size editor.
- [ ] Complete iPad Safari device verification for choose factory → edit → save → reload → export → import → play, including loading a different SID chip model. Unit tests cover validation, persistence, and JSON roundtrips.

**Completion checks:** A new user can load a factory sound in one action. A returning user can save, retrieve, export, and import a custom sound without losing its important settings or needing a server account.

## Priority 1 follow-up: C64 game-inspired factory sounds

**Implementation status (2026-11-16):** The **30-sound C64-inspired bank** is on `main` (24 category presets + six legacy factory sounds). **Ten layer showcase presets** exercise **Layer (per SID)** routing (40 factory sounds total). Tests check IDs, categories, validation and JSON roundtrips. **Owner iPad listening (2026-11-16):** presets reported sounding fine in regular use; no per-preset matrix or patch tweaks filed. See [factory-bank notes](docs/c64-factory-bank.md). Further work: formal phrase-matrix logs, pitch-envelope drum validation, and adjustments only from evidence—not duplicate IDs.

**Goal:** Maintain and validate the expanded bank of **24 original presets**, six per category, and expand only after listening on iPad.

| Category | Sounds to cover |
| --- | --- |
| Bass | Tight pulse, PWM bass, filtered saw, hollow square, octave pulse and soft triangle |
| Keys | Pluck, bell, chord stab, organ, slow pad and shimmering PWM keys |
| Leads | Bright pulse, nasal PWM, smooth legato, vibrato, octave lead and filtered saw |
| Drums | Kick, snare, closed hat, open hat, clap and tom |

- [x] HVSC reference log for [Turrican](https://www.lemon64.com/game/turrican), [Parallax](https://www.slayradio.org/sidinfo/MUSICIANS%2FG%2FGalway_Martin%2FParallax.sid), and [Commando](https://www.slayradio.org/sidinfo/MUSICIANS%2FH%2FHubbard_Rob%2FCommando.sid): composer, subtune, time range, traits, factory mapping — [c64-soundtrack-references.md](docs/c64-soundtrack-references.md); audition phrases in [factory-audition-matrix.js](src/factory-audition-matrix.js).
- [x] Listen for short, articulate bass and percussion, slow modulation and evolving keys, and clear pulse leads — owner qualitative pass on iPad Safari (2026-11-16; no per-preset adjust log). Register-trace tuning remains optional for future HVSC-close work.
- [ ] Prototype one patch per category first. For drums, start with one playable hit per preset. If a convincing hit needs a fast pitch sweep or timed waveform changes beyond the current controls, document the gap and scope that work separately.
- [x] Group the existing and new factory presets in the preset browser while retaining My Presets and version-3 import compatibility.
- [x] Soundtrack reference research and per-preset audition phrases (register traces still **manual** when tuning). Agent sheet: [agents/roadmap-step-d-factory.md](agents/roadmap-step-d-factory.md).
- [x] Audition every preset on iPad with a consistent set of low, middle and high notes — owner reported factory presets sound fine in extended iPad use (2026-11-16); summary in [ipad-safari-qa.md](docs/ipad-safari-qa.md) factory listening section. Formal low/mid/high matrix per [factory-audition-matrix.js](src/factory-audition-matrix.js) not filed.

**Completion checks:** At least 24 new sounds are easy to find across the four categories, with a short reference and patch-design log for each game.

## Programmable pitch envelopes (engine shipped; presets and drums open)

**Why this matters:** Classic SID percussion and FX rely on rapid *per-note pitch* changes after note-on, not only ADSR volume. A kick's deep falling attack, a tom's descending body, laser/zap effects, and other classic SID percussion rely on rapid changes to the SID oscillator **frequency registers** after a note starts. A static note or a stepped Game Arp cannot reproduce those smooth, millisecond-scale pitch sweeps. The current factory drums are explicitly approximations rather than authentic pitch-swept drum patches. This also unlocks intentional pitch bends in basses, leads, and effects without requiring a full SID-tune player.

**Implementation status:**

- [x] Editable pitch envelope per **engine voice** (enable, breakpoints, linear/curved interpolation); disabled state matches legacy playback. See [docs/pitch-envelope.md](docs/pitch-envelope.md).
- [x] Audio-clock scheduling in the **AudioWorklet** render path; frequency writes via reSIDfp without changing the WASM synthesis core.
- [x] Per-note / per-unison-slot ownership, legato retune, Stop All, and regression tests (`test/pitch-envelope-*.js`).
- [x] Persist in preset schema **v4+** / **v5** (per-engine `pitchEnvelope`); import upgrades v3 with envelope off.
- [x] Compact graph editor UI (`pitch-envelope-editor.js`).
- [ ] Full breakpoint editor polish, iPad touch verification, and recorded curve-vs-request comparisons (kick/tom transients).
- [ ] Compare recordings on 6581/8580, concurrent voices, and fast arp rates on iPad Safari before claiming drum validation.

**Preset updates and new sounds after pitch-envelope support (follow-up PR):**

- [ ] **Revisit existing drum presets first.** `Low Thud Kick` / `Low Tom` now use kick/tom pitch templates (Step D tuning PR); iPad audition still open. Next: `Noise Snare` / `Noise Clap` listening pass. Keep hats noise-based unless pitch modulation materially improves them. The goal is audible improvement, not simply using the new feature everywhere.
- [ ] **Preserve recognizable existing sounds.** Before changing any shipped factory preset, record its current settings and a reference audio sample. For substantial tonal changes, consider a new named variant with a new ID rather than silently replacing a well-liked patch. Do not overwrite users' saved copies or change factory IDs casually.
- [ ] **Create new pitch-envelope presets** once the effect is tested: swept kick, descending arcade tom, laser/zap, rising or falling FX, pitch-diving bass, and a lead with a short attack scoop. Place them in the existing Drums, FX, Bass and Leads groups, using original sound designs rather than copying commercial soundtrack patches.
- [x] **Protect user presets across the schema change.** v3/v4 imports upgrade with pitch envelope off; v5 round-trips per-engine envelopes (`test/preset-library.test.js`).
- [ ] **Audition before replacing or adding to the default bank.** Compare before/after recordings, pitch trajectory, attack, sustain, levels, retrigger behavior and release tails on iPad Safari for both SID models. Retain distinct, useful sounds; reject redundant or ineffective additions. Document each patch's purpose and what the pitch envelope contributes.
- [ ] **Extend regression coverage** to enforce unique factory IDs/names, preserve legacy sounds and user presets, verify envelope-enabled presets round-trip correctly, and confirm older saved presets retain their prior audio behavior.

**Suggested delivery sequence:** First ship the pitch-envelope engine and editor without altering factory sounds. Then make a separately reviewable preset-refresh PR, testing improved legacy drums and new pitches before merging either set.

**Completion checks:** A user can program and save an audible, repeatable pitch sweep, hear convincing pitch-descending kick/tom examples, and play overlapping notes without pitch leaks or stuck voices. iPad playback and render-time measurements are required before claiming the audio result is validated.

## Priority 2a: composable Arpeggiator and Game Arp

**Goal:** Make Game Arp a reusable pattern triggered at a root pitch, while the regular Arpeggiator independently selects and advances that root. The two features should work together rather than being mutually exclusive.

**Signal flow:**

```text
Held / latched keyboard notes
           |
           v
Arpeggiator (optional)  -> chooses the current root note
           |
           v
Game Arp (optional)     -> applies pattern intervals to that root
           |
           v
SID playback + highlighted keyboard keys
```

- [x] Support four modes: both off (direct notes), Game Arp only (pattern from held/latched root), Arpeggiator only (ordered notes), and both on (ordered roots driving Game Arp).
- [x] Give Arpeggiator responsibility for note ordering, latch and root, and Game Arp responsibility for interval patterns. Both can run together.
- [x] Add independent root-change and pattern-step rates sharing master/local BPM. Root changes preserve the ongoing Game Arp phase until its next pattern tick; selecting a new mode, style or rate restarts the phrase.
- [x] Trigger immediately on first key press, stop on final release when latch is off, and preserve clear-latch/stop behavior. Verify on iPad Safari before claiming device-level reliability.
- [x] Bound the final Game Arp note to MIDI 0–127 and illuminate that actual note. The future scale-lock policy must run after root transposition and pattern offsets.
- [x] Label each role and rate explicitly and avoid a redundant current-note readout above the keyboard. iPad layout verification remains pending.
- [x] CI regression: four composable modes, root/interval math, `resolveGameRoot`, latch release, and source-wiring (`test/arp-composition.test.js`, `test/arp-four-modes.test.js`, `test/arp-key-integration.test.js`). Agent notes: [agents/roadmap-step-c-arp.md](agents/roadmap-step-c-arp.md); desktop pass: [desktop-chromium-qa.md](docs/desktop-chromium-qa.md).
- [x] iPad Safari verification of all four modes, independent timing, transitions, latch/stop and keyboard highlights — owner exercised all combinations on iPad Safari (2026-11-16, summary in [ipad-safari-qa.md](docs/ipad-safari-qa.md) composable section).

**Completion checks:** Both generators can run simultaneously; Arpeggiator changes the root of the ongoing Game Arp phrase, each feature retains a clear independent purpose, and no combination produces stuck notes or misleading highlights.

## Implementation preview: Game Arp step sequencer and 64C layout

**Design reference:** The approved Game Arp sequencer mockup, with the keyboard stretching across the bottom and an optional collapse control. This is the first functional adaptation, not a claim that the entire image is implemented.

- [x] Full-width Arp/Seq editor with a warm Commodore 64C-inspired palette, orange highlights, accessible tab navigation and horizontal scrolling on narrow displays.
- [x] Editable 16-step custom Game Arp pattern with semitone offsets, gate/rest and per-step note length; switch between 4/8/16 active steps.
- [x] Game Arp Preview transport, existing pattern rate/sync/latch, and visual highlighting for the active step.
- [x] Preserve authentic reSIDfp note output and separate root-arpeggiator timing; add sequence state to version-3 presets without invalidating existing files.
- [x] Full-width keyboard with Show/Hide control and remembered visibility. Maintain keyboard and arpeggiator note ownership when hiding or changing octaves.
- [ ] Verify desktop, iPad landscape, portrait, scrolling, touch slider hit targets, keyboard focus and sound on a real device; CI source tests alone are insufficient.
- [ ] Evaluate glide/portamento, accent and filter parameter automation in a separate slice, with deterministic per-step timing and authentic SID register behavior.
- [ ] Design the rest of the broader mockup (FX, Mix, additional independent SID devices) only after the existing working controls fit clearly; never ship decorative dead buttons.
- [ ] Investigate browser timer jitter and AudioWorklet scheduling independently.

## Priority 2b: selectable Western scales and scale-constrained playback

**Goal:** Support conventional 12-tone equal-tempered Western musical scales on the keyboard and in all sounding notes, with predictable, opt-in pitch restrictions.

- [x] Add a **Key** selector (all 12 pitch classes) and a **Scale** selector: Chromatic (default), Major, Natural Minor, Harmonic Minor, Melodic Minor, major-scale modes, Major/Minor Pentatonic, and Blues — `src/western-scales.js`, Play panel (agent notes: [agents/roadmap-step-2b-scale.md](agents/roadmap-step-2b-scale.md)).
- [x] Show in-scale versus out-of-scale keys on the touch keyboard (dimmed out-of-scale when scale ≠ chromatic).
- [x] **Scale lock** quantizes to nearest scale tone (lower MIDI on ties); chromatic or lock off = no quantization.
- [x] Policy at `play()` / `stop()` boundary for keyboard, Root Arp, Game Arp (offsets after transposition).
- [ ] Preserve intended octaves and note-off ownership: when multiple pressed keys map to one pitch, releasing one must not silence the other or leave a stuck note.
- [ ] Test all root keys and scale interval sets, negative/positive transpositions, octave crossings, MIDI note boundaries, held/latch transitions, mode switching, and note-highlighting accuracy.
- [ ] Verify responsive and accessible presentation on iPad Safari, with no avoidable audio latency or extra WASM rebuild.

**Completion checks:** A user can select a conventional key/scale and enable scale lock; all keyboard and arpeggiator output then follows that scale, visibly and audibly. Chromatic/default behavior stays unchanged.

## Priority 3: MIDI input on iPad and desktop

**Goal:** Play Project6581 from a connected controller and from another music app running on the same iPad.

**Delivery order (step-by-step):** **(1)** Desktop [Web MIDI](https://caniuse.com/midi) over HTTPS — Step **E** in the queue above. **(2)** Document and test iPad-capable browsers or a native shell — Step **G**. CC mapping, MIDI Learn, MIDI out, and clock are explicitly later slices.

- [x] **Desktop first — implement** minimal `requestMIDIAccess()` adapter, port/channel UI, note on/off + velocity-zero off + CC64 sustain, routed through keyboard `keyDown`/`keyUp` (**Prefs** dialog). Shipped [#124](https://github.com/funkatron/Project6581/pull/124)–[#125](https://github.com/funkatron/Project6581/pull/125). **Verify** on desktop HTTPS with [desktop-chromium-qa.md](docs/desktop-chromium-qa.md) (optional per owner).
- [ ] **Then verify iPad routes.** Stock Safari on iPad does not expose Web MIDI. Test a MIDI-enabled iPad browser such as [Web MIDI Browser](https://apps.apple.com/us/app/web-midi-browser/id953846217) for both MIDI input and AudioWorklet/WASM playback. Test USB and Bluetooth controllers and a same-iPad sequencer or DAW as separate cases. Record hardware, app and OS versions, routing steps, foreground/split-view behavior and audio recovery after switching apps.
- [ ] **Prototype a native route if needed.** If a MIDI-enabled browser cannot cover both use cases reliably, try a minimal iPad shell hosting the existing synth. Use [Core MIDI](https://developer.apple.com/documentation/coremidi) for physical inputs and expose a [virtual destination](https://developer.apple.com/documentation/coremidi/mididestinationcreatewithprotocol(_:_:_:_:_:)) another app can select. Verify the complete path from MIDI event to audible SID output, including app switching. Record the chosen route and setup steps before committing to packaging.
- [x] **Share the performance path.** On supported desktop browsers use Web MIDI over HTTPS. Route Web MIDI or native input through the same note and arp logic as the on-screen keyboard. Port/channel selector and status in **Prefs**; note-on/off, velocity-zero off, CC64 sustain, panic/unplug cleanup; note ownership across keyboard/MIDI ([#125](https://github.com/funkatron/Project6581/pull/125)).
- [ ] **Verify live playing.** Measure MIDI-to-audio onset alongside the existing keyboard latency baseline. Test channel filtering, repeated notes, simultaneous touch/MIDI, both arps, latch, hot unplug/reconnect and Stop All. Verify on a physical iPad with a connected controller and with another app sending notes to Project6581.
- [ ] **Follow-up slices.** Add optional CC mapping and MIDI Learn. Scope MIDI output separately, distinguishing direct and generated notes and handling matching note-offs and feedback. Evaluate clock sync after live input is stable.

**Completion checks:** A documented iPad setup plays the synth from both a physical controller and another app on the same iPad. Supported desktop browsers pass the same note-lifecycle checks.

## Priority 4: package Project6581 as an application

**Goal:** Make the synthesizer feel like an installable music application on iPad and desktop while retaining the browser version. Begins after **Step E** (desktop MIDI) unless packaging is needed earlier solely for iPad MIDI (**Step G**).

- [ ] Begin with a **Progressive Web App**: manifest, app icon, standalone/home-screen display, clear install guidance, responsive safe-area layout, and an update/version indicator.
- [ ] Cache the **app shell, JS, and reSIDfp WASM** for genuine offline use after first successful install. Keep cache invalidation and deployment updates predictable; never serve an incompatible cached JS/WASM pair.
- [ ] Ensure local user presets, imported banks, and saved recordings are easy to find, export and retain. Explain browser storage clearing and backup limitations.
- [ ] Review app-like interaction details: startup/loading feedback, keyboard always accessible, clear unsaved-preset state, consistent navigation, touch targets and transport controls.
- [ ] Evaluate **native wrappers** only where they deliver tangible benefits, especially reliable MIDI access on iPad, file import/export, audio sessions and background handling. Compare an iOS shell with desktop packaging before choosing a framework. Do not replace the existing lightweight web deployment by default.
- [ ] Test offline launch, version upgrades, WAV/M4A sharing, iPad Files import/export and recovery after a suspended/resumed app session.

**Completion checks:** Project6581 can be launched from a home screen or desktop as a focused standalone experience and used offline, while retaining consistent audio, user presets and the existing public web URL.

## Planned investigation: local SID tune playback

**Goal:** Find out whether Project6581 can open a local `.sid` file and play its subtunes reliably on iPad and desktop.

- [ ] **Evaluate a dedicated player.** Read the [HVSC format notes](https://hvsc.c64.org/faq) and prototype [libsidplayfp](https://github.com/libsidplayfp/libsidplayfp) compiled to WASM. A C64 CPU/player environment executes PSID tune code and produces timed SID register writes. reSIDfp consumes those writes and renders PCM audio. RSID needs more complete C64 machine emulation. Check emulator and ROM dependencies, distribution requirements, WASM download size and startup cost.
- [ ] **Prove the smallest useful player.** Open a local file from iPad Files or the desktop picker. Start with single-SID PSID tunes, display title, author and subtune selection, and provide Play and Stop. Validate header, size, offsets and song selection before emulation. Keep player state separate from the synth and load the player on demand.
- [ ] **Compare playback and decide scope.** Check Turrican, Parallax and Commando files where their format matches the prototype, and use test fixtures we can distribute for automated checks. Compare subtune selection, PAL/NTSC tempo and chip model against a reference player. Measure startup, CPU load and dropouts on iPad, and verify return to live synth playback. Report separate results for RSID and multi-SID before promising either format. Give unsupported and malformed files clear error messages.

**Completion checks:** A small prototype and compatibility report establish which files play correctly, what the iPad performance costs are, and whether to proceed with an in-app player. User-selected tunes are read locally.

## Record the SID output (WAV and M4A) — shipped; iPad verification open

**Goal:** Let musicians record what they actually hear from the emulated SID and export a useful audio file without a microphone or external software.

- [x] Add Record / Stop & save with a persistent downloadable file link.
- [x] Capture true reSIDfp PCM in bounded AudioWorklet chunks and encode 16-bit mono WAV using the actual AudioContext sample rate.
- [x] Offer M4A (native browser AAC in an MP4 container) only where supported; do not mislabel WebM or AAC as MP3.
- [x] Limit recording to three minutes and preserve playback and existing LFO/arp behavior.
- [ ] Confirm recording and downloading on iPad Safari, including alternate-app return, short captures, and memory use.
- [ ] Consider optional MP3 conversion only after core WAV/M4A operation is validated. Avoid a large encoder dependency for the initial recording feature.
- [ ] Export matched before/after PWM recordings and use their spectra and waveforms to diagnose [the reported weak PWM effect](https://github.com/funkatron/Project6581/issues/45).

**Completion checks:** A user can record and download a valid WAV, and an M4A where native browser support exists. CI success alone is not an iPad audio verification.

## Current regression hardening

- [x] Add register-level tests for independent note allocation across three SID chips, deterministic oldest-voice stealing, Unison transitions, and panic/release.
- [x] Correct whole-note synchronized LFO rate conversion; 4/1, 2/1, and 1/1 correspond to 16, 8, and 4 beats per cycle.
- [x] Improve iPad panel-width-responsive LFO controls and suppress duplicate key release after pointer capture ends.
- [x] Run CI on the regression PR: 35 tests passed, zero failures (2026-11-04).
- [ ] Complete real iPad Safari audio/layout verification using [the device checklist](docs/ipad-safari-qa.md); a code review alone cannot complete this step.
- [x] Confirm the GitHub Pages deployment of PRs #39 and #40 (commit `ec25e9c`, November 4, 2026).

The [audio-clock investigation](docs/audio-clock-lfo-investigation.md) tracks extending worklet-rate modulation beyond filter/volume/resonance. Spectrum analyzer, oscilloscope, and spectrogram remain separate roadmap items. Triple-SID engines are shipped (see below).

## November 5, 2026: latency report and neutral Game Arp reset

- [x] Inspect the supplied iPad screen recording: visible keyboard presses and captured attacks are about 0.9–1.0 seconds apart in multiple examples. This is **recorded A/V separation**, not proof of device speaker latency; iOS screen recording can affect A/V synchronization.
- [x] Make new/reset Game Arp sequences neutral: 16 zero-offset steps, every gate ON, 75% note length. Preserve explicitly saved user patterns.
- [x] Flush note-on SID register batches immediately in the input handler rather than deferring to a microtask.
- [x] Add opt-in in-app timing diagnostics that compare input-to-worklet acknowledgment, reSIDfp render cost versus audio quantum budget, and browser-reported output latency. Do not mislabel any of these as physical speaker latency.
- [ ] Verify diagnosis on the same iPad without screen recording, with arpeggiators off versus on, and built-in speakers versus external audio routes.
- [ ] If render time exceeds the block budget or dispatch round trip is large, profile/optimize worklet CPU and consider rendering only active SID chips (requires a native WASM rebuild and careful envelope-tail tests). Keep this separate from the reset and instrumentation PR.

## Priority: reduce keyboard-to-audio latency

**Goal:** Minimize the delay between touch/keyboard press and the first audible SID sample on iPad Safari and desktop browsers. Preserve authentic reSIDfp rendering, without falling back to prototype audio.

Distinguish **in-app timing** (footer, Diagnostics Activity log, worklet metrics) from **perceived speaker output** and from **intermittent browser audio-path drift** (meters on time, sound late; fresh tab recovery — see [latency-investigation.md](docs/latency-investigation.md)).

### Investigation

- [ ] Complete **Step A:** [desktop-chromium-qa.md](docs/desktop-chromium-qa.md) on current production; file whether lag reproduces on Chromium or is Safari/session-specific. Agent CI smoke: [agents/roadmap-step-a-chromium.md](agents/roadmap-step-a-chromium.md).
- [ ] Measure touch/pointer event to SID register dispatch, AudioWorklet receipt, and first nonzero PCM sample separately.
- [ ] Measure perceived and output latency on iPad Safari **and desktop Chromium**, including AudioContext `baseLatency` and `outputLatency` when available.
- [x] Inspect AudioWorklet messaging: each note currently emits multiple register writes. PR #14 batches writes into one message per JavaScript turn.
- [ ] Check buffering, SID envelope attack, and note retrigger behavior.
- [ ] Compare Game Arp's first note with direct keyboard playing and subsequent arp steps.

### Implementation and verification

- [ ] Eliminate avoidable main-thread delays and redundant note-off/note-on cycles. The write batching change is not yet latency-verified.
- [ ] Reduce or bound scheduling latency without introducing clicks, dropouts, or unstable timing.
- [ ] Add regression tests for note dispatch and Game Arp onset.
- [ ] Verify latency improvements with before/after measurements on iPad Safari and desktop Chromium.
- [ ] If intermittent output lag persists with normal in-app metrics, document recovery steps (new tab, context resume) before engine or WASM changes.

**Completion condition:** Demonstrated lower median and tail key-to-sound latency under equivalent test conditions, with reliable SID-only audio and no regression in arpeggiator timing.

## LFO modulation (shipped; layout and device verification open)

**Goal:** Three independent LFOs modulate continuous parameters per engine without overwriting saved base slider values. See [live-sid-engine.md](docs/live-sid-engine.md) for scheduling split (worklet vs main thread).

**Shipped on `main`:**

- [x] **LFO 1–3** with enable, rate, sync, depth, target, and **engine scope** (`all` or SID 1–3).
- [x] Waveforms: sine, triangle, sawtooth, square, **sample-hold** (`src/lfo-modulation.js`).
- [x] Targets: cutoff, resonance, volume, pulse width, detune, ADSR stages, PWM depth/rate — with pulse-only gating and unison gating for detune.
- [x] **Summation** when multiple LFOs share a target (offset sum + clamp).
- [x] **Stationary-thumb** UI and effective-value readout ([modulation-center](#modulation-center-shipped-ipad-verification-open) below).
- [x] **Filter/volume/resonance** modulation on the audio clock in the worklet (`useAudioClockLfo=true`); presets persist LFO blocks in v5.
- [x] Automated waveform, routing, sync-division, and modulation-track tests.

**Still open:**

- [ ] Dedicated **LFOs tab** and control-width polish (UI refinement section above).
- [ ] iPad Safari verification for simultaneous LFOs, touch on modulation sliders, and ADSR/PWM paths.
- [ ] Extend audio-clock modulation to remaining targets or reduce stepping ([audio-clock investigation](docs/audio-clock-lfo-investigation.md)).

## Voice allocation controls (shipped; iPad verification open)

**Design and implementation:** [Voice allocation layout](docs/voice-allocation-layout.md). The approved compact Voice Assign, Voices and Unison selectors and a full-width Detune slider are implemented in the same PR. Existing styling and keyboard are retained. **Spread remains excluded.**

- [x] Plan a compact **Voice Assign** selector: **Mono, Legato, Duo, Poly**.
- [x] Define **Voices** (1–9 total hardware oscillators) separately from **Unison** (1–Voices stacked layers per note), with **Detune** in cents.
- [x] Specify a compact, wrapping inline group of **content-sized** Voice Assign, Voices and Unison selectors with **Detune on a full-width row**, retaining the current Sound tab, iPad/desktop keyboard visibility, and accessible touch targets.
- [x] Document the desired allocation, note ownership, clipping/voice limits, legato envelope behavior, and preset/LFO interactions without changing the audio engine.
- [x] Voice Assign through PR #50: nine-oscillator budget, per-note Unison stacks, Detune (no stereo Spread).
- [x] Voice ownership, oldest-stack stealing, Mono retrigger, Legato pitch-only transitions; presets **v5**.
- [ ] iPad playback and responsive layout verification ([ipad-safari-qa.md](docs/ipad-safari-qa.md)).

**Scope decision:** No stereo **Spread** (detune-as-width) milestone. Per-engine **pan** and triple SID cards are shipped separately.

## Modulation-center (shipped; iPad verification open)

**Goal:** Readable modulation without moving slider thumbs during playback.

- [x] Base value + units always visible; thumb is the editable center; green track shows effective value; worklet posts `modulation-display` for live filter readouts.
- [ ] iPad Safari portrait/landscape touch and numeric readability ([ipad-safari-qa.md](docs/ipad-safari-qa.md)).

## Three independently configurable SID engines (shipped; polish open)

**Goal:** Use **one, two, or three separate SID sound engines** in a session, each with independent settings, while keeping master keyboard, arpeggiators, and voice allocation understandable.

**Architecture (2026-11):** Three reSIDfp chips still back up to **nine** oscillators (three per chip). The UI exposes **three always-visible engine cards** with per-chip enable, model, waveform/ADSR/PWM, filter, pan, volume, meters, and pitch envelope. **Note routing:** **SID 1**, **All (shared voices)**, or **Layer (per SID)**. LFO targets can scope to **all** or **SID 1–3**. Preset format **v5** stores `sound.engines[]` and `performance.routing`.

### Gate 1: design — done (see [triple-sid-ui-mockup.md](docs/triple-sid-ui-mockup.md))

- [x] Always-visible **SID 1–3** cards (no add/remove; max three).
- [x] **Master** scope: voice assign, Voices/Unison/Detune, keyboard, arps, BPM, Stop all, record.
- [x] **Per-engine** scope: enable, 6581/8580, voice, filter, pan, volume, pitch envelope.
- [x] Routing design: shared pool vs layer vs SID-1-only; wireframe in repo docs.
- [x] LFO allocation: global LFOs with per-engine target (`engines: '1'|'2'|'3'|'all'`).
- [x] Migration: legacy presets upgrade to three engines with settings on SID 1.

**Illustrative information architecture, not a final layout:**

```text
 MASTER: BPM   Keyboard   Arpeggiators   Stop all   Output
 SID DEVICES: [SID 1 ●] [SID 2] [ + Add SID (max 3) ]
 SELECTED:    SID 1  |  MOS 6581  |  Enabled  |  Volume  |  Pan
              Wave/voices  |  ADSR  |  Pulse/PWM  |  Filter
 MODULATION:  LFO 1–3  |  Target: SID 1 · Cutoff
```

### Gate 2: implementation — mostly done; verification open

- [x] Explicit three-engine model in `sid-engines.js` / presets v5.
- [x] Route keyboard and arpeggiators per `performance.routing`; layer mode stacks chips (see layer factory presets).
- [x] Independent per-engine 6581/8580 and filters without resetting siblings (live register path).
- [x] Automated tests: engine panels, routing, presets, polyphony; CI deploy on `main`.
- [x] **Layer voice ownership** ([#94](https://github.com/funkatron/Project6581/pull/94)): `layerStacks` / `noteOnLayer` per chip in Layer mode—muting or disabling one engine does not steal voices on siblings (regression tests in `test/unison-sid-controller.test.js`).
- [ ] **iPad:** Layer mode with one engine Voice off—chip mutes without promoting another (manual row from #94 test plan).
- [ ] iPad Safari: all routing modes, pan/clip, tab switching with held notes, CPU under layer stacks.
- [ ] Future: optional “single focused SID” compact layout (roadmap UI refinement), not a return to one hidden engine.

**Completion checks:** Layer routing plays predictable stacked notes; muting or disabling one engine does not corrupt others; device QA recorded in [ipad-safari-qa.md](docs/ipad-safari-qa.md).

## Planned: master effects (FX) section

**Goal:** Add a real **Effects** workspace — not decorative mockup buttons — with a focused set of post-SID (or master-bus) processors that musicians can hear while playing and save in presets.

**First processors (owner priority):**

- [ ] **Compressor** — tame peaks and even out factory PWM/leads vs quieter patches; expose threshold/ratio/makeup or a small sensible default set.
- [ ] **Distortion** — intentional drive/saturation on the mixed SID output (distinct from chip pulse width).
- [ ] **Delay** — tempo-synced echoes sharing master BPM where practical; wet/dry mix.
- [ ] **Phaser** — classic swept notch filter on the output bus.

**Engineering notes:**

- [ ] Implement in the **AudioWorklet / Web Audio graph** after reSIDfp mix, preserving authentic per-note SID rendering (no WASM core change unless a measured defect requires it).
- [ ] Persist FX parameters in preset schema (version bump when shipped); factory presets ship sensible off/default states.
- [ ] iPad-safe touch targets, bypass per effect, and level staging so FX do not routinely clip the master meter.
- [ ] Regression tests for preset round-trip, bypass, and deterministic render smoke where feasible without golden-ear claims.

**Completion checks:** User can enable each effect from a dedicated FX area, hear the change on live play and arps, save/recall with presets, and disable all FX without altering SID register behavior.

## Planned: drum sequencer

**Goal:** A **drum-focused step sequencer** separate from the melodic **Game Arp** (semitone offsets from a held root). Trigger short drum/noise hits on a grid with its own clock — usable alongside keyboard, Root Arp, and Game Arp without stuck notes or confusing routing.

- [ ] Define scope: step count (e.g. 16), per-step instrument or drum-preset slot, velocity/gate, and whether steps address **factory drum IDs** or fixed noise/pitch templates.
- [ ] Transport: enable, rate/sync to master BPM, preview without keyboard, Stop all integration.
- [ ] Routing: default to Drums factory patches or a dedicated drum voice path; document interaction with **triple SID** and **layer** mode.
- [ ] UI: grid readable on iPad landscape; reuse 64C-inspired sequencing patterns where it helps, without duplicating the Game Arp editor verbatim.
- [ ] Preset persistence for patterns and transport settings; import/export with validation.
- [ ] Behavioral tests for clock wrap, mute steps, and coexistence with Game Arp / Root Arp.

**Completion checks:** User can program a repeating drum pattern, hear it in time with master BPM, switch factory drum sounds, and save the pattern in a user preset. No fake controls — every step either sounds or is an explicit rest.

**Related:** [Programmable pitch envelopes](#programmable-pitch-envelopes-engine-shipped-presets-and-drums-open) and [factory Drums bank](#priority-1-follow-up-c64-game-inspired-factory-sounds) for timbre; drum **level** parity is tracked in the next section.

## Planned: drum level boost (mix parity)

**Goal:** Factory and live **drum/noise** hits often read quieter than **PWM-heavy** bass, keys, and leads. **Ship with SID 4 + drum sequencer** ([agents/roadmap-drum-sequencer-ui.md](agents/roadmap-drum-sequencer-ui.md) §6e): post-mix **output boost** on the drum chip only.

- [ ] **Product behavior:** SID 4 **Boost** control: **0 dB / +6 dB / +12 dB** (default **+6**); stored in `sound.engines[3].outputBoostDb`; not a hidden rewrite of factory JSON.
- [ ] WASM `sid_set_chip_gain` (or equivalent) applied before master pan sum; meters and recording reflect boosted drum bus.
- [ ] Presets without engine 4: no boost until drum feature; engine 4 template uses **+6 dB**.
- [ ] iPad listening pass: drum seq vs PWM lead at **+6** and **+12**; document clip risk at +12 with full unison.

**Completion checks:** At default **+6 dB**, owner-agreed drum grooves sit in the same ballpark as PWM patches; **0 dB** matches unboosted chip level.

## Planned investigation: audio-clock LFO scheduling

**Goal:** Replace main-thread timer-driven SID modulation with timing derived from the audio engine, without increasing audible latency or undermining future multi-SID operation.

- [ ] Measure actual LFO callback jitter, missed updates, and parameter stepping at 60 Hz on iPad Safari and desktop, including under UI load and background/foreground transitions.
- [ ] Inspect AudioWorklet-to-reSIDfp register scheduling and identify the smallest viable audio-thread modulation prototype.
- [ ] Compare CPU load, timing accuracy, audible artifacts, and message overhead for main-thread timers versus audio-clock scheduling across 1–3 SID chips.
- [ ] Define how BPM synchronization, phase continuity, sample-and-hold, multiple modulation targets, and stop/reset work across the thread boundary.
- [ ] Add deterministic timing tests and device-level audio checks before replacing the current 60 Hz fallback.

**Completion checks:** Documented measurements and a bounded implementation plan; no architectural migration until benefits and multi-SID implications are understood.

## Planned: audio visualization instruments

**Goal:** Provide optional, low-overhead visual feedback for authentic SID output, using a recessed hardware-instrument display consistent with the Commodore 64C-inspired interface.

- [ ] Prototype a real-time spectrum analyzer using Web Audio `AnalyserNode` on the existing SID audio output; display frequency versus magnitude, with readable frequency markers and sensible dB scaling.
- [ ] Evaluate a time-domain oscilloscope for examining SID waveforms, pulse-width changes, and envelopes.
- [ ] Explore a scrolling spectrogram for viewing harmonics, filter sweeps, and LFO modulation over time.
- [ ] Keep visualization optional and pause rendering when hidden, backgrounded, or disabled; avoid adding audio latency or disturbing playback.
- [ ] Measure rendering overhead on iPad Safari and desktop, including multi-SID configurations; choose FFT size, refresh rate, and display resolution based on evidence.
- [ ] Consider whether combined output and per-SID views are useful once independent SID chips are supported.
- [ ] Ensure the display is responsive, accessible, and styled as a recessed instrument panel without consuming essential control space.

**Completion checks:** Spectrum visualization accurately follows SID audio, can be disabled without affecting synthesis, and meets device-level performance and usability checks. Oscilloscope and spectrogram are follow-on options, not prerequisites.
