# Project6581 release versioning

## Current release floor: v0.3.0

| Milestone | Shipped highlights (on `main`) |
| --- | --- |
| **v0.2.0** | Triple SID engine cards, note routing, preset format **v5**, audio timing diagnostics |
| **v0.3.0** | Per-engine LFO targets, live per-chip voice settings, WebKit browser smoke fixes |
| **After v0.3.0 floor** | Layer factory presets, rainbow meters, layer routing fixes (commit-derived semver only) |

`package.json` still records the intentional floor (**0.3.0**). `node scripts/resolve-version.mjs` may report a higher **0.x** (for example **0.4.0**) from `feat:` commits on `main` since the floor. That is expected automatic semver until you cut a new floor with `scripts/bump-release.mjs`.

Displayed build stamps add a UTC timestamp and cache id (`version+timestamp`); they are not separate product releases.

## How automatic semver works

1. **`package.json`** holds the intentional **release floor** (last milestone you chose).
2. **`BASELINE`** in `scripts/version-policy.mjs` is the **main** commit where that floor was recorded.
3. **`scripts/stamp-build.mjs`** (CI, Pages, previews) calls **`resolveVersion()`**, which walks **first-parent** commits after `BASELINE` and applies [Conventional Commits](https://www.conventionalcommits.org/) rules:
   - `feat:` → minor (patch reset)
   - `fix:`, `docs:`, `chore:`, etc. → patch
   - `feat!:` / `BREAKING CHANGE:` → minor while `0.x`, major at `1.0+`
   - Squash-merge PR titles without a prefix → patch
   - `chore: release …` and `Merge branch …` baseline-only commits → **no** auto bump
4. Build stamps add a **UTC timestamp** and cache-bust id (`version+timestamp`); they are not separate releases.

Check the version CI would stamp without writing files:

```bash
node scripts/resolve-version.mjs
```

Cut a new milestone floor:

```bash
node scripts/bump-release.mjs 0.4.0
# commit package.json + version-policy.mjs, push main
```

## Conventions

- Do not confuse app semver with **preset JSON schema** version (currently v5 in presets).
- Reserve **1.0.0** for an explicit stability decision; until then stay on `0.x` with minor milestones.
- Release notes: record user-facing changes, device checks, and the exact `main` commit when promoting a floor.