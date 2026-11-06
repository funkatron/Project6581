# Project6581 agent guidance

- Preserve authentic reSIDfp playback and immediate note-on register flushing.
- Read ROADMAP.md and the relevant device checklist before changing behavior.
- Keep fixes focused; use behavioral regression tests for asynchronous lifecycle changes.
- Do not rebuild native WASM for JavaScript or UI-only changes.
- Inspect CI and all Copilot reviews. Merge and production deployment require explicit authorization; publish previews only when requested.
- Put additional agent documentation in agents/. User-facing verification belongs in docs/.
- Include a scannable completion checklist in PR descriptions. Distinguish automated checks from actual iPad audio verification.
