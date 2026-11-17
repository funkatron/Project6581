# Roadmap Step 2b — Western scale lock

**Goal:** Key + scale selectors, keyboard in/out highlighting, optional **scale lock** on all performance notes.

## Policy (shipped)

- **Highlighting:** Keys dim when outside the selected scale (chromatic = no dimming).
- **Scale lock:** When enabled (and scale is not chromatic), off-scale input **quantizes to the nearest scale tone**; equal distance → **lower** MIDI note. Applied in `play()` / `stop()` and arp clocks so audio and highlights match.
- **Presets:** `performance.scale` `{ tonic, id, lock }` saved in preset v5 JSON (defaults on import).

## Automated

- [x] `src/western-scales.js` + `test/western-scales.test.js`
- [x] Full `node --test`

## Device (owner)

- [ ] iPad: scale lock with touch + Root/Game arp on real hardware
- [ ] MIDI (desktop): notes quantize when lock on