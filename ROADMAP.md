# Project6581 roadmap

## Priority: reduce keyboard-to-audio latency

**Goal:** Minimize the delay between touch/keyboard press and the first audible SID sample on iPad Safari and desktop browsers. Preserve authentic reSIDfp rendering, without falling back to prototype audio.

### Investigation

- [ ] Measure touch/pointer event to SID register dispatch, AudioWorklet receipt, and first nonzero PCM sample separately.
- [ ] Measure perceived and output latency on iPad Safari, including AudioContext `baseLatency` and `outputLatency` when available.
- [ ] Check AudioWorklet message scheduling, buffering, SID envelope attack, and note retrigger behavior.
- [ ] Compare Game Arp's first note with direct keyboard playing and subsequent arp steps.

### Implementation and verification

- [ ] Eliminate avoidable main-thread delays and redundant note-off/note-on cycles.
- [ ] Reduce or bound scheduling latency without introducing clicks, dropouts, or unstable timing.
- [ ] Add regression tests for note dispatch and Game Arp onset.
- [ ] Verify latency improvements with before/after measurements on iPad Safari and desktop.

**Completion condition:** Demonstrated lower median and tail key-to-sound latency under equivalent test conditions, with reliable SID-only audio and no regression in arpeggiator timing.
