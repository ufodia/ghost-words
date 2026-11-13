import { describe, expect, it } from 'vitest';
import { analyze, demoCues, demoSignal, exportSrt, formatTime, parseTranscript, repeatedPhrase, signalDb, timestamp, validateCues, wavBytes } from './core';

describe('timestamped transcript formats', () => {
  it('parses SRT with BOM, CRLF and multiline text', () => {
    const cues = parseTranscript('\uFEFF1\r\n00:00:01,250 --> 00:00:02,500\r\nHello\r\nworld.\r\n');
    expect(cues[0]).toEqual({ id: 'cue-1', start: 1.25, end: 2.5, text: 'Hello\nworld.' });
  });
  it('parses VTT cue settings and ignores notes', () => {
    const cues = parseTranscript('WEBVTT\n\nNOTE a note\nignore me\n\nchapter\n00:01.000 --> 00:02.000 align:start\nWords.');
    expect(cues[0].start).toBe(1);
    expect(cues[0].text).toBe('Words.');
  });
  it('validates JSON cues and regenerates identities', () => {
    expect(parseTranscript('{"cues":[{"id":"<script>","start":0,"end":1,"text":"literal <script>"}]}', 'json')[0].id).toBe('cue-1');
  });
  it('accepts a UTF-8 BOM in JSON transcript files', () => {
    expect(parseTranscript('\uFEFF[{"start":0,"end":1,"text":"BOM transcript"}]', 'json')[0].text).toBe('BOM transcript');
  });
  it('keeps SRT exports parseable when JSON text includes blank lines', () => {
    const cues = validateCues([{ start: 0, end: 1, text: 'First line.\n \nSecond line.\r\n\r\nThird line.' }]);
    expect(parseTranscript(exportSrt(cues))[0].text).toBe('First line.\nSecond line.\nThird line.');
  });
  it('preserves positive cue durations at SRT millisecond precision', () => {
    const cues = validateCues([{ start: 0.0008, end: 0.0012, text: 'Very short cue.' }]);
    const [roundTrip] = parseTranscript(exportSrt(cues));
    expect(roundTrip.start).toBe(0.001);
    expect(roundTrip.end).toBe(0.002);
  });
  it('rejects reversed, negative and nonnumeric timings', () => {
    for (const start of [-1, NaN, '1']) expect(() => validateCues([{ start, end: 2, text: 'a' }])).toThrow();
    expect(() => validateCues([{ start: 3, end: 2, text: 'a' }])).toThrow();
    expect(() => validateCues([])).toThrow();
  });
  it('rejects bad timestamp components and unstructured text', () => {
    expect(() => timestamp('00:61:01,000')).toThrow();
    expect(() => parseTranscript('Not a transcript')).toThrow();
  });
  it('round-trips millisecond precision and preserves literal text', () => {
    const cues = [{ id: 'cue-1', start: 3661.123, end: 3662.124, text: '<b>Quoted markup</b>' }];
    expect(parseTranscript(exportSrt(cues))).toEqual(cues);
    expect(formatTime(59.9996)).toBe('00:01:00,000');
  });
});
describe('evidence heuristics', () => {
  it('finds the planted silence, repetition and out-of-range timing independently', () => {
    const flags = analyze(demoCues, demoSignal());
    expect(flags.map(f => [f.cueId, f.kind])).toEqual([['cue-2', 'silence'], ['cue-3', 'repetition'], ['cue-5', 'timing']]);
  });
  it('measures RMS against dBFS, including quiet speech false-positive boundary', () => {
    const signal = { samples: new Float32Array(100).fill(0.01), sampleRate: 100 };
    expect(signalDb(signal, 0, 1)).toBeCloseTo(-40);
    const cues = [{ id: 'a', start: 0, end: 1, text: 'Quiet words' }];
    expect(analyze(cues, signal, -42)).toHaveLength(0);
    expect(analyze(cues, signal, -35)[0].kind).toBe('silence');
  });
  it('does not invent silence evidence without audio', () => {
    expect(analyze([{ id: 'a', start: 0, end: 1, text: 'Normal words' }], null)).toEqual([]);
  });
  it('flags overlaps as review, not proof of an error', () => {
    const flags = analyze([{ id: 'a', start: 0, end: 2, text: 'one' }, { id: 'b', start: 1, end: 3, text: 'two' }], null);
    expect(flags[0].level).toBe('review');
  });
  it('requires a real repeated phrase and handles punctuation/case', () => {
    expect(repeatedPhrase('Go now! go now. GO NOW.')).toBe(true);
    expect(repeatedPhrase('Please go now, then return later.')).toBe(false);
    expect(repeatedPhrase('go go')).toBe(false);
  });
  it('detects adjacent repeated cues while ignoring single word duplicates', () => {
    const repeated = [{ id: 'a', start: 0, end: 1, text: 'It is complete.' }, { id: 'b', start: 1, end: 2, text: 'It is complete!' }];
    expect(analyze(repeated, null)[0].cueId).toBe('b');
  });
  it('retains pending lines and removes only explicit human decisions', () => {
    const output = exportSrt(demoCues, { 'cue-2': 'remove', 'cue-3': 'keep' });
    expect(output).not.toContain('Please subscribe');
    expect(output).toContain('Please continue');
    expect(parseTranscript(output)).toHaveLength(4);
  });
  it('rejects nonsensical thresholds', () => {
    expect(() => analyze([], null, NaN)).toThrow();
    expect(() => analyze([], null, 0)).toThrow();
  });
  it('writes a valid mono 16-bit PCM WAV header', () => {
    const bytes = wavBytes(demoSignal());
    const view = new DataView(bytes.buffer);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF');
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(40, true)).toBe(16000 * 12 * 2);
  });
  it('matches exact RMS across partial blocks and reuses a signal for overlapping cues', () => {
    const samples = new Float32Array(32777);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i * 0.013) * (i % 7) / 10;
    const signal = { samples, sampleRate: 8000 };
    for (const [start, end] of [[0, 4], [0.001, 3.973], [0.13, 0.25], [0.127, 0.26], [3.9, 5]]) {
      const first = Math.max(0, Math.floor(start * signal.sampleRate));
      const last = Math.min(samples.length, Math.ceil(end * signal.sampleRate));
      let sum = 0; for (let i = first; i < last; i++) sum += samples[i] ** 2;
      const exact = 20 * Math.log10(Math.sqrt(sum / (last - first)));
      expect(signalDb(signal, start, end)).toBeCloseTo(exact, 10);
    }
    const cues = Array.from({ length: 10000 }, (_, i) => ({ id: `cue-${i}`, start: 0.1, end: 4, text: `Segment ${i}` }));
    expect(analyze(cues, signal, -5).filter(f => f.kind === 'silence')).toHaveLength(10000);
    expect(analyze(cues, signal, -80).filter(f => f.kind === 'silence')).toHaveLength(0);
  });
  it('clips out-of-range intervals and rejects nonfinite signal metadata', () => {
    const signal = { samples: new Float32Array(2048).fill(0.2), sampleRate: 1000 };
    expect(signalDb(signal, -4, 1)).toBeCloseTo(20 * Math.log10(0.2));
    expect(signalDb(signal, 4, 5)).toBe(-120);
    expect(() => signalDb({ ...signal, sampleRate: 0 }, 0, 1)).toThrow();
  });
});
