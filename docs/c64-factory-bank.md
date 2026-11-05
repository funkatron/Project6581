# C64-inspired factory sound bank

These are **original patches**, not recreations or extracted settings from commercial soundtracks. Listening references for future research: *Turrican*, *Parallax*, and *Commando*. Composer/subtune/time-range and register-trace research remain pending; do not claim an exact game or composer match.

## First four prototypes

| Patch | Category | Design intent | Audition |
| --- | --- | --- | --- |
| Tight Pulse Bass | Bass | Narrow pulse, short decay, low-pass warmth | C2, G2, C3; short repeated notes |
| Shimmer PWM Keys | Keys | Slow PWM and gentle attack, sustained key texture | C3, E4, G4; hold then release |
| Bright Pulse Lead | Leads | Bright narrow pulse and subtle pulse modulation | C4, G4, C5; legato and repeated notes |
| Noise Snare | Drums | Short high-pass noise burst; **not** a pitch-swept SID drum | C3, C4, C5; rapid repeated hits |

All patches use existing synth controls and the current version-3 preset format. The Game Arp is disabled in these prototypes so single-note audition is predictable.

## Device listening checks (pending)

- [ ] Audition low, middle and high pitches on real iPad Safari, checking useful output levels and timbral distinction.
- [ ] Check release tails and repeated hits for stuck notes and clicks.
- [ ] Check PWM audibility on the Keys/Lead patches; note existing PWM limitations.
- [ ] Confirm preset loading during an active note and no unexpected playback.
- [ ] Research and log exact composer, subtune, time range, audible features and verified register behavior for the three reference games before attributing any patch to a specific soundtrack.

## Follow-up

Expand in small batches toward the roadmap's **24 new sounds (six each in Bass, Keys, Leads and Drums)**. Drum pitch sweeps or timed waveform changes require a separately scoped feature if static patches cannot produce convincing hits. Keep existing six factory sounds and all user preset import/export behavior intact.
