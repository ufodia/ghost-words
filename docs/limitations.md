# Interpretation and limits

GhostWords flags review candidates. It has no acoustic speech model, speaker identification, language understanding, confidence calibration, or access to the system that created your transcript.

## What a flag means

The quiet-audio heuristic computes RMS energy over the entire cue interval. Brief speech inside a long interval may be diluted. Background noise can hide invented text from this heuristic. Low-volume speech can be flagged. Energy is measured relative to digital full scale; the tool does not know your microphone gain or listening environment.

Repetition uses simple text normalization and local patterns. Repeated words can be intentional. Paraphrased loops can be missed. Timing checks do not correct alignment, synchronize a wrong transcript, or identify speakers.

## Supported scale

The UI limits compressed audio input to 100 MB and decoded audio to 30 minutes. Browser decoding occurs before duration is available and can temporarily require substantial memory. A smaller excerpt is recommended on low-memory machines. The transcript limit is 2 MB, 10,000 cues, and 20,000 characters per cue. A very large queue may be slow because the initial version renders every row.

## Evidence and persistence

The JSON report is not signed, does not hash the audio, and cannot establish forensic provenance. User text edits are reflected in exported cues; a separate original transcript is not retained in the report. Preserve your original files if you need a complete revision history.

Review state is not saved automatically. Refreshing closes the session state. Exports deliberately retain pending cues and require you to choose removal. Check the final recording and transcript before relying on them for publication or consequential decisions.
