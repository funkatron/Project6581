# Project6581 release versioning

## Next milestone: v0.2.0 (planned)

Project6581 has gained substantial functionality since the original 0.1 series, including the Game Arp step sequencer, expanded arpeggiator, three LFOs, voice allocation/unison, preset management, recording, and major interface improvements. **v0.2.0 is the next intentional minor release**, once the current work (including PR #59's Safari audio verification) is sufficiently validated and a merge/release is explicitly authorized.

This document records a decision, **not an immediate version bump, merge, or production deployment**. Retain the known-good PR #59 preview and its exact build stamp as a diagnostic comparison.

## Versioning conventions

- Use `MAJOR.MINOR.PATCH`. While the app is in 0.x development, increase **MINOR** for meaningful functional milestones or potentially incompatible changes. Increase **PATCH** for fixes and maintenance releases within an established minor series. Reserve **1.0.0** for a separately approved stability milestone.
- Assign semantic versions to **intentional releases**, not automatically to every CI run, documentation edit, preview build, or commit. A significant collection of completed features can justify a single planned minor release rather than a series of incidental patch increments.
- Show the **UTC build timestamp** and **short Git commit SHA** separately from the release version. They identify an exact preview/build without implying that each build is a new release.
- Do not confuse application version numbers with independent formats such as the user-preset JSON schema version.
- For a release, record the version, notable user-facing changes, relevant device checks, and exact source commit. Confirm CI, Copilot comments, actual iPad playback where applicable, and production deployment independently.

## Implementation follow-up

The current build logic in `scripts/version-policy.mjs` derives a version from commit messages, including patch increments for documentation and other routine commits. This **does not yet implement** the intentional-release policy above. In a separate, reviewed change, align `package.json`, build stamping, tests, and release documentation with this policy. Preserve a unique build identifier for previews; do not modify the audio engine merely to change the version number.

**Next action:** Plan/approve the v0.2.0 release after PR #59 verification; do not merge or deploy on the strength of this documentation change alone.
