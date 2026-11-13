# Changelog

## Unreleased

- Prevent pending transcript reads from overwriting Clear desk, Load demo, or a newer import.
- Accept a UTF-8 BOM in JSON transcript files.
- Keep SRT exports valid when JSON cue text contains blank lines or positive durations shorter than one millisecond.
- Reset audio metadata when clearing the desk and retain the cue text length limit during editing.
- Add focused unit and browser regressions for these import/export boundaries.

## 0.1.0 — 2026-11-13

Initial version: browser-local audio decode and waveform, SRT/VTT/JSON input, quiet-audio/repetition/timing review flags, transcript editing and review decisions, reviewed SRT and evidence JSON exports, synthetic demo, core tests, and project guides.
