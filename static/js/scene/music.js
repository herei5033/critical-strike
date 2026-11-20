// =====================================================================
// Движок сцен — звук.
// Музыка: если есть static/audio/scene/<настроение>.mp3 — играет файл,
// иначе — процедурный нуарный эмбиент (пэд, редкие ноты пианино, ветер и дождь).
// =====================================================================

const SceneMusic = {
  mood: null, on: true, nodes: null, timer: null, fileOk: {},

  ctx() { if (!AudioSys.ctx) AudioSys.init(); return AudioSys.ctx; },

  setOn(v) {
    this.on = v;
    if (!v) { this._stopSynth(); AudioSys.stopMusic(); }
    else { const m = this.mood; this.mood = null; this.play(m || 'title'); }
  },

  // настроения: тональность, аккорды, темп нот, громкость
  MOODS: {
    title:   { root: 45, prog: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-5, -1, 2]], gap: [2.2, 4.5], vol: 0.9, bright: 900 },
    home:    { root: 43, prog: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [-2, 2, 5]], gap: [3, 6], vol: 0.7, bright: 700 },
    night:   { root: 41, prog: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]], gap: [2.5, 5], vol: 0.8, bright: 800 },
    roof:    { root: 40, prog: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-1, 3, 6]], gap: [2, 4], vol: 0.85, bright: 650 },
    tension: { root: 38, prog: [[0, 3, 6], [1, 4, 7], [0, 3, 6], [-1, 2, 6]], gap: [1.2, 2.6], vol: 0.9, bright: 520 },
    dawn:    { root: 48, prog: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]], gap: [2, 4], vol: 0.7, bright: 1200 },
    memory:  { root: 44, prog: [[0, 3, 7], [-1, 3, 6], [-3, 0, 4], [-5, -1, 2]], gap: [1.6, 3.2], vol: 0.8, bright: 1000 },
  },

  async play(mood) {
    if (!mood || mood === this.mood) return;
    this.mood = mood;
    AudioSys.lastTrack = null;
    if (!this.on || !AudioSys.musicEnabled) return;
    const url = `/static/audio/scene/${mood}.mp3`;
    if (this.fileOk[url] === undefined) this.fileOk[url] = hasMedia(url);
    if (this.fileOk[url]) { this._stopSynth(); AudioSys.playMusic(url); return; }
    AudioSys.stopMusic();
    this._synth(this.MOODS[mood] || this.MOODS.night);
  },

  stop() { this._stopSynth(); AudioSys.stopMusic(); this.mood = null; },

  _stopSynth() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const n = this.nodes;
    if (!n) return;
    const ac = this.ctx(), now = ac.currentTime;
    try { n.master.gain.cancelScheduledValues(now); n.master.gain.setValueAtTime(n.master.gain.value, now); n.master.gain.linearRampToValueAtTime(0, now + 1.2); } catch (e) {}
    setTimeout(() => { try { n.oscs.forEach(o => o.stop()); n.master.disconnect(); } catch (e) {} }, 1400);
    this.nodes = null;
  },

  _reverb(ac) {
    const len = ac.sampleRate * 3, buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const cv = ac.createConvolver(); cv.buffer = buf; return cv;
  },

  _synth(M) {
    const ac = this.ctx();
    if (!ac) return;
    this._stopSynth();
    const master = ac.createGain(); master.gain.value = 0;
    master.connect(ac.destination);
    master.gain.linearRampToValueAtTime(0.32 * M.vol * this.volMul(), ac.currentTime + 3);
    this._mvol = M.vol;
    const rev = this._reverb(ac), wet = ac.createGain(); wet.gain.value = 0.55;
    rev.connect(wet); wet.connect(master);
    const filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = M.bright; filt.Q.value = 0.7;
    const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = M.bright * 0.35;
    lfo.connect(lfoG); lfoG.connect(filt.frequency); lfo.start();
    const padG = ac.createGain(); padG.gain.value = 0.16;
    filt.connect(padG); padG.connect(master); padG.connect(rev);
    const oscs = [lfo];
    const voices = [];
    for (let i = 0; i < 3; i++) for (let d = 0; d < 2; d++) {
      const o = ac.createOscillator(); o.type = d ? 'sawtooth' : 'triangle'; o.detune.value = d ? 7 : -5;
      const g = ac.createGain(); g.gain.value = d ? 0.05 : 0.1;
      o.connect(g); g.connect(filt); o.start(); oscs.push(o); voices.push(o);
    }
    // бас
    const bass = ac.createOscillator(); bass.type = 'sine'; const bg = ac.createGain(); bg.gain.value = 0.18;
    bass.connect(bg); bg.connect(master); bass.start(); oscs.push(bass);
    // ветер / дождь
    const nb = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate), nd = nb.getChannelData(0);
    let last = 0; for (let i = 0; i < nd.length; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; nd[i] = last * 6 + (Math.random() * 2 - 1) * 0.15; }
    const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true;
    const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.4;
    const ng = ac.createGain(); ng.gain.value = 0;
    ns.connect(nf); nf.connect(ng); ng.connect(master); ns.start(); oscs.push(ns);
    this.nodes = { master, voices, bass, rev, ng, oscs };
    this.weather(this._weather || 0);

    const f = (n) => 440 * Math.pow(2, (n - 69) / 12);
    let ci = 0;
    const scale = [0, 2, 3, 5, 7, 8, 10];
    const chord = () => {
      if (!this.nodes || this.nodes.master !== master) return;
      const ch = M.prog[ci % M.prog.length]; ci++;
      const now = ac.currentTime;
      voices.forEach((o, i) => o.frequency.setTargetAtTime(f(M.root + 12 + ch[(i >> 1) % 3]), now, 1.6));
      bass.frequency.setTargetAtTime(f(M.root + ch[0] - 12 + 12), now, 2);
      setTimeout(chord, 9000);
    };
    chord();
    const note = () => {
      if (!this.nodes || this.nodes.master !== master) return;
      const now = ac.currentTime;
      const ch = M.prog[(ci + 3) % M.prog.length];
      const n = Math.random() < 0.6 ? M.root + 24 + ch[(Math.random() * 3) | 0] : M.root + 24 + scale[(Math.random() * 7) | 0];
      const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f(n); o2.frequency.value = f(n) * 2.001;
      const g2 = ac.createGain(); g2.gain.value = 0.25;
      o.connect(g); o2.connect(g2); g2.connect(g);
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.11, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, now + 3.5);
      g.connect(master); g.connect(rev);
      o.start(now); o2.start(now); o.stop(now + 3.6); o2.stop(now + 3.6);
      if (Math.random() < 0.3) {            // иногда вторая нота — ответ
        const o3 = ac.createOscillator(), g3 = ac.createGain();
        o3.type = 'sine'; o3.frequency.value = f(n - (Math.random() < 0.5 ? 3 : 5));
        g3.gain.setValueAtTime(0, now + 0.5); g3.gain.linearRampToValueAtTime(0.07, now + 0.52); g3.gain.exponentialRampToValueAtTime(0.0008, now + 3.8);
        o3.connect(g3); g3.connect(master); g3.connect(rev); o3.start(now + 0.5); o3.stop(now + 3.9);
      }
      this.timer = setTimeout(note, (M.gap[0] + Math.random() * (M.gap[1] - M.gap[0])) * 1000);
    };
    this.timer = setTimeout(note, 1500);
  },

  volMul() { return window.SCENE ? SCENE.volK('music') / 0.7 : 1; },
  applyVol() {
    const n = this.nodes, ac = this.ctx();
    if (n) n.master.gain.setTargetAtTime(0.32 * (this._mvol || 0.8) * this.volMul(), ac.currentTime, 0.3);
    if (AudioSys.musicGain) AudioSys.musicGain.gain.value = 0.3 * this.volMul();
  },
  weather(k) {
    this._weather = k;
    const n = this.nodes;
    if (!n) return;
    const ac = this.ctx();
    n.ng.gain.setTargetAtTime(0.09 * k, ac.currentTime, 1.5);
  },
};

// короткие звуки интерфейса и мира — тоже синтез
const ASfx = {
  _t: 0,
  mul() { return window.SCENE ? SCENE.volK('sfx') : 1; },
  env(type, freq, dur, vol, slide) {
    const ac = AudioSys.ctx;
    if (!ac || !AudioSys.ready) return;
    vol *= this.mul(); if (vol <= 0) return;
    const now = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, now);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, now + dur);
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0005, now + dur);
    o.connect(g); g.connect(ac.destination); o.start(now); o.stop(now + dur + 0.02);
  },
  noise(dur, vol, freq) {
    const ac = AudioSys.ctx;
    if (!ac || !AudioSys.ready) return;
    vol *= this.mul(); if (vol <= 0) return;
    const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ac.createBufferSource(); s.buffer = b;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = 1.2;
    const g = ac.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(ac.destination); s.start();
  },
  tick() { this.env('sine', 1300, 0.04, 0.025); },
  select() { this.env('triangle', 660, 0.12, 0.05, 990); },
  page() { this.noise(0.18, 0.12, 2500); },
  ok() { this.env('sine', 523, 0.25, 0.06); setTimeout(() => this.env('sine', 784, 0.4, 0.05), 90); this.noise(0.08, 0.06, 3000); },
  no() { this.env('sine', 330, 0.3, 0.06, 220); this.noise(0.08, 0.06, 900); },
  door() { this.noise(0.25, 0.25, 400); this.env('square', 90, 0.12, 0.03, 60); },
  step(out) { if (Math.random() < 0.5) this.noise(0.05, out ? 0.05 : 0.035, out ? 600 : 300); },
  ring() {
    let i = 0;
    const r = () => { if (i++ >= 6) return; this.env('square', 880, 0.05, 0.02); setTimeout(() => this.env('square', 740, 0.05, 0.02), 55); setTimeout(r, 110); };
    r();
  },
  lighter() { this.noise(0.06, 0.2, 4000); setTimeout(() => this.noise(0.4, 0.08, 700), 120); },
  heart() { this.env('sine', 60, 0.18, 0.2, 40); setTimeout(() => this.env('sine', 55, 0.2, 0.16, 38), 240); },
  glass() { this.env('sine', 2200, 0.5, 0.03); this.env('sine', 3300, 0.4, 0.02); },
  die() { this.noise(0.03, 0.12, 2600 + Math.random() * 1500); },
  type() { this.env('square', 1800 + Math.random() * 400, 0.012, 0.006); },
  thunder() { this.noise(2.6, 0.5, 90); setTimeout(() => this.noise(1.6, 0.3, 140), 300); },
  buzz() { let i = 0; const b = () => { if (i++ > 2) return; this.env('sawtooth', 120, 0.25, 0.04); setTimeout(b, 380); }; b(); },
  knock() { this.noise(0.06, 0.3, 300); setTimeout(() => this.noise(0.06, 0.3, 300), 180); setTimeout(() => this.noise(0.06, 0.3, 300), 360); },
};
