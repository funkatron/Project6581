# SID Instrument Lab: tools and dependencies

Living checklist for **native 6510 capture** (PR #186). Update this file when CI or local setup changes.

## Core runtime (Instrument Lab JS)

| Tool | Role | In repo? |
|------|------|----------|
| **Node.js** (project `type: module`) | Tests, `scripts/sid-lab.mjs`, process backend | CI / dev |
| `npm test` / `node --test` | Regression suite | `package.json` |

## Native capture backend (`dist/sid-lab-capture`)

Built via `bash scripts/build-sid-lab-capture.sh` (not required for parser-only workflow).

### System packages (Linux)

| Package | Why |
|---------|-----|
| `git` | Clone `vendor/libsidplayfp` + submodules |
| `build-essential` (gcc/g++) | C++20 link of capture binary |
| `make` | libsidplayfp build |
| `autoconf`, `automake`, `libtool` | Generate `configure` for libsidplayfp |
| `libgcrypt-dev` | MD5 in libsidplayfp (`pkg-config libgcrypt`) |
| `xa65` | Assemble `psiddrv.bin` / sidplayer blobs at build time (`configure` sets `XA=xa`) |
| `patch` | Apply `native/sid-lab-capture/overlay/libsidplayfp-register-trace.patch` |

Usually present: `od`, `pkg-config`, `perl` (resid wave tables).

### Vendored upstream (local only, not committed as a rule)

| Path | Version | Notes |
|------|---------|--------|
| `vendor/libsidplayfp` | **v2.14.0** tag | Full clone + `git submodule update --init` (`exsid-driver`, `resid`) |
| Overlay | `native/sid-lab-capture/overlay/` | Trace hook sources + bank headers + patch |

### Output artifact

| Path | Protocol |
|------|----------|
| `dist/sid-lab-capture` | JSON stdin → `{ "events": [{cycle, chip, register, value}] }` stdout |

Wire-up: `node scripts/sid-lab.mjs capture tune.sid --backend /absolute/path/to/dist/sid-lab-capture --json`

## Optional: playback probe (PCM only, no trace)

| Tool | Role |
|------|------|
| `libsidplayfp-wasm` (npm, **no-save**) | `scripts/sid-lab-playback-probe.mjs`, `test/sid-instrument-lab-real-playback.test.js` |

Not a substitute for native capture; `getSidStatus()` is not a write trace.

## Optional: trace replay (Project6581 reSIDfp)

| Artifact | Role |
|----------|------|
| `dist/residfp.wasm` | `build:wasm` / `scripts/build-residfp.sh` (Emscripten) |
| | `render-residfp-offline.js`, `test/sid-instrument-lab-real-wasm.test.js` |

**Do not** rebuild WASM for JS-only Instrument Lab changes (see `AGENTS.md`).

## Optional: real HVSC / RSID verification

| Asset | Policy |
|-------|--------|
| User-supplied `.sid` (e.g. Commando) | Legitimate copy only; **never** commit to repo |
| C64 ROM dumps (kernal/basic/chargen) | Required for some RSID; **never** commit; not yet wired in minimal capture binary |

## GitHub / PR workflow

| Tool | Role |
|------|------|
| `gh` | PR #186, CI status, Copilot review |
| Branch `feature/sid-instrument-lab-foundation` | Working branch |

## Quick verify (after build)

```sh
bash scripts/build-sid-lab-capture.sh
node --test test/sid-instrument-lab-native-capture.test.js
```

Manual smoke (fixture):

```sh
# pipe JSON with sidBase64 from test/fixtures/sid-lab-tone.js
```

Expected **subsequence** on chip 0: registers 24 → 0 → 1 → 5 → 6 → 4 (values `0x0f,0x00,0x20,0x09,0xf0,0x21`). Player init may add extra writes (e.g. duplicate volume).

## CI gap (track)

- [ ] Document whether CI should build `sid-lab-capture` or skip with conditional test (like `real-wasm`).
- [ ] Pin apt packages or container image if we add a native job.
- [ ] `xa65` + autotools on CI runners if native build is mandatory.