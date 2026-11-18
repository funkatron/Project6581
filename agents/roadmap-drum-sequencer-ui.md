# Drum sequencer UI plan (16 steps)

**Status:** design approved (2026-11-18); tab + transport refined same day.  
**Owner request:** **16 steps**, own **DRUM SEQ** tab, preview **separate from arps**, **DRUM** control on keyboard strip.  
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
| **Clock** | Own **rate + sync** to master BPM; **fully independent** timer from Root/Game arps |
| **Preview** | **Only** starts the drum clock — does **not** enable Root/Game, does **not** require held keys |
| **Coexistence** | May run **in parallel** with keyboard + Root/Game; **Stop all** stops drum transport + releases drum hits |

---

## 3. UI placement — dedicated **DRUM SEQ** tab

Tab bar becomes: **SYNTH · ARP / SEQ · DRUM SEQ · LFOs** (Diagnostics unchanged).

```
┌─────────────────────────────────────────────────────────────┐
│ [SYNTH] [ARP / SEQ] [DRUM SEQ] [LFOs]     ← new tabPlayDrum │
├─────────────────────────────────────────────────────────────┤
│ DRUM STEP SEQUENCER · 16 steps                    [?]      │
│  Rate · Sync master BPM · ▶ Preview · ■ Stop                 │
│  ┌────┬──┬──┬──┬──…─┬──┐  playhead on active column         │
│  │Kick│■ │  │■ │    │  │                                   │
│  │Sn  │  │■ │  │    │  │  6 lanes × 16 columns             │
│  …                                                           │
│  └────┴──┴──┴──┴──…─┴──┘                                    │
│  Optional later: per-row factory preset dropdown            │
└─────────────────────────────────────────────────────────────┘
```

- **DOM:** `#tabDrum` → `#drumPanel` (mirror `tabPlay` / `playPanel` / `tabLfos` wiring in `seq-ui.css` + `sid-studio.js`).
- **ARP tab stays melodic only** — no drum block under Root/Game.
- **Visual language:** neutral/warm gray chrome (`#6b5c4f` / `#e8e0d6` fills) so DRUM SEQ reads as **rhythm**, not teal/orange melody.
- **Grid UX:** reuse `.seq-grid-scroller` pattern (horizontal scroll portrait, full grid landscape).

---

## 3b. Keyboard strip — **DRUM** generator control

Extend `#generatorLeds` (same component family as Root / Game / Latch in `generator-led-ui.js`):

| Control | Label shown | Tap behavior |
| --- | --- | --- |
| **DRUM** pill | `DRUM` + rate when running (e.g. `DRUM · 1/16`) | **Start/stop drum transport** — same as ▶ Preview / ■ Stop on the DRUM SEQ tab |
| Long-press | — | Help: `generator-led-drum` → focus `#tabDrum` |

- **Lit state** = drum clock **running** (not merely “pattern has hits”).
- **Does not** toggle Root/Game; independent third transport.
- Tap **DRUM** while running → **stop** drum seq (step index may reset or hold — pick **reset to 0** on stop for predictability, match Game Preview stop).

---

## 3c. Playing the keyboard while the drum seq runs

| Question | v1 answer |
| --- | --- |
| Does the drum pattern follow held keys? | **No.** Drum hits use **fixed factory drum timbres** and default kit MIDI notes per row — not keyboard root / scale lock. |
| Can I play chords under a drum loop? | **Yes.** Keyboard + Root/Game use normal `keyDown` / arp clocks; drum clock fires **one-shot hits** on its own grid. |
| Does enabling Root Arp start the drum seq? | **No.** Only **DRUM** pill, tab **Preview**, or an explicit “arm” if we add one later. |
| Voice budget | Drum hits are **short**; engine treats each lane as monophonic one-shot; document max simultaneous rows per step (up to 6). |
| Routing | Default drum rows → **SID 1** or dedicated drum route (implementation D2); never steal Game Arp melody voices without doc. |

**Mental model:** Drum seq = **band drummer**; keyboard/arps = **bassist/lead** — same BPM when Sync on, separate start buttons.

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
| **Preview** (tab) | Start **drum-only** clock from step 0; syncs **DRUM** pill on |
| **Stop** (tab) | Halt drum clock; syncs **DRUM** pill off; release active drum voices |
| **DRUM** pill | Toggle same transport as Preview/Stop |
| **Stop all** (header) | Stops drum transport + arps + keyboard-owned notes (panic rules unchanged) |
| Keyboard | Live play **independent**; does not transpose drum grid (v1) |

---

## 6. Implementation slices (after this plan)

| PR | Scope |
| --- | --- |
| **D0** | Tab shell: `#tabDrum`, `#drumPanel`, workspace `data-tab` CSS |
| **D1** | `drum-step-sequencer.js` data model + tests (16×6 booleans, validate) |
| **D2** | `mountDrumPerformance` clock — separate from `game.timer` / `arp.timer` |
| **D3** | Grid UI + tab transport; wire **DRUM** pill via extended `generator-led-ui.js` + `performanceArp` or sibling state |
| **D4** | Preset v5+ field `performance.drumSequence` + rate/sync; import/export |
| **D5** | Help entries + iPad QA (drum-only preview, keyboard + drum parallel) |

No WASM. Preserve reSIDfp note path. Voice budget: one short hit per row per step (monophonic per lane).

---

## 7. Acceptance (UI)

- [ ] 16 step columns labeled 1–16 (sr-only or tiny header)
- [ ] 6 rows identifiable on iPad portrait without mis-taps
- [ ] Playhead visible during preview
- [ ] Distinct from Game Arp (no pitch sliders in drum block)
- [ ] Own **DRUM SEQ** tab; ARP tab unchanged
- [ ] **DRUM** pill start/stop without opening tab
- [ ] Preview runs with **no** Root/Game enabled and **no** keys held
- [ ] Help `?` on section title + long-press on cell

---

## 8. Related docs

- [ROADMAP.md](../ROADMAP.md) — Planned: drum sequencer  
- [agents/roadmap-owner-backlog-fx-drums.md](roadmap-owner-backlog-fx-drums.md)  
- [agents/mockups/mock-arp-tab.svg](mockups/mock-arp-tab.svg) — ARP tab layout study  
- [src/game-step-sequencer.js](../src/game-step-sequencer.js) — melodic sequence reference only