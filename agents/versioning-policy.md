# Versioning policy (owner, 2026-11-17)

**`package.json` `version` must equal the true resolved version** — not a stale floor. After code lands on a branch targeting `main`, run `node scripts/sync-package-version.mjs` and commit `package.json` when the resolved version changes. The baseline is the last first-parent commit that changed the `package.json` version, so squash merges are safe; there is no stored SHA to update.

## Semver rules (0.x)

| Change | Bump | Commit style |
| --- | --- | --- |
| **New feature or behavior change** | **Middle** (minor), patch → 0 | `feat: …` or merge PR title starting with `feat:` (GitHub merge body title on `main`) |
| **Any other codebase change** | **Right** (patch) | `fix:`, `refactor:`, `docs:`, `chore:`, tests, or untyped PR titles |

- Breaking changes before 1.0: still **minor** (not major).
- `chore: release v…` and merge-only baseline commits do **not** increment.
- Footer build stamp uses the same resolved version + UTC time ([docs/versioning.md](../docs/versioning.md)).

## Agent workflow

1. Finish the code PR.
2. `node scripts/sync-package-version.mjs` on the branch (needs git history; `fetch-depth: 0` in CI).
3. Commit `package.json` if the version changed (the sync script refuses to run with uncommitted `package.json` edits).
4. CI fails if `package.json` ≠ `resolve-version.mjs` output.

Preset JSON **schema version** (v5) is separate from app semver.