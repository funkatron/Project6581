# Project6581 🎹

**Play classic Commodore 64 SID sounds in your browser.**

Project6581 is a touch-friendly synthesizer using **reSIDfp**, an emulator of the original C64 sound chip. It works with a touch-friendly screen keyboard, a choice of MOS 6581 or 8580 chip emulation, and two arpeggiator modes.

> **Current voice model:** Up to eight emulated SID oscillators can play either together in **Unison** or as independent notes when Unison is off. All voices use the authentic reSIDfp engine.

**[▶ Open the synthesizer](https://funkatron.github.io/Project6581/)**

> **New here?** You don't need to know anything about synthesizers or the Commodore 64. Start with the three steps below.

## 🚀 Make your first sound (about 30 seconds)

1. **Open the synthesizer.** Use Safari or another modern browser.
2. **Enable authentic SID** if the page asks you to. Some versions start loading automatically; on iPad, the first touch may be needed to unlock sound.
3. **Touch and hold a piano key.** You should hear a repeating melody because **Game Arp is on by default**.

**Want one sustained note instead?** Turn **Game Arp → Enabled** off. You can now play notes directly.

> 🔈 **No sound?** Turn up your device volume, check the **Engine status** message, and try touching a key again. If initialization fails, reload the page and retry. There is no substitute audio engine.

## 🎛️ The controls, in plain language

| Control | What it changes | Try this |
| --- | --- | --- |
| **Game Arp** | Plays a built-in repeating pattern when you hold a key | Switch between **Action**, **Adventure**, and **Arcade** |
| **Arp** | Repeats notes you play in a chosen order | Turn **Game Arp off**, then **Arp on** |
| **Latch** | Keeps the pattern playing after you lift your finger | Enable **Latch**, then tap a key |
| **Rate** | How frequently the pattern changes notes | Start at **1/16**; try **1/32** for faster motion |
| **BPM** | Overall pattern tempo | Move the slider slowly to hear the difference |
| **Waveform** | Selects a native SID waveform: Triangle, Sawtooth, Pulse, or Noise | Compare **Pulse** and **Sawtooth** |
| **Voices** | Sets the total available SID oscillators, 1–8, for Unison or independent notes | Try **3** with Unison off for three-note chords |
| **Unison / Detune** | Unison stacks the voices on one note; turning it off enables polyphony. Detune applies to Unison only. | Try 4 voices, Unison on, and 12¢ detune |
| **Attack / Decay / Sustain / Release** | How a note begins, changes, holds, and ends | Increase **Release** for a longer tail |
| **Pulse width / PWM** | Pulse-specific controls are shown only for the Pulse waveform; PWM implementation is still incomplete | Try **25%**, then **50%** |
| **Filter cutoff** | How much high-frequency sound passes through | Lower it for a darker sound |
| **Resonance** | Emphasizes frequencies around the filter cutoff | Increase a little while moving cutoff |
| **Chip character** | Selects **6581** or **8580** SID emulation | Reload after changing the chip selection |
| **Stop all** | Stops notes, disables both arpeggiators, and clears their held/latch state | Use this to silence and reset playback |

**Tip:** Start by changing *one* control at a time. You can learn what each does by listening to the difference.

## 🎮 Three things to try

### 1. Make a classic game melody
- Leave **Game Arp** enabled.
- Select **Arcade**.
- Hold a key, then try **Rate → 1/32**.

### 2. Play a single bass note
- Disable **Game Arp** and **Arp**.
- Choose the **Pulse** waveform.
- Lower **Filter cutoff**, then hold a low key.

### 3. Make a repeating sequence
- Disable **Game Arp** and enable **Arp**.
- Hold two or more keys, or turn on **Latch** to keep notes playing.
- Choose **Up / Down**, then experiment with **BPM**.

## 🧩 A few useful terms

- **SID:** The three-voice sound chip used in the Commodore 64 computer.
- **reSIDfp:** The software emulation engine that produces the authentic SID-style audio.
- **Arpeggiator (arp):** A feature that plays notes in a repeating sequence.
- **Polyphonic:** With Unison off, independent keys can sound at the same time, up to the selected Voices limit. When all slots are occupied, the oldest note is replaced. **Unison** instead layers the selected oscillators on the most recently pressed note.
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
- **Voice model:** Up to eight active oscillators across three emulated SID chips (three oscillators per chip), with their output mixed in the native bridge. Unison and independent-note polyphony share the Voices control.
- **No audio fallback:** If the WebAssembly SID engine cannot initialize, the app reports the failure instead of silently substituting generic oscillators.

### Building and testing

The native bridge is in `native/sid_bridge.cpp`. The build script, `scripts/build-residfp.sh`, uses Emscripten to compile the pinned libresidfp source and exports the SID initialization, register-write, rendering, and reset functions. Its filter-table initialization is adapted to run without native threads in the standalone AudioWorklet environment.

```sh
npm test
```

That command runs the Node.js test suite. Building the WASM binary separately requires an activated Emscripten environment and the native build dependencies; see the build script and [GitHub Actions](https://github.com/funkatron/Project6581/actions) for the exact process.

**Build efficiency:** Ordinary README and UI changes should reuse the compiled WASM artifact. Changes to the native bridge, libresidfp build inputs, or toolchain require rebuilding it.

### Limitations and ongoing work

- Polyphony and Unison are available, but different SID chips cannot yet be configured independently. Switching between Unison and polyphony releases previous notes to prevent stuck voices.
- Live pulse-width modulation and some parameter changes during sustained notes are not yet fully implemented. Showing PWM controls conditionally does not mean PWM modulation is already functional.
- Three LFOs with selectable modulation waveforms, limited parameter routing, and synchronized musical divisions are available. More targets and audio-clock scheduling remain [roadmap](ROADMAP.md) items. The main-thread 60 Hz scheduler can introduce timing jitter, particularly on busy mobile browsers.
- Very fast arpeggiator rates depend on browser scheduling and may sound uneven.
- iPad Safari may require a user gesture to start its audio context.
- Touch-to-sound latency is an active investigation; see [ROADMAP.md](ROADMAP.md).

### Preview builds and deployment

The production application is published at **[Project6581](https://funkatron.github.io/Project6581/)**. PR previews are **opt-in**, not automatically built for every pull request. When explicitly requested, a maintainer can manually run **Build PR preview**, supply the PR number, and select **publish**. Previews are served at `/Project6581/pr-<number>/` after the Pages deployment completes. A successful CI check alone does not establish that the preview URL is live.

Previews are **not automatically removed** when their PR closes; use the workflow's manual **remove** operation. Fork pull requests are not supported for write-capable preview publication. Preview assets are maintained on the internal `preview-assets` branch and combined with the production site during Pages deployment.

**Source and further reading:** [GitHub repository](https://github.com/funkatron/Project6581) · [Development roadmap](ROADMAP.md) · [Actions](https://github.com/funkatron/Project6581/actions)

## 📱 iPad Safari verification

The current device QA steps are documented in [docs/ipad-safari-qa.md](docs/ipad-safari-qa.md). CI tests note allocation and musical LFO rates, but does not itself verify touch latency, iOS audio-unlock behavior, or playback through iPad speakers. PR previews are not built automatically.
