# Voice allocation controls: UI-only design proposal

**Status:** Proposed, awaiting layout approval. **No application UI, audio engine, presets, tests, or native/WASM code is changed by this document.**

## Design intent

Use the ARP 2600 app reference for **functional concepts**, not its control-panel appearance. Keep Project6581's existing style, spacing, native selectors/sliders, Sound tab, preset toolbar, keyboard position, touch targets, and responsive grid. In particular, do **not** introduce physical faders, orange blocks, vertical controls, or a new overall layout.

**User decision:** **No Spread control.** Do not add stereo width, pan, stereo oscillator routing, or a dormant Spread slider as part of this feature. Detune remains a *pitch* offset only.

### Four controls to expose

| Label | Proposed control | Meaning |
| --- | --- | --- |
| **Voice Assign** | Select: Mono, Legato, Duo, Poly | Decide how many *different held pitches* can sound and how repeated/new notes are assigned. |
| **Voices** | Select: 1–8 | Total hardware oscillator budget across the three emulated SID chips (the existing voice count). |
| **Unison** | Select: 1–8, bounded by Voices | Number of oscillator layers used **per sounding pitch**. **1** means no stacking. Replaces the ambiguous Unison on/off toggle. |
| **Detune** | Existing 0–100-cent range slider with persistent numeric readout | Spread the pitches of multiple stacked layers about their musical root; enabled when Unison >1. **Not** stereo spread. |

**Important:** Voices and Unison are different numbers: Voices is the available *oscillator pool*; Unison is the cost (layers) for each simultaneous note. Example: Voices = 6 and Unison = 2 allows at most three independently voiced pitches in Poly mode; Duo restricts it to at most two.

### Proposed compact layout inside the existing Sound tab

Preserve everything outside the Sound panel and all current colors and component styling. **Selectors should be only as wide as their contents**, not consume half a row merely because the form has two columns. The numeric selectors need room for one digit and a chevron, not full slider width.

```text
 Sound tab
 ┌──────────────────────────────────────────────────────────┐
 │ Preset [Current sound ▾]   Save  Save as… …               │  ← unchanged
 │ SOUND                                                    │
 │ Voice allocation                                         │
 │ Assign [Poly ▾]     Voices [6 ▾]     Unison [2 ▾]          │
 │ Detune [────────────●──────────────] 12¢                 │
 │ Up to 3 notes · 6 oscillators                            │
 │ Chip [MOS 6581 ▾]     Volume [────────●─────] 55%         │
 │ Cutoff [────────●─────] Hz  Resonance [──●────] 10%       │
 │ Filter [Low-pass ▾]                                      │
 │ SID voice: waveform / ADSR / pulse width / PWM…          │  ← unchanged
 └──────────────────────────────────────────────────────────┘
 Persistent keyboard stays in its current location.
```

This is a **grouping and reading-order sketch**, not an instruction to redesign cards, borders, colors, switches, or headings. The existing Sound panel and two-column `voice-grid` remain. The three short selectors form one **compact, wrapping inline group** within that grid; Detune gets the next full-width row so the slider is actually useful.

**Control sizing:** Give Voice Assign a content-sized selector wide enough for **Legato** (the longest option). Voices and Unison selectors each need only one digit plus arrow and internal padding. Use `width: max-content` or similarly content-sized behavior, rather than `flex: 1` or stretching each selector to fill its grid cell. Keep each *interactive control* touch friendly with an approximately **44 px-high hit target** and accessible label. Avoid unnecessary horizontal margins or large minimum widths.

**Portrait / narrow iPad:** Keep the same Sound tab and keyboard. Let the compact inline selector group **wrap naturally** into two rows when needed, rather than squeezing labels or allowing horizontal scrolling. Keep Detune on its own row with a readable cents value. Do not add another panel or move the keyboard.

**Landscape / desktop:** Keep all three short selectors inline when they fit, followed by the full-width Detune slider. The rest of the existing two-column control grid, presets, and keyboard remain unchanged. Do **not** add a new global three-column workspace layout.

**Helper line:** Keep it short (for example, **“Up to 3 notes · 6 oscillators”**) and update it when assignment, Voices or Unison changes. Its accessibility label may provide the longer explanation.

### Proposed interaction rules for later implementation

1. **Mono:** One musical pitch at a time, latest held note takes priority; new notes retrigger the envelope. Unison may layer that one pitch.
2. **Legato:** Like Mono for pitch priority and layer allocation, but moving between overlapping held notes changes pitch **without retriggering the SID envelope**. When the final key is released, release the gate normally. Do not silently add portamento/glide; that is a separate feature.
3. **Duo:** At most two *distinct* pitches can sound, each using one complete Unison stack. Effective capacity is `min(2, floor(Voices / Unison))`. If the capacity is full, a new distinct note steals the **oldest sounding pitch** and releases its entire stack before allocating the replacement. Late note-off events for a stolen note are ignored and must never release its replacement.
4. **Poly:** Multiple distinct pitches can sound, up to `floor(Voices / Unison)` (maximum 8). Use the **same oldest-sounding-pitch stealing policy and late-note-off rule** as Duo; never release a slot just because the note number matches an older event.

- **Unison** has a minimum of 1 and a maximum of Voices. If Voices is reduced below Unison, clamp Unison immediately and update its visible value. A change in assignment or layer count must release/reassign active voices safely.
- **Detune** acts only when Unison >1. Show its numeric cents value consistently, but disable the range input when Unison =1. Do not change the user's saved Detune when it is disabled.
- **Duo** with insufficient oscillators for two complete stacks falls back to one simultaneous pitch and says so in the helper. Never allocate partial stacks. Give each sounding note a unique **ownership generation/press token**; a voice-stealing event invalidates the displaced note's ownership. Note-off only releases a stack if that note-on token still owns it. Repeated presses of the same pitch first end/replace its prior ownership predictably, including when a stale release arrives after the replacement.
- **Preset storage:** Save and restore Voice Assign, Voices, Unison, and Detune. As the user has explicitly waived preset backward compatibility, update the preset schema when the feature is implemented; no migrations are required. Do not modify preset format during this design-only PR.
- **LFOs:** Existing Detune modulation remains per unison stack, without introducing a new LFO destination for Voice Assign or Unison because those are discrete settings.
- **Three SID devices:** This UI groups allocation for the **current instrument**; it is not the previously planned three independently configurable SID devices feature. When independent SID devices are designed, each may need its own allocation panel and voice budget. Do not conflate the two milestones.

### Proposed touch/interaction walkthrough

1. Load **Deep Bass**. In Sound, set Voice Assign to **Poly**, Voices to **6**, and Unison to **2**. The compact helper displays **“Up to 3 simultaneous notes (6 oscillators)”**.
2. Hold C, E and G: hear three independently voiced notes, each with two detuned layers, using all six oscillators.
3. Switch Voice Assign to **Legato**: the held notes stop cleanly; playing an overlapping sequence moves between notes without envelope retriggering. With Unison still 2, the musical pitch has two layers.
4. Set Unison to **1**: Detune becomes inactive but preserves its last value. Set it back to 2: the previous Detune value returns.

## Implementation gate (not in this PR)

- [ ] Review/approve this reading order, names and dependent control behavior.
- [ ] Implement the voice allocator and new mode semantics separately, including live-note release, legato no-retrigger, Duo, Poly, voice limits and deterministic stealing.
- [ ] Save the new fields with presets, updating schema as needed without compatibility migrations.
- [ ] Use a small number of playback/ownership tests and confirm audible behavior on iPad Safari before merging.
- [ ] Check Copilot review threads, CI, and deployment independently.

**Completion check for this design PR:** A clear, implementable layout and interaction specification is documented **without changing the synthesizer**.
