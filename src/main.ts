import './style.css';
import { analyze, demoCues, demoSignal, exportSrt, formatTime, parseTranscript, wavBytes, type AudioSignal, type Cue, type Decision, type Finding } from './core';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar"><a class="brand" href="./" aria-label="GhostWords home"><span class="brand-symbol" aria-hidden="true">◔</span> Ghost<span>Words</span></a><nav aria-label="Project"><span class="local-indicator"><i></i> Your files stay here</span><a href="https://github.com/ufodia/ghost-words" target="_blank" rel="noreferrer">GitHub ↗</a><a class="coffee" href="https://buymeacoffee.com/ufodia" target="_blank" rel="noreferrer">Buy me a coffee ↗</a></nav></header>
  <main><section class="intro"><div><p class="eyebrow">THE AUDIO EVIDENCE DESK · V0.1</p><h1>Read what it wrote.<br><em>Hear what was there.</em></h1><p class="lede">Find suspicious lines in an AI transcript. Listen to the evidence, make the call, and export a cleaner draft.</p></div><div class="intro-note"><span class="note-number">01 / 03</span><div class="little-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><p>Silence can have words.<br>That does not mean they were spoken.</p></div></section>
  <section class="workspace" aria-label="Transcript review workspace"><div class="workspace-bar"><div><span class="status-dot"></span><strong id="session-name">Synthetic demo session</strong><span class="muted" id="session-meta"></span></div><button class="text-button" id="demo">Load demo</button><button class="text-button" id="clear">Clear desk</button></div>
  <div class="import-bar"><label class="file-button">↥ Load audio<input id="audio-file" type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"></label><label class="file-button">↥ Load transcript<input id="transcript-file" type="file" accept=".srt,.vtt,.json"></label><span id="file-info">WAV, MP3 and browser-supported audio · SRT, VTT or JSON</span><span class="privacy-pill">LOCAL ONLY</span></div>
  <div class="signal-panel"><div class="signal-label"><span>AUDIO SIGNAL</span><span id="audio-duration">12.00 seconds</span></div><div class="wave-wrap"><canvas id="waveform" aria-label="Audio waveform. Use the transcript rows or audio player for playback."></canvas><div id="playhead" aria-hidden="true"></div></div><div class="time-scale" aria-hidden="true"><span>00:00</span><span id="mid-time">00:06</span><span id="end-time">00:12</span></div><audio id="audio" controls preload="metadata" aria-label="Recording playback"></audio><p class="demo-note" id="demo-note">Demo audio contains synthetic calibration tones and silence, not speech. Transcript errors are deliberately planted.</p></div>
  <div class="review-grid"><section class="transcript-panel"><div class="section-bar"><div><p class="eyebrow">01 / INSPECT</p><h2>Transcript</h2></div><span class="counter" id="cue-count">5 segments</span></div><div id="cue-list"></div></section><aside class="evidence-panel"><div class="section-bar"><div><p class="eyebrow">02 / VERIFY</p><h2>Evidence queue</h2></div><span class="counter warm" id="finding-count"></span></div><div class="threshold"><label for="threshold">Quiet-audio threshold <output id="threshold-value">−42 dBFS</output></label><input id="threshold" type="range" min="-80" max="-15" value="-42" step="1"><p>Lower values flag only quieter audio. Flags invite review; they do not prove an error.</p></div><div id="evidence-list"></div><div class="boundary"><span>◎</span><p>Energy is not speech recognition. Quiet speech and legitimate repetition can be flagged.</p></div></aside></div>
  <div class="export-bar"><div><p class="eyebrow">03 / TAKE IT WITH YOU</p><strong id="review-status">Start with a flagged segment</strong><p>Unreviewed lines remain in the export. Only lines you remove are excluded.</p></div><div class="export-actions"><button id="export-report" class="secondary">Export evidence JSON</button><button id="export-srt" class="primary">Export reviewed SRT <span>↗</span></button></div></div></section>
  <p class="status-message" id="message" role="status" aria-live="polite"></p><footer><p>A little less guesswork. A little more listening.</p><span>Open source · MIT © 2026 Ufodia</span><a href="https://github.com/ufodia/ghost-words/blob/main/docs/user-guide.md" target="_blank" rel="noreferrer">Read the field guide ↗</a></footer></main>`;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const audio = byId<HTMLAudioElement>('audio');
let cues: Cue[] = demoCues.map(c => ({ ...c }));
let signal: AudioSignal | null = null;
let findings: Finding[] = [];
let decisions: Record<string, Decision> = {};
let selected = 'cue-2';
let objectUrl: string | null = null;
let stopAt: number | null = null;
let audioName = 'synthetic-demo.wav';
let threshold = -42;
let loadingAudio = false;
let audioGeneration = 0;
let transcriptGeneration = 0;
function message(text: string, error = false) { const el = byId('message'); el.textContent = text; el.classList.toggle('error', error); }
function download(name: string, content: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function setAudio(blob: Blob, nextSignal: AudioSignal, name: string) {
  audio.pause(); if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(blob); audio.src = objectUrl; signal = nextSignal; audioName = name; stopAt = null;
  const duration = signal.samples.length / signal.sampleRate;
  byId('audio-duration').textContent = `${duration.toFixed(2)} seconds`;
  byId('mid-time').textContent = formatTime(duration / 2).slice(3, 8);
  byId('end-time').textContent = formatTime(duration).slice(3, 8);
  byId('file-info').textContent = name;
  drawWave();
}
function loadDemo() {
  audioGeneration++; transcriptGeneration++; cues = demoCues.map(c => ({ ...c })); decisions = {}; selected = 'cue-2';
  const demo = demoSignal(); setAudio(new Blob([wavBytes(demo)], { type: 'audio/wav' }), demo, 'synthetic-demo.wav');
  byId('session-name').textContent = 'Synthetic demo session'; byId('demo-note').hidden = false; byId<HTMLInputElement>('audio-file').value = ''; byId<HTMLInputElement>('transcript-file').value = '';
  refresh(); message('Demo loaded. Select the quiet-audio flag, then listen.');
}
function refresh() { findings = analyze(cues, signal, threshold); renderCues(); renderEvidence(); updateProgress(); drawWave(); }
function select(cue: Cue, play = true) {
  selected = cue.id; renderCues(); renderEvidence();
  if (signal && cue.start < signal.samples.length / signal.sampleRate) {
    audio.currentTime = cue.start; stopAt = cue.end;
    if (play) audio.play().catch(() => message('Playback needs a browser interaction. Use the audio player.', true));
  } else message('This segment is outside the loaded recording.', true);
}
function renderCues() {
  const list = byId('cue-list'); list.replaceChildren();
  byId('cue-count').textContent = `${cues.length} segments`;
  byId('session-meta').textContent = signal ? ' / AUDIO ATTACHED' : ' / TRANSCRIPT ONLY';
  if (!cues.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Load a transcript to begin. Every line stays under your control.'; list.append(p); }
  for (const cue of cues) {
    const row = document.createElement('article'); row.className = `cue-row ${selected === cue.id ? 'selected' : ''} ${decisions[cue.id] === 'remove' ? 'removed' : ''}`;
    const meta = document.createElement('div'); meta.className = 'cue-meta';
    const play = document.createElement('button'); play.className = 'play-cue'; play.textContent = '▶'; play.setAttribute('aria-label', `Play segment at ${formatTime(cue.start, '.')}`); play.onclick = () => select(cue);
    const time = document.createElement('span'); time.textContent = `${formatTime(cue.start, '.').slice(3)} — ${formatTime(cue.end, '.').slice(3)}`;
    const cueFindings = findings.filter(f => f.cueId === cue.id);
    const badge = document.createElement('span'); badge.className = `cue-badge ${cueFindings.length ? 'flagged' : ''}`; badge.textContent = decisions[cue.id] === 'remove' ? 'REMOVED' : decisions[cue.id] === 'keep' ? 'REVIEWED' : cueFindings.length ? 'CHECK THIS' : 'NO SIGNAL FLAG';
    meta.append(play, time, badge); row.append(meta);
    const text = document.createElement('textarea'); text.value = cue.text; text.maxLength = 20000; text.rows = cue.text.length > 85 ? 3 : 2; text.setAttribute('aria-label', `Edit segment ${cue.id.replace('cue-', '')}`);
    text.onchange = () => { if (!text.value.trim()) { message('Use Remove line to exclude an empty segment.', true); text.value = cue.text; return; } cue.text = text.value.trim(); decisions[cue.id] = 'pending'; refresh(); message('Text updated. Review flags have been recalculated.'); };
    row.append(text);
    const actions = document.createElement('div'); actions.className = 'cue-actions';
    for (const [label, decision] of [['Keep line', 'keep'], ['Remove line', 'remove'], ['Reset review', 'pending']] as const) {
      const b = document.createElement('button'); b.textContent = label; b.className = decisions[cue.id] === decision ? 'active' : ''; b.onclick = () => { decisions[cue.id] = decision; renderCues(); renderEvidence(); updateProgress(); }; actions.append(b);
    }
    row.append(actions); list.append(row);
  }
}
function renderEvidence() {
  const list = byId('evidence-list'); list.replaceChildren();
  byId('finding-count').textContent = `${findings.length} flags`;
  if (!signal) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Load audio to inspect quiet segments. Repetition and timing checks still run on your transcript.'; list.append(p); }
  if (!findings.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = cues.length ? 'No configured signal flags. This does not certify the transcript.' : 'Your evidence queue will appear here.'; list.append(p); }
  findings.forEach((finding, index) => {
    const cue = cues.find(c => c.id === finding.cueId)!;
    const card = document.createElement('button'); card.className = `finding ${selected === cue.id ? 'selected' : ''}`;
    const top = document.createElement('span'); top.className = 'finding-meta'; top.textContent = `${String(index + 1).padStart(2, '0')} / ${finding.kind.toUpperCase()} · ${formatTime(cue.start, '.').slice(3)}`;
    const title = document.createElement('strong'); title.textContent = finding.label;
    const detail = document.createElement('span'); detail.className = 'finding-detail'; detail.textContent = finding.detail;
    const state = document.createElement('span'); state.className = 'finding-state'; state.textContent = decisions[cue.id] === 'keep' ? '✓ Reviewed · kept' : decisions[cue.id] === 'remove' ? '− Reviewed · removed' : 'Listen to segment →';
    card.append(top, title, detail, state); card.onclick = () => select(cue); list.append(card);
  });
}
function updateProgress() { const reviewed = cues.filter(c => decisions[c.id] && decisions[c.id] !== 'pending').length; const removed = cues.filter(c => decisions[c.id] === 'remove').length; byId('review-status').textContent = `${reviewed} of ${cues.length} segments reviewed · ${removed} removed`; byId<HTMLButtonElement>('export-srt').disabled = !cues.length; byId<HTMLButtonElement>('export-report').disabled = !cues.length; }
function drawWave() {
  const canvas = byId<HTMLCanvasElement>('waveform');
  const width = canvas.clientWidth || 900; const height = 120; const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#d7ded8'; ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
  if (!signal) return;
  const block = Math.max(1, Math.floor(signal.samples.length / (width / 3)));
  ctx.fillStyle = '#226450';
  for (let x = 0; x < width; x += 3) { const from = Math.floor(x / width * signal.samples.length); let peak = 0; for (let i = from; i < Math.min(signal.samples.length, from + block); i++) peak = Math.max(peak, Math.abs(signal.samples[i])); const h = Math.max(2, peak * 270); ctx.fillRect(x, (height - h) / 2, 2, h); }
  const duration = signal.samples.length / signal.sampleRate;
  ctx.fillStyle = '#d99d7230'; for (const f of findings.filter(f => f.kind === 'silence')) { const cue = cues.find(c => c.id === f.cueId)!; ctx.fillRect(cue.start / duration * width, 0, (cue.end - cue.start) / duration * width, height); }
}
byId('demo').onclick = loadDemo;
byId('clear').onclick = () => { audioGeneration++; transcriptGeneration++; cues = []; decisions = {}; signal = null; findings = []; audioName = ''; stopAt = null; audio.pause(); audio.removeAttribute('src'); audio.load(); if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null; byId('session-name').textContent = 'Empty desk'; byId('audio-duration').textContent = 'No audio loaded'; byId('file-info').textContent = 'Load audio and a matching transcript'; byId('demo-note').hidden = true; refresh(); drawWave(); message('Workspace cleared from memory.'); };
byId<HTMLInputElement>('threshold').oninput = event => { threshold = +(event.target as HTMLInputElement).value; byId('threshold-value').textContent = `${threshold} dBFS`; refresh(); drawWave(); };
byId<HTMLInputElement>('transcript-file').onchange = async event => { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; const generation = ++transcriptGeneration; try { if (file.size > 2_000_000) throw new Error('Transcript exceeds the 2 MB limit.'); const source = await file.text(); if (generation !== transcriptGeneration) return; const parsed = parseTranscript(source, file.name.split('.').pop()); cues = parsed; decisions = {}; selected = parsed[0].id; byId('session-name').textContent = file.name; byId('demo-note').hidden = true; refresh(); drawWave(); message(`Loaded ${parsed.length} transcript segments.`); } catch (error) { if (generation === transcriptGeneration) message((error as Error).message, true); } finally { if (generation === transcriptGeneration) (event.target as HTMLInputElement).value = ''; } };
byId<HTMLInputElement>('audio-file').onchange = async event => {
  const file = (event.target as HTMLInputElement).files?.[0]; if (!file || loadingAudio) return;
  const generation = ++audioGeneration; loadingAudio = true; message('Decoding audio locally…');
  let context: AudioContext | undefined;
  try {
    if (file.size > 100_000_000) throw new Error('Audio exceeds the 100 MB upload limit.');
    context = new AudioContext(); const decoded = await context.decodeAudioData(await file.arrayBuffer());
    if (decoded.duration > 1800) throw new Error('Use an audio excerpt of 30 minutes or less.');
    const samples = new Float32Array(decoded.length); for (let c = 0; c < decoded.numberOfChannels; c++) { const channel = decoded.getChannelData(c); for (let i = 0; i < samples.length; i++) if (Math.abs(channel[i]) > Math.abs(samples[i])) samples[i] = channel[i]; }
    if (generation !== audioGeneration) return;
    setAudio(file, { samples, sampleRate: decoded.sampleRate }, file.name); decisions = {}; byId('demo-note').hidden = true; refresh(); drawWave(); message('Audio decoded locally. Load its matching transcript or review the current one.');
  } catch (error) { if (generation === audioGeneration) message(`Could not decode audio: ${(error as Error).message}`, true); }
  finally { if (context) await context.close().catch(()=>{}); loadingAudio = false; (event.target as HTMLInputElement).value = ''; }
};
audio.addEventListener('timeupdate', () => { const duration = signal ? signal.samples.length / signal.sampleRate : 1; byId('playhead').style.left = `${Math.min(100, audio.currentTime / duration * 100)}%`; if (stopAt !== null && audio.currentTime >= stopAt) { audio.pause(); stopAt = null; } });
byId('export-srt').onclick = () => { if (!cues.length) return; download('ghostwords-reviewed.srt', exportSrt(cues, decisions), 'application/x-subrip'); message('SRT exported. Pending cues are included; removed cues are excluded.'); };
byId('export-report').onclick = () => { download('ghostwords-evidence.json', JSON.stringify({ schemaVersion: 1, tool: 'GhostWords', version: '0.1.0', audioName, thresholdDbFs: threshold, method: 'RMS energy, text repetition and timing heuristics; human review required', cues, findings, decisions }, null, 2), 'application/json'); message('Evidence report exported. It contains transcript text and review decisions.'); };
new ResizeObserver(drawWave).observe(byId('waveform'));
window.addEventListener('beforeunload', () => { if (objectUrl) URL.revokeObjectURL(objectUrl); });
loadDemo();
