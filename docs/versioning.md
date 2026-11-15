# Project6581 release versioning

## Current release: v0.3.0

**v0.2.0** shipped triple SID engines, routing, preset format v5, and improved audio timing diagnostics. **v0.3.0** adds per-engine LFO/modulation, live voice settings per chip, and WebKit browser smoke fixes for the new engine panel UI.

This document records release decisions. Build stamps still carry a UTC timestamp and derived cache-bust id separate from the semantic version.

## Versioning conventions

- Use `MAJOR.MINOR.PATCH`. While the app is in 0.x development, increase **MINOR** for meaningful functional milestones or potentially incompatible changes. Increase **PATCH** for fixes and maintenance releases within an established minor series. Reserve **1.0.0** for a separately approved stability milestone.
- Assign semantic versions to **intentional releases**, not automatically to every CI run, documentation edit, preview build, or commit. A significant collection of completed features can justify a single planned minor release rather than a series of incidental patch increments.
- Show the **UTC build timestamp** and **short Git commit SHA** separately from the release version. They identify an exact preview/build without implying that each build is a new release.
- Do not confuse application version numbers with independent formats such as the user-preset JSON schema version.
- For a release, record the version, notable user-facing changes, relevant device checks, and exact source commit. Confirm CI, Copilot comments, actual iPad playback where applicable, and production deployment independently.

## Build stamping

`package.json` holds the intentional release floor. `scripts/version-policy.mjs` defines `BASELINE` (the main commit at that release). `scripts/stamp-build.mjs` may advance the displayed version from conventional commits **after** `BASELINE` only. When cutting a new release, bump `package.json` and move `BASELINE` to the release commit on main in the same change.