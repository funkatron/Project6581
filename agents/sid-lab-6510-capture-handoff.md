# Handoff: Native 6510 register capture (PR #186)

**Branch:** `feature/sid-instrument-lab-foundation` (tracks origin)  
**PR:** https://github.com/funkatron/Project6581/pull/186  
**Repo:** https://github.com/funkatron/Project6581  

Point the next agent at this file and at `AGENTS.md`, `agents/sid-lab-6510-capture-design.md`, and `agents/sid-instrument-lab.md`.

---

## Objective (context)

Integrate **libsidplayfp** as a **native** 6510 playback engine that emits **cycle-timestamped** `{cycle, chip, register, value}` traces, wired to `captureSidRegisters` via the existing **process backend** protocol—**without** changing live **reSIDfp** / AudioWorklet behavior.

---

## What was accomplished

### Working native backend

- **Hook:** `SidBank::poke` / `ExtraSidBank::poke` call `traceSidRegisterWrite()` using `EventScheduler::getTime(EVENT_CLOCK_PHI2)`.
- **Overlay:** `native/sid-lab-capture/overlay/` (trace sources, bank headers, `libsidplayfp-register-trace.patch`).
- **Binary:** `native/sid-lab-capture/sid-lab-capture.cpp` — JSON stdin → `{events:[...]}` stdout (same contract as `createProcessSidBackend`).
- **Build:** `scripts/build-sid-lab-capture.sh` → `dist/sid-lab-capture` (**gitignored** via `dist/`).

### Verified behavior

- Manual smoke + `test/sid-instrument-lab-native-capture.test.js` pass locally when `dist/sid-lab-capture` exists.
- Fixture trace includes expected subsequence **24→0→1→5→6→4** (`0x0f,0x00,0x20,0x09,0xf0,0x21`). Extra **duplicate volume** write (reg 24) from player init is expected; `assertToneFixtureWrites` allows it.

### Docs

- `agents/sid-lab-tools.md` — deps checklist (autotools, libgcrypt-dev, **xa65**, submodules, etc.).
- `agents/sid-lab-upstream.md` — upstream v2.14.0, patch location, limits.
- `agents/sid-instrument-lab.md` — tooling links.

---

## Git state (in repo)

| Path | Notes |
|------|--------|
| `native/sid-lab-capture/` | Overlay + `sid-lab-capture.cpp` |
| `scripts/build-sid-lab-capture.sh` | Builds `dist/sid-lab-capture` |
| `test/sid-instrument-lab-native-capture.test.js` | Skips if binary missing |
| Agent docs | `sid-lab-handoff.md`, `sid-lab-tools.md`, `sid-lab-upstream.md`, `sid-instrument-lab.md` |
| `vendor/libsidplayfp/` | **Gitignored** — clone via build script |
| `dist/sid-lab-capture` | **Gitignored** — build locally or in CI |

---

## Verification checklist (PR)

| Item | Status |
|------|--------|
| Native source inspected | Done (v2.14.0; see `sid-lab-upstream.md`) |
| Native builds | Done locally (`build-sid-lab-capture.sh`) |
| PSID fixture executes | Done |
| Expected SID writes in order | Done (integration test) |
| Cycle timestamps | Done (monotonic PHI2 cycles) |
| Real HVSC tune (Commando) | **Not done** — user-supplied `.sid` |
| Trace → reSIDfp replay | **Not verified** (`render-residfp-offline.js`, `sid-lab wav`) |
| Automated tests | New test passes when binary present |
| CI | **No native job** — test skips without binary |
| Docs | Agent docs added; update PR body checklist |

---

## Follow-ups (priority)

1. **CI:** Optional workflow installing `xa65`, autotools, `libgcrypt-dev`—or keep skip-only test.
2. **CLI:** Done: omitting `--backend` or using `--backend auto` resolves `dist/sid-lab-capture`, with a clear build error when missing.
3. **Commando / HVSC:** Manual `capture` + probe; document in PR; no checked-in tunes.
4. **RSID / ROMs:** `sid-lab-capture.cpp` does not call `setRoms()` yet.
5. **Trace limits:** `shouldStop` on sink not consulted in `Player::play` loop (limits in callback only).
6. **Push + PR:** Refresh verification checklist on #186.

---

## Commands

```sh
git checkout feature/sid-instrument-lab-foundation
# apt: autoconf automake libtool g++ libgcrypt-dev xa65
bash scripts/build-sid-lab-capture.sh
node --test test/sid-instrument-lab-native-capture.test.js
node --test test/sid-instrument-lab-*.test.js

node scripts/sid-lab.mjs capture /path/to/tune.sid \
  --backend "$(pwd)/dist/sid-lab-capture" --subtune 1 --json
```

---

## Rules

- No merge/tag/deploy without authorization.
- No copyrighted SID/ROM in repo.
- Do not rebuild `residfp.wasm` for Instrument Lab-only JS/doc changes (`AGENTS.md`).
- Small, reviewable commits on PR #186.

---

## Success condition

Met for the **original tone fixture** with **real** libsidplayfp 6510 emulation (not mocks alone). Commando, CI, and WAV replay proof remain open.