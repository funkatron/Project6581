# Project6581 release versioning

## Owner policy (2026-11-17)

1. **`package.json` tracks the true app version** — it must match `node scripts/resolve-version.mjs` on every merge to `main`. Run `node scripts/sync-package-version.mjs` after shipping code and commit the result when the version changes.
2. **Patch (rightmost):** any change to the codebase that is not a feature/behavior milestone.
3. **Minor (middle):** new features or **behavior changes** — use **`feat:`** in commit/PR titles so version history stays honest.

Displayed footer: `Project6581 vX.Y.Z · Built … (UTC)` from [stamp-build.mjs](../scripts/stamp-build.mjs). Cache-bust id is `version+timestamp` on module URLs.

**Preset JSON schema version** (v5 in presets) is unrelated to app semver.

## Current release floor: v0.4.0+

**App semver on `main`:** **v0.5.0** (LFO pan target, instrument state slice, Step E QA guards — [#139](https://github.com/funkatron/Project6581/pull/139)).

## Historical floors: v0.3.0

| Milestone | Shipped highlights (on `main`) |
| --- | --- |
| **v0.2.0** | Triple SID engine cards, note routing, preset format **v5**, audio timing diagnostics |
| **v0.3.0** | Per-engine LFO targets, live per-chip voice settings, WebKit browser smoke fixes |
| **After v0.3.0 floor** | Layer factory presets, rainbow meters, layer routing fixes (commit-derived semver only) |

## How automatic semver works

1. **`package.json`** holds the current **released** version (kept in sync via `sync-package-version.mjs`).
2. **`BASELINE`** in [version-policy.mjs](../scripts/version-policy.mjs) is the **main** commit where `package.json` last synced.
3. **`resolveVersion()`** walks **first-parent** commits after `BASELINE` and applies:
   - `feat:` (or PR squash title) → **minor**, patch reset to 0
   - Any other counted commit → **patch**
   - `feat!:` / `BREAKING CHANGE:` → minor while `0.x` (major at `1.0+`)
   - `chore: release …` / `Merge branch …` baseline-only → **no** bump
4. CI ([test.yml](../.github/workflows/test.yml)) fails if `package.json` ≠ resolved.

Check resolved version:

```bash
node scripts/resolve-version.mjs
```

Sync after your changes:

```bash
node scripts/sync-package-version.mjs
# commit package.json + version-policy.mjs when updated
```

Cut a named milestone (optional label; still uses sync):

```bash
node scripts/bump-release.mjs 0.4.0
# same as sync but sets an explicit target floor — prefer sync for day-to-day
```

## Conventions

- Use **`feat:`** for user-visible features and behavior changes (minor).
- Use **`fix:`**, **`refactor:`**, etc., or untyped titles for everything else (patch).
- Reserve **1.0.0** for an explicit stability decision.
- Agent notes: [agents/versioning-policy.md](../agents/versioning-policy.md).