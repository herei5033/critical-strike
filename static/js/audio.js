const AudioSys = {
  ctx: null,
  ready: false,

  init() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { console.warn('WebAudio не поддерживается'); return; }
      this.ctx = new Ctx();
      this.ready = true;
    } catch (e) {
      console.warn('AudioSys.init failed:', e);
      this.ready = false;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  play(type) {
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      if (this.ctx.state !== 'running') return;

      const t = this.ctx.currentTime;
      const osc = (freq, type, duration, vol) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(t);
        o.stop(t + duration);
      };
      const noise = (duration, vol) => {
        const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        src.connect(g);
        g.connect(this.ctx.destination);
        src.start(t);
      };

      switch (type) {
        case 'shoot':
          osc(150, 'sawtooth', 0.1, 0.3);
          noise(0.1, 0.2);
          break;
        case 'melee':
          noise(0.12, 0.3);
          break;
        case 'hit':
          osc(100, 'square', 0.1, 0.25);
          noise(0.1, 0.15);
          break;
        case 'die':
          osc(80, 'sawtooth', 0.3, 0.25);
          noise(0.3, 0.25);
          break;
        case 'pickup':
          osc(400, 'sine', 0.1, 0.15);
          break;
        case 'empty':
          osc(200, 'square', 0.05, 0.1);
          break;
        case 'door':
          osc(220, 'square', 0.05, 0.15);
          noise(0.08, 0.1);
          break;
        case 'hurt':
          osc(90, 'square', 0.15, 0.3);
          noise(0.12, 0.2);
          break;
      }
    } catch (e) {
      console.warn('AudioSys.play error:', e);
    }
  }
};