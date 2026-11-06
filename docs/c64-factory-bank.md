# C64-inspired factory sound bank

**Status:** 24 original new presets across Bass, Keys, Leads and Drums (six per group), plus the six original Project6581 factory sounds, for **30 total**. The first four patches have been auditioned on iPad with encouraging feedback; the other 20 are unverified sound-design starting points.

These are **original patches**, not reproductions or extracted settings from commercial games. Research references for future listening: *Turrican*, *Parallax*, and *Commando*. Composer/subtune/time-range and SID register traces must be documented before associating an individual patch with a specific game.

The preset browser groups sounds as **Bass / Keys / Leads / Drums / FX**. Legacy Lead, Pluck and Pad presets appear under Leads or Keys without changing their stored metadata or preset IDs. All sounds still use preset JSON **schema version 3**.

## Expanded sound selection

| Group | Sound | Design intent | Quick audition |
| --- | --- | --- | --- |
| Bass | Tight Pulse Bass ✓ | Short, narrow pulse | C2, G2, C3 |
| Bass | PWM Drive Bass | Moving pulse-width texture | Hold C2, then repeat |
| Bass | Filtered Saw Bass | Low, rounded sawtooth | C2, F2, C3 |
| Bass | Hollow Square Bass | Band-pass hollow pulse | Hold C2 and C3 |
| Bass | Octave Runner Bass | Built-in four-step octave movement | Hold C2, then E2 |
| Bass | Warm Triangle Bass | Gentle low triangle | C2, G2, C3 |
| Keys | Shimmer PWM Keys ✓ | Soft PWM texture | C3, E4, G4 |
| Keys | Chip Pluck Keys | Quick, percussive pluck | Repeated C4, E4 |
| Keys | Bell Keys | Decaying triangular bell approximation | C4, C5, G4 |
| Keys | Chord Stab Keys | Two-oscillator unison chord stacks | C4–E4–G4 together |
| Keys | Organ Keys | Polyphonic held chords | Hold C4–E4–G4 |
| Keys | Slow Glass Pad | Slowly opening, modulated sustain | Hold C4–E4 |
| Leads | Bright Pulse Lead ✓ | Narrow, clear pulse lead | C4, G4, C5 |
| Leads | Nasal PWM Lead | Resonant, animated narrow pulse | Hold C4 and G4 |
| Leads | Smooth Legato Lead | Triangle with no-retrigger transitions | Overlap C4→E4→G4 |
| Leads | Tremolo Pulse Lead | Volume LFO creates audible amplitude tremolo | Hold C4 |
| Leads | Octave Chase Lead | Four-note Game Arp octave pattern | Hold C4 |
| Leads | Filtered Saw Lead | Resonant saw with moving cutoff | Hold C4, G4 |
| Drums | Noise Snare ✓ | Short filtered noise burst | Rapid C3, C4 hits |
| Drums | Low Thud Kick | Short low-pitched triangle | Repeat C1/C2 |
| Drums | Closed Noise Hat | Very short, high-passed noise | Rapid C4 |
| Drums | Open Noise Hat | Longer high-passed noise decay | C4 taps with space |
| Drums | Noise Clap | Short band-pass noise with amplitude modulation | Repeat C4 |
| Drums | Low Tom | Longer decaying triangular low tone | C2, G2 |

✓ means a prototype from the earlier four-sound batch. It **does not** imply the complete new bank has been acoustically verified.

The six original presets remain unchanged: Deep Bass, Arcade Lead, Chiptune Pluck, Pulsing Pad, Soft Flute and Filter Motion. The latter legacy categories are mapped into browser groups only.

## Current synthesis limitations

- **Static pitch:** A note's oscillator frequency does not have its own programmable envelope. The kick and tom are short triangular tones, not true descending pitch-swept SID drums. Noise clap/snare/hat patches are filtered noise approximations.
- **Octave phrases:** The octave bass and lead use the existing four-step Game Arp, producing discrete pitches rather than smooth bends. Neutral/reset Game Arp steps remain unchanged.
- **Tremolo is not vibrato:** The Tremolo Pulse Lead modulates **volume**; it does not modulate pitch.
- **No sampled soundtracks:** The presets use the existing SID controls and reSIDfp engine. No game music or copyrighted instrument samples are bundled.

See the [programmable pitch envelopes roadmap](../ROADMAP.md#planned-synthesis-feature-programmable-pitch-envelopes) for the separate feature needed to recreate fast kick/tom pitch falls and more expressive lead effects.

## iPad listening and interaction checks

- [ ] Audition each new patch at low, middle and high notes using built-in speakers and, if available, headphones. Record impressions of level, brightness, timbral distinction and usefulness.
- [ ] Confirm the grouped preset picker scrolls and remains usable in iPad portrait and landscape, with the keyboard still accessible.
- [ ] Check rapid retriggers, release tails, Game Arp patterns, polyphonic chords, Stop All and switching between sounds while a note is held.
- [ ] Pay special attention to PWM audibility, note clicks, high-pass hats, noise-clap timbre, and filter/resonance differences between 6581 and 8580.
- [ ] Verify all saved version-3 user presets, import/export round trips and existing legacy sounds still work. No unexpected playback on selection.
- [ ] For any game-specific comparisons, document original C64 composer/subtune/time range and observable sound characteristics before claiming a match.

## Later improvements

Develop [programmable pitch envelopes](../ROADMAP.md#planned-synthesis-feature-programmable-pitch-envelopes) as an independent PR. Once available, revise kick/tom patches using genuine frequency sweeps. Investigate sequenced noise bursts or waveform changes only if the current controls cannot produce an adequate snare/clap. Subsequent expansion should be based on listening rather than patch counts alone.
