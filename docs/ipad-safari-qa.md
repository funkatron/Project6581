# iPad Safari release verification

This is a **device test plan**, not evidence that any test has passed. Automated Node tests cover core register behavior but cannot establish sound quality, screen layout, or iPadOS AudioContext behavior.

## Test environments

- [ ] iPad Safari, portrait, default browser text size; reload from a clean tab.
- [ ] iPad Safari, landscape; rotate once while the keyboard is displayed.
- [ ] Narrow viewport (e.g. iPhone Safari or Safari responsive mode); check both tabs.
- [ ] Desktop browser, using a mouse and physical keyboard for comparison.

## Audio readiness and touch controls

- [ ] Engine LED shows loading, then ready/running; the first deliberate touch unlocks audio if needed.
- [ ] No unexpected fallback synth, missing reSIDfp binary, stuck spinner, or silent failure.
- [ ] Main header, status text, and Stop all fit without text touching or disappearing behind panel borders.
- [ ] Switch Sound / Arpeggiator & LFO tabs; controls remain operable and the piano keyboard stays visible.
- [ ] Controls do not overlap; labels are readable. LFO layout adapts to the **panel** width in portrait and landscape.
- [ ] All LFO select boxes, sliders, switches, and octave buttons respond to touch without selecting nearby controls.
- [ ] Compare the black-key widths to white-key widths in the two-octave desktop layout and compact one-octave iPad layout. Black keys should be roughly two-thirds as wide and remain centered between white keys.
- [ ] Try C♯, D♯, F♯, G♯ and A♯ by touch in portrait and landscape, including near each black key's edges; notes should trigger reliably without accidentally selecting an adjacent white key.
- [ ] Verify black keys do not overlap neighboring black keys or clip their note labels; desktop mouse, physical keyboard, and held-note highlighting behave as before.
- [ ] Press/release a key once and check that it releases only once, including after pointer capture ends.
- [ ] Turn device orientation while no notes are held; no stranded active keys.

## Voice assignment and Unison layers

Disable Game Arp and Arp first, to hear independent keys rather than pattern notes.

- [ ] Set **Poly**, Voices **6**, Unison **2**. Hold C, E and G; hear three simultaneous pitches with two oscillators each.
- [ ] While holding three Poly notes, play a fourth; the **oldest** complete stack is stolen and a late release must not cut off the new note.
- [ ] Releasing the physically held, stolen key does **not** silence the replacing note.
- [ ] Set Voices **8**, Unison **1**, Poly and play an eight-note chord spanning three emulated SID chips.
- [ ] Set **Mono**, Voices **4**, Unison **4**, Detune **12¢**; one key sounds four detuned oscillators.
- [ ] In Mono, overlap two keys and release the newest. The earlier pitch returns with retriggering. Repeat in **Legato**, checking that overlapping transitions do not restart the envelope.
- [ ] In Duo, add a third pitch; the oldest pitch is displaced. Test late note-off and repeated same-note presses.\n- [ ] Change Assign, Voices, Unison while notes sound, then Stop all. No stuck gates; the compact selectors remain readable on iPad portrait/landscape.

## Synchronized LFOs

Start with a sustained Pulse note, moderate filter cutoff, LFO depth, and Cutoff as target. Turn **Sync** on and use Master BPM = 120.

| Displayed rate | Expected cycle duration |
| --- | --- |
| 4/1 | 8 seconds |
| 2/1 | 4 seconds |
| 1/1 | 2 seconds |
| 1/4 | 0.5 seconds |
| 1/16 | 0.125 seconds |
| 1/32 | 0.0625 seconds |

- [ ] 4/1 and 2/1 are slower than 1/1; shorter divisions are progressively faster.
- [ ] Changing Master BPM scales LFO speed and does not stop the sound.
- [ ] Disable/retarget LFO and verify unmodulated base values return.
- [ ] Compare 1, 2, and 3 simultaneous LFOs; observe any audible stepping or UI stutter.
- [ ] Move Safari to the background and back; record whether timing drifts or audio stops.

## Top-bar preset library (pending iPad device verification)

- [ ] On iPad landscape, tap the compact current-preset name in the top bar. The modal opens with Factory presets and My presets in two columns without moving the keyboard or Sound panel.
- [ ] On narrow screens, verify the two collections stack vertically and scroll independently; all actions remain reachable without horizontal overflow.
- [ ] Factory sounds are read-only, user sounds remain separate in local storage, and the selected preset is visibly indicated in the correct list.
- [ ] Choose a factory or user preset; the modal closes, the top bar updates, and playing the keyboard uses the newly selected sound.
- [ ] Confirm the unsaved-change dot and discard confirmation, and test dialog close and Escape without changing the current sound.
- [ ] Save, Save as, Rename, Delete, Import and Export inside the modal; verify the persistent download link remains tappable after export.

## Factory/user presets (additional sound and persistence checks)

- [ ] Choose each factory sound, hold a note, and verify the audible waveform, filter and envelope change.
- [ ] Modify a factory preset, see the unsaved indicator, then Save as… and reload the user preset.
- [ ] Modify an existing user preset, Save, Rename, and Delete it; factory presets remain read-only.
- [ ] Confirm master BPM, Game Arp style/enable, Arp sync/latch/rate and all three LFOs restore from the same preset.
- [ ] Loading a preset while a note is held clears active notes but does not trigger new playback or leave hanging notes.
- [ ] Select a preset using the other SID chip model; check audio reinitializes and Safari allows sound after a key gesture.
- [ ] Export one preset and a full user bank to Files, import again, and confirm duplicate-name replacement requires permission.
- [ ] Import malformed JSON and an out-of-range parameter; confirm existing user presets remain unchanged.
- [ ] Refresh the app and verify saved user presets remain available, without assuming cloud sync.

## Composable Game Arp and Arpeggiator (pending device verification)

- [ ] Both off: keys play directly, with no pattern timers running.
- [ ] Game Arp only: holding one key triggers the chosen style immediately; Pattern rate changes its note steps.
- [ ] Arpeggiator only: three keys cycle in Up, Down, Up/Down or Random order; Root rate controls the interval.
- [ ] Both on: Arpeggiator changes the root while Game Arp independently runs its interval pattern; Root 1/4 and Pattern 1/16 are noticeably distinct.
- [ ] Releasing the last key with Latch off stops both clocks; with Latch enabled, the stored roots continue.
- [ ] Switch styles, enable/disable either generator, change BPM and rates, use Clear latch and Stop all. No stuck or doubled notes.
- [ ] Generated-note highlights follow the actual sounding pitch, including roots outside the visible keyboard range, without adding note text.

## Audio recording and download (pending device verification)

- [ ] With SID active, record a short sustained note as WAV; stop and verify a playable, nonempty file in iPad Files.
- [ ] Confirm M4A appears only if iPad Safari reports supported native audio/mp4 recording; try the same note in M4A and verify it plays.
- [ ] If an automatic download does not open on iPad, use the persistent Download WAV / Download M4A link.
- [ ] Verify selecting a format, pressing Record, playing, and Stop & save do not interrupt normal playback.
- [ ] Record a silence-to-note transition and check the audio does not rely on microphone permission.
- [ ] Try three minutes of recording and verify automatic stop, export, reasonable memory consumption and responsive keyboard/controls.
- [ ] Compare Pulse note WAV captures with PWM depth 0% and 40%, rates 1 Hz and 5 Hz, to assess the reported weak sound change.

## Stationary-center slider visuals (pending device verification)

- [ ] With no LFO assigned, all 11 continuous sound controls show their numeric base value and appropriate unit.
- [ ] Assign LFOs above and below the center. The thumb remains fixed at the user-selected base position; a green segment moves between center and effective value.
- [ ] Check both values remain readable on iPad portrait and landscape, including short landscape viewports and narrow phone widths.
- [ ] Edit the slider while modulation runs; the thumb updates the base while audio follows the resulting effective value.
- [ ] Retarget, disable or reset LFOs and ensure the moving segment disappears while the base value remains visible.
- [ ] Verify touchscreen drag, VoiceOver/keyboard range editing and 60 Hz updates do not block inputs or cause audible timing problems.

## Expanded LFO routing (pending device verification)

- [ ] All 11 target names appear in each LFO's Target selector, with touch-friendly selection in portrait and landscape.
- [ ] ADSR modulation audibly changes held Unison and polyphonic notes without breaking note release or causing stuck gates.
- [ ] Detune changes pitch between active layers in Mono, Legato, Duo and Poly when Unison is greater than 1; at Unison 1 the slider is inactive without losing its value.
- [ ] PWM depth/rate audibly change Pulse movement, without changing Triangle/Sawtooth/Noise output.
- [ ] Turning off or retargeting an LFO restores the saved base setting; two LFOs on one target combine predictably and clip at bounds.
- [ ] Check fast modulation CPU use, UI responsiveness, register-write load, and audible stepping at 60 Hz. These are not established by Node tests.

## Arpeggiator keyboard visuals (issue #41, pending device verification)

- [ ] Game Arp illuminates each generated pitch, not just the physically held root key.
- [ ] Regular Arp illuminates steps in Up, Down, Up/Down and Random patterns.
- [ ] Gold physical touches remain distinguishable from teal generated notes, including when they overlap.
- [ ] A generated note outside the visible octave shows **no misleading key highlight** and no extra note text.
- [ ] Clear latch, Stop all, mode changes, and Safari blur remove a stale generated-note highlight.
- [ ] At high rates, the UI remains responsive without flashing or additional audio events.

## Recording results

Capture: iPad model, iPadOS/Safari version, orientation, displayed build ID, repro steps, expected versus actual result, and any audio or layout screenshot/video. Mark each item only after an actual device check.

**Release policy:** CI success and GitHub Pages deployment success are separate. Do not mark this checklist complete based on CI alone. Do not publish a PR preview unless specifically requested.
