/** All signal analysis is deterministic and runs without a model or network. */
export interface Cue { id: string; start: number; end: number; text: string }
export type Decision = 'pending' | 'keep' | 'remove';
export interface Finding { cueId: string; kind: 'silence' | 'repetition' | 'timing'; label: string; detail: string; level: 'review' | 'high'; db?: number }
export interface AudioSignal { samples: Float32Array; sampleRate: number }
export const MAX_CUES = 10000;

export function timestamp(value: string): number {
  const match = value.trim().match(/^(?:(\d{1,3}):)?(\d{2}):(\d{2})[.,](\d{3})$/);
  if (!match) throw new Error(`Invalid timestamp: ${value}`);
  const [, hours, minutes, seconds, millis] = match;
  if (+minutes > 59 || +seconds > 59) throw new Error(`Invalid timestamp: ${value}`);
  return +(hours ?? 0) * 3600 + +minutes * 60 + +seconds + +millis / 1000;
}
export function validateCues(value: unknown): Cue[] {
  const list = Array.isArray(value) ? value : (value && typeof value === 'object' && 'cues' in value ? value.cues : null);
  if (!Array.isArray(list) || list.length < 1 || list.length > MAX_CUES) throw new Error(`Provide 1–${MAX_CUES} transcript cues.`);
  return list.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Cue ${index + 1} is not an object.`);
    const { start, end, text } = item;
    if (typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > 360000 || typeof text !== 'string' || !text.trim() || text.length > 20000) throw new Error(`Cue ${index + 1} needs valid start/end seconds and nonempty text.`);
    return { id: `cue-${index + 1}`, start, end, text: text.trim() };
  });
}
export function parseTranscript(source: string, extension = 'srt'): Cue[] {
  if (source.length > 2_000_000) throw new Error('Transcript exceeds the 2 MB text limit.');
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (extension.toLowerCase() === 'json' || text.trim().startsWith('[') || text.trim().startsWith('{')) return validateCues(JSON.parse(text));
  const blocks = text.split(/\n\s*\n/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!block.trim() || /^(WEBVTT|NOTE(?:\s|$)|STYLE$|REGION$)/.test(lines[0])) continue;
    const timeIndex = lines.findIndex(line => line.includes('-->'));
    if (timeIndex < 0) throw new Error('A transcript block has no timestamp arrow. Use SRT, VTT, or the documented JSON format.');
    const [left, right] = lines[timeIndex].split('-->');
    const endText = right?.trim().split(/\s+/)[0];
    if (!endText) throw new Error('A transcript cue is missing its end timestamp.');
    cues.push({ id: '', start: timestamp(left), end: timestamp(endText), text: lines.slice(timeIndex + 1).join('\n') });
  }
  return validateCues(cues);
}
const ENERGY_BLOCK = 1024;
const energyIndexes = new WeakMap<Float32Array, Float64Array>();
/** Samples are immutable after analysis. Index memory is ~8 bytes per 1,024 samples. */
function energyIndex(samples: Float32Array): Float64Array {
  const cached = energyIndexes.get(samples);
  if (cached) return cached;
  const blocks = Math.floor(samples.length / ENERGY_BLOCK);
  const prefix = new Float64Array(blocks + 1);
  for (let block = 0; block < blocks; block++) {
    let sum = 0;
    const end = (block + 1) * ENERGY_BLOCK;
    for (let i = block * ENERGY_BLOCK; i < end; i++) sum += samples[i] ** 2;
    prefix[block + 1] = prefix[block] + sum;
  }
  energyIndexes.set(samples, prefix);
  return prefix;
}
export function signalDb(signal: AudioSignal, start: number, end: number): number {
  if (!Number.isFinite(signal.sampleRate) || signal.sampleRate <= 0 || !Number.isFinite(start) || !Number.isFinite(end)) throw new Error('Signal rate and interval must be finite, with a positive sample rate.');
  const first = Math.max(0, Math.floor(start * signal.sampleRate));
  const last = Math.min(signal.samples.length, Math.ceil(end * signal.sampleRate));
  if (last <= first) return -120;
  const prefix = energyIndex(signal.samples);
  const firstFullBlock = Math.ceil(first / ENERGY_BLOCK);
  const lastFullBlock = Math.floor(last / ENERGY_BLOCK);
  let sum = 0;
  if (firstFullBlock >= lastFullBlock) {
    for (let i = first; i < last; i++) sum += signal.samples[i] ** 2;
  } else {
    sum = prefix[lastFullBlock] - prefix[firstFullBlock];
    for (let i = first; i < firstFullBlock * ENERGY_BLOCK; i++) sum += signal.samples[i] ** 2;
    for (let i = lastFullBlock * ENERGY_BLOCK; i < last; i++) sum += signal.samples[i] ** 2;
  }
  return Math.max(-120, 20 * Math.log10(Math.sqrt(sum / (last - first)) || 1e-6));
}
function normalized(text: string): string { return text.toLocaleLowerCase('en').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim(); }
export function repeatedPhrase(text: string): boolean {
  const words = normalized(text).split(' ');
  for (let width = 1; width <= 6; width++) {
    for (let i = 0; i + width * 3 <= words.length; i++) {
      const phrase = words.slice(i, i + width).join(' ');
      if (phrase && phrase === words.slice(i + width, i + width * 2).join(' ') && phrase === words.slice(i + width * 2, i + width * 3).join(' ')) return true;
    }
  }
  return false;
}
export function analyze(cues: Cue[], signal: AudioSignal | null, threshold = -42): Finding[] {
  if (!Number.isFinite(threshold) || threshold < -100 || threshold > -5) throw new Error('Silence threshold must be between -100 and -5 dBFS.');
  const findings: Finding[] = [];
  const duration = signal ? signal.samples.length / signal.sampleRate : Infinity;
  cues.forEach((cue, index) => {
    if (cue.end > duration + 0.02) findings.push({ cueId: cue.id, kind: 'timing', label: 'Outside the recording', detail: 'This cue extends beyond the loaded audio. Check the file pairing and timing.', level: 'high' });
    if (index > 0 && cue.start < cues[index - 1].end) findings.push({ cueId: cue.id, kind: 'timing', label: 'Overlapping cues', detail: 'The previous cue has not ended. Overlap may be intentional for multiple speakers.', level: 'review' });
    if (signal && cue.start < duration) {
      const db = signalDb(signal, cue.start, cue.end);
      if (db < threshold) findings.push({ cueId: cue.id, kind: 'silence', label: 'Text over quiet audio', detail: `Average energy ${db.toFixed(1)} dBFS is below your ${threshold} dBFS threshold. Quiet speech can also trigger this flag.`, level: 'high', db });
    }
    if (repeatedPhrase(cue.text) || (index > 0 && normalized(cue.text).split(' ').length >= 3 && normalized(cue.text) === normalized(cues[index - 1].text))) findings.push({ cueId: cue.id, kind: 'repetition', label: 'Possible repetition loop', detail: 'A phrase repeats three times, or this cue repeats the previous cue. Listen before changing it.', level: 'review' });
  });
  return findings;
}
export function formatTime(seconds: number, separator = ','): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}${separator}${String(ms % 1000).padStart(3, '0')}`;
}
export function exportSrt(cues: Cue[], decisions: Record<string, Decision> = {}): string {
  return cues.filter(cue => decisions[cue.id] !== 'remove').map((cue, index) => {
    const startMs = Math.round(cue.start * 1000);
    const endMs = Math.max(startMs + 1, Math.round(cue.end * 1000));
    // Blank lines delimit SRT cues. Keep every word, while preventing embedded
    // blank lines and sub-millisecond timings from producing an invalid export.
    const text = cue.text.replace(/\r\n?/g, '\n').replace(/\n\s*\n/g, '\n').trim();
    return `${index + 1}\n${formatTime(startMs / 1000)} --> ${formatTime(endMs / 1000)}\n${text}\n`;
  }).join('\n');
}
export function demoSignal(): AudioSignal {
  const sampleRate = 16000;
  const samples = new Float32Array(sampleRate * 12);
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    if ((t >= 0.4 && t < 2.7) || (t >= 5.6 && t < 7.6) || (t >= 8.3 && t < 10.4)) samples[i] = 0.18 * Math.sin(2 * Math.PI * 220 * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t));
  }
  return { samples, sampleRate };
}
export function wavBytes(signal: AudioSignal): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(44 + signal.samples.length * 2);
  const view = new DataView(buffer);
  const word = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  word(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); word(8, 'WAVE'); word(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, signal.sampleRate, true); view.setUint32(28, signal.sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); word(36, 'data'); view.setUint32(40, signal.samples.length * 2, true);
  signal.samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true));
  return new Uint8Array(buffer);
}
export const demoCues: Cue[] = [
  { id: 'cue-1', start: 0.4, end: 2.7, text: 'Calibration segment one.' },
  { id: 'cue-2', start: 3.2, end: 5.0, text: 'Thank you for watching. Please subscribe.' },
  { id: 'cue-3', start: 5.6, end: 7.6, text: 'Please continue. Please continue. Please continue.' },
  { id: 'cue-4', start: 8.3, end: 10.4, text: 'Calibration segment four.' },
  { id: 'cue-5', start: 12.5, end: 14.0, text: 'This line extends beyond the recording.' }
];
