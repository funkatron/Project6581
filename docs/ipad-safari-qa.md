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
- [ ] Press/release a key once and check that it releases only once, including after pointer capture ends.
- [ ] Turn device orientation while no notes are held; no stranded active keys.

## Polyphony and Unison

Disable Game Arp and Arp first, to hear independent keys rather than pattern notes.

- [ ] Set Voices to 3 and Unison **off**. Hold C, E, and G simultaneously; hear a three-note chord.
- [ ] Play a fourth note while still holding the chord; oldest voice is stolen predictably.
- [ ] Releasing the physically held, stolen key does **not** silence the replacing note.
- [ ] Set Voices to 8, Unison off; verify multiple notes spanning all three SID instances.
- [ ] Enable Unison, Voices 4, and Detune 12¢. One held key should sound layered, not a chord.
- [ ] In Unison, hold two keys, release the newest; the earlier held note should resume.
- [ ] Switch between modes, adjust Voices, and use Stop all. No hanging notes or unexpected sounds.

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

## Recording results

Capture: iPad model, iPadOS/Safari version, orientation, displayed build ID, repro steps, expected versus actual result, and any audio or layout screenshot/video. Mark each item only after an actual device check.

**Release policy:** CI success and GitHub Pages deployment success are separate. Do not mark this checklist complete based on CI alone. Do not publish a PR preview unless specifically requested.
