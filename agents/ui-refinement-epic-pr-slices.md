# UI refinement epic — consolidated plan (PR slices)

**Origin:** UI evaluation (2026-11-16) and follow-ups: header density, SID slider layout, routing IA, Root vs Game Arp hierarchy, Help `?` + long-press, generator LEDs above keyboard, accidental text selection, Odyssey-inspired patterns.

**Out of scope for this epic:** WASM/audio, preset v5 schema, new synthesis, LFO tab move (separate track in `docs/interface-refinement-plan.md`).

**Mockups (SVG):** `/opt/cursor/artifacts/mock-{header-toolbar,synth-tab,arp-tab,keyboard-strip,help-dialog}.svg` (agent run artifacts; not in repo).

---

## Already on `main` (do not re-implement)

| PR | Summary |
|----|---------|
| [#100](https://github.com/funkatron/Project6581/pull/100) | Master mixed loudness in worklet + rainbow meter UI |
| [#101](https://github.com/funkatron/Project6581/pull/101) | Root vs Game key colors; independent highlights; Root visible when Game on |
| [#102](https://github.com/funkatron/Project6581/pull/102) | Master meter in **header**; horizontal up to **300px** |

---

## Open / parallel

| PR | Summary | Action |
|----|---------|--------|
| [#103](https://github.com/funkatron/Project6581/pull/103) | `user-select: none` on `main`; text on diagnostic inputs only | **Merge first** — low risk, helps all touch work |

---

## PR slice map (recommended order)

Each slice is one reviewable PR (`cursor/<name>-fa36`), `npm test` green, no iPad claim without checklist.

```text
103 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9
         ↘ P4 can parallel after P1
                    P6 needs P1 for ? on play target (optional: ship P6 without ?)
```

| # | Branch name (suggested) | Title | Depends on |
|---|-------------------------|-------|------------|
| **P1** | `cursor/ui-tokens-param-row-fa36` | Design tokens + `.param-row` CSS (no behavior change) | — |
| **P2** | `cursor/header-toolbar-compact-fa36` | Compact header toolbar (height, icons, BPM chip) | P1 (`--bar-h`) |
| **P3** | `cursor/help-dialog-foundation-fa36` | Help dialog + content module + latch `?` pilot | — |
| **P4** | `cursor/synth-play-target-fa36` | Move keyboard route to SYNTH; Arp targets on ARP | P3 optional |
| **P5** | `cursor/sid-param-rows-fa36` | SID pan/filter/voice rows use param-row + brief formatters | P1 |
| **P6** | `cursor/arp-root-first-chrome-fa36` | Root Arp above Game; teal/orange module chrome | P3 optional |
| **P7** | `cursor/help-inline-migration-fa36` | Move inline hints to help; drop seq sidebar prose | P3, P4, P6 |
| **P8** | `cursor/generator-leds-keyboard-fa36` | LED pills above keyboard; tap → ARP section | P6 (scroll targets) |
| **P9** | `cursor/help-long-press-fa36` | Long-press + context-menu help; `?` on all modules | P7, P8 |

**Optional follow-ups (separate PRs, not blocking):**

| # | Title |
|---|--------|
| P10 | Landscape ARP: Root \| Game two-column `@container` |
| P11 | Header second row: full-width meter on narrow; engine status merge |
| P12 | SID card `@container` 1 vs 2 col params; reduce side gutters |
| P13 | Preset dialog `.selectable-text` enclave inside `user-select: none` shell |

---

## P1 — Design tokens + param-row CSS

**User pain:** Slider track width varies with label length; values like `80% L` steal space.

**Scope:**

- CSS variables: `--bar-h`, `--label-w`, `--value-w`, `--help-btn`, `--root-teal`, `--game-orange`.
- Class `.param-row` grid: label | track | value (documented; **no** engine markup change yet).

**Files:** `src/studio-core.css`, `test/ui-text-selection.test.js` or new `test/ui-param-row.test.js` (CSS presence).

**Acceptance:** No visual change until P5; tokens referenced in comments only.

**Manual:** —

---

## P2 — Compact header toolbar

**User pain (evaluation):** Header buttons too wide, inconsistent height; meter competes with text buttons.

**Scope:**

- Uniform `header .controls` child height (`--bar-h`, 44px on coarse pointer).
- Record / Stop all: icon-forward labels + full `aria-label`.
- Master BPM as chip: `BPM` + short slider + 3-digit output (shrink copy).
- Meter: `flex: 1 1 200px; max-width: 300px`; buttons `flex: 0`.
- Optional: tuck **Format** under record menu (product call — default keep compact select).

**Files:** `index.html`, `src/studio-core.css`, `src/seq-ui.css`, `test/step-sequencer-ui.test.js` or header layout test.

**Acceptance:** All header controls align to one cap height; no audio regression.

**Manual:** iPad portrait header wrap; Record/Stop still operable.

---

## P3 — Help dialog foundation

**User pain:** Tutorial `small` paragraphs and sidebar crowd panels.

**Scope:**

- `src/ui-help-dialog.js`, `src/ui-help-content.js` (latch content only).
- `<dialog id="studioHelp">` in `index.html`; `.help-trigger` styles.
- One `?` on latch row; hide visible `#arpLatchHint`, retain sr-only for a11y.
- `mountHelpTriggers` from `sid-studio.js`.

**Files:** above + `test/ui-help.test.js`.

**Acceptance:** `?` opens dialog; Esc/close restores focus; latch help text not visible inline.

**Manual:** VoiceOver reads dialog title.

---

## P4 — Keyboard play target on SYNTH

**User pain (evaluation):** Keyboard routing under ARP tab is confusing.

**Scope:**

- Move `#keyboardRoute` to voice panel: **Play target** + `?` (wire to P3 content when ready).
- ARP tab block renamed **Arp targets**; only `#arpRoute`, `#gameRoute`.
- Remove `.note-routing-hint` from DOM (content → `ui-help-content` in P7 if P3 not merged).

**Files:** `index.html`, `test/sid-engine-panels-always-on.test.js`, preset/routing tests.

**Acceptance:** Preset v5 routing round-trip; factory layer presets still load.

**Manual:** Layer preset: change keyboard target on SYNTH without opening ARP.

---

## P5 — SID param rows

**User pain:** Inconsistent narrow sliders in engine cards (evaluation + VM demo).

**Scope:**

- `src/control-format.js` (or colocate): `formatPanBrief`, `formatHzBrief`, `formatPercent`.
- `sid-engine-panels-ui.js`: pan + filter grid → `.param-row` markup; drop `justify-content: space-between` label flex for those rows.
- Drop `min-width: max-content` on `.base-value` inside `.param-row` / workspace panel rules.

**Files:** `sid-engine-panels-ui.js`, `studio-core.css`, `test/sid-engine-panels*.test.js`.

**Acceptance:** Cutoff/pan/vol tracks same width within a card; values ≤4.5rem column.

**Manual:** Drag cutoff on SID 1 in 280px-wide card.

---

## P6 — Root Arp first + module chrome

**User pain:** Root Arp hidden under Game grid; no header divider vs Game.

**Scope:**

- DOM order: latch → **root-arp-panel** → game arp (move `#seqExtras` above `#gameArpTitle`).
- `#rootArpTitle` styled like `#gameArpTitle` (teal rule, icon).
- `.root-arp-transport` bar (Enabled, pattern, rate, sync).
- Remove `seq-subsection` / “extras” naming.

**Files:** `index.html`, `seq-ui.css`, `studio-core.css`, `test/step-sequencer-ui.test.js`, `arp-key-integration.test.js`.

**Acceptance:** Root controls visible without scrolling past step grid on typical iPad height.

**Manual:** Root + Game on; teal/orange keys + both panels obvious.

---

## P7 — Help content migration

**User pain:** Helper notes should live in Help pop-ups (`?`), not inline.

**Scope:**

- Fill `ui-help-content` keys: play-target-keyboard, arp targets, game-arp-steps, pitch-envelope, voice-allocation, keyboard.
- `?` on: play target, arp targets, root title, game title, pitch envelope, keyboard heading.
- Remove: seq-sidebar instructional paragraphs, pitch envelope hint `small`, keyboard “Touch and hold…” line.
- Keep: `#arpStatus`, `#seqStatus`, `#voiceCapacity` (live status).

**Files:** `index.html`, `ui-help-*`, `seq-ui.css` (sidebar layout slim), tests.

**Depends:** P3, P4, P6 for correct placement of triggers.

**Manual:** No tutorial paragraphs visible; all topics reachable via `?`.

---

## P8 — Generator LEDs above keyboard

**User pain (evaluation + Odyssey):** Arp on/off invisible while playing.

**Scope:**

- `src/generator-led-ui.js`; `.generator-leds` in keyboard heading.
- Pills: ROOT (teal), GAME (orange), LATCH (amber); sync checkboxes.
- **Short tap:** switch to ARP tab + `scrollIntoView` root/game title.
- **Long-press:** deferred to P9 (stub or noop).

**Files:** `index.html`, `seq-ui.css`, `studio-core.css`, `sid-studio.js`, `editor-tabs.js` (focusTab helper), tests.

**Depends:** P6 for title ids and scroll targets.

**Manual:** From SYNTH tab, see LEDs; tap GAME opens Game section.

---

## P9 — Long-press + context-menu help

**User pain:** `?` plus tap/long-press on controls for help.

**Scope:**

- `src/ui-help-gesture.js`: `bindHelpGesture`, 550ms, move tolerance.
- Long-press: module titles, LED pills, routing labels, step numbers (not gates/sliders/keys).
- Desktop `contextmenu` → Help.
- Dialog lead-in: “You long-pressed …”

**Files:** `ui-help-gesture.js`, wire in studio mount, `test/ui-help-gesture.test.js`.

**Depends:** P7, P8.

**Manual:** Long-press ROOT LED shows root arp help without toggling enable.

---

## Cross-cutting quality (evaluation items mapped to slices)

| Evaluation theme | PR slice |
|------------------|----------|
| Header meter + grouping | Shipped #102; P2 refines buttons |
| Empty SYNTH gutters / voice below fold | P5 + optional P13 |
| Master vs chip meter legend | P7 help content `meters` key (add in P7) |
| ARP legend teal/orange | P6 chrome + P8 LEDs |
| Status bar vs header duplication | Optional P11 |
| Help instead of inline notes | P3, P7, P9 |
| Accidental text selection | #103 |
| Tap targets / contrast | Existing QA; retest after P2/P8 |

---

## Testing strategy (every slice)

- `npm test` must pass (no WASM rebuild for CSS/DOM-only slices).
- Touch routing/preset: `preset-library.test.js`, `readRoutingFromDom`, `arp-key-*` where ARP DOM changes.
- New: `ui-help*.test.js`, `ui-param-row.test.js`, `generator-led*.test.js` as modules land.
- **iPad:** Single checklist appendix in PR body; distinguish automated vs manual per `AGENTS.md`.

---

## iPad manual epic checklist (once P4–P9 land)

- [ ] Keyboard route changed on SYNTH; layer preset stacks three chips
- [ ] Root Arp panel above Game; no scroll to find Root enable
- [ ] Generator LEDs match checkboxes; tap navigates to ARP
- [ ] Long-press LED opens help without accidental toggle
- [ ] Sliders equal width in SID card; no text selection on drag (#103)
- [ ] Header one height; record/stop usable in portrait
- [ ] `?` and long-press where documented; status lines still update

---

## Docs / agent maintenance

- Keep **this file** as slice source of truth; retire duplicate phase labels in older `ui-refinement-ia-plan.md` when merging plan branch.
- User-facing verification notes only in `docs/` if requested; implementation detail stays in `agents/`.

---

## Suggested merge cadence

1. **#103** (text selection)  
2. **P1** + **P3** (foundation; can be one PR if you prefer fewer PRs)  
3. **P4** + **P6** (IA — highest user confusion)  
4. **P5** + **P2** (polish; parallel OK)  
5. **P7** → **P8** → **P9** (help + LEDs complete the story)  

**Rough PR count:** 9 implementation PRs (+ #103) after shipped meter/arp work; optional 3–4 more for layout polish.