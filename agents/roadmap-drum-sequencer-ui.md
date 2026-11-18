# Drum sequencer UI plan (16 steps)

**Status:** design approved (2026-11-18); tab + transport + **SID 4 drum engine** + **standalone groove files** + **DRUM pill left of ROOT** (owner 2026-11-18).  
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
| **Sound** | Each row bound to a **kit lane** on **dedicated SID 4** (index `3`); snapshot voice+filter at hit time (§6a–6b) |
| **Drum engine** | **Fourth reSIDfp chip** — not in keyboard / arp / game routing; melodic triple SID unchanged |
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

Extend `#generatorLeds` (same component family as Root / Game / Latch in `generator-led-ui.js`).

**Order (left → right):** `DRUM` · `ROOT` · `GAME` · `LATCH` — drum transport is first so rhythm is one tap from the keyboard.

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
| Voice budget | All drum lanes → **SID 4 only**; per-lane owners; 3-voice steal **only on that chip** (§6b). Engines 1–3 never see drum hits. |
| Routing | Keyboard / Root / Game routes ignore SID 4; drum seq is hard-wired to engine index `3`. |

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
| **Kit** | Six **lanes**, each `{ presetId, midiNote, pan }` (implicit **SID 4**); optional `sound.drumLfo` | “The sounds” + stereo kit + motion |

- Changing the **pattern** does not change timbres; changing the **kit** does not erase steps (same as hardware: load pattern + load kit).
- **v1 kit UI:** embedded default factory kit only; lane preset picker = **v1.1** slice (can ship hidden behind long-press row label).
- **Named kits (user bank):** optional `category: "Drum kits"` entries — same JSON shape as a kit fragment; recall from DRUM SEQ header later. Not required for D0–D3.
- **Standalone groove file (v1):** **pattern + kit together** — see §6c (`6581drum` / import on DRUM SEQ tab).

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
| **D1b** | **SID 4 (drum chip):** native `sid_bridge.cpp` + worklet mix + engine index `3`; **full SID engine card** (same controls as 1–3); **per-voice pan mix** for lane pans; **requires WASM rebuild** |
| **D3b** | Per-lane **pan** on grid row headers; persist in `drumKit.lanes[].pan` |
| **D3c** | **Drum LFO** UI on DRUM SEQ tab; preset field `sound.drumLfo`; targets lane pan (±100) + optional SID 4 filter/volume/pan |
| **D2** | `mountDrumPerformance` clock — separate from `game.timer` / `arp.timer` |
| **D3** | Grid UI + tab transport; wire **DRUM** pill (**first** in `generator-led-ui.js`) via extended `generator-led-ui.js` + drum performance state |
| **D4** | Preset v5+ `performance.drumSequence` + `performance.drumKit` + `sound.engines[3]` defaults; **standalone groove** import/export (pattern+kit); user kit bank optional |
| **D5** | Help entries + iPad QA (drum-only preview, keyboard + drum parallel) |

Preserve reSIDfp note path. Voice budget: one short hit per row per step (monophonic per lane) on SID 4 only.

---

## 6a. Dedicated **SID 4** drum engine

| Layer | Decision |
| --- | --- |
| **Hardware model** | Fourth **reSIDfp** instance in native bridge (today: `std::array<…, 3>` in `native/sid_bridge.cpp`) |
| **User label** | **SID 4** or **Drums** in UI; runtime index **`3`** |
| **Melodic engines** | SID 1–3 unchanged: routing, layer mode, voice budget, preset `sound.engines[0..2]` |
| **Drum engine** | SID 4 holds kit timbres (per-lane snapshots + optional global drum filter/model on the card) |
| **Routing** | Drum clock **never** uses `performance.routing.keyboard|arp|game`; always `chipMask: [3]` |
| **Mix** | Chip-level pan + meter like 1–3; **lane pan** via per-voice stereo weights in WASM (§6d) |
| **UI** | **Fourth engine card** on SYNTH tab — same surface as SID 1–3 (model, voice, filter, pan, pitch envelope, enable, meter); DRUM SEQ tab links/focuses SID 4 |

**Why a real fourth chip (not “borrow SID 2”):** Owner wants drums **isolated** — six-lane steps and short decays should not compete with lead polyphony or steal melodic voices.

**Preset schema (additive):** `sound.engines[3]` stores drum-chip model/filter/volume defaults; `performance.drumKit` stores per-lane `presetId` + `midiNote`. Full synth save includes all four engines when present; v5 imports without engine 4 get a **factory drum-engine template** on first drum feature use.

**UI placement:** **SID 4** uses `mountSidEnginePanels` parity (owner 2026-11-18). Rhythm editing stays on DRUM SEQ; sound design on SYNTH card 4.

---

## 6b. Playback architecture — do drum hits steal voices?

**Short answer:** Each **lane** is monophonic (retrigger on that lane replaces only the previous hit on that lane). All physical voices for drums come from **SID 4 only** — engines 1–3 are unaffected.

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

4. **Timbre:** Read lane from `performance.drumKit`. Resolve `presetId` through preset library once per kit change; at hit time pass **voice + filter snapshot** (and pitch envelope when present) into `sidController.noteOn` with **`chipMask: [3]`** (SID 4) and fixed `midiNote` (factory audition map: kick C1/C2, snare C3/C4, etc.).
5. **Release:** Do **not** hold drum notes indefinitely. Schedule `noteOff` after `max(decay+release, pitchEnvLength)` per lane (timer or register-driven), clearing `activeOwners` for that lane when the one-shot completes.

### Voice stealing on SID 4

SID 4 has **3** oscillators (same as each melodic chip). Six lanes share that budget.

| Case | Behavior |
| --- | --- |
| **≤3 lanes on one step** | One voice per sounding lane — no steal. |
| **4–6 hits same step** | Oldest **drum** voice on chip 3 is stolen (FIFO); never keyboard / arp / game owners (different chip). |
| **Same lane retrigger** | Owner `drum:*` noteOff before noteOn — lane self-replace. |

Drum allocator is scoped to **index 3 only** in the unison controller path used by `triggerDrumLane`.

### Audition (tap cell)

Same `triggerDrumLane` as the sequencer — one preview hit, no clock advance.

### What we are **not** doing in v1

- Routing drums through SID 1–3 or user routing dropdown.
- Loading a full synth preset into the drum chip per hit.
- Transposing drums from held keyboard root (pattern is fixed MIDI per kit).

---

## 6d. Per-lane pan + **Drum LFO** (feasibility)

### Per-drum-track pan

| Item | Detail |
| --- | --- |
| **UX** | Pan slider per row (kick…tom), `-100…+100`, default `0`; in kit + **6581drum** export |
| **Not hardware SID** | Real 6581 has **one mono mix per chip**; pan is not per-voice in the chip |
| **Engine approach** | On SID 4, extend `sid_bridge` render to apply **`voicePan[3][0..2]`** when summing that chip (map active voice → lane at `noteOn` time). Up to **three** lanes panned correctly at once; when 4–6 hits steal voices, pan follows **whichever lane owns that voice** — acceptable with owner sign-off on steal behavior |
| **Chip pan** | Engine card **Pan** still pans the whole drum bus; lane pans are **relative** inside the bus |

### Dedicated **Drum LFO** (one)

| Item | Detail |
| --- | --- |
| **Placement** | **DRUM SEQ** tab (not the global LFOs tab) — “Drum LFO” block beside rate/transport |
| **Scope** | Affects **SID 4 only** + drum kit lanes; never modulates SID 1–3 unless user copies a trick manually |
| **Preset** | `sound.drumLfo` — same shape as one melodic LFO (`enabled`, `wave`, `rate`, `sync`, `depth`, `target`, …); **separate** from the fixed **three** melodic LFOs so v5 validation stays stable |
| **Targets (v1)** | `drumLanePan` (modulates **all six** lane pans with same waveform/depth — stereo wobble on the kit), `volume`, `cutoff`, `resonance`, `pan` (chip 4), plus ADSR/pulse if useful |
| **v1.1** | Per-lane LFO target pickers (kick pan only, etc.) if `drumLanePan` macro is too coarse |

**Primary owner ask:** LFO changing pans on tracks → implement **`drumLanePan`** as bipolar offset on each `lanes[].pan` in `updateModulation` / drum mod tick (main thread, like chip pan today).

### Is this too much? SID limits?

| Concern | Verdict |
| --- | --- |
| **Oscillators** | Drum LFO is **software** — does **not** use a fourth SID voice. Still **3 voices** on SID 4; LFO only moves registers / mix gains. |
| **Full SID 4 card** | **Low risk** — reuse existing panel code + `engines[3]`; preset/import grow to four engines. |
| **Per-lane pan** | **Medium** — needs WASM mixer work with D1b; UI + schema are easy. Correct stereo with 6 simultaneous hits is **approximate** when voices steal (same as steal tails). |
| **Drum LFO** | **Medium-low** — new `sound.drumLfo`, target enum, mod hook; no audio-thread requirement for pan in v1. |
| **CPU / iPad** | Fourth chip + same LFO math as today; monitor in D5 QA. |

**Recommendation:** Ship **D1b + full card + lane pan + drum LFO** in the drum epic; treat **per-lane LFO targets** (one LFO per row) as v1.1 unless scope creeps.

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
    { "id": "kick", "presetId": "low-thud-kick", "midiNote": 36 },
    ...
  ]
}
```

- **Dirty / Save** includes pattern + kit + drum engine settings like arp + routing today.
- **Recall synth preset** restores drum grid and kit; drum transport **stopped** (same as arp preview off on load).

### Standalone **drum groove** files (v1 — owner required)

Primary share format bundles **pattern + kit** (and optionally **SID 4** engine defaults) so a beat is portable without a full synth preset.

| Field | Purpose |
| --- | --- |
| `format` | `"6581drum"` |
| `version` | `1` |
| `name` | Display name (1–64 chars, same rules as presets) |
| `drumSequence` | Grid + rate/sync |
| `drumKit` | Six lanes |
| `drumEngine` | Optional `sound.engines[3]` slice; if omitted, factory drum-chip template |
| `drumLfo` | Optional `sound.drumLfo` (same shape as one melodic LFO) |

**UI (DRUM SEQ tab):** **Export groove…** / **Import groove…** (file picker + paste JSON). Import replaces current pattern + kit (and drum engine block if present); does **not** alter SID 1–3 or performance arp/game.

**Secondary exports (same menu, optional):** pattern-only or kit-only fragments for power users — not required for v1 menu if groove export covers sharing.

**User library:** Grooves can also be saved as user rows `category: "Drum grooves"` with the same payload embedded under `settings.performance` + `settings.sound.engines[3]`.

Factory showcase presets may ship with a **default groove** baked in for demo; Galway stays melody-focused.

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
- [ ] Save / load restores `drumSequence` + `drumKit` + SID 4 settings with main preset
- [ ] Import/export **6581drum** groove (pattern + kit together)
- [ ] Generator LED order: **DRUM** left of **ROOT**
- [ ] SID 4 card matches SID 1–3 controls on SYNTH tab
- [ ] Per-lane pan; Drum LFO modulates lane pans (or chip targets)

---

## 8. Related docs

- [ROADMAP.md](../ROADMAP.md) — Planned: drum sequencer  
- [agents/roadmap-owner-backlog-fx-drums.md](roadmap-owner-backlog-fx-drums.md)  
- [agents/mockups/mock-arp-tab.svg](mockups/mock-arp-tab.svg) — ARP tab layout study  
- [src/game-step-sequencer.js](../src/game-step-sequencer.js) — melodic sequence reference only