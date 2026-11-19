# Drum architecture — SID history vs Project6581 vs DR-660

**Owner questions (2026-11-19):** Is one SID 4 + 3-voice polyphony too clunky vs a DR-660? Should we add **SID 5–6** for drums? Boost **+18 dB** and **snare resonance**?

This note is research and product framing — not a build ticket.

---

## How SID “drums” were usually made (C64 / 6581)

Classic trackers and games rarely treated percussion like a modern ROMpler. Typical patterns:

| Technique | Role |
| --- | --- |
| **Noise + short ADSR** | Snare, hi-hat, clap (LFSR noise waveform) |
| **Triangle + fast pitch envelope** | Kick, tom (“thud” by sweeping `$D400` down) |
| **Shared chip filter** | One **cutoff/res/mode** for **all three voices** on that chip — not per-pad |
| **Multi-SID rigs** | 2× or 3× SID tunes: e.g. bass/lead on chip A, percussion bursts on chip B |
| **Time multiplexing** | Same voice retriggered at 50 Hz with new waveform/filter; not six independent sustaining pads |

So the **hardware model** is: few oscillators, **one analog filter per chip**, and **composer tricks** per hit type — not six parallel instruments with independent EQ.

**Project6581 today:** SID 4, **3 voices**, lane → oscillator pin, **factory preset** (voice+filter snapshot) per lane, **one filter write per hit** (last lane wins on simultaneous steps). That is faithful to **one** SID’s limits; it feels clunky next to a DR-660 because we are comparing **one analog chip** to **many digital samples + voices**.

---

## Boss DR-660 (and similar) — what users expect

| DR-660 mental model | SID 4 today |
| --- | --- |
| One voice (or sample) **per pad**, always the same timbre slot | Lanes **share 3 voices**; kick/OH share voice 1 by design |
| Per-pad level, tune, sometimes decay | Lane **Level** + fixed **midiNote**; timbre from **presetId** |
| Independent processing per pad (in later units) | **One filter** on the drum chip per hit instant |
| Simple: press pad → same sound | Voice steal / slot eviction if >3 overlaps |

The “clunky” feeling is mostly **shared filter + 3-voice cap + preset-at-hit-time**, not the sequencer grid itself.

---

## Directions (not mutually exclusive)

### A. Mix / factory polish (small)

- **+18 dB** chip boost step (extends `DRUM_BOOST_DB`; clip risk documented).
- **Snare / clap factory**: higher **filter resonance**, band-pass or high-pass bias, optional preset-only **resonance boost** field on kit lanes (still one filter per trigger — but snare hits set filter before noise decay).
- iPad pass at +18 with melodic unison to set master headroom policy.

### B. Per-lane dedicated chips (large — owner spike)

**Idea:** Keep SID **1–3** melodic; add **1–2 drum-only SID instances**:

| Chip | Suggested role | Voices | Benefit |
| --- | --- | --- | --- |
| **SID 4** (existing) | Kick, tom | 3 (often mono use) | Stable low ends; pitch envelopes |
| **SID 5** | Snare, clap | 3 | Noise + resonance without stealing kick |
| **SID 6** | CH, OH | 3 | Short hats; optional |

**Per lane:** `engineIndex` in kit (kick → 4, sn → 5, ch → 6) → **no cross-lane steal** on the same chip; **independent filter** per chip at hit time.

**Costs:** WASM render **+N chips**, UI **+N engine cards** (or grouped “Drum rack” panel), preset schema, metering, routing, tests, CI drum-audio matrix multiplied.

**Alignment with history:** Matches **multi-SID** C64 arrangements more than cramming all percussion into one 6581.

### C. Hybrid (medium)

- Stay at **4 chips** but **hard-map lanes to voices** (already improved) + **do not change global filter on every hit** — use **SID 4 panel filter** as bus EQ; lanes only change voice/noise/pitch envelope (reduces kick-filter-stomps-CH).
- **Parallel “audition” chips** only in sequencer preview (heavy).

---

## Recommendation (for roadmap ordering)

1. **Near:** +18 dB + snare/clap **factory + kit resonance** tuning (listening + CI WAV).
2. **Spike (1–2 PRs of design only):** `lanes[].engineIndex` + max **5–6 SID chips** in WASM — measure CPU on iPad, mock UI in agents/.
3. **Defer** full DR-660 parity (per-pad decay sliders, choke groups, velocity) until engine topology is settled.

---

## References in repo

- [roadmap-drum-sequencer-ui.md](roadmap-drum-sequencer-ui.md) §6 (SID 4)
- [drum-sequence-audio-test-plan.md](drum-sequence-audio-test-plan.md) (CI listen)
- Factory: `noise-snare`, `noise-clap`, `closed-noise-hat` in preset library

---

*Update this note when the owner picks A vs B vs C or after multi-SID prototype.*