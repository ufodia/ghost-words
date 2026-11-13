# Field guide

## Start with paired files

Open the app and load a recording with **Load audio**. Load the transcript for that same recording with **Load transcript**. The file name and audio duration help you check the pairing. File names do not prove that the contents match.

All formats supported by your browser's audio decoder may work. WAV and MP3 are common starting points. An unsupported codec produces a decoding error while preserving the existing desk. For a large recording, create a local excerpt first and adjust transcript timestamps to that excerpt.

## Read the evidence queue

Select a flag to highlight its transcript row and play that time interval. Segment playback pauses near the cue's end; use the native recording player to listen more broadly. Browser time events are approximate, so playback is a review convenience, not a sample-accurate audio editor.

**Text over quiet audio** reports the average RMS energy for that interval. The default threshold is −42 dBFS. Lower the threshold to flag only quieter spans. A quiet speaker can trigger this flag.

**Possible repetition loop** means a phrase repeats three times within a cue, or a cue of at least three words repeats the previous cue after basic normalization. Legitimate repetitions can match this pattern.

**Overlapping cues** identifies timing overlap with the previous input cue. Multiple speakers can legitimately overlap. **Outside the recording** identifies a cue ending after the loaded audio duration.

## Make a human decision

Edit the text in a transcript row and move focus out of the field to apply the change. Flags are recalculated and that cue returns to pending review. An empty text edit is rejected; use **Remove line** to exclude a cue.

- **Keep line:** record that you reviewed the cue and retained it.
- **Remove line:** exclude that cue from the next SRT export.
- **Reset review:** return the cue to pending.

Loading a new transcript or recording resets all review decisions. Changing the threshold recalculates flags but retains decisions. Check your decisions again if your interpretation changes.

## Export before you close

**Export reviewed SRT** downloads the current text with the original timings, excluding removed cues and renumbering the rest. Pending cues are retained. **Export evidence JSON** includes all cues, flags, review states, threshold, method, and recording file name. The recording itself is not embedded.

The evidence JSON is an audit report, not a resumable session file. To start another review, import its `cues` array as transcript JSON and load the original recording. Review decisions are not automatically restored.

## Reset

**Load demo** replaces the desk with the synthetic example. **Clear desk** removes current files and state from application memory. Browser downloads already saved to disk are unaffected.
