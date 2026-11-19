const AudioSys = {
  ctx: null,
  ready: false,
  musicSource: null,
  musicGain: null,
  currentTrack: null,
  musicEnabled: true,

  sounds: {},
  musicCache: {},   // url → расшифрованная музыка (грузится при запуске игры)

  // Один звук эффекта (перед уровнем)
  async loadSound(name) {
    if (!this.ctx) this.init();
    if (!this.ctx || this.sounds[name]) return;
    const r = await fetch(`/static/audio/${name}.mp3`);
    if (!r.ok) return;
    this.sounds[name] = await this.ctx.decodeAudioData(await r.arrayBuffer());
  },

  // Музыкальный трек целиком в память, чтобы включался без задержки
  async cacheMusic(url) {
    if (!this.ctx) this.init();
    if (!this.ctx || this.musicCache[url]) return;
    const r = await fetch(url);
    if (!r.ok) { (this._missing = this._missing || new Set()).add(url); return; }
    this.musicCache[url] = await this.ctx.decodeAudioData(await r.arrayBuffer());
  },

  init() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { console.warn('WebAudio не поддерживается'); return; }
      this.ctx = new Ctx();
      this.ready = true;

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.ctx.destination);
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

  // Асинхронная предзагрузка всех звуков
  async preload() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const soundList = [
  'shoot_m4', 'shoot_ak47', 'shoot_glock', 'shoot_uzi', 'shoot_shotgun',
  'door_open', 'stun', 'throw', 'pickup_weapon', 'pickup_health',
  'enemy_death', 'punch', 'melee_swing', 'menu_move', 'menu_select',
  'char_select', 'player_hurt', 'player_death', 'empty_click', 'footstep',
  'game_start',
  // Новые звуки:
  'tank_hit', 'hound_bark', 'sniper_charge', 'sniper_shot'
];

    const promises = soundList.map(async (name) => {
      const url = `/static/audio/${name}.mp3`;
      try {
        const response = await fetch(url);
        if (!response.ok) return; // Файла нет — пропускаем
        const buffer = await response.arrayBuffer();
        const decoded = await this.ctx.decodeAudioData(buffer);
        this.sounds[name] = decoded;
      } catch (e) {
        // Игнорируем ошибки отдельных файлов
      }
    });

    await Promise.all(promises);
  },

  playMusic(trackPath) {
    this.lastTrack = trackPath;     // чтобы включить музыку обратно из паузы
    if (!this.ctx || !this.musicEnabled) return;
    if (this.currentTrack === trackPath && this.musicSource) return;

    this.stopMusic();
    if (this._missing && this._missing.has(trackPath)) return;   // файла нет — просто тишина

    const start = (decoded) => {
      if (!this.musicEnabled || !decoded) return;
      this.musicSource = this.ctx.createBufferSource();
      this.musicSource.buffer = decoded;
      this.musicSource.loop = true;
      this.musicSource.connect(this.musicGain);
      this.musicSource.start();
      this.currentTrack = trackPath;
    };
    if (this.musicCache[trackPath]) { start(this.musicCache[trackPath]); return; }

    fetch(trackPath)
      .then(r => {
        if (!r.ok) throw new Error('404');
        return r.arrayBuffer();
      })
      .then(buffer => this.ctx.decodeAudioData(buffer))
      .then(decoded => {
        this.musicCache[trackPath] = decoded;
        // пока грузилось, могли попросить другой трек
        if (!this.musicEnabled || this.lastTrack !== trackPath || this.musicSource) return;
        this.musicSource = this.ctx.createBufferSource();
        this.musicSource.buffer = decoded;
        this.musicSource.loop = true;
        this.musicSource.connect(this.musicGain);
        this.musicSource.start();
        this.currentTrack = trackPath;
      })
      .catch(e => { (this._missing = this._missing || new Set()).add(trackPath); console.warn('Music load failed:', trackPath, e.message); });
  },

  stopMusic() {
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch (e) {}
      this.musicSource.disconnect();
      this.musicSource = null;
    }
    this.currentTrack = null;
  },

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) this.stopMusic();
    return this.musicEnabled;
  },

  play(name, vol = 1) {
    if (!this.ctx || !this.ready) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const buffer = this.sounds[name];
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    if (vol < 0.999) {
      const g = this.ctx.createGain();
      g.gain.value = vol;
      source.connect(g); g.connect(this.ctx.destination);
    } else source.connect(this.ctx.destination);
    source.start();
  },

  // Звук в точке мира: тише с расстоянием от героя, далёкие не слышны
  listener: null,
  playAt(name, x, y, range = 650) {
    if (!this.listener) { this.play(name); return; }
    const d = Math.hypot(x - this.listener.x, y - this.listener.y);
    const vol = 1 - d / range;
    if (vol <= 0.03) return;
    this.play(name, Math.min(1, vol * vol + 0.05));
  }
};