# Project6581 🎹

**Play classic Commodore 64 SID sounds in your browser.**

Project6581 is a touch-friendly synthesizer using **reSIDfp**, an emulator of the original C64 sound chip. It works with a touch-friendly screen keyboard, a choice of MOS 6581 or 8580 chip emulation, and two arpeggiator modes.

> **Voice allocation:** Up to eight authentic SID oscillators. Choose Mono, Legato, Duo or Poly, and decide how many oscillators each note uses with **Unison**.

**[▶ Open the synthesizer](https://funkatron.github.io/Project6581/)**

> **New here?** You don't need to know anything about synthesizers or the Commodore 64. Start with the three steps below.

## 🚀 Make your first sound (about 30 seconds)

1. **Open the synthesizer.** Use Safari or another modern browser.
2. **Enable authentic SID** if the page asks you to. Some versions start loading automatically; on iPad, the first touch may be needed to unlock sound.
3. **Touch and hold a piano key.** You should hear a repeating melody because **Game Arp is on by default**.

**Want one sustained note instead?** Turn **Game Arp → Enabled** off. You can now play notes directly.

**Follow the melody:** During Game Arp or regular Arp playback, the keyboard highlights generated notes in **teal** and physically pressed keys in **gold**. If an arpeggiator note is outside the displayed octaves, no key is highlighted for that note. The indicator clears when you stop playback.

> 🔈 **No sound?** Turn up your device volume, check the **Engine status** message, and try touching a key again. If initialization fails, reload the page and retry. There is no substitute audio engine.

## 🎛️ Game Arp step sequencer (first implementation)

Choose **ARP / SEQ** to edit a Game Arp phrase. The new 64C-inspired panel has 16 numbered steps and keeps the full-width keyboard beneath the editor. Scroll the step grid horizontally on narrow screens.

- Set **Pattern → Custom steps** (editing any step does this automatically).
- Move a vertical step slider to set its **pitch offset** (−12 to +24 semitones from the note you play).
- Toggle a step's **gate** to make it play or rest. Adjust **Length** beneath the gate to shorten that step's note (25–100%).
- Choose **4, 8 or 16 steps** and use the existing **Rate**, **Sync**, and **Latch** controls.
- Tap **Preview** to hear your custom pattern from the current keyboard octave without holding a key. Playing keys changes the root while previewing. **Stop** ends Game Arp playback. **Reset steps** now makes all 16 steps neutral (0 semitones, every gate on, 75% note length), not a built-in melody with rests.
- Tap **Root Arpeggiator & 3 LFOs** to expand the existing modulation and root controls.
- Tap **Hide keyboard** to collapse the full-width keyboard while using the sequencer. Tap **Show keyboard** to restore it. This choice is remembered locally.

Custom steps are stored with your existing version-3 user presets. Existing presets still load and use a default phrase when they contain no step data. The SID audio engine is unchanged.

This release implements pitch, gates, and per-step note length. Glide, parameter automation, and the additional FX/Mix or multi-SID controls shown in the design study are not implemented yet.

**Audio timing investigation:** The **Audio timing** link in the footer opens optional diagnostics for note dispatch to the AudioWorklet, reSIDfp render time per block, and browser-reported base/output buffering. It does not measure speaker latency. For a useful comparison, press one key with both arpeggiators off, then use Game Arp Preview, and compare the figures. Existing user presets retain their explicitly saved sequences until you reset or edit them.

## 💾 Factory sounds and user presets

Tap the **current preset name in the top bar** to open the preset library. The modal shows **Factory presets** and **My presets** side by side on wider screens and stacked on narrow screens. Choose one to load it and return to the keyboard. Factory presets are read-only.

Inside the preset library, use **Save as…** to keep an edited sound. Your new sound appears in **My presets**, stored separately from the built-in factory collection. You can use **Save**, **Rename**, or **Delete** for your user presets. The top bar shows only the current preset name and a small dot for unsaved changes.

The modal also contains **Export** to download the current sound as JSON, **Export bank** to back up user presets, and **Import…** to load either file type. Imports are validated and require confirmation before overwriting a user preset with the same name. Downloads can be copied between your iPad and Mac.

A preset includes the SID model, sound and filter controls, all three LFOs, master BPM, and both arpeggiators' settings. Loading a preset stops any current notes but **does not automatically start playing**. Held keys and the notes stored in latches are not saved.

**Storage note:** My presets are stored locally in this browser. They are not automatically shared between devices, and clearing browser data may erase them. **Export bank** provides a backup. The preset JSON format is currently version 3, adding Voice Assign and per-note Unison layers. Versions 1–2 are not migrated or imported. Recreate those sounds manually if needed.

## 🎛️ The controls, in plain language

| Control | What it changes | Try this |
| --- | --- | --- |
| **Game Arp** | Triggers a repeating pattern relative to a root note, at its own Pattern rate | Switch between **Action**, **Adventure**, and **Arcade** |
| **Arpeggiator** | Chooses root notes in Up, Down, Up/Down or Random order; with Game Arp on, it moves the pattern's root instead of playing a competing melody | Hold C, E and G and enable both arpeggiators |
| **Latch** | Keeps the pattern playing after you lift your finger | Enable **Latch**, then tap a key |
| **Root rate / Pattern rate** | Independent tempos for root selection and Game Arp pattern steps; both follow the selected master/local BPM | Try Root 1/4 and Pattern 1/16 |
| **BPM** | Overall pattern tempo | Move the slider slowly to hear the difference |
| **Waveform** | Selects a native SID waveform: Triangle, Sawtooth, Pulse, or Noise | Compare **Pulse** and **Sawtooth** |
| **Voice Assign** | Mono retriggers a single note; Legato changes overlapping pitches without restarting envelopes; Duo plays up to two notes; Poly plays as many complete stacks as the oscillator budget permits | Choose **Poly** for chords |
| **Voices** | Total oscillator budget, 1–8, across the three emulated SID chips | Try **6** |\n| **Unison** | Layers *per note*, from 1 up to Voices. For example, 6 Voices / 2 Unison layers permits 3 simultaneous Poly notes | Try **2** |\n| **Detune** | Changes pitch in cents between unison layers (not stereo width); inactive with 1 Unison layer | Try **12¢** |
| **Attack / Decay / Sustain / Release** | How a note begins, changes, holds, and ends | Increase **Release** for a longer tail |
| **Pulse width / PWM** | Pulse width sets the center of the Pulse waveform; PWM depth and rate now sweep that width continuously | Select Pulse, set depth to 20%, and vary PWM rate |
| **Filter cutoff** | How much high-frequency sound passes through | Lower it for a darker sound |
| **Resonance** | Emphasizes frequencies around the filter cutoff | Increase a little while moving cutoff |
| **Chip character** | Selects **6581** or **8580** SID emulation | Reload after changing the chip selection |
| **LFO 1–3** | Modulate cutoff, resonance, volume, Pulse width, Unison detune, ADSR, and PWM depth/rate; multiple LFOs may share a target | Route a slow LFO to Attack or PWM depth |
| **Stop all** | Stops notes, disables both arpeggiators, and clears their held/latch state | Use this to silence and reset playback |

### Record and export audio

Use **Record** in the top bar to capture the actual SID synthesizer output. Choose **WAV** for lossless recording and analysis, or **M4A** for a smaller AAC-compressed recording when the browser offers native M4A recording. **MP3 is not yet supported.**

Press **Stop & save** to finalize a file. The browser attempts a download and keeps a **Download WAV / M4A** link available for iPad Safari if you need to tap it yourself. Recordings stop automatically after three minutes to limit memory consumption. You can keep playing normally while recording.

The WAV contains 16-bit mono PCM from the reSIDfp render path (the app plays this same mono signal through both output channels). No microphone permissions, server uploads, or external recording services are needed. To compare PWM behavior, record the same sustained Pulse note with depth 0%, then 40%, and upload the WAV recordings for analysis.

**LFO display:** A slider's thumb and neutral number show the base value you set. When an LFO changes that parameter, a green track segment shows how far its effective value moves from the base, and a second green number shows the current value. The thumb stays put unless you move it.

**Tip:** Start by changing *one* control at a time. You can learn what each does by listening to the difference.

## 🎮 Three things to try

### 1. Make a classic game melody
- Leave **Game Arp** enabled, or select **Custom steps** to hear your edited phrase.
- Select **Arcade**.
- Hold a key, then try **Pattern rate → 1/32**.

### 2. Play a single bass note
- Disable **Game Arp** and **Arp**.
- Choose the **Pulse** waveform.
- Lower **Filter cutoff**, then hold a low key.

### 3. Make a repeating sequence
- Turn on **Arpeggiator** and **Game Arp** together.
- Hold C, E and G, or enable **Latch** to keep the roots cycling.
- Set **Root order → Up / Down**, **Root rate → 1/4**, and **Pattern rate → 1/16**. Each root receives the selected Game Arp pattern.

## 🧩 A few useful terms

- **SID:** The three-voice sound chip used in the Commodore 64 computer.
- **reSIDfp:** The software emulation engine that produces the authentic SID-style audio.
- **Arpeggiator (arp):** A feature that plays notes in a repeating sequence.
- **Polyphonic:** Several notes play simultaneously with their selected Unison layers, up to `floor(Voices / Unison)`. Duo limits this to two; oldest sounding notes are stolen when capacity is reached.
- **Unison:** Several oscillators playing one note together. Small pitch offsets (detune) can make the combined sound thicker.
- **1/128 rate:** A very fast pattern setting. Browser timing can become uneven at extreme rates, particularly on mobile devices.

## 🛠️ Troubleshooting

| What you notice | What to do |
| --- | --- |
| Nothing happens when you touch a key | Wait for the engine status to show ready, then touch again |
| The page says audio is suspended | Tap a key to allow Safari to start audio |
| SID initialization fails | Reload; if the problem continues, report the exact status message |
| Notes keep repeating | Disable **Latch** or select **Clear latch** |
| Notes are stuck | Press **Stop all** |
| Very fast arp sounds uneven | Try **1/32** or **1/16** and lower BPM |

## 🔍 Technical details (for the curious)

Project6581 is intentionally a small browser application, but its audio engine is a real SID emulator rather than a synthesizer that merely imitates SID sounds.

### How sound reaches the speakers

```text
Touch / keyboard
      ↓
JavaScript note and arpeggiator logic
      ↓
SID register writes
      ↓
AudioWorklet + WebAssembly
      ↓
reSIDfp (6581 / 8580 emulation)
      ↓
PCM samples → browser audio output
```

- **Sound generation:** [libresidfp](https://github.com/libsidplayfp/libresidfp), pinned to **v1.1.2**, is compiled into `dist/residfp.wasm`. It models SID oscillators, envelopes, and filter behavior.
- **Browser audio:** An `AudioWorklet` renders the emulated audio off the main UI thread. JavaScript handles note input, controls, and arpeggiator scheduling.
- **Chip selection:** The interface offers MOS **6581** and **8580** models, whose filter characteristics differ.
- **Voice model:** Up to eight oscillators across three emulated SID chips. Voice Assign controls one-note retriggering (Mono), no-retrigger pitch changes (Legato), two-note stacks (Duo), or multi-note stacks (Poly). The total Voices and per-note Unison counts are independent.
- **No audio fallback:** If the WebAssembly SID engine cannot initialize, the app reports the failure instead of silently substituting generic oscillators.

### Building and testing

The native bridge is in `native/sid_bridge.cpp`. The build script, `scripts/build-residfp.sh`, uses Emscripten to compile the pinned libresidfp source and exports the SID initialization, register-write, rendering, and reset functions. Its filter-table initialization is adapted to run without native threads in the standalone AudioWorklet environment.

```sh
npm test
```

That command runs the Node.js test suite. Building the WASM binary separately requires an activated Emscripten environment and the native build dependencies; see the build script and [GitHub Actions](https://github.com/funkatron/Project6581/actions) for the exact process.

**Build efficiency:** Ordinary README and UI changes should reuse the compiled WASM artifact. Changes to the native bridge, libresidfp build inputs, or toolchain require rebuilding it.

### Limitations and ongoing work

- Voice Assign, Voices, Unison layers and Detune are available, but the three underlying SID chips still cannot be configured independently. Changing the allocation safely releases currently sounding notes.
- Pulse-width modulation and live ADSR/detune update active stacks through SID registers without retriggering their envelopes. SID envelope rates and levels are quantized to hardware values. Legato pitch changes also avoid retriggering.
- Three LFOs can route to 11 continuous sound parameters and use synchronized musical divisions. Discrete controls such as oscillator count, waveform and chip model are not modulation targets. Tempo modulation and audio-clock scheduling remain [roadmap](ROADMAP.md) items. Stationary-thumb LFO visualization is implemented; iPad Safari visual and touch verification remains pending. The main-thread 60 Hz scheduler can introduce timing jitter, particularly on busy mobile browsers.
- Very fast arpeggiator rates depend on browser scheduling and may sound uneven.
- iPad Safari may require a user gesture to start its audio context.
- Touch-to-sound latency is an active investigation; see [ROADMAP.md](ROADMAP.md).

### Preview builds and deployment

The production application is published at **[Project6581](https://funkatron.github.io/Project6581/)**. PR previews are **opt-in**, not automatically built for every pull request. When explicitly requested, a maintainer can manually run **Build PR preview**, supply the PR number, and select **publish**. Previews are served at `/Project6581/pr-<number>/` after the Pages deployment completes. A successful CI check alone does not establish that the preview URL is live.

Previews are **not automatically removed** when their PR closes; use the workflow's manual **remove** operation. Fork pull requests are not supported for write-capable preview publication. Preview assets are maintained on the internal `preview-assets` branch and combined with the production site during Pages deployment.

**Source and further reading:** [GitHub repository](https://github.com/funkatron/Project6581) · [Development roadmap](ROADMAP.md) · [Actions](https://github.com/funkatron/Project6581/actions)

## 📱 iPad Safari verification

The current device QA steps are documented in [docs/ipad-safari-qa.md](docs/ipad-safari-qa.md). CI tests note allocation and musical LFO rates, but do not themselves verify touch latency, iOS audio-unlock behavior, or playback through iPad speakers. PR previews are not built automatically.
