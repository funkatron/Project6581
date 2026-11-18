# Drum sequencer UI plan (16 steps)

**Status:** design / pre-implementation (2026-11-18)  
**Owner request:** up to **16 steps**, start here after roadmap merges.  
**Goal:** Row-based drum grid — **not** a copy of the melodic Game Arp editor.

---

## 1. Examples reviewed

### A. In-repo: Game Arp step sequencer (do **not** duplicate)

| Aspect | Game Arp (`#seqGrid`, `game-step-sequencer.js`) |
| --- | --- |
| Purpose | Melody from **held root** + semitone **offsets** |
| Layout | **16 columns** × **3 lanes** (NOTE / GATE / LENGTH) per step |
| Step UI | Vertical pitch slider, gate toggle, length % per column |
| Length | 4 / 8 / 16 **active** steps (data always 16) |
| Clock | Shares Game Arp rate, sync, latch, preview |

**Takeaway:** Reuse **grid chrome** (16-column scroll, step playhead, C64 palette) but use **horizontal drum lanes**, not per-step pitch sliders.

### B. Hardware / DAW patterns (interaction reference)

| Reference | Pattern | Borrow for Project6581 |
| --- | --- | --- |
| **Roland TR-808/909** | Rows = instruments, columns = steps; tap cell = hit on/off | Primary mental model |
| **Elektron Model:Cycles** | 16 (or 64) steps, per-track mutes, swing optional later | Step count + playhead |
| **GarageBand (iOS) Live Loops / beat grid** | Large touch cells, clear on/off | iPad min ~44px targets |
| **Teenage Engineering PO-32** | Compact grid, one sound per row | Density on portrait |
| **C64 trackers (e.g. GT2-style)** | Channel rows, fixed tick clock | SID authenticity nod, not literal UX |

### C. Anti-patterns

- **Game Arp clone** with drum samples — wrong data model (offsets vs preset triggers).
- **Decorative FX/Mix tabs** from mockup — ROADMAP forbids dead controls.
- **Second clock fighting Root/Game** without clear transport ownership — document in help.

---

## 2. Product definition (v1)

| Item | Decision |
| --- | --- |
| **Steps** | **16** fixed columns (v1); optional 8/16 *length* like Game Arp in v1.1 if needed |
| **Rows** | **6 lanes** mapped to factory **Drums** category IDs (see §4) |
| **Cell** | Boolean **hit** (on/off); **velocity** later slice |
| **Sound** | Each row bound to one **factory drum preset** (snapshot settings at trigger time OR load preset into drum voice slot — engineering choice in implementation PR) |
| **Clock** | Own **enable + rate + sync** to master BPM; **independent** of Game Arp tick |
| **Preview** | **▶ Drum seq** runs pattern without held keyboard notes (like Game Preview) |
| **Coexistence** | May run with Root Arp / Game Arp; **Stop all** clears drum seq transport + voices |

---

## 3. UI placement (ARP tab)

```
┌─────────────────────────────────────────────────────────────┐
│ Arp targets · Latch (existing)                              │
├──────────────────────────┬──────────────────────────────────┤
│ ROOT ARPEGGIATOR         │ GAME ARP STEP SEQUENCER          │  ← existing P10 layout
│ (teal)                   │ (orange, melodic grid)           │
├──────────────────────────┴──────────────────────────────────┤
│ DRUM STEP SEQUENCER (new section, neutral/warm gray chrome) │
│  Enable · Rate · Sync · Steps 16 · ▶ Preview · ■ Stop        │
│  ┌────┬──┬──┬──┬──…─┬──┐  playhead                          │
│  │Kick│■ │  │■ │    │  │  ← row label + 16 tap cells       │
│  │Sn  │  │■ │  │    │  │                                    │
│  │CH  │■ │■ │  │    │  │                                    │
│  │OH  │  │  │■ │    │  │                                    │
│  │Cp  │  │■ │  │    │  │                                    │
│  │Tom │  │  │  │■   │  │                                    │
│  └────┴──┴──┴──┴──…─┴──┘                                    │
│  Row preset: [Low Thud Kick ▾] per lane (v1) or fixed map   │
└─────────────────────────────────────────────────────────────┘
```

- **New block:** `#drumSeqPanel` **below** `#arpGeneratorsGrid` (full width of `#playPanel`).
- **Visual language:** Reuse `--root-teal` / `--seq-orange` **only** for existing blocks; drum block uses **neutral border** (`#9a8f84`) + **drum accent** (`#6b5c4f` labels) so it reads as **rhythm**, not melody.
- **Narrow / portrait:** Same horizontal scroller pattern as `.seq-grid-scroller` (min column width ~40px, 16 cols).
- **Landscape wide:** Entire grid visible without scroll when container ≥ ~720px.

---

## 4. Default row → factory preset map

| Row label | Factory ID | Notes |
| --- | --- | --- |
| Kick | `low-thud-kick` | Pitch envelope |
| Snare | `noise-snare` | Pitch envelope (#157) |
| CH | `closed-noise-hat` | Noise |
| OH | `open-noise-hat` | Noise |
| Clap | `noise-clap` | Pitch envelope |
| Tom | `low-tom` | Pitch envelope |

Per-row preset dropdown is **v1 stretch**; fixed map is acceptable for first implementation PR.

---

## 5. Interaction spec

| Action | Behavior |
| --- | --- |
| Tap empty cell | Turn **on** (filled cell); trigger optional low audition |
| Tap on cell | Turn **off** |
| Long-press cell | Open **Help** lane (hit / rest) — same help pattern as Game steps |
| **Enable** off | Grid read-only gray; no clock |
| **Preview** | Start clock from step 0; highlight column playhead |
| **Stop** | Halt clock, clear playhead, release drum voices |
| **Stop all** (header) | Includes drum seq stop |
| Keyboard held | Does **not** transpose drum row notes in v1 |

---

## 6. Implementation slices (after this plan)

| PR | Scope |
| --- | --- |
| **D1** | `drum-step-sequencer.js` data model + tests (16×6 booleans, validate) |
| **D2** | Clock in `performance-play.js` (or sibling), trigger via `play()` with drum routing |
| **D3** | DOM grid UI + CSS (`drum-seq-grid`), wire transport |
| **D4** | Preset v5+ field `performance.drumSequence`; import/export |
| **D5** | iPad QA checklist + help entries |

No WASM. Preserve reSIDfp note path. Voice budget: one short hit per row per step (monophonic per lane).

---

## 7. Acceptance (UI)

- [ ] 16 step columns labeled 1–16 (sr-only or tiny header)
- [ ] 6 rows identifiable on iPad portrait without mis-taps
- [ ] Playhead visible during preview
- [ ] Distinct from Game Arp (no pitch sliders in drum block)
- [ ] Help `?` on section title + long-press on cell

---

## 8. Related docs

- [ROADMAP.md](../ROADMAP.md) — Planned: drum sequencer  
- [agents/roadmap-owner-backlog-fx-drums.md](roadmap-owner-backlog-fx-drums.md)  
- [agents/mockups/mock-arp-tab.svg](mockups/mock-arp-tab.svg) — ARP tab layout study  
- [src/game-step-sequencer.js](../src/game-step-sequencer.js) — melodic sequence reference only