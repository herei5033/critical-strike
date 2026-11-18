const AudioSys = {
  ctx: null,
  ready: false,
  musicSource: null,
  musicGain: null,
  currentTrack: null,
  musicEnabled: true,

  sounds: {},

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
    if (!this.ctx || !this.musicEnabled) return;
    if (this.currentTrack === trackPath && this.musicSource) return;

    this.stopMusic();

    fetch(trackPath)
      .then(r => {
        if (!r.ok) throw new Error('404');
        return r.arrayBuffer();
      })
      .then(buffer => this.ctx.decodeAudioData(buffer))
      .then(decoded => {
        if (!this.musicEnabled) return;
        this.musicSource = this.ctx.createBufferSource();
        this.musicSource.buffer = decoded;
        this.musicSource.loop = true;
        this.musicSource.connect(this.musicGain);
        this.musicSource.start();
        this.currentTrack = trackPath;
      })
      .catch(e => console.warn('Music load failed:', e));
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

  play(name) {
    if (!this.ctx || !this.ready) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const buffer = this.sounds[name];
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.start();
  }
};