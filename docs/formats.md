# Input and export contracts

## SRT and WebVTT

SRT uses `HH:MM:SS,mmm --> HH:MM:SS,mmm`. WebVTT accepts dot-separated milliseconds and either `MM:SS.mmm` or `HH:MM:SS.mmm`; cue settings after the end timestamp are ignored. WEBVTT headers, NOTE blocks, STYLE blocks, and REGION blocks are skipped. Cue text can span several lines and is treated as literal text, including markup.

SRT exports use millisecond precision. If rounding would collapse a positive cue interval, the exported end is extended to one millisecond after its start. Embedded blank lines from JSON or manual edits are collapsed to a single line break because blank lines delimit SRT cues. Every word remains in the export; the evidence JSON retains the original cue timing and text.

```srt
1
00:00:00,400 --> 00:00:02,700
Calibration segment one.
```

## JSON transcript

Provide a cue array or an object containing `cues`. Start and end are finite seconds; start must be nonnegative, end greater than start, and end no greater than 360,000 seconds. Text must be nonempty and at most 20,000 characters per cue. Each import must contain 1–10,000 cues. Supplied cue IDs are replaced with deterministic local IDs in input order.

An initial UTF-8 byte-order mark is accepted in all three transcript formats.

```json
{"cues":[{"start":0.4,"end":2.7,"text":"Calibration segment one."}]}
```

The transcript parser does not reorder cues. Out-of-order inputs can produce overlap flags and remain in that order when exported.

## Evidence JSON

The report has `schemaVersion: 1`, tool/version, audio file name, `thresholdDbFs`, a method description, `cues`, `findings`, and `decisions`. Decisions are keyed by cue ID with `pending`, `keep`, or `remove`. A missing decision means pending. Findings include cue ID, kind, label, detail, severity (`review` or `high`), and optional measured dBFS.

Reports include literal transcript text. They contain neither the audio bytes nor a cryptographic binding to the audio; retain the original recording separately if you need evidence provenance.

## Library API

Import the TypeScript functions from `src/core.ts` in a compatible build:

```ts
import { analyze, parseTranscript, exportSrt } from './src/core';

const cues = parseTranscript('1\n00:00:00,000 --> 00:00:01,000\nHello.');
const findings = analyze(cues, null); // Repetition/timing checks only without audio.
const srt = exportSrt(cues, { 'cue-1': 'keep' });
```

`analyze(cues, signal, threshold)` accepts `{samples: Float32Array, sampleRate: number}` or `null`; a signal should contain finite normalized PCM data at its actual positive sample rate. The browser supplies decoded data. Treat sample arrays as immutable after the first analysis because the energy index is cached by array identity; use a new array after an audio edit. Threshold must be finite and between −100 and −5 dBFS. `signalDb` measures exact interval RMS with a shared block-energy index, using −120 dBFS as its floor. `wavBytes` writes a mono PCM WAV for the synthetic fixture.
