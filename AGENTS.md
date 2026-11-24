# Project6581 agent guidance

- Preserve authentic reSIDfp playback and immediate note-on register flushing.
- Read ROADMAP.md and the relevant device checklist before changing behavior.
- Keep fixes focused; use behavioral regression tests for asynchronous lifecycle changes.
- Do not rebuild native WASM for JavaScript or UI-only changes.
- Inspect CI and all Copilot reviews. Merge and production deployment require explicit authorization; publish previews only when requested.
- Put additional agent documentation in agents/. User-facing verification belongs in docs/.
- For multi-surface UI flags, use the slice pattern in [agents/ui-reactive-state.md](agents/ui-reactive-state.md) (`ui-control.js` + subscribe), not raw `.checked =` / `.value =` on slice-bound controls.
- Include a scannable completion checklist in PR descriptions. Distinguish automated checks from actual iPad audio verification.
- **Stable tool layout:** toggling visibility must not reflow sibling controls — see [agents/ui-stable-layout.md](agents/ui-stable-layout.md) and `setLayoutInert()` in `src/ui-layout.js`.
- **Slider UX:** horizontal vs vertical vs pop-up faders — see [agents/ui-slider-patterns.md](agents/ui-slider-patterns.md) (drum grid uses compact horizontal lane strips; vertical/pop-over where row height is insufficient).
- **Versioning:** `package.json` must match `node scripts/resolve-version.mjs`. Run `node scripts/sync-package-version.mjs` when code changes bump semver; **feat/behavior → minor**, other changes → **patch**. See [agents/versioning-policy.md](agents/versioning-policy.md).
- **Lint:** `npm run lint` must pass (CI enforces it). `eslint.config.mjs` has bug-finding rules only, no style rules; do not add Prettier or reformat files while tests still match exact source text.
