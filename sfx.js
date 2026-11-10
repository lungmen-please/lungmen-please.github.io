'use strict';
// 音效：全部用 WebAudio 现场合成。

const SFX = {
  ctx: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, type = 'square', vol = 0.08, slide = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.2, freq = 800, delay = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime + delay, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.buffer = buf; s.connect(f).connect(g).connect(c.destination); s.start(t);
  },
  stamp() { this.noise(0.12, 0.5, 500); this.tone(90, 0.15, 'sine', 0.3, -40); },
  paper() { this.noise(0.08, 0.12, 3000); },
  click() { this.tone(900, 0.03, 'square', 0.04); },
  bell() { this.tone(1320, 0.5, 'sine', 0.1); this.tone(1760, 0.6, 'sine', 0.06, 0, 0.05); },
  buzz() { this.tone(110, 0.35, 'sawtooth', 0.08); },
  good() { this.tone(660, 0.08, 'square', 0.05); this.tone(990, 0.12, 'square', 0.05, 0, 0.08); },
  scan(on) { this.tone(on ? 300 : 600, 0.25, 'sine', 0.06, on ? 300 : -300); },
  alarm() { for (let i = 0; i < 3; i++) this.tone(740, 0.12, 'square', 0.05, 0, i * 0.18); },
  mumble(text, pitch) {
    if (!this.ctx || this.muted) return;
    const n = Math.min(10, Math.ceil(text.length / 2));
    for (let i = 0; i < n; i++) this.tone(pitch * (0.85 + Math.random() * 0.4), 0.05, 'triangle', 0.035, 0, i * 0.07);
  },
};
