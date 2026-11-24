# SID Instrument Lab: libsidplayfp upstream

## Versions inspected

| Component | Version | License | Source |
|-----------|---------|---------|--------|
| libsidplayfp | v2.14.0 | GPL-2.0-or-later | https://github.com/libsidplayfp/libsidplayfp |
| libresidfp (via residfp-builder) | bundled in libsidplayfp | GPL-2.0-or-later | same tree |
| libsidplayfp-wasm (playback probe only) | npm, unpinned optional dev dep | GPL-2.0-or-later | https://github.com/libsidplayfp/libsidplayfp-wasm |

## Register-write interception

SID bus writes from the 6510 land in `SidBank::poke` and `ExtraSidBank::poke` (`src/c64/Banks/`), which forward to `c64sid::poke` / `writeReg`. Project6581 patches these banks to call `traceSidRegisterWrite()` with `EventScheduler::getTime(EVENT_CLOCK_PHI2)` as the cycle timestamp.

Patches live under `native/sid-lab-capture/overlay/` and are applied by `scripts/build-sid-lab-capture.sh`.

## Build

```sh
bash scripts/build-sid-lab-capture.sh
dist/sid-lab-capture   # JSON stdin/stdout capture backend
```

System tools: see **[sid-lab-tools.md](sid-lab-tools.md)** (autoconf, automake, libtool, g++, libgcrypt-dev, xa65, git submodules, etc.).

## Compatibility limits

- Cycle timestamps use libsidplayfp's PHI2 clock, not audio sample indices.
- Trace replay through Project6581 `reSIDfp` remains frame-quantized (`render-residfp-offline.js`).
- RSID and some PSID tunes may require user-supplied C64 ROMs via `sidplayfp::setRoms` (not wired in the minimal capture binary yet).
- Multi-SID: extra chips are indexed in installation order (chip 0 = $D400).
- Do not commit HVSC tunes or C64 ROM images.