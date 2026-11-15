# Latency investigation log

Working notes for **Lane D** (keyboard-to-audio latency). Measurements from footer **Audio timing**, device sessions, and code profiling belong here. Distinct from acknowledgment round-trip metrics, render cost versus block budget, and perceived speaker onset (see `docs/ipad-safari-qa.md`).

## Findings

### 6581 vs 8580 on the same preset (user observation, 2026-11-07)

**Observation (not yet traced in engine code):** With the synthesizer starting on the default **6581** chip model and loading a **previously problematic preset** (exact preset ID/name not captured in this note), **latency issues were perceived**. Switching to the **8580** model and loading the **same preset** did **not** reproduce those latency issues. This implicates the **6581 emulation path** (or model-specific reinitialization / register behavior) as a factor worth investigating, separate from preset content alone.

**Open follow-ups:**

- Record preset ID/name, iPadOS/Safari version, and Audio timing figures for both chip loads
- Compare dispatch RTT, render avg/max vs block budget, and `baseLatency` / `outputLatency` for 6581 vs 8580 on identical preset snapshots
- Determine whether delay correlates with model switch, preset load, filter table init, or chip reload in `ensureSidModel`
