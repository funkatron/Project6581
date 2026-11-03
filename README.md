# Project6581 🎹

**Play classic Commodore 64 SID sounds in your browser.**

Project6581 is a touch-friendly synthesizer using **reSIDfp**, an emulator of the original C64 sound chip. It works with a screen keyboard and supports repeating game-style melodies.

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
| **Waveform** | The basic tone shape | Compare **Pulse** and **Sawtooth** |
| **Attack / Decay / Sustain / Release** | How a note begins, changes, holds, and ends | Increase **Release** for a longer tail |
| **Pulse width** | The character of the pulse waveform | Try **25%**, then **50%** |
| **Filter cutoff** | How much high-frequency sound passes through | Lower it for a darker sound |
| **Resonance** | Emphasizes frequencies around the filter cutoff | Increase a little while moving cutoff |
| **Chip character** | Selects **6581** or **8580** SID emulation | Reload after changing the chip selection |
| **Stop all** | Stops currently playing notes | Use this if a note seems stuck |

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
- **Monophonic:** This interface currently plays **one SID voice at a time**, even though the original chip has three.
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
- **Current voice model:** The interface exposes one playable voice, although the original SID hardware supports three.
- **No audio fallback:** If the WebAssembly SID engine cannot initialize, the app reports the failure instead of silently substituting generic oscillators.

### Building and testing

The native bridge is in `native/sid_bridge.cpp`. The build script, `scripts/build-residfp.sh`, uses Emscripten to compile the pinned libresidfp source and exports the SID initialization, register-write, rendering, and reset functions. Its filter-table initialization is adapted to run without native threads in the standalone AudioWorklet environment.

```sh
npm test
```

That command runs the Node.js test suite. Building the WASM binary separately requires an activated Emscripten environment and the native build dependencies; see the build script and [GitHub Actions](https://github.com/funkatron/Project6581/actions) for the exact process.

**Build efficiency:** Ordinary README and UI changes should reuse the compiled WASM artifact. Changes to the native bridge, libresidfp build inputs, or toolchain require rebuilding it.

### Limitations and ongoing work

- The playable interface is currently **monophonic**.
- Live pulse-width modulation and some parameter changes during sustained notes are not yet fully implemented.
- Very fast arpeggiator rates depend on browser scheduling and may sound uneven.
- iPad Safari may require a user gesture to start its audio context.
- Touch-to-sound latency is an active investigation; see [ROADMAP.md](ROADMAP.md).

### Preview builds and deployment

The production application is published at **[Project6581](https://funkatron.github.io/Project6581/)**. Same-repository pull requests can publish separate, public previews at `/Project6581/pr-<number>/` once their **Build PR preview** and Pages deployment workflows complete. A successful CI check alone does not establish that the preview URL is live.

Previews are removed when their PR closes. Fork pull requests do not publish previews automatically because publishing requires repository write permissions. Preview assets are maintained on the internal `preview-assets` branch and combined with the production site during Pages deployment.

**Source and further reading:** [GitHub repository](https://github.com/funkatron/Project6581) · [Development roadmap](ROADMAP.md) · [Actions](https://github.com/funkatron/Project6581/actions)
