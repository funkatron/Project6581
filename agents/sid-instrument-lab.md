# SID Instrument Lab: implementation notes

Status: foundation in progress; not connected to the UI or audio engine.

## Goal

Provide an independent, touch-first Project6581 workspace to inspect .sid music, isolate SID voices, capture timed register activity, and export audio and reusable instrument definitions. This is an internal feature, not a separate application.

## Architectural boundaries

- Keep arbitrary SID 6510 program execution in a dedicated, sandboxed playback/emulation layer. **Never** execute SID music data in the live synth worklet.
- The header parser is pure and synchronous. It reads PSID/RSID metadata, including subtunes, addresses and flags, but does not interpret machine code or produce audio.
- Playback should run outside the main live-performance audio lifecycle. Prefer a worker with bounded CPU/time/memory budgets and explicit stop/cancel.
- Capture register writes with timestamps and chip identity. Model multi-SID tunes and global filter registers explicitly.
- Voice isolation is not instrument extraction: a voice can change instruments throughout a subtune, and the chip filter is shared.
- Preserve exact event traces when exporting simplified Project6581 presets, noting any fidelity loss.
- Reuse the existing WAV encoder only after producing isolated, validated PCM samples.
- Keep control locations stable when expanding panels or switching voices; follow agents/ui-stable-layout.md.

## Milestones

### M1: File loading and voice isolation
- [x] Add standalone PSID/RSID metadata reader with tests
- [ ] Validate against a real HVSC file (e.g. Commando.sid)
- [ ] Add an Instrument Lab entry point and local .sid file picker
- [ ] Display metadata, subtune list, and playback status
- [ ] Implement isolated SID playback, stop, and voice solo
- [ ] Capture timed SID register events and export solo WAV
- [ ] Automated tests for malformed files, subtunes, isolation, and cancellation
- [ ] Verify Safari on iPad with audible solo playback and file export

### M2: Instrument discovery
- [ ] Detect note-on boundaries and recurring register-event patterns
- [ ] Cluster candidate instruments and offer human review
- [ ] Export exact event sequences and approximate Project6581 presets
- [ ] Compare extracted audio with the original playback

## Safety and accuracy

SID files contain executable machine code. Treat all uploaded files as untrusted; parsing the header alone is not playback validation. RSID compatibility and multi-SID support need separate tests. Do not claim a voice stem is a distinct instrument. Avoid embedding copyrighted tune binaries in repository tests.

## Release policy

Do not merge, tag, deploy, or bump semantic version merely for individual commits. Verify CI, review Copilot feedback, and obtain explicit authorization before release.
