// Есть ли файл на сервере (список отдаёт app.py). Нет списка — считаем, что есть.
const MEDIA_SET = window.MEDIA_FILES ? new Set(window.MEDIA_FILES) : null;
function hasMedia(url) {
  if (!MEDIA_SET) return true;
  return MEDIA_SET.has(String(url).replace(/^\/?static\//, '').split('?')[0]);
}

// =====================================================================
// ЗВУКИ. У каждого события свой звук: static/audio/<имя>.mp3 (все необязательные).
// Если своего файла нет — играет запасной из этой таблицы, а если нет и его — тишина.
// =====================================================================
const SFX_FALLBACK = {
  // оружие
  shoot_m4s: 'shoot_m4', shoot_rpg: 'shoot_shotgun', shoot_flamer: 'throw', shoot_minigun: 'shoot_uzi', shoot_golden_uzi: 'shoot_uzi',
  melee_bat: 'melee_swing', melee_pipe: 'melee_swing', melee_knife: 'melee_swing', melee_sword: 'melee_swing',
  melee_cleaver: 'melee_swing', melee_nightstick: 'melee_swing', melee_spiked_bat: 'melee_swing', fist: 'punch',
  weapon_throw: 'throw', grenade_throw: 'throw', explosion: 'shoot_shotgun', explosion_debris: 'tank_hit',
  // герои
  hurt_dani: 'player_hurt', hurt_gal: 'player_hurt', hurt_daur: 'player_hurt',
  death_dani: 'player_death', death_gal: 'player_death', death_daur: 'player_death',
  step_dani: 'footstep', step_gal: 'footstep', step_daur: 'footstep',
  armor_hit: 'tank_hit', dash: 'melee_swing', dash_wall: 'punch', dash_hit: 'punch', revive: 'pickup_health',
  clones: 'stun', perfect_clone: 'pickup_weapon', clone_heal: 'pickup_health', arsenal: 'stun', arsenal_catch: 'pickup_weapon',
  rage_mode: 'sniper_charge', babah_ready: 'pickup_weapon', mode_on: 'pickup_weapon', babah: null,
  // предметы
  pickup_grenade: 'pickup_weapon', pickup_armor: 'pickup_weapon', pickup_second: 'pickup_weapon', ammo_box: 'pickup_weapon',
  item_take: 'pickup_weapon', ally_samsa: 'pickup_health',
  // враги и боссы
  death_bandit: 'enemy_death', death_tank: 'enemy_death', death_hound: 'enemy_death', death_sniper: 'enemy_death',
  enemy_stun: 'stun', enemy_crawl: 'player_hurt',
  boss_death: 'enemy_death', boss_stun: 'stun', boss_hit: 'tank_hit', boss_second_wind: 'sniper_charge', boss_swing: 'melee_swing',
  boss_roar: 'hound_bark', boss_wall_crash: 'tank_hit', boss_spinup: 'sniper_charge', boss_minigun: 'shoot_uzi',
  boss_windup: 'sniper_charge', boss_shotgun: 'shoot_shotgun', boss_burst: 'shoot_uzi', boss_slam: 'tank_hit',
  boss_slam_blast: 'shoot_shotgun', boss_call: 'hound_bark', boss_intro: 'sniper_charge',
  // мир
  door_kick: 'door_open', door_slam: 'punch', door_break: 'door_open', door_knockdown: 'punch',
  break_wood: 'door_open', break_metal: 'tank_hit', break_glass: 'empty_click', break_fabric: 'door_open', glass_break: 'empty_click',
  wave: 'hound_bark', ambush: 'hound_bark', level_clear: 'game_start', victory: 'game_start', combo: null, combo_big: null,
  objective_done: 'pickup_health', lesson_done: 'game_start', step_done: 'pickup_weapon',
  // интерфейс
  ui_locked: 'empty_click', map_toggle: 'menu_move', pause: 'menu_move',
  // корпоратив
  coop_pick: 'char_select', coop_intro: 'char_select', ally_down: 'player_death', chat: null, chat_system: null,
  // футбол
  ball_kick: 'punch', whistle: 'game_start', ready_on: 'menu_select', ready_off: 'menu_move',
  // Samsa Kombat
  kombat_fight: 'game_start', kombat_whoosh: 'melee_swing', kombat_land: 'tank_hit', kombat_special: 'throw', kombat_block: 'tank_hit',
  kombat_hit: 'punch', kombat_hit_heavy: 'tank_hit', kombat_grunt: 'player_hurt', kombat_ko: 'enemy_death', kombat_stun: 'stun',
  fatality_whistle: 'menu_select', fatality_punch: 'punch', fatality_tank_hit: 'tank_hit', fatality_throw: 'throw',
  fatality_player_hurt: 'player_hurt', fatality_shoot_uzi: 'shoot_uzi', fatality_stun: 'stun', fatality_melee_swing: 'melee_swing',
  fatality_player_death: 'player_death', fatality_enemy_death: 'enemy_death',
};

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
    if (!hasMedia(`audio/${name}.mp3`)) return;          // необязательный звук без файла — не запрашиваем
    const r = await fetch(`/static/audio/${name}.mp3`);
    if (!r.ok) return;
    this.sounds[name] = await this.ctx.decodeAudioData(await r.arrayBuffer());
  },

  // Музыкальный трек целиком в память, чтобы включался без задержки
  async cacheMusic(url) {
    if (!this.ctx) this.init();
    if (!this.ctx || this.musicCache[url]) return;
    if (!hasMedia(url)) { (this._missing = this._missing || new Set()).add(url); return; }
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
      if (!hasMedia(url)) return;
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
    if (!hasMedia(trackPath)) (this._missing = this._missing || new Set()).add(trackPath);
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

    const buffer = this.resolve(name);
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

  // свой звук события, а если его файла нет — запасной по цепочке SFX_FALLBACK
  resolve(name) {
    for (let i = 0; i < 4 && name; i++) {
      if (this.sounds[name]) return this.sounds[name];
      name = SFX_FALLBACK[name];
    }
    return null;
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