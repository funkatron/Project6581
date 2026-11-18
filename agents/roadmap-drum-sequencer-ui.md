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
| **Sound** | Each row bound to a **kit lane** (factory preset id + fixed MIDI note + engine index); trigger applies **inline voice+filter snapshot**, not a full preset load per hit (§9) |
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
| Voice budget | **Per-lane monophonic** owners (`drum:kick`, …); steal **only among drum hits on the same SID** (§9). Keyboard / arp voices on other chips are not stolen. |
| Routing | Default kit spreads **2 lanes per engine** (6÷3 chips); `performance.routing.drum` optional later — v1 fixed map. |

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

## 4b. Drum **kit** vs drum **pattern**

| Artifact | What it stores | User mental model |
| --- | --- | --- |
| **Pattern** | 16×6 hit grid + transport (`rate`, `sync`, optional `length` 8/16 later) | “The beat” (like a TR pattern) |
| **Kit** | Six **lanes**, each `{ presetId, midiNote, engine }` | “The sounds” (like swapping 808 vs 909 samples) |

- Changing the **pattern** does not change timbres; changing the **kit** does not erase steps (same as hardware: load pattern + load kit).
- **v1 kit UI:** embedded default factory kit only; lane preset picker = **v1.1** slice (can ship hidden behind long-press row label).
- **Named kits (user bank):** optional `category: "Drum kits"` entries — same JSON shape as a kit fragment; recall from DRUM SEQ header later. Not required for D0–D3.

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
| **D4** | Preset v5+ `performance.drumSequence` + `performance.drumKit`; user kit bank (optional); import/export fragments |
| **D5** | Help entries + iPad QA (drum-only preview, keyboard + drum parallel) |

No WASM. Preserve reSIDfp note path. Voice budget: one short hit per row per step (monophonic per lane).

---

## 6b. Playback architecture — do drum hits steal voices?

**Short answer:** Each **lane** is monophonic (retrigger on that lane replaces only the previous hit on that lane). **Physical SID voices** are shared only **within the drum rack’s assigned chip(s)** — drums do **not** steal keyboard or arp voices on other engines.

### Trigger path (implementation target)

1. On each clock tick, for every lane with a hit on the active step, call `triggerDrumLane(laneId)` (new helper beside `play()` / `playOne()` in `sid-studio.js`).
2. Build a stable **owner key** per lane: `drum:kick`, `drum:sn`, `drum:ch`, `drum:oh`, `drum:clap`, `drum:tom`.
3. Reuse the existing **one owner → one sounding note** rule in `playOne()`:

```233:240:src/sid-studio.js
 const prior=activeOwners.get(ownerKey);
 if(prior)sidController.noteOff(prior.note,prior.token);
 ...
 activeOwners.set(ownerKey,{note,token});
```

So **re-hitting kick on step 5** cuts the tail of the kick from step 3 on the **same lane only** — desirable for drums.

4. **Timbre:** Read lane from `performance.drumKit`. Resolve `presetId` through preset library once per kit change; at hit time pass **voice + filter snapshot** (and pitch envelope when present) into `sidController.noteOn` for the lane’s `engine` and fixed `midiNote` (factory audition map: kick C1/C2, snare C3/C4, etc.).
5. **Release:** Do **not** hold drum notes indefinitely. Schedule `noteOff` after `max(decay+release, pitchEnvLength)` per lane (timer or register-driven), clearing `activeOwners` for that lane when the one-shot completes.

### Voice stealing on the chip

Each SID chip has **3** oscillators (`VoiceAllocator` in `live-sid-controller.js`; unison stack uses the same budget per chip).

| Layout | Behavior |
| --- | --- |
| **Default kit (v1)** | **2 lanes per engine** (kick+sn → E1, CH+OH → E2, clap+tom → E3). Worst case **2 voices per chip per step** — fits without steal. |
| **Dense step (6 hits)** | All six fire together → **6 voices** needed → **oldest drum hit on that chip** is stolen (FIFO age), **never** a `keyboard` / `arp` / `game` owner. |
| **Same lane retrigger** | Owner `drum:*` already noteOff’d before noteOn — no extra steal. |

Implement **scoped steal:** drum hits only participate in allocation on the chip indices listed in the kit. Keyboard poly on engine 1 does not see engine 2’s drum allocator (already true when `chipMask` is a single chip in unison mode).

### Audition (tap cell)

Same `triggerDrumLane` as the sequencer — one preview hit, no clock advance.

### What we are **not** doing in v1

- Loading a full factory preset into all three voices per hit (too slow, fights synth preset).
- Sharing one voice for all drums (would choke six-lane steps).
- Transposing drums from held keyboard root (pattern is fixed MIDI per kit).

---

## 6c. Saving patterns and kits

### Inside a **synth preset** (primary path)

Extend `performance` in preset format **v5** (additive; validate in `validatePresetSettings`):

```json
"drumSequence": {
  "enabled": false,
  "rate": "1/16",
  "sync": true,
  "localBpm": 120,
  "steps": 16,
  "grid": [[0,1,0,...], /* 6 rows × 16 booleans */]
},
"drumKit": {
  "name": "Factory 6581",
  "lanes": [
    { "id": "kick", "presetId": "low-thud-kick", "midiNote": 36, "engine": 0 },
    ...
  ]
}
```

- **Dirty / Save** includes pattern + kit like arp + routing today.
- **Recall synth preset** restores drum grid and kit; drum transport **stopped** (same as arp preview off on load).

### Standalone saves (stretch)

| Feature | Format |
| --- | --- |
| Export pattern | JSON fragment `drumSequence` only (share beats) |
| Export kit | JSON fragment `drumKit` only |
| User kit bank | Full mini-preset rows `{ name, category: "Drum kits", settings: { performance: { drumKit } } }` |

Factory showcase presets may ship with a **default pattern** baked in for demo; Galway stays melody-focused.

### Tests (D4)

- Round-trip import/export of pattern + kit.
- Grid validation (exactly 6×16 booleans).
- Hit playback test: six owners fire on one tick without throwing; mock controller records six distinct sources.

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
- [ ] Save / load restores `drumSequence` + `drumKit` with main preset

---

## 8. Related docs

- [ROADMAP.md](../ROADMAP.md) — Planned: drum sequencer  
- [agents/roadmap-owner-backlog-fx-drums.md](roadmap-owner-backlog-fx-drums.md)  
- [agents/mockups/mock-arp-tab.svg](mockups/mock-arp-tab.svg) — ARP tab layout study  
- [src/game-step-sequencer.js](../src/game-step-sequencer.js) — melodic sequence reference only