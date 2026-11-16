# Latency investigation log

Working notes for **Lane D** (keyboard-to-audio latency). Measurements from footer **Touch → output**, expanded **Audio timing**, device sessions, and code profiling belong here.

**Footer metric (2026-11):** After each key press, `keyToOutputEstimateMs` = main-thread time to first loud PCM in the worklet + remainder of the render quantum + `AudioContext.outputLatency`. This is the best in-app estimate of touch → device output; it is not a DAC trace. Control-ping and render-cost lines remain inside the optional timing panel only.

## Findings

### 6581 vs 8580 on the same preset (user observation, 2026-11-07)

**Observation (not yet traced in engine code):** With the synthesizer starting on the default **6581** chip model and loading a **previously problematic preset** (exact preset ID/name not captured in this note), **latency issues were perceived**. Switching to the **8580** model and loading the **same preset** did **not** reproduce those latency issues. This implicates the **6581 emulation path** (or model-specific reinitialization / register behavior) as a factor worth investigating, separate from preset content alone.

**Open follow-ups:**

- Record preset ID/name, iPadOS/Safari version, and Audio timing figures for both chip loads
- Compare dispatch RTT, render avg/max vs block budget, and `baseLatency` / `outputLatency` for 6581 vs 8580 on identical preset snapshots
- Determine whether delay correlates with model switch, preset load, filter table init, or chip reload in `ensureSidModel`

### Meters on time, output late — browser session (user observation, 2026-11-16)

**Observation:** During iPad testing, **level meters and in-app timing tracked key presses**, but **audible output occasionally lagged** (roughly once in several sessions). **Closing the tab and loading a fresh tab** restored aligned output without code changes.

**Working hypothesis:** `AudioContext` or OS output buffering entered a bad state (long-lived tab, interrupted/suspended transitions, or route changes). Treat as **host recovery** until a reproducible case shows normal footer metrics *and* abnormal worklet PCM onset in the same diagnostic bundle.

**Open follow-ups:**

- Capture a diagnostic JSON **while the lag is audible**; compare `contextState`, startup transitions, and note event timing vs a good session
- Repeat on **desktop Chromium** using [desktop-chromium-qa.md](desktop-chromium-qa.md) to separate Safari-specific session issues from engine defects
- If reproducible, consider a small UX affordance (visible context state + “reload audio”) before deeper scheduling changes
