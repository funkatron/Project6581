# Versioning policy (owner, 2026-11-17)

**`package.json` `version` must equal the true resolved version** — not a stale floor. After code lands on a branch targeting `main`, run `node scripts/sync-package-version.mjs` and commit `package.json` + `scripts/version-policy.mjs` when the resolved version changes.

## Semver rules (0.x)

| Change | Bump | Commit style |
| --- | --- | --- |
| **New feature or behavior change** | **Middle** (minor), patch → 0 | `feat: …` or merge PR title starting with `feat:` |
| **Any other codebase change** | **Right** (patch) | `fix:`, `refactor:`, `docs:`, `chore:`, tests, or untyped PR titles |

- Breaking changes before 1.0: still **minor** (not major).
- `chore: release v…` and merge-only baseline commits do **not** increment.
- Footer build stamp uses the same resolved version + UTC time ([docs/versioning.md](../docs/versioning.md)).

## Agent workflow

1. Finish the code PR.
2. `node scripts/sync-package-version.mjs` on the branch (needs git history; `fetch-depth: 0` in CI).
3. Commit sync files if version changed.
4. CI fails if `package.json` ≠ `resolve-version.mjs` output.

Preset JSON **schema version** (v5) is separate from app semver.