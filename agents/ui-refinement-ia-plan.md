# UI / IA refinement — implementation plan

**Status:** Design approved in principle (2026-11-16). Not started as a single branch set.  
**Goal:** Make Project6581 scannable on iPad and desktop: compact header, consistent sliders, honest tab semantics, visible Root vs Game Arp, help on demand, keyboard-adjacent performance state.

**Out of scope:** SID audio, WASM, preset schema (v5), register timing, new synthesis features.

---

## Problem summary

| Issue | Cause | Target outcome |
|-------|--------|----------------|
| Header too wide | Text-heavy buttons, mixed heights (38–44px) | One toolbar height; icons for verbs |
| Sliders hard to use | Flex `space-between`, value `max-content`, 2-col grid in narrow cards | Param rows: fixed label / flex track / fixed value |
| Keyboard route on ARP tab | Historical “master routing” block | Keyboard target on **SYNTH** |
| Root Arp hidden | Below Game grid; weak `seq-subsection` chrome | Root **above** Game; teal module kit |
| Teaching copy everywhere | Inline `small`, seq sidebar, routing hint | `?` + optional long-press → one dialog system |
| Arp state invisible while playing | Only on ARP tab | LED pills above keyboard; tap → jump, long-press → help |

---

## Design system tokens (add early)

Define in `src/studio-core.css` `:root` (or `.studio-tokens`):

| Token | Desktop | Touch (`pointer: coarse`) |
|-------|---------|---------------------------|
| `--bar-h` | 38px | 44px |
| `--label-w` | 5.5rem | 5.5rem |
| `--value-w` | 4.5rem | 4.5rem |
| `--help-btn` | 30px | 36px |
| `--root-teal` | #2d7465 | (border); `#7bcabb` accent |
| `--game-orange` | `var(--seq-orange)` | unchanged |

Formatter helpers in `src/control-format.js` (or extend `modulation-track.js`):

- `formatPanBrief(pan)` → `Ctr`, `L80`, `R42`
- `formatHzBrief(hz)` → `7.0k` / `6691`
- `formatPercent(n)` → `55%`

---

## Architecture: help system

### Modules

| File | Responsibility |
|------|----------------|
| `src/ui-help-content.js` | Stable string keys → `{ title, bullets[], relatedTab?, focusId? }` |
| `src/ui-help-dialog.js` | One `<dialog id="studioHelp">`, `openHelp(id, { leadIn? })`, focus restore |
| `src/ui-help-gesture.js` | `bindHelpGesture(el, { helpId, onTap?, longMs: 550, moveTolerance: 10 })` |
| `src/studio-core.css` | `.help-trigger`, `dialog.help-popover` |

### Content keys (initial)

- `play-target-keyboard`, `play-target-arp-root`, `play-target-arp-game`
- `latch`
- `root-arp`, `game-arp`, `game-arp-steps`
- `voice-allocation`, `keyboard`, `pitch-envelope`
- `generator-led-root`, `generator-led-game`, `generator-led-latch`

### Gestures

| Target | Short tap | Long press | `?` button |
|--------|-----------|------------|------------|
| `?` | Open help | — | — |
| Generator LED pill | Jump tab + scroll | Help for that generator | — |
| Module `h2` title strip | — | Module help | `?` on same row |
| Routing label (not `<select>`) | — | Play-target help | — |
| Piano keys, sliders, gates | **No help gesture** | — | — |

Desktop: `contextmenu` → “Help…” on bound hosts.

### Remove from default DOM (move text to `ui-help-content.js`)

- `.note-routing-hint`
- `#arpLatchHint` visible text (keep `aria-describedby` → sr-only `#arpLatchHelpSr`)
- `.seq-sidebar` instructional `<p>` (keep strong labels if desired, or drop aside entirely)
- Generic keyboard `small` (“Touch and hold…”)
- Pitch envelope hint `small`

### Keep visible (status, not docs)

- `#arpStatus`, `#seqStatus`, `#voiceCapacity`, `#presetStatus`, footer build, `#sidEngineStatus`

---

## Architecture: generator LEDs

| File | Responsibility |
|------|----------------|
| `src/generator-led-ui.js` | Mount pills in `.keyboard-heading`, sync `#arpOn`, `#gameArpOn`, `#arpLatch` |
| `index.html` | Container `.generator-leds` in keyboard heading |
| `src/seq-ui.css` | Pill layout in grid; second row on narrow |
| Extend `.sid-led` | `.gen-led`, `[data-gen="root"]`, `[data-gen="game"]`, `[data-state="on|off|active"]` |

**Tap:** `tabPlay` → `rootArpTitle` / `gameArpTitle` `scrollIntoView`.  
**Long-press:** `openHelp('generator-led-…')`.  
**Display when on:** micro copy on pill — `ROOT · 1/8` from pattern/rate (read-only).

Mirror optional mini-LED in section title rows (same `data-state`, updated from one sync function).

---

## Phase plan (recommended PR sequence)

### PR A — Foundation: help dialog + tokens + param row CSS

**Risk:** Low. No audio.

1. Add tokens and `.param-row` grid (CSS only).
2. Implement `ui-help-dialog`, `ui-help-content`, `mountHelpTriggers` for one pilot (`latch`).
3. Tests: help content keys exist; dialog has accessible title; latch hint removed from visible HTML.

**Exit:** One `?` works; pattern documented in this file.

---

### PR B — SYNTH: keyboard play target + param rows on SID cards

1. Move `#keyboardRoute` to voice panel (new `h3` “Play target” + `?`).
2. ARP tab: remove keyboard `<select>`; keep `arpRoute`, `gameRoute` under “Arp targets”.
3. Refactor `sid-engine-panels-ui.js` pan + filter rows to `.param-row` markup (class names, not inline flex labels).
4. Value formatters for pan/hz/%.

**Tests:** `preset-library` round-trip; `readRoutingFromDom`; `sid-engine-panels` markup; note-routing test updates.

**Mockup:** `mock-synth-tab.svg`

---

### PR C — Header toolbar compact

1. `--bar-h` on `header .controls` children.
2. Record / Stop all: icon-primary labels; full `aria-label`.
3. BPM chip: `BPM` + short slider + 3-digit output.
4. Format: inside record overflow menu **or** keep compact select at 11px (product call).
5. Meter: `flex: 1 1 200px; max-width: 300px; flex-shrink` policy vs buttons `flex: 0`.

**Tests:** `ui-contrast`, step-sequencer header breakpoints; optional snapshot of header HTML patterns.

**Mockup:** `mock-header-toolbar.svg`

---

### PR D — ARP IA: Root above Game + module chrome

1. Reorder DOM: latch → **root-arp-panel** → game arp block.
2. `#rootArpTitle` matching `#gameArpTitle` (teal rule, icon).
3. `.root-arp-transport` clone of `.seq-transport` styling.
4. Rename `#seqExtras` → remove “extras” semantics.
5. Help `?` on root + game titles; remove sidebar column from grid (layout only).

**Tests:** `step-sequencer-ui`, `arp-key-integration`; iPad scroll order (manual).

**Mockup:** `mock-arp-tab.svg`

---

### PR E — Keyboard generator LEDs + gestures

1. `generator-led-ui.js` + heading markup.
2. Wire tab jump + `bindHelpGesture` on pills and titles.
3. Document long-press in keyboard help content.

**Tests:** DOM sync when checkboxes toggle; tab aria-selected on jump (jsdom).

**Mockup:** `mock-keyboard-strip.svg`

---

### PR F — Help migration sweep + long-press hosts

1. All content keys wired to `?` buttons.
2. Long-press on module titles, routing labels, step numbers (not gates).
3. `contextmenu` on desktop.

**Tests:** `ui-help.test.js` coverage for every key; no remaining tutorial `small` in `index.html` (allowlist status lines).

**Mockup:** `mock-help-dialog.svg`

---

### Optional PR G — Landscape ARP two-column

`@container (min-width: 900px)` on `.performance-panel`: Root | Game side-by-side; keyboard unchanged.

---

## Dependency graph

```text
PR A (help + tokens + param-row CSS)
 ├── PR B (SYNTH routing + param rows)
 ├── PR C (header)          — can parallel
 ├── PR D (ARP reorder)     — needs A for ? on titles
 ├── PR E (LEDs)            — needs D for scroll targets / titles
 └── PR F (help sweep)      — needs A; best after B,D,E for focus IDs
```

**Suggested merge order:** A → B → D → E → F → C (header can ship anytime after A).

---

## File touch list (cumulative)

| File | Phases |
|------|--------|
| `index.html` | B, D, E, F |
| `src/studio-core.css` | A, B, C, E, F |
| `src/seq-ui.css` | C, D, E |
| `src/sid-engine-panels-ui.js` | B |
| `src/ui-help-*.js` | A, F |
| `src/generator-led-ui.js` | E |
| `src/sid-studio.js` | E (mount), B (if tab focus helper) |
| `src/editor-tabs.js` | E (expose focusTab) |
| `test/*` | per phase |

---

## Verification matrix

| Check | Auto | iPad manual |
|-------|------|-------------|
| `npm test` | Each PR | — |
| Preset v5 import/export with routing | Yes | — |
| Layer factory preset + keyboard route on SYNTH | Yes | Play layer stack |
| Root + Game LEDs match checkboxes | Yes | Tap jump / long-press help |
| Param row tracks equal width in 280px card | Visual / optional unit | Slider drag |
| Header 44px touch targets | CSS | Portrait / landscape |
| VoiceOver: help dialog, LED labels | Partial | Full pass |
| No audio regression | CI smoke | Key → sound |

---

## Vector mockups

See repository-adjacent artifacts (this agent run):

- `/opt/cursor/artifacts/mock-header-toolbar.svg`
- `/opt/cursor/artifacts/mock-synth-tab.svg`
- `/opt/cursor/artifacts/mock-arp-tab.svg`
- `/opt/cursor/artifacts/mock-keyboard-strip.svg`
- `/opt/cursor/artifacts/mock-help-dialog.svg`

Caption legend for all mockups:

- Orange fill = Game Arp chrome  
- Teal fill = Root Arp chrome  
- Gray hatched = removed inline help (moves to dialog)  
- `?` = help trigger  

---

## Open product decisions

1. **Format select:** stay in header vs record submenu.  
2. **Long-press on LED:** also toggle enable vs navigate-only (recommend navigate-only).  
3. **Global help** in app header (Odyssey gear) vs per-module only.  
4. **ARP landscape two-column** in v1 or follow-up.

---

## Completion checklist (epic)

- [ ] Help dialog + content module; no visible tutorial paragraphs in main panels  
- [ ] Keyboard play target on SYNTH; ARP shows arp targets only  
- [ ] Root Arp above Game Arp with teal parity to orange Game chrome  
- [ ] Generator LEDs above keyboard with tap-to-jump and long-press help  
- [ ] Header consistent height; record/stop iconified; BPM chip  
- [ ] SID param rows: fixed label/value columns  
- [ ] `npm test` green; iPad QA notes in `docs/ipad-safari-qa.md` (manual section only)