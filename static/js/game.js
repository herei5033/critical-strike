class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
    this.state = 'loading';
    this.menu = new Menu(this);
    this.zoom = 1.45 / 1.3;   // камера отдалена на 30%

    this.assetsToLoad = 0;
    this.assetsLoaded = 0;
    this.isReady = false;

    this.level = null;
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.pickups = [];
    this.cam = null;
    this.restartTimer = 0;

    this.selectedChar = 0;
    this.charSelectAnim = 0;

    this.shake = 0;
    this.score = 0;
    this.kills = 0;
    this.totalEnemies = 0;

    this.playerName = "";
    this.nameSubmitted = false;

    // Спецэффекты
    this.lightFlicker = 0;
    this.chromaticOffset = 0;

    this.buf = document.createElement('canvas');
    this.buf.width = this.W; this.buf.height = this.H;
    this.bctx = this.buf.getContext('2d');

    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = this.W;
    this.fogCanvas.height = this.H;
    this.fogCtx = this.fogCanvas.getContext('2d');

    this.scanlines = document.createElement('canvas');
    this.scanlines.width = this.W; this.scanlines.height = this.H;
    const sctx = this.scanlines.getContext('2d');
    for (let y = 0; y < this.H; y += 3) {
      sctx.fillStyle = 'rgba(0,0,0,0.15)';
      sctx.fillRect(0, y, this.W, 1);
    }

    this.images = { dani: new Image(), gal: new Image(), daur: new Image() };

    // Корпоратив и боссы
    this.coopUI = new CoopUI(this);
    this.campaignUI = new CampaignUI(this);
    this.storyUI = new StoryUI(this);
    this.modesUI = new ModesUI(this);
    this.kombat = new SamsaKombat(this);
    this.storyIdx = null;       // глава сюжета (когда soloMode === 'story')
    this.dialogue = null;
    this.tutorial = null;       // урок обучения (полигон НВП)
    this.allies = [];           // клоны Дани
    this.pulls = [];            // стволы, летящие к Дауру (арсенал)
    this.fireTrail = [];        // огненный след рывка Галы
    this.mission = null;        // задания главы сюжета
    this.thoughts = new Thoughts(this);   // мысли героя над головой
    this.radio = new Radio(this);         // сообщения союзников по рации
    this._storySeen = new Set();
    this.soloMode = 0;          // номер уровня кампании, 'endless' или 'story'
    this.campaignIdx = null;
    this.levelBanner = null;
    this.coop = null;
    this.fxBullets = [];      // пули напарников и вражеские пули у клиента — только для вида
    this.projectiles = [];    // гранаты и ракеты
    this.explosions = [];
    this.bossDirector = null;
    TextField.init();

    this._loadAssets();
  }

  // Запуск игры: музыка и фото главных героев (остальное — перед уровнями)
  async _loadAssets() {
    AudioSys.init();
    const list = Assets.bootList(this);
    this.assetsToLoad = list.length;
    this._bootT = 0;
    await Assets.run(list, (n, total, it) => { this.assetsLoaded = n; this._bootLabel = LOAD_LABELS[it.type]; });
    this.assetsLoaded = this.assetsToLoad;
    this.isReady = true;
  }

  // Перед уровнем: показать экран загрузки, пока не скачано всё нужное, затем продолжить
  _loadThen(items, info, cont) {
    const need = Assets.missing(items);
    if (!need.length) { cont(); return; }
    this._load = { info, done: 0, total: need.length, t: 0, ready: false, cont, label: '' };
    this.state = 'levelLoad';
    Assets.run(need, (n, total, it) => { if (this._load) { this._load.done = n; this._load.label = LOAD_LABELS[it.type]; } })
      .then(() => { if (this._load) this._load.ready = true; });
  }

  _levelInfo() {
    if (this.soloMode === 'story' && this.storyIdx !== null) { const c = STORY[this.storyIdx]; return { title: c.title, sub: c.place, color: c.color }; }
    if (this.soloMode === 'tutorial') return { title: 'ПОЛИГОН НВП', sub: 'Обучение', color: '#a8c070' };
    if (typeof this.soloMode === 'number') { const L = CAMPAIGN[this.soloMode]; return { title: L.name, sub: L.sub, color: L.color }; }
    return { title: 'БЕСКОНЕЧНЫЙ ЗАБЕГ', sub: 'Случайные этажи и боссы по очкам', color: '#c060ff' };
  }

  // Все живые/раненые игроки: свой герой + напарники
  allPlayers() {
    const list = this.player ? [this.player] : [];
    if (this.coop) for (const r of this.coop.remotes.values()) if (r.hasState) list.push(r);
    return list;
  }

  startRun() {
    const story = this.soloMode === 'story' && this.storyIdx !== null;
    const items = story ? Assets.storyList(this.storyIdx) : Assets.gameplayList();
    this._loadThen(items, this._levelInfo(), () => this._startRunNow());
  }

  _startRunNow() {
    this.coop = null;
    const story = this.soloMode === 'story' && this.storyIdx !== null;
    if (!story) this.storyIdx = null;
    const ch = story ? STORY[this.storyIdx] : null;
    this.campaignIdx = ch ? (ch.level.campaign !== undefined ? ch.level.campaign : null) : (typeof this.soloMode === 'number' ? this.soloMode : null);
    // боссы по очкам — в бесконечном режиме; в кампании и сюжете у каждого уровня свой босс
    this.bossDirector = this.campaignIdx === null && !story ? new BossDirector() : null;
    this.score = 0;
    this.kills = 0;
    this.playerName = "";
    this.nameSubmitted = true;
    this.runSubmitted = false;

    AudioSys.stopMusic();
    AudioSys.playMusic('/static/audio/game_music.mp3');
    AudioSys.play('game_start');

    this.player = null;   // новый забег — заряд способностей и счёт убийств с нуля
    if (story) { this._startStoryChapter(); return; }
    this.startLevel();
  }

  // ---------- обучение ----------
  startTutorial(i) {
    this.soloMode = 'tutorial';
    this._loadThen(Assets.tutorialList(), this._levelInfo(), () => this._startTutorialNow(i));
  }

  _startTutorialNow(i) {
    const def = TUTORIALS[i];
    this.coop = null;
    this.storyIdx = null;
    this.soloMode = 'tutorial';
    this.campaignIdx = null;
    this.bossDirector = null;
    this.score = 0; this.kills = 0;
    this.nameSubmitted = true; this.runSubmitted = true;   // в таблицу лидеров обучение не пишем
    this.selectedChar = Math.max(0, ['dani', 'gal', 'daur'].indexOf(def.hero));
    this.player = null;
    AudioSys.stopMusic();
    AudioSys.playMusic('/static/audio/game_music.mp3');
    Utils.withSeed(TUTORIAL_LAYOUT.seed, () => this._buildLevel(TUTORIAL_LAYOUT));
    this.enemies = []; this.pickups = []; this.totalEnemies = 0;
    this._spawnPlayer(0);
    this._afterLevelStart();
    this.levelBanner = { name: 'ПОЛИГОН НВП', sub: def.title, color: def.color, t: 2.5 };
    this.tutorial = new Tutorial(this, def);
    this.tutorial.protect(this.player);
  }

  // ---------- сюжет ----------
  _startStoryChapter() {
    const ch = STORY[this.storyIdx];
    this.campaignIdx = ch.level.campaign !== undefined ? ch.level.campaign : null;
    this.bossDirector = null;
    this.startLevel();
    StoryAssets.music(this.storyIdx + 1);
    // вступление показываем один раз за сессию (после смерти сразу в бой)
    this.mission = null;
    const begin = () => { this.mission = new Mission(this, ch); };
    if (!this._storySeen.has(ch.id)) {
      this._storySeen.add(ch.id);
      this.dialogue = new Dialogue(this, ch.intro, { title: ch.title, place: ch.place, color: ch.color, onDone: () => { this.dialogue = null; this.state = 'playing'; begin(); } });
      this.state = 'dialogue';
    } else begin();
  }

  // Глава пройдена: финальный диалог, затем экран победы
  _storyComplete() {
    const ch = STORY[this.storyIdx];
    StoryProgress.unlock(this.storyIdx + 2);
    AudioSys.play('game_start');
    Effects.screenFlash(0.35, '255,240,200');
    this.dialogue = new Dialogue(this, ch.outro, { title: ch.title, place: 'ГЛАВА ПРОЙДЕНА', color: ch.color, onDone: () => {
      this.dialogue = null;
      this.state = 'victory'; this.victoryT = 0;
      if (this.storyIdx >= STORY.length - 1) this._submitRun();
    } });
    this.state = 'dialogue';
  }

  // Случайный этаж главы: фиксированный seed и свой босс в самой дальней комнате
  _buildStoryFloor(spec) {
    Utils.withSeed(spec.seed, () => this._buildLevel(null, spec.mul || 1));
    const L = this.level;
    if (!spec.boss || !L.rooms || !L.playerRoom) return;
    const pr = L.playerRoom;
    const far = L.rooms.filter(r => !r.hall && r !== pr).sort((a, b) =>
      Utils.dist(b.cx, b.cy, pr.cx, pr.cy) - Utils.dist(a.cx, a.cy, pr.cx, pr.cy))[0];
    const pt = far && L.randomFreePoint(far);
    if (!pt) return;
    this.enemies.push(new Boss(pt.x - 11, pt.y - 11, spec.boss, 1));
    this.totalEnemies = this.enemies.length;
  }

  startLevel() {
    AudioSys.init();
    const L = this.campaignIdx !== null ? CAMPAIGN[this.campaignIdx] : null;
    const ch = this.storyIdx !== null && !this.coop ? STORY[this.storyIdx] : null;
    if (L) Utils.withSeed(L.seed, () => this._buildLevel(L));
    else if (ch) this._buildStoryFloor(ch.level);
    else this._buildLevel();
    this._spawnPlayer(0);
    this._afterLevelStart();
    if (ch) { this.levelBanner = { name: ch.level.campaign !== undefined ? L.name : ch.level.name, sub: ch.title, color: ch.color, t: 3 }; return; }
    this.levelBanner = L
      ? { name: L.name, sub: `УРОВЕНЬ ${this.campaignIdx + 1} ИЗ ${CAMPAIGN.length}`, color: L.color, t: 3 }
      : { name: 'БЕСКОНЕЧНЫЙ ЗАБЕГ', sub: 'боссы приходят за очками', color: '#c060ff', t: 2.5 };
  }

  // Запись результата забега в таблицу лидеров (имя — никнейм или «ИГРОК»)
  _submitRun() {
    if (this.runSubmitted || this.coop) return;
    this.runSubmitted = true;
    this.playerName = Nick.get() || 'ИГРОК';
    this.submitScore(this.playerName);
  }

  // Начало матча корпоратива (после того как хост нажал старт)
  startCoopMatch(info, net) {
    TextField.close();
    this._exitAsk = null;
    this.coop = new CoopSession(this, info, net);
    this.player = null;
    this.selectedChar = Math.max(0, CHAR_IDS.indexOf(this.coop.me.char));
    this.bossDirector = new BossDirector();
    this.score = 0; this.kills = 0;
    this.nameSubmitted = true;
    AudioSys.stopMusic();
    AudioSys.playMusic('/static/audio/game_music.mp3');
    AudioSys.play('game_start');
    this._loadThen(Assets.gameplayList(), { title: 'КОРПОРАТИВ', sub: `комната ${info.code}`, color: '#ff2a6d' }, () => {
      this.state = 'coopIntro';
      this.introT = 0;
      this.startCoopLevel(info.seed);
    });
  }

  // Уровень корпоратива строится из общего seed — у всех одинаковый
  startCoopLevel(seed) {
    const intro = this.state === 'coopIntro';
    // каждый третий этаж — улица: ночной город или джунгли (боссов приводит директор боссов)
    const n = this.coop.levelNo || 1;
    const out = n % 3 === 0 ? CAMPAIGN.find(c => c.id === (n % 6 === 0 ? 'jungle' : 'city')) : null;
    if (out) Utils.withSeed(seed, () => this._buildLevel({ ...out, bossRoom: -1 }));
    else Utils.withSeed(seed, () => this._buildLevel());
    this._spawnPlayer(this.coop.me.slot || 0);
    this.coop.prepareLevel();
    this._afterLevelStart();
    this.levelBanner = out
      ? { name: out.name, sub: `ЭТАЖ ${n} • вылазка на улицу`, color: out.color, t: 3 }
      : { name: `ЭТАЖ ${n}`, sub: 'корпоратив', color: '#ff2a6d', t: 2.2 };
    if (intro) this.state = 'coopIntro';
  }

  _afterLevelStart() {
    this._waves = 0; this._waveT = undefined; this._huntT = 0;
    if (this.thoughts) { this.thoughts.cur = null; setTimeout(() => { if (this.state === 'playing') this.thoughts.event('level'); }, 3200); }
    this.projectiles = [];
    this.explosions = [];
    Flames.reset();
    Effects.reset();
    this.fxBullets = [];
    this.combo = 0;
    this.comboTimer = 0;
    this.state = 'playing';
    this.restartTimer = 0;
    this.shake = 0;
    this.levelClearTimer = 0;
    if (this.bossDirector) this.bossDirector.onLevelStart();
  }

  // Уровень, враги и предметы. Использует только Math.random — поэтому детерминирован при withSeed
  _buildLevel(layout, extraMul = 1) {
    // уровни крупнее: случайные — больше площадь, статичные — растянутая планировка
    const k = layout ? CAMPAIGN_SCALE : RANDOM_SCALE;
    const worldW = TILE * Math.ceil(60 * k + (k > 1 ? 2 : 0));
    const worldH = TILE * Math.ceil(45 * k + (k > 1 ? 2 : 0));
    const L = layout ? scaledLayout(layout, CAMPAIGN_SCALE) : null;
    // в корпоративе врагов больше: +30% за каждого напарника
    const enemyMul = (this.coop ? 1 + 0.3 * (this.coop.players.length - 1) : 1) * extraMul;
    try { this.level = new Level(worldW, worldH, L ? { layout: L, enemyMul } : { enemyMul }); }
    catch (e) { console.error('Level gen failed:', e); this.level = null; }

    if (!this.level) {
      this.level = {
        w: worldW, h: worldH, cols: worldW/TILE, rows: worldH/TILE,
        rooms: [{ cx: 5, cy: 5 }], spawnPoints: [], doors: [], decor: [],
        noiseEvents: [],
        collides: () => false, isWallAt: () => false,
        bulletHitsWall: () => false,
        lineOfSight: () => true,
        spawnPoint: () => ({ x: 160, y: 160 }),
        addNoise: () => {},
        update: () => {}, draw: () => {}, drawFog: () => {}, drawEffects: () => {},
        getRoomAt: () => null, _findRoomPath: () => null, _doorBetween: () => null,
        getLitRooms: () => ({ room: null, lit: new Set() }),
        randomFreePoint: () => null,
        _getGrid: () => 0,
      };
    }

    const diff = layout ? CAMPAIGN.indexOf(layout) : 0;
    this.enemies = this.level.spawnPoints.map(p => {
      if (p.boss) return new Boss(p.x, p.y, p.boss, this.coop ? this.coop.players.length : 1);
      const e = new Enemy(p.x, p.y, p.behavior, p.waypoints, p.type);
      if (p.weapon) e.weapon = makeWeapon(p.weapon);
      // с каждым уровнем враги быстрее и зорче
      if (diff > 0) { e.speed *= 1 + diff * 0.06; e.fovRange *= 1 + diff * 0.08; }
      return e;
    });
    this.totalEnemies = this.enemies.length;
    this.bullets = [];
    this.pickups = [];
    this.kills = 0;

    const weaponPool = ['m4', 'ak47', 'uzi', 'bat', 'pipe', 'knife', 'sword'];
    for (let i = 0; i < (layout ? 6 : 8); i++) {
      const r = Utils.choice(this.level.rooms);
      if (r === this.level.playerRoom) continue;
      const p = this.level.randomFreePoint(r);
      if (p) this.pickups.push(new Pickup(p.x, p.y, makeWeapon(Utils.choice(weaponPool))));
    }
    for (let i = 0; i < (layout ? 3 : 4) + (this.coop ? this.coop.players.length - 1 : 0); i++) {
      const r = Utils.choice(this.level.rooms);
      const p = this.level.randomFreePoint(r);
      if (p) this.pickups.push(new Pickup(p.x, p.y, null, true));
    }
    // гранаты и редкие РПГ/огнемёт (врагам они не достаются)
    // гранаты, редкие РПГ/огнемёт (врагам они не достаются) и ровно 3 бронежилета на уровень
    const extra = [['grenade', 3 + (this.coop ? this.coop.players.length - 1 : 0)], ['rpg', Math.random() < 0.35 ? 1 : 0], ['flamer', Math.random() < 0.35 ? 1 : 0], ['armor', layout ? 2 : 3]];
    for (const [kind, n] of extra) {
      for (let i = 0, tries = 0; i < n && tries < 40; tries++) {
        const r = Utils.choice(this.level.rooms);
        if (kind === 'armor' && (r === this.level.playerRoom || r.hall)) continue;
        const p = this.level.randomFreePoint(r);
        if (!p) continue;
        const pk = new Pickup(p.x, p.y, kind === 'grenade' || kind === 'armor' ? null : makeWeapon(kind));
        if (kind === 'grenade') pk.isGrenade = true;
        if (kind === 'armor') pk.isArmor = true;
        this.pickups.push(pk);
        i++;
      }
    }
  }

  // Герой появляется у точки старта; в корпоративе — рядом друг с другом
  _spawnPlayer(slot) {
    const worldW = this.level.w, worldH = this.level.h;
    let sp = this.level.spawnPoint();
    const offs = [[0, 0], [26, 0], [-26, 0]][slot] || [0, 0];
    if (!this.level.collides(sp.x + offs[0], sp.y + offs[1], 18, 18)) sp = { x: sp.x + offs[0], y: sp.y + offs[1] };
    if (this.level.collides(sp.x, sp.y, 18, 18)) {
      let found = false;
      for (let rad = 1; rad < 10 && !found; rad++) {
        for (let dx = -rad; dx <= rad && !found; dx++) {
          for (let dy = -rad; dy <= rad && !found; dy++) {
            const nx = sp.x + dx * TILE;
            const ny = sp.y + dy * TILE;
            if (!this.level.collides(nx, ny, 18, 18)) {
              sp = { x: nx, y: ny };
              found = true;
            }
          }
        }
      }
    }

    const chars = ['dani', 'gal', 'daur'];
    const charId = chars[this.selectedChar];

    const prev = this.player && this.player.charId === charId ? this.player : null;
    this.player = new Player(sp.x, sp.y, charId);
    if (prev) { this.player.charge = prev.charge || 0; this.player.kills = prev.kills || 0; this.player.babahReady = !!prev.babahReady; }
    // теневые клоны остаются на прошлом этаже, идеальный идёт за Дани дальше
    this.allies = (prev ? (this.allies || []) : []).filter(a => !a.dead && a.kind === 'perfect');
    for (const a of this.allies) { a.owner = this.player; a.x = sp.x + 20; a.y = sp.y; if (this.level.collides(a.x, a.y, a.w, a.h)) { a.x = sp.x; a.y = sp.y; } }

    this.cam = new Camera(this.W, this.H, this.zoom);
    const viewW = this.W / this.zoom;
    const viewH = this.H / this.zoom;
    const maxX = Math.max(0, worldW - viewW);
    const maxY = Math.max(0, worldH - viewH);
    this.cam.x = Utils.clamp(this.player.x - viewW / 2, 0, maxX);
    this.cam.y = Utils.clamp(this.player.y - viewH / 2, 0, maxY);
  }

  // Конец корпоратива: все ранены
  enterTeamOver() {
    this.state = 'dead';
    this.shake = 1;
    this.nameSubmitted = true;
    if (this.coop) {
      this.coop.teamOver = true;
      if (this.coop.isHost && !this.coop.ended) {
        this.coop.ended = true;
        this.submitScore(null, this.coop.players.map(p => ({ name: p.name, char: p.char })));
      }
    }
  }

  // Конец матча корпоратива: все возвращаются в лобби хоста (соединения остаются)
  leaveMatch() {
    TextField.close();
    this._exitAsk = null;
    this.paused = null;
    if (this.coop) { this.coop.dispose(); this.coop = null; }
    this.coopUI.inMatch = false;
    this.player = null; this.level = null; this.enemies = []; this.bullets = []; this.pickups = []; this.cam = null;
    this.coopUI.open();
    this.coopUI.screen = 'lobby';
    AudioSys.stopMusic();
    AudioSys.playMusic('/static/audio/menu_music.mp3');
  }

  toMenu() {
    TextField.close();
    this._exitAsk = null;
    this.paused = null;
    this.tutorial = null;
    this.allies = [];
    this.pulls = [];
    this.fireTrail = [];
    this.mission = null;
    this.radio.q = []; this.radio.cur = null; this.thoughts.cur = null;
    if (this.coop) { this.coop.dispose(); this.coop = null; this.coopUI.leave(true); }
    this.state = 'menu';
    this.player = null;
    this.level = null;
    this.enemies = [];
    this.bullets = [];
    this.pickups = [];
    this.cam = null;

    AudioSys.stopMusic();
    AudioSys.playMusic('/static/audio/menu_music.mp3');
  }

  update(dt) {
    if (this.state === 'loading') {
      this._bootT = (this._bootT || 0) + dt;
      this.menu.t += dt;
      const go = Input.consumeClick() || Object.keys(Input._pressedThisFrame).some(k => Input._pressedThisFrame[k]) || this._tapped;
      if (this.isReady && go) {
        this._tapped = false;
        AudioSys.init(); AudioSys.resume();
        AudioSys.play('menu_select');
        this.state = 'menu';
        AudioSys.playMusic('/static/audio/menu_music.mp3');
      }
      return;
    }

    this._syncQuiet();

    // Эффекты
    this.lightFlicker += dt * 15;
    this.chromaticOffset = Math.max(0, this.chromaticOffset - dt * 20);

    // мобильные кнопки переключает mobile.js

    if (this.state === 'coop') { this.coopUI.update(dt); return; }
    if (this.state === 'levelSelect') { this.campaignUI.update(dt); return; }
    if (this.state === 'storySelect') { this.storyUI.update(dt); return; }
    if (this.state === 'modes') { this.menu.t += dt; this.modesUI.update(dt); return; }
    if (this.state === 'kombat') { this.menu.t += dt; this.kombat.update(dt); return; }
    if (this.state === 'dialogue') {
      if (this.dialogue) this.dialogue.update(dt); else this.state = 'playing';
      Effects.update(dt * 0.3, this.level);
      return;
    }

    if (this.coop) {
      this.coop.update(dt);
      if (this.coop.closed) {
        const reason = this.coop.closeReason;
        this.toMenu();
        this.coopUI.open();
        this.coopUI.flash(reason);
        return;
      }
    }

    if (this.thoughts && this.state === 'playing') { this.thoughts.update(dt); this.radio.update(dt); }
    if (this.state === 'levelLoad') {
      const L = this._load;
      if (!L) { this.state = 'menu'; return; }
      L.t += dt; this.menu.t += dt;
      if (L.ready && L.t > 0.45) { this._load = null; L.cont(); }
      return;
    }

    if (this.coop && this._updateExitAsk(dt)) return;
    if (!this.coop && this.paused) {
      if (this.state !== 'playing') this.paused = null;
      else { this._updatePauseMenu(); return; }
    }
    if (this.player && this.player.rageT > 0 && !this.player.dead) this.shake = Math.max(this.shake || 0, 0.22);

    if (this.state === 'coopIntro') {
      this.introT += dt;
      if (this.introT > 4.2 || (this.introT > 1.5 && Input.wasPressed('Enter'))) this.state = 'playing';
      return;
    }

    if (this.state === 'charSelect') {
      this.charSelectAnim += dt * 10;

      const oldChar = this.selectedChar;
      if (Input.wasPressed('MobileUp') || Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA')) this.selectedChar = (this.selectedChar + 2) % 3;
      if (Input.wasPressed('MobileDown') || Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) this.selectedChar = (this.selectedChar + 1) % 3;

      if (this.selectedChar !== oldChar) {
        AudioSys.play('char_select');
      }

      if (Input.wasPressed('MobileEnter') || Input.wasPressed('Enter') || Input.wasPressed('Space')) this.startRun();
      if (Input.wasPressed('Escape')) { if (this.soloMode === 'story') this.storyUI.open(); else this.campaignUI.open(); return; }

      if (Input.consumeClick()) {
        const mx = Input.mouse.x;
        const my = Input.mouse.y;
        for (let i = 0; i < 3; i++) {
          const r = (this._charRects || [])[i];
          if (r && mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) {
            if (this.selectedChar === i) {
              this.startRun();
            } else {
              this.selectedChar = i;
              AudioSys.play('char_select');
            }
            return;
          }
        }
      }
      return;
    }

    if (this.state === 'playing' || this.state === 'dead' || this.state === 'levelClear') {
      if (!this.coop && this.state === 'playing' && this._escPressed()) { this._openPause(); AudioSys.play('menu_move'); return; }
      if (!this.coop && this.state === 'dead' && Input.wasPressed('Escape') && this.nameSubmitted) { this.toMenu(); return; }
    }
    // Чат корпоратива
    if (this.coop && (this.state === 'playing' || this.state === 'levelClear') && Input.wasPressed('KeyT') && !TextField.active) {
      TextField.open({ placeholder: 'Сообщение команде (Enter — отправить, Esc — отмена)', maxLength: 120, onSubmit: (v) => this.coop && this.coop.sendChat(v) });
    }

    if (this.state === 'menu') { AudioSys.listener = null; this.menu.update(dt); return; }
    AudioSys.listener = this.player && !this.player.dead ? { x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2 } : null;
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    if (!this.player || !this.level || !this.cam) return;

    if (this.state === 'levelClear') {
      if (this.coop && !this.coop.isHost) {
        // клиент ждёт, пока хост пришлёт новый уровень
        this.coop.updateReplicas(dt);
        return;
      }
      this.levelClearTimer -= dt;
      const skip = !this.coop && (Input.wasPressed('MobileEnter') || Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.consumeClick());
      if (this.levelClearTimer <= 0 || skip) {
        if (this.coop) {
          this.coop.levelNo++;
          this.coop.seed = (Math.random() * 2e9) | 0;
          this.startCoopLevel(this.coop.seed);
        } else this.startLevel();
      }
      return;
    }

    if (this.state === 'victory') {
      this.victoryT += dt;
      Effects.update(dt, this.level);
      this.player.updateParticles(dt);
      if (this.victoryT < 0.8) return;
      const story = this.storyIdx !== null;
      const last = story ? this.storyIdx >= STORY.length - 1 : this.campaignIdx >= CAMPAIGN.length - 1;
      const next = story
        ? () => { this.storyIdx++; this._loadThen(Assets.storyList(this.storyIdx), this._levelInfo(), () => this._startStoryChapter()); }
        : () => { this.campaignIdx++; this.soloMode = this.campaignIdx; this.startLevel(); };
      if (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter')) { if (last) { this._submitRun(); this.toMenu(); } else next(); return; }
      if (Input.wasPressed('Escape')) { this._submitRun(); this.toMenu(); return; }
      if (Input.consumeClick()) {
        const mx = Input.mouse.x, my = Input.mouse.y, w = this.W, h = this.H;
        if (mx > w / 2 - 150 && mx < w / 2 + 150 && my > h * 0.62 && my < h * 0.62 + 46) { if (last) { this._submitRun(); this.toMenu(); } else next(); }
        else if (mx > w / 2 - 150 && mx < w / 2 + 150 && my > h * 0.62 + 58 && my < h * 0.62 + 104) { this._submitRun(); this.toMenu(); }
      }
      return;
    }

    if (this.state === 'dead') {
      // Кровь/частицы и тряска продолжают затухать после смерти
      this.player.updateParticles(dt);
      this.deathT = (this.deathT || 0) + dt;
      Effects.update(dt, this.level);
      this.shake = Math.max(0, this.shake - dt * 2);

      if (this.coop) {
        // итоги, затем хост возвращает всех в своё лобби (хост может сделать это сразу)
        this.coop.overUpdate(dt);
        if (this.coop && this.coop.isHost) {
          const R = this._teamOverRects(), mx = Input.mouse.x, my = Input.mouse.y;
          const inR = r => mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h;
          this._toSel = this._toSel || 0;
          if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA') || Input.wasPressed('MobileUp')) this._toSel = 0;
          if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD') || Input.wasPressed('MobileDown')) this._toSel = 1;
          if (inR(R.again)) this._toSel = 0; else if (inR(R.lobby)) this._toSel = 1;
          let act = (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter')) ? this._toSel : -1;
          if (Input.wasPressed('KeyR')) act = 0;
          if (Input.consumeClick()) act = inR(R.again) ? 0 : inR(R.lobby) ? 1 : -1;
          if (act === 0) { AudioSys.play('menu_select'); this._toSel = 0; this.coopUI.restart(); }
          else if (act === 1) { AudioSys.play('menu_select'); this.coopUI.backToLobby(); }
        }
        return;
      }

      if (this.deathT < 1) return;
      {
        if (Input.wasPressed('KeyR') || Input.wasPressed('Enter') || Input.wasPressed('Space')) { this.startRun(); return; }
        if (Input.wasPressed('Escape')) { this.toMenu(); return; }

        if (Input.consumeClick()) {
          const mx = Input.mouse.x;
          const my = Input.mouse.y;
          const w = this.W;
          const h = this.H;

          if (mx > w/2 - 120 && mx < w/2 + 120 && my > h/2 + 60 && my < h/2 + 110) {
            this.startRun();
          }
          if (mx > w/2 - 120 && mx < w/2 + 120 && my > h/2 + 130 && my < h/2 + 180) {
            this.toMenu();
          }
        }
      }
      return;
    }

    if (this.state === 'playing') {
      // хитстоп: короткая "заморозка" мира в момент сильного удара
      if (Effects.hitstop > 0) { Effects.hitstop -= dt; Effects.update(dt * 0.2, this.level); return; }
      Effects.update(dt, this.level);
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer <= 0) this.combo = 0;
      const coopClient = this.coop && !this.coop.isHost;
      if (!this.player.dead) {
        const shotsBefore = this.bullets.length;
        const frozen = (this._exitAsk || this.paused) ? [Input.keys, Input._pressedThisFrame, Input.mouse.down, Input.mouse.right] : null;
        if (frozen) { Input.keys = {}; Input._pressedThisFrame = {}; Input.mouse.down = false; Input.mouse.right = false; }
        try {
          this.player.update(dt, this.level, this.cam, this.bullets, this.enemies, this.pickups);
        } catch (e) { console.error('PLAYER UPDATE ERROR:', e); }
        if (frozen) [Input.keys, Input._pressedThisFrame, Input.mouse.down, Input.mouse.right] = frozen;
        if (this.bullets.length > shotsBefore) {
          this.player._netShots = (this.player._netShots || 0) + 1;
          const wid = this.player.weapon ? this.player.weapon.id : '';
          for (let i = shotsBefore; i < this.bullets.length; i++) if (!this.bullets[i].src) this.bullets[i].src = wid;
        }
        for (const f of this.player._fired) this._spawnFired(f, this.player.charId, coopClient);
        this.player._fired.length = 0;
        this._heroSkills(dt);
        if (this.player._thrownPickup) {
          const tp = this.player._thrownPickup;
          if (coopClient) {
            this.coop.event({ t: 'throw', w: tp.weapon.id, am: tp.weapon.ammo, x: Math.round(tp.x), y: Math.round(tp.y), a: +this.player.angle.toFixed(2) });
          } else this.pickups.push(tp);
          this.player._thrownPickup = null;
        }
      }
      this.player.updateParticles(dt);
      if (this.coop) this.coop.trackMyBullets();

      try { this.level.update(dt, this.enemies, this.player); } catch (e) { console.error('LEVEL UPDATE ERROR:', e); }

      if (coopClient) {
        this.coop.updateReplicas(dt);
        if (this.bossDirector && this.bossDirector.banner) {
          this.bossDirector.banner.t -= dt;
          if (this.bossDirector.banner.t <= 0) this.bossDirector.banner = null;
        }
      } else {
        // каждый враг охотится на ближайшего живого игрока
        const targets = this.allPlayers().filter(p => !p.dead);
        for (const e of this.enemies) {
          let target = this.player;
          let best = Infinity;
          for (const t of targets) {
            const d = Utils.dist(t.x, t.y, e.x, e.y);
            if (d < best) { best = d; target = t; }
          }
          if (e.isBoss) e.targets = targets;
          try { e.update(dt, this.level, target, this.bullets, this.enemies, this.pickups); }
          catch (err) { console.error('ENEMY UPDATE ERROR:', err); }
        }
        this.totalEnemies = this.enemies.length;
        if (this.bossDirector) this.bossDirector.update(dt, this);
        this._updateLottery(dt);
        this._unstickEnemies(dt);
        // подпись комнаты при входе (у статичных уровней — «Кабинет 319» и т.п.)
        const rm = this.level.getRoomAt && this.level.getRoomAt(this.player.x + 9, this.player.y + 9);
        if (rm && rm !== this._lastRoom) { this._lastRoom = rm; if (rm.label) this._roomLabel = { text: rm.label, t: 2.2 }; }
        if (this._roomLabel) { this._roomLabel.t -= dt; if (this._roomLabel.t <= 0) this._roomLabel = null; }
        this._updatePacing(dt);
        if (this.tutorial) this.tutorial.update(dt);
        if (this.mission) this.mission.update(dt);
      }

      const pcx = this.player.x + this.player.w / 2;
      const pcy = this.player.y + this.player.h / 2;
      const remotes = this.coop && this.coop.isHost ? [...this.coop.remotes.values()].filter(r => r.hasState && !r.dead) : [];
      for (const b of this.bullets) {
        try { b.update(dt, this.level); } catch (err) { console.error('BULLET UPDATE ERROR:', err); }
        if (!b.dead && !b.isPlayer && !this.player.dead) {
          // Проверка по отрезку, чтобы быстрые пули не пролетали сквозь игрока
          if (Utils.segDist(b.px, b.py, b.x, b.y, pcx, pcy) < 12) {
            this.player.takeDamage(1, { kind: b.src === 'shotgun' ? 'shotgun' : 'bullet', angle: Math.atan2(b.vy, b.vx) }); b.dead = true; this.shake = Math.max(this.shake, 0.6);
            this.chromaticOffset = 10;
          }
        }
        // хост: вражеские пули ранят напарников (урон уходит им по сети)
        if (!b.dead && !b.isPlayer) {
          for (const r of remotes) {
            if (Utils.segDist(b.px, b.py, b.x, b.y, r.x + 9, r.y + 9) < 12) { r.takeDamage(1, { kind: b.src === 'shotgun' ? 'shotgun' : 'bullet', angle: Math.atan2(b.vy, b.vx) }); b.dead = true; break; }
          }
        }
        if (!b.dead && !b.isPlayer) {
          for (const a of this.allies) {
            if (!a.dead && Utils.segDist(b.px, b.py, b.x, b.y, a.cx(), a.cy()) < 10) { a.hit(1); b.dead = true; break; }
          }
        }
      }
      if (coopClient) {
        this.coop.clientBulletHits();
        // у клиента вражеские пули — картинка с хоста; по своим клонам считаем сами
        for (const b of this.fxBullets) {
          if (!b.enemyNet || b.dead) continue;
          for (const a of this.allies) if (!a.dead && Utils.segDist(b.px, b.py, b.x, b.y, a.cx(), a.cy()) < 10) { a.hit(1); b.dead = true; break; }
        }
      }
      // гранаты и ракеты (у клиента их позиции приходят от хоста)
      if (!coopClient) {
        for (const pr of this.projectiles) pr.update(dt, this);
        this.projectiles = this.projectiles.filter(pr => !pr.dead);
      }
      this.player._ffT = Math.max(0, (this.player._ffT || 0) - dt);
      if (this.coop) this.coop.remoteFlames(dt);
      Flames.update(dt, this);
      // пули напарников и копии вражеских пуль — только картинка, урона не наносят
      for (const b of this.fxBullets) {
        b.update(dt, this.level);
        if (b.enemyNet && !b.dead && !this.player.dead && Utils.segDist(b.px, b.py, b.x, b.y, pcx, pcy) < 10) b.dead = true;
      }
      this.fxBullets = this.fxBullets.filter(b => !b.dead || b.enemyNet);
      if (this.fxBullets.length > 300) this.fxBullets = this.fxBullets.slice(-300);

      if (coopClient) {
        this.coop.clientPickups();
        for (const p of this.pickups) p.phase += dt * 2;
      }

      // pickups может пополняться во время обхода (дроп из убитых врагов) — идём по индексу
      for (let i = 0; i < (coopClient ? 0 : this.pickups.length); i++) {
        const p = this.pickups[i];
        try { p.update(dt, this.level, this.enemies, this.pickups); } catch (err) { console.error('PICKUP UPDATE ERROR:', err); }
        if (p.pickedUp || p.thrown || p.groundTimer > 0) continue;
        const dist = Utils.dist(p.x, p.y, this.player.x + this.player.w/2, this.player.y + this.player.h/2);
        if (dist < 24 && !this.player.dead) {
          const pl = this.player;
          const slot = pickupSlot({ hp: pl.hp, maxHp: pl.maxHp, armor: pl.armor, charId: pl.charId, grenades: pl.grenades, w1: pl.weapon && pl.weapon.id, w2: pl.weapon2 && pl.weapon2.id }, p);
          if (slot) {
            p.pickedUp = true;
            if (slot === 'health') { pl.hp++; AudioSys.play('pickup_health'); this.thoughts.event('samsa'); }
            else if (slot === 'grenade') { pl.grenades++; AudioSys.play('pickup_weapon'); Effects.popup(pl.x + 9, pl.y - 8, '+ГРАНАТА', '#8aff8a', 11); }
            else if (slot === 'armor') { this.thoughts.event('armor'); pl.armor = 2; AudioSys.play('pickup_weapon'); Effects.popup(pl.x + 9, pl.y - 8, '+БРОНЯ', '#5aa8ff', 12); Effects.ring(pl.x + 9, pl.y + 9, '90,170,255', 28); }
            else if (slot === 'w1') { pl.weapon = prepWeapon(pl.charId, p.weapon); AudioSys.play('pickup_weapon'); if (pl.weapon.boss) this.thoughts.event('weapon'); }
            else { pl.weapon2 = prepWeapon(pl.charId, p.weapon); AudioSys.play('pickup_weapon'); Effects.popup(pl.x + 9, pl.y - 8, 'ДВА СТВОЛА!', '#ffd319', 11); }
          }
        }
      }

      // Очки с комбо: убийства подряд (до 3 сек между ними) умножают награду
      for (const e of (coopClient ? [] : this.enemies)) {
        if (!e.dead || e._scored) continue;
        e._scored = true;
        this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
        this.comboTimer = 3;
        const pts = 100 * Math.min(this.combo, COMBO_CAP);
        this.score += pts;
        this.kills++;
        this._creditKill(e);
        Effects.popup(e.cx(), e.cy() - 14, `+${pts}`, this.combo > 1 ? '#ff2a6d' : '#ffd319', 13 + Math.min(this.combo, 5) * 2);
        if (this.combo > 1) Effects.popup(e.cx(), e.cy() - 30, `x${this.combo} КОМБО`, '#05d9e8', 11);
        if (this.combo === 5) this.thoughts.event('streak');
        Effects.screenFlash(0.08, '255,255,255');
        this.shake = Math.max(this.shake, 0.35);
      }

      if (!coopClient) this.pickups = this.pickups.filter(p => !p.pickedUp);
      this.bullets = this.bullets.filter(b => !b.dead);
      if (this.bullets.length > 300) this.bullets = this.bullets.slice(-300);

      // Раненый в корпоративе смотрит глазами живого напарника
      if (this.player.dead && this.coop) {
        const mate = [...this.coop.remotes.values()].find(r => r.hasState && !r.dead);
        this.cam.follow(mate || this.player, this.level, dt);
      }
      if (this.coop && this.coop.isHost) this.coop.hostUpdate(dt);

      // Камера: если игрок заглядывает (Shift) — смещаем вперед
      if (!this.player.dead) {
        if (this.player.isLooking) {
          const lookDist = 150; // Насколько далеко заглядываем
          const lookX = this.player.x + Math.cos(this.player.angle) * lookDist;
          const lookY = this.player.y + Math.sin(this.player.angle) * lookDist;

          this.cam.follow({x: lookX, y: lookY, w: 0, h: 0}, this.level, dt);
        } else {
          this.cam.follow(this.player, this.level, dt);
        }
      }

      if (this.player.dead && !this.coop) {
        // имя не спрашиваем: результат записывается под никнеймом (или «ИГРОК»)
        this.state = 'dead'; this.shake = 1.0; this.deathT = 0;
        this._submitRun();
      }
      const cleared = this.storyIdx !== null && !this.coop ? !!(this.mission && this.mission.complete) : this.enemies.every(e => e.dead);
      if (!coopClient && !this.tutorial && this.state === 'playing' && cleared) {
        if (this.storyIdx !== null && !this.coop) {
          this._storyComplete();
        } else if (this.campaignIdx !== null && !this.coop) {
          this.state = 'victory'; this.victoryT = 0;
          Progress.unlock(this.campaignIdx + 2);
          if (this.campaignIdx >= CAMPAIGN.length - 1) this._submitRun();
          AudioSys.play('game_start');
          Effects.screenFlash(0.35, '255,240,200');
        } else {
          this.state = 'levelClear'; this.levelClearTimer = this.coop ? 1.8 : 1.0;
        }
      }
      if (this.levelBanner) { this.levelBanner.t -= dt; if (this.levelBanner.t <= 0) this.levelBanner = null; }
    }

    this.shake = Math.max(0, this.shake - dt * 2);
  }

  submitScore(name, players) {
    const body = { name: name || 'ANON', score: Math.floor(this.score), char: CHAR_IDS[this.selectedChar] };
    if (players) body.players = players;
    try {
      fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {});
    } catch (e) {}
  }

  // Личный счёт убийств героя: каждые 10 — заряд режима героя
  // у Даура и Дани каждые 10 убийств (заряд) включают особый режим.
  _creditKill(e) {
    if (!e.killedBy) return;
    const pl = this.allPlayers().find(p => p && p.charId === e.killedBy);
    if (!pl) return;
    pl.kills = (pl.kills || 0) + 1;
    if (pl !== this.player && this.coop) this.coop.sendTo(pl.pid, { t: 'kc', n: pl.kills });
    if (pl.dead || this._modeBusy(pl)) return;
    pl.charge = (pl.charge || 0) + 1;
    if (pl !== this.player && this.coop) this.coop.sendTo(pl.pid, { t: 'chg', n: pl.charge });
    if (pl.charge >= MODE_KILLS) { pl.charge = 0; this._triggerMode(pl, MODE_OF[pl.charId]); }
  }

  // Пока режим активен (ярость, живой идеальный клон, заряженный «БАБАХ») — заряд не копится
  _modeBusy(pl) {
    if (pl === this.player) {
      if (pl.charId === 'daur') return pl.rageT > 0;
      if (pl.charId === 'gal') return pl.babahReady;
      return this.allies.some(a => a.kind === 'perfect' && !a.dead);
    }
    return pl.mode === 1 || pl.mode === 4 || !!pl.pc;
  }

  _triggerMode(pl, m) {
    if (pl === this.player) this._applyMode(pl, m);
    else if (this.coop) { this.coop.sendTo(pl.pid, { t: 'mode', m }); if (m === 'rage') pl.mode = 1; if (m === 'babah') pl.mode = 4; if (m === 'clone') pl.pc = 1; }
  }

  // Режим у своего героя (вызывается и по сети у клиента)
  _applyMode(pl, m) {
    if (m === 'rage') pl.rageT = MODE_TIME;
    else if (m === 'babah') pl.babahReady = true;
    else if (m === 'clone') this.allies.push(new Ally(pl, pl.x + Math.cos(pl.angle + 2) * 26, pl.y + Math.sin(pl.angle + 2) * 26, 'perfect'));
    announceMode(pl, m);
    if (this.thoughts) this.thoughts.event(m);
  }

  // Навыки своего героя: клоны, «БАБАХ», аура смерти, огненное тело
  _heroSkills(dt) {
    // клоны живут и у хоста, и у клиента корпоратива (каждый считает своих)
    for (const a of this.allies) a.update(dt, this);
    this.allies = this.allies.filter(a => !a.dead);
    this._updatePulls(dt);
    this._updateFireTrail(dt);
    const p = this.player;
    if (!p || p.dead) return;
    if (p._wantClones) {
      p._wantClones = false;
      this.allies = this.allies.filter(a => !(a.kind === 'shadow'));
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI * 2 + p.angle;
        let x = p.x + Math.cos(a) * 40, y = p.y + Math.sin(a) * 40;
        if (this.level.collides(x, y, 16, 16)) { x = p.x; y = p.y; }
        this.allies.push(new Ally(p, x, y, 'shadow', i));
      }
      AudioSys.play('stun');
      if (this.thoughts) this.thoughts.event('clones');
    }
    if (p._wantBabah) { p._wantBabah = false; this._babah(p); }
    if (p._wantPull) { p._wantPull = false; this._arsenal(p); }
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    // ярость Даура: аура смерти — всё (кроме боссов) в маленьком радиусе погибает мгновенно
    if (p.rageT > 0) {
      for (const e of this.enemies) {
        if (e.dead || e.isBoss) continue;
        if (Utils.dist(cx, cy, e.cx(), e.cy()) < RAGE_AURA) {
          Effects.burst(e.cx(), e.cy(), '255,30,40', 14, 200);
          e.die(this.pickups, { kind: 'burn', angle: Math.atan2(e.cy() - cy, e.cx() - cx), by: p.charId });
        }
      }
    }
    // Гала в огне, пока «БАБАХ» заряжен: кто прикоснётся — горит
    if (p.babahReady) {
      this._fireT = (this._fireT || 0) - dt;
      if (this._fireT <= 0) {
        this._fireT = 0.4;
        for (const e of this.enemies) if (!e.dead && Utils.dist(cx, cy, e.cx(), e.cy()) < 26) e.takeDamage(1, this.pickups, { kind: 'burn', angle: 0, by: p.charId });
      }
      if (Math.random() < 0.35) Effects.burst(cx + Utils.rand(-8, 8), cy + Utils.rand(-8, 8), '255,140,40', 1, 50);
    }
  }

  // ---------- АРСЕНАЛ Даура: притягивает два лучших огнестрела с карты, свои — на пол ----------
  _bestGuns(owner) {
    return this.pickups
      .filter(q => q.weapon && q.weapon.type === 'ranged' && !q.pickedUp && !q.thrown && !q._noPull && canWield(owner.charId, q.weapon))
      .sort((a, b) => weaponValue(b.weapon) - weaponValue(a.weapon))
      .slice(0, 2);
  }

  // Что оставить и что притянуть: два лучших ствола среди своих и лежащих на карте
  _arsenalPlan(p) {
    const own = [p.weapon, p.weapon2].filter(w => w && w.type === 'ranged').map(w => ({ w, own: true, v: weaponValue(w) + 0.001 }));
    const map = this._bestGuns(p).map(q => ({ q, w: q.weapon, own: false, v: weaponValue(q.weapon) }));
    const top = [...own, ...map].sort((a, b) => b.v - a.v).slice(0, 2);
    return { keep: top.filter(c => c.own).map(c => c.w), pull: top.filter(c => !c.own).map(c => c.q) };
  }

  _dropGuns(p, cx, cy, keep) {
    for (const w of [p.weapon, p.weapon2]) {
      if (!w || keep.includes(w)) continue;
      if (this.coop && !this.coop.isHost) {
        this.coop.event({ t: 'throw', w: w.id, am: w.ammo, x: Math.round(cx), y: Math.round(cy), a: +(Math.random() * 6.28).toFixed(2) });
        continue;
      }
      const d = new Pickup(cx + Utils.rand(-14, 14), cy + Utils.rand(-14, 14), w);
      d.groundTimer = 2; d._noPull = true;
      setTimeout(() => { d._noPull = false; }, 3000);
      this.pickups.push(d);
    }
    p.weapon = keep[0] || null; p.weapon2 = keep[1] || null;
  }

  _arsenal(p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const plan = this._arsenalPlan(p);
    if (!plan.pull.length) {
      p.skillCd = 0.5;
      Effects.popup(cx, cy - 22, this._bestGuns(p).length ? 'ЛУЧШЕ УЖЕ В РУКАХ' : 'НЕЧЕГО ПРИТЯНУТЬ', '#9a94b8', 11);
      return;
    }
    Effects.ring(cx, cy, '90,200,255', 46);
    AudioSys.play('stun');
    this._dropGuns(p, cx, cy, plan.keep);
    if (this.coop && !this.coop.isHost) {
      // клиент корпоратива: предметы у хоста — он выберет стволы и пришлёт их с анимацией
      this.coop.event({ t: 'pull', n: plan.pull.length });
    } else {
      for (const pk of plan.pull) { pk.pickedUp = true; this.pulls.push({ w: pk.weapon, sx: pk.x, sy: pk.y, x: pk.x, y: pk.y, t: 0, target: p, equip: true }); }
    }
    if (this.thoughts) this.thoughts.say(Utils.choice(['Ко мне, железо!', 'Апгрейд арсенала.', 'Телекинез — это просто хороший Wi-Fi.']), 2.6);
  }

  // хост: напарник-Даур просит притянуть n лучших стволов
  _arsenalFor(rp, pid, n = 2) {
    for (const pk of this._bestGuns(rp).slice(0, Utils.clamp(n | 0, 1, 2))) {
      pk.pickedUp = true;
      this.coop.sendTo(pid, { t: 'give', w: pk.weapon.id, am: pk.weapon.ammo, s: 'w2', fx: Math.round(pk.x), fy: Math.round(pk.y) });
      this.pulls.push({ w: pk.weapon, sx: pk.x, sy: pk.y, x: pk.x, y: pk.y, t: 0, target: rp, equip: false });
    }
  }

  // ---------- огненный след рывка Галы: горит 2,5 с, поджигает всех, кто наступит ----------
  _updateFireTrail(dt) {
    const dashers = [];
    if (this.player && !this.player.dead && this.player.charId === 'gal' && this.player.dashT > 0) dashers.push(this.player);
    if (this.coop) for (const rp of this.coop.remotes.values()) if (!rp.dead && rp.charId === 'gal' && rp.mode === 3) dashers.push(rp);
    for (const d of dashers) {
      const x = d.x + 9, y = d.y + 9, last = d._trailLast;
      if (!last || Utils.dist(last.x, last.y, x, y) > 12) {
        d._trailLast = { x, y };
        this.fireTrail.push({ x, y, t: 0, life: 2.5, by: d.charId, seed: Math.random() * 10 });
      }
    }
    for (const d of [this.player]) if (d && d.dashT <= 0) d._trailLast = null;
    const owner = !this.coop || this.coop.isHost;
    for (const f of this.fireTrail) {
      f.t += dt;
      if (Math.random() < dt * 6) Effects.burst(f.x + Utils.rand(-6, 6), f.y + Utils.rand(-6, 6), '255,140,40', 1, 40);
      if (!owner) continue;
      for (const e of this.enemies) {
        if (e.dead || (e._trailCd || 0) > 0) continue;
        if (Utils.dist(f.x, f.y, e.cx(), e.cy()) < 18) {
          e._trailCd = 0.45;
          e.takeDamage(1, this.pickups, { kind: 'burn', angle: 0, by: f.by });
          Effects.burst(e.cx(), e.cy(), '255,140,40', 5, 120);
        }
      }
    }
    for (const e of this.enemies) if (e._trailCd > 0) e._trailCd -= dt;
    this.fireTrail = this.fireTrail.filter(f => f.t < f.life);
    if (this.fireTrail.length > 220) this.fireTrail.splice(0, this.fireTrail.length - 220);
  }

  _drawFireTrail(ctx) {
    if (!this.fireTrail.length) return;
    const now = performance.now() / 1000;
    ctx.save();
    // выжженный пол
    for (const f of this.fireTrail) {
      ctx.fillStyle = `rgba(20,8,4,${0.35 * (1 - f.t / f.life)})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, 11, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.fireTrail) {
      const k = 1 - f.t / f.life, fl = 0.75 + 0.25 * Math.sin(now * 18 + f.seed * 5);
      const r = (9 + 5 * fl) * Math.min(1, f.t * 8) * (0.5 + 0.5 * k);
      const g = ctx.createRadialGradient(f.x, f.y - 2, 0, f.x, f.y, r * 1.6);
      g.addColorStop(0, `rgba(255,230,150,${0.55 * k})`);
      g.addColorStop(0.45, `rgba(255,120,30,${0.45 * k})`);
      g.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, r * 1.6, 0, Math.PI * 2); ctx.fill();
      // язычки пламени
      for (let i = 0; i < 2; i++) {
        const ph = (now * 2.2 + f.seed + i * 0.5) % 1;
        ctx.fillStyle = `rgba(255,${170 - ph * 100},40,${0.5 * k * (1 - ph)})`;
        ctx.beginPath(); ctx.arc(f.x + Math.sin(f.seed * 7 + i * 3) * 5, f.y - ph * 14, 3.5 * (1 - ph) + 1, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  _updatePulls(dt) {
    for (const f of this.pulls) {
      f.t += dt / PULL_TIME;
      const tx = f.target.x + 9, ty = f.target.y + 9, k = Math.min(1, f.t * f.t);
      f.x = f.sx + (tx - f.sx) * k; f.y = f.sy + (ty - f.sy) * k;
      if (Math.random() < 0.5) Effects.burst(f.x, f.y, '90,200,255', 1, 40);
      if (f.t >= 1 && !f.done) {
        f.done = true;
        Effects.ring(tx, ty, '90,200,255', 22);
        if (f.equip && f.target === this.player && !f.target.dead) {
          const p = f.target, w = prepWeapon(p.charId, f.w);
          if (!p.weapon) p.weapon = w; else if (!p.weapon2) p.weapon2 = w;
          else if (!this.coop || this.coop.isHost) this.pickups.push(new Pickup(tx, ty, f.w));   // руки заняты — кладём рядом
          AudioSys.play('pickup_weapon');
        }
      }
    }
    this.pulls = this.pulls.filter(f => !f.done);
  }

  _drawPulls(ctx) {
    const t = performance.now() / 1000;
    for (const f of this.pulls) {
      const tx = f.target.x + 9, ty = f.target.y + 9;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(90,200,255,${0.35 + 0.25 * Math.sin(t * 30)})`; ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 60;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(f.x, f.y); ctx.stroke();
      ctx.setLineDash([]);
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 18);
      g.addColorStop(0, 'rgba(120,220,255,0.6)'); g.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 18, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(t * 14); ctx.scale(1.2, 1.2);
      Sprites.drawWeapon(ctx, f.w.id, true);
      ctx.restore();
    }
  }

  // «БАБАХ» Галы: мощный взрыв вокруг, обычных врагов убивает, боссам — много урона, самого Галу не ранит
  _babah(p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    Explosives.explode(this, cx, cy, BABAH_R, { cosmetic: true });
    Effects.ring(cx, cy, '255,240,180', BABAH_R * 1.2);
    Effects.burst(cx, cy, '255,120,30', 50, 420);
    Effects.screenFlash(0.5, '255,180,80');
    this.shake = Math.max(this.shake, 1.2);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Utils.dist(cx, cy, e.cx(), e.cy());
      if (d > BABAH_R) continue;
      const cause = { kind: 'explosion', angle: Math.atan2(e.cy() - cy, e.cx() - cx), by: p.charId };
      if (e.isBoss) e.takeDamage(d < BABAH_R * 0.5 ? 8 : 6, this.pickups, cause);
      else e.die(this.pickups, cause);
    }
    const lv = this.level;
    if (lv.furniture) lv.furniture.forEach((f, i) => { if (!f.destroyed && f.hp > 0 && Utils.dist(cx, cy, f.x, f.y) < BABAH_R) lv.damageFurniture(i, 8, f.x, f.y); });
    if (lv.windows) lv.windows.forEach((w, i) => { if (!w.broken && Utils.dist(cx, cy, (w.x + 0.5) * TILE, (w.y + 0.5) * TILE) < BABAH_R) lv.damageWindow(i); });
    lv.addNoise(cx, cy, 800);
    if (this.thoughts) this.thoughts.say(Utils.choice(['БАБАХ!', 'Вот это я понимаю — горячий привет.', 'Жарковато вышло.']));
  }

  // (лотерея Дани удалена — вместо неё клоны)
  _updateLottery(dt) {}

  // Темп: последние враги сами идут на игроков, в бесконечном режиме и корпоративе — волны подкрепления
  _updatePacing(dt) {
    if (this.tutorial) return;
    if (this.coop && !this.coop.isHost) return;
    if (!this.level || !this.level.rooms) return;
    const alive = this.enemies.filter(e => !e.dead && !e.isBoss);
    const total = Math.max(1, this.enemies.filter(e => !e.isBoss).length);
    const players = this.allPlayers().filter(p => p && !p.dead);
    if (!players.length) return;
    // добивание: когда осталось мало врагов, каждые 3 с они «слышат» ближайшего героя
    this._huntT = (this._huntT || 0) - dt;
    if (alive.length && (alive.length <= 6 || alive.length / total <= 0.2) && this._huntT <= 0) {
      this._huntT = 3;
      for (const e of alive) {
        let best = players[0], bd = Infinity;
        for (const p of players) { const d = Utils.dist(p.x, p.y, e.x, e.y); if (d < bd) { bd = d; best = p; } }
        if (e.state === 'idle' || e.state === 'patrol' || e.state === 'investigate') {
          e.state = 'investigate'; e.noiseTarget = { x: best.x + 9, y: best.y + 9 }; e.investigateTimer = 8;
        }
      }
    }
    // волны: не в кампании; после 45% зачистки, до 2 (соло) / 3 (корп) волн на этаж
    if (this.campaignIdx !== null && !this.coop) return;
    const n = players.length;
    const maxWaves = this.coop ? 3 : 2;
    this._waveT = (this._waveT === undefined ? 20 : this._waveT) - dt;
    if ((this._waves || 0) >= maxWaves || this._waveT > 0 || alive.length / total > 0.55) return;
    this._waveT = this.coop ? 22 : 30;
    this._waves = (this._waves || 0) + 1;
    const lit = new Set();
    for (const p of players) for (const r of this.level.getLitRooms(p).lit) lit.add(r);
    const far = this.level.rooms.filter(r => !lit.has(r) && !r.hall).map(r => ({ r, d: Math.min(...players.map(p => Utils.dist((r.x + r.w / 2) * TILE, (r.y + r.h / 2) * TILE, p.x, p.y))) })).sort((a, b) => b.d - a.d);
    const room = far.length ? far[Math.min(far.length - 1, Utils.randInt(0, 2))].r : null;
    if (!room) return;
    const size = 3 + n + this._waves;
    for (let i = 0; i < size; i++) {
      const pt = this.level.randomFreePoint(room);
      if (!pt) continue;
      const roll = Math.random();
      const type = roll < 0.12 ? 'tank' : roll < 0.3 ? 'hound' : 'normal';
      const e = new Enemy(pt.x - 9, pt.y - 9, 'static', null, type);
      if (type === 'normal') e.weapon = makeWeapon(Utils.choice(['ak47', 'uzi', 'm4', 'shotgun', 'bat', 'pipe', 'knife']));
      e.state = 'investigate'; e.noiseTarget = { x: players[0].x + 9, y: players[0].y + 9 }; e.investigateTimer = 10;
      this.enemies.push(e);
    }
    this.totalEnemies = this.enemies.length;
    Effects.screenFlash(0.18, '255,40,60');
    AudioSys.play('hound_bark');
    this.levelBanner = { name: 'ПОДКРЕПЛЕНИЕ', sub: `ВОЛНА ${this._waves} — ${size} ВРАГОВ ИДУТ К ВАМ`, color: '#ff2a40', t: 2.4 };
  }

  // Враг дольше полсекунды внутри стены/двери — переносим на ближайшее свободное место
  _unstickEnemies(dt) {
    if (this.coop && !this.coop.isHost) return;
    const lv = this.level;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!lv.collides(e.x, e.y, e.w, e.h)) { e._inWallT = 0; continue; }
      e._inWallT = (e._inWallT || 0) + dt;
      if (e._inWallT < 0.5) continue;
      e._inWallT = 0;
      search: for (let r = 6; r <= 120; r += 6) {
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2;
          const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
          if (!lv.collides(x, y, e.w, e.h)) { e.x = x; e.y = y; e._px = x; e._py = y; e._path = null; break search; }
        }
      }
    }
  }

  // Красный фильтр безумия (ярость) и золотое сияние (лотерея) поверх мира
  _drawModeFx(ctx) {
    const pl = this.player;
    if (!pl || pl.dead) return;
    const W = this.W, H = this.H, t = performance.now() / 1000;
    if (pl.rageT > 0) {
      const k = Math.min(1, pl.rageT / 0.6, (MODE_TIME - pl.rageT) / 0.25 + 0.3);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(255,${70 + 30 * Math.sin(t * 11)},70,${0.85 * k})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
      rg.addColorStop(0, 'rgba(255,0,20,0)'); rg.addColorStop(1, `rgba(255,0,20,${0.45 * k})`);
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      // мерцание окружения
      const r = Math.random();
      if (r < 0.12) { ctx.fillStyle = `rgba(0,0,0,${0.35 * k})`; ctx.fillRect(0, 0, W, H); }
      else if (r < 0.2) { ctx.fillStyle = `rgba(255,30,40,${0.18 * k})`; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
    if (pl.babahReady) {
      const k = 0.6 + 0.4 * Math.sin(t * 4);
      ctx.save();
      const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      rg.addColorStop(0, 'rgba(255,120,30,0)'); rg.addColorStop(1, `rgba(255,100,20,${0.22 * k})`);
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (false) {
      const k = 1;
      ctx.save();
      const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      rg.addColorStop(0, 'rgba(255,210,60,0)'); rg.addColorStop(1, `rgba(255,190,40,${0.3 * k})`);
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 10; i++) {
        const x = (Math.sin(i * 91.7 + t * 0.7) * 0.5 + 0.5) * W, y = ((i * 0.137 + t * 0.25) % 1) * H;
        Sprites.star(ctx, x, y, 3 + (i % 3), ['#ffd319', '#ff5ac8', '#5ae0ff'][i % 3]);
      }
      ctx.restore();
    }
  }

  // ---------- HUD ----------
  _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Полупрозрачная неоновая плашка
  _hudPanel(ctx, x, y, w, h, col, s) {
    ctx.save();
    this._rr(ctx, x, y, w, h, 6 * s);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(22,12,38,0.86)'); g.addColorStop(1, 'rgba(8,4,16,0.86)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = col; ctx.fillRect(x, y, 3 * s, h);
    ctx.restore();
  }

  _drawHud(ctx, s, rightMargin) {
    const pl = this.player;
    const t = performance.now() / 1000;
    const COL = { dani: '#05d9e8', gal: '#ff2a6d', daur: '#ffd319' };
    const INFO = { dani: ['ДАНИ', 'ТЕНЕВОЙ'], gal: ['ГАЛА', 'ПОДЖИГАТЕЛЬ'], daur: ['ДАУР', 'СТРЕЛОК'] };
    const col = COL[pl.charId] || '#05d9e8';
    const font = (px, bold = true) => `${bold ? 'bold ' : ''}${Math.max(9, Math.round(px * s))}px "Courier New", monospace`;

    // отслеживаем урон — HUD вздрагивает и краснеет
    if (this._hudHp === undefined || pl.hp > this._hudHp) this._hudHp = pl.hp;
    if (pl.hp < this._hudHp) { this._hudHp = pl.hp; this._hudHurtAt = t; }
    const hurt = Utils.clamp(1 - (t - (this._hudHurtAt || -9)) / 0.6, 0, 1);
    const low = pl.hp <= 2 && !pl.dead;

    ctx.save();
    ctx.translate(hurt > 0 ? Utils.rand(-2, 2) * hurt * s : 0, 0);

    const ws = pl.weapon2 ? [pl.weapon, pl.weapon2] : [pl.weapon];
    const x0 = 10 * s, y0 = 10 * s, pw = 210 * s;
    const headH = 50 * s, rowH = 24 * s;
    const ph = headH + ws.length * rowH + 4 * s;
    this._hudPanel(ctx, x0, y0, pw, ph, col, s);

    // ===== герой =====
    const ps = 30 * s, px = x0 + 8 * s, py = y0 + 5 * s;
    const img = this.images[pl.charId];
    ctx.save();
    this._rr(ctx, px, py, ps, ps, 4 * s); ctx.clip();
    ctx.fillStyle = '#120a1e'; ctx.fillRect(px, py, ps, ps);
    if (img && img.complete && img.naturalWidth) {
      const iw = img.naturalWidth, ih = img.naturalHeight, m = Math.min(iw, ih);
      ctx.drawImage(img, (iw - m) / 2, (ih - m) * 0.2, m, m, px, py, ps, ps);
    }
    if (pl.dead) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(px, py, ps, ps); }
    if (hurt > 0 || low) {
      ctx.fillStyle = `rgba(255,0,40,${Math.max(hurt * 0.6, low ? 0.18 + 0.15 * Math.sin(t * 8) : 0)})`;
      ctx.fillRect(px, py, ps, ps);
    }
    ctx.restore();
    ctx.save();
    this._rr(ctx, px, py, ps, ps, 4 * s);
    ctx.shadowColor = low ? '#ff2a6d' : col; ctx.shadowBlur = 6 * s;
    ctx.strokeStyle = low ? '#ff2a6d' : col; ctx.lineWidth = 1.5 * s; ctx.stroke();
    ctx.restore();

    const [nm, perk] = INFO[pl.charId] || ['ГЕРОЙ', ''];
    const tx = px + ps + 8 * s;
    ctx.textAlign = 'left';
    ctx.font = font(12); ctx.fillStyle = '#fff';
    ctx.fillText(nm, tx, y0 + 16 * s);
    const nw = ctx.measureText(nm).width;
    ctx.font = font(8); ctx.fillStyle = col;
    ctx.fillText(perk, tx + nw + 5 * s, y0 + 15 * s);

    // сердца (красные) и броня (синие)
    const armor = pl.armor || 0;
    for (let i = 0; i < pl.maxHp + armor; i++) {
      const isArmor = i >= pl.maxHp;
      const filled = isArmor || i < pl.hp;
      const hx = tx + 5 * s + i * 13 * s, hy = y0 + 21 * s;
      const beat = filled && low && !isArmor ? 1 + 0.12 * Math.max(0, Math.sin(t * 9)) : 1;
      const c = isArmor ? ['#3a9cff', '#a8d4ff', '#3a9cff'] : filled ? ['#ff2a6d', '#ff9ac0', '#ff2a6d'] : ['#2a1a2e', '#4a3450', null];
      ctx.save();
      ctx.translate(hx, hy); ctx.scale(s * 0.52 * beat, s * 0.52 * beat);
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(-10, -6, -16, 6, 0, 16);
      ctx.bezierCurveTo(16, 6, 10, -6, 0, 4);
      ctx.closePath();
      if (c[2]) { ctx.shadowColor = c[2]; ctx.shadowBlur = 6; }
      ctx.fillStyle = c[0];
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = c[1]; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.restore();
    }
    // гранаты — справа на строке имени
    for (let i = 0; i < pl.grenades; i++) {
      ctx.save();
      ctx.translate(x0 + pw - 12 * s - i * 11 * s, y0 + 12 * s); ctx.scale(1.05 * s, 1.05 * s);
      Sprites.drawGrenade(ctx, 0, false);
      ctx.restore();
    }
    // навык F и заряд режима героя
    {
      const ay = y0 + 40 * s, ax = tx, aw = x0 + pw - 10 * s - ax;
      let label, frac, c2;
      const n = Math.min(MODE_KILLS, pl.charge || 0);
      let right = '', rc = '#9a94b8';
      const kf = Input.isMobile ? '' : ' [F]';
      const nm = { dani: 'КЛОНЫ', gal: 'РЫВОК', daur: 'АРСЕНАЛ' }[pl.charId] || 'НАВЫК';
      const ready = pl.skillCd <= 0;
      label = ready ? `${nm}${kf} ГОТОВ` : `${nm} ${pl.skillCd.toFixed(pl.skillCd < 2 ? 1 : 0)}с`;
      frac = 1 - pl.skillCd / (SKILL_CD[pl.charId] || 1); c2 = ready ? '#3dff8a' : '#9a94b8';
      const hot = n >= MODE_KILLS - 2 ? '#ffd319' : '#9a94b8';
      if (pl.charId === 'dani') {
        const pc = this.allies.find(a => a.kind === 'perfect' && !a.dead);
        right = pc ? `КЛОН ${pc.hp}♥` : `ИДЕАЛ ${n}/${MODE_KILLS}`; rc = pc ? '#ffd319' : hot;
      } else if (pl.charId === 'gal') {
        const ke = Input.isMobile ? '' : ' [E]';
        right = pl.babahReady ? `БАБАХ${ke}!` : `БАБАХ ${n}/${MODE_KILLS}`;
        rc = pl.babahReady ? (Math.sin(performance.now() / 120) > 0 ? '#ff8a30' : '#ffd319') : hot;
      } else {
        right = pl.rageT > 0 ? `ЯРОСТЬ ${pl.rageT.toFixed(1)}с` : `ЯРОСТЬ ${n}/${MODE_KILLS}`; rc = pl.rageT > 0 ? '#ff2a40' : hot;
      }
      ctx.font = font(8); ctx.textAlign = 'left'; ctx.fillStyle = c2;
      ctx.fillText(label, ax, ay - 1 * s);
      if (right) { ctx.textAlign = 'right'; ctx.fillStyle = rc; ctx.fillText(right, ax + aw, ay - 1 * s); ctx.textAlign = 'left'; }
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(ax, ay + 2 * s, aw, 3 * s);
      ctx.fillStyle = c2; ctx.fillRect(ax, ay + 2 * s, aw * Utils.clamp(frac, 0, 1), 3 * s);
    }

    // ===== оружие — строки под героем =====
    let y = y0 + headH;
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x0 + 8 * s, y - 2 * s, pw - 16 * s, 1);
    ws.forEach((w, wi) => {
      const empty = w && w.type === 'ranged' && w.ammo <= 0;
      const iw = 46 * s, ix = x0 + 8 * s;
      // иконка
      ctx.save();
      ctx.beginPath(); ctx.rect(ix, y + 1 * s, iw, rowH - 4 * s); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(ix, y + 1 * s, iw, rowH - 4 * s);
      if (w) {
        const len = w.length || 20;
        const k = Math.min(1.6, 36 / len) * s;
        ctx.translate(ix + iw / 2 - len * 0.32 * k, y + rowH / 2 - 1 * s);
        ctx.scale(k, k);
        ctx.shadowColor = 'rgba(255,255,255,0.35)'; ctx.shadowBlur = 3;
        Sprites.drawWeapon(ctx, w.id, true);
      } else {
        ctx.translate(ix + iw / 2, y + rowH / 2 - 1 * s);
        ctx.fillStyle = '#dfa57e';
        this._rr(ctx, -7 * s, -5 * s, 14 * s, 10 * s, 3 * s); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < 3; i++) ctx.fillRect((-3.5 + i * 3.5) * s, -5 * s, 1 * s, 6 * s);
      }
      ctx.restore();

      const nx = ix + iw + 7 * s, right = x0 + pw - 8 * s;
      const label = w ? w.name.toUpperCase() : 'КУЛАКИ';
      ctx.textAlign = 'left'; ctx.font = font(10); ctx.fillStyle = empty ? '#ff2a6d' : '#fff';
      ctx.fillText(label, nx, y + 10 * s, right - nx - 40 * s);
      if (w && w.type === 'ranged') {
        const frac = w.maxAmmo ? w.ammo / w.maxAmmo : 0;
        const ammoCol = empty ? '#ff2a6d' : frac < 0.25 ? '#ffb040' : '#05d9e8';
        ctx.font = font(9); ctx.textAlign = 'right'; ctx.fillStyle = ammoCol;
        const blink = empty && Math.sin(t * 7) > -0.3;
        ctx.fillText(empty ? (blink ? (Input.isMobile ? 'ПУСТО·БРОС' : 'ПУСТО·Q') : '') : `${w.ammo}/${w.maxAmmo}`, right, y + 10 * s);
        const bx = nx, by = y + 14 * s, bw = right - nx;
        if (w.maxAmmo <= 16) {
          const gap = 1.5 * s, pwid = (bw - gap * (w.maxAmmo - 1)) / w.maxAmmo;
          for (let i = 0; i < w.maxAmmo; i++) {
            ctx.fillStyle = i < w.ammo ? ammoCol : 'rgba(255,255,255,0.1)';
            ctx.fillRect(bx + i * (pwid + gap), by, pwid, 4 * s);
          }
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(bx, by, bw, 4 * s);
          ctx.fillStyle = ammoCol; ctx.fillRect(bx, by, bw * frac, 4 * s);
        }
      } else {
        ctx.font = font(8, false); ctx.fillStyle = '#9a94b8';
        ctx.fillText(w ? 'ближний бой' : 'оглушает, добивает', nx, y + 19 * s);
      }
      if (ws.length > 1) {
        ctx.font = font(7, false); ctx.fillStyle = '#6a6488'; ctx.textAlign = 'left';
        ctx.fillText(wi ? 'Л' : 'П', ix + 2 * s, y + 8 * s);
      }
      y += rowH;
    });
    ctx.restore();
    this._hudBottom = y0 + ph;

    // ===== справа: очки, убийства, комбо =====
    const R = this.W - rightMargin;
    const y0r = y0 + (this.coop ? 14 * s : 0);
    const rw = 150 * s, rx = R - rw, rh = 44 * s;
    this._hudPanel(ctx, rx, y0r, rw, rh, '#ffd319', s);
    this._hudScore = this._hudScore === undefined || this._hudScore > this.score ? this.score : this._hudScore + Math.ceil((this.score - this._hudScore) * 0.2);
    const bump = this._hudScore < this.score ? 1.08 : 1;
    ctx.textAlign = 'left'; ctx.font = font(8, false); ctx.fillStyle = '#9a94b8';
    ctx.fillText('ОЧКИ', rx + 10 * s, y0r + 13 * s);
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = font(18 * bump); ctx.shadowColor = '#ffd319'; ctx.shadowBlur = 8 * s; ctx.fillStyle = '#ffd319';
    ctx.fillText(String(this._hudScore), R - 8 * s, y0r + 22 * s);
    ctx.restore();
    const kFrac = this.totalEnemies ? Math.min(1, this.kills / this.totalEnemies) : 0;
    ctx.font = font(9); ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(`☠ ${this.kills}/${this.totalEnemies}`, rx + 10 * s, y0r + 37 * s);
    const kbx = rx + 62 * s, kbw = rw - 70 * s;
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(kbx, y0r + 32 * s, kbw, 4 * s);
    ctx.fillStyle = kFrac >= 1 ? '#3dff8a' : '#ff2a6d'; ctx.fillRect(kbx, y0r + 32 * s, kbw * kFrac, 4 * s);

    let ry = y0r + rh + 4 * s;
    const bd = this.bossDirector;
    if (bd && !bd.active && !this.enemies.some(e => e.isBoss && !e.dead)) {
      const left = Math.max(0, bd.nextScore - this.score);
      ctx.font = font(8); ctx.textAlign = 'right'; ctx.fillStyle = left < 300 ? '#ff2a6d' : '#9a94b8';
      ctx.fillText(left > 0 ? `БОСС ЧЕРЕЗ ${left}` : 'БОСС БЛИЗКО…', R - 4 * s, ry + 8 * s);
      ry += 12 * s;
    }
    if (this.combo > 1 && this.comboTimer > 0) {
      const k = Utils.clamp(this.comboTimer / 3, 0, 1);
      const cs = 15 + Math.min(this.combo, 8) * 1.5;
      const pop = 1 + Math.max(0, (this.comboTimer - 2.75) * 1.2);
      const cc = this.combo >= 6 ? '#ffd319' : this.combo >= 4 ? '#ff8a30' : '#ff2a6d';
      ctx.save();
      ctx.translate(R - 4 * s, ry + 18 * s); ctx.scale(pop, pop);
      ctx.font = font(cs); ctx.textAlign = 'right';
      ctx.shadowColor = cc; ctx.shadowBlur = 10 * s; ctx.fillStyle = cc;
      ctx.fillText(`x${this.combo}`, 0, 0);
      const cw = ctx.measureText(`x${this.combo}`).width;
      ctx.shadowBlur = 0; ctx.font = font(8); ctx.fillStyle = '#fff';
      ctx.fillText('КОМБО', -cw - 4 * s, -2 * s);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(R - 90 * s, ry + 23 * s, 86 * s, 3 * s);
      ctx.fillStyle = k < 0.3 ? '#ff2a6d' : '#05d9e8'; ctx.fillRect(R - 90 * s, ry + 23 * s, 86 * s * k, 3 * s);
    }
  }

  _drawHearts(ctx) {
    const hp = this.player ? this.player.hp : 0;
    const maxHp = this.player ? this.player.maxHp : 3;
    const scale = Math.min(1, this.W / 960);

    for (let i = 0; i < maxHp; i++) {
      const x = 20 * scale + i * 34 * scale;
      const y = 58 * scale;
      const filled = i < hp;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(-10, -6, -16, 6, 0, 16);
      ctx.bezierCurveTo(16, 6, 10, -6, 0, 4);
      ctx.closePath();
      ctx.fillStyle = filled ? P.player : '#2a1a2a';
      ctx.fill();
      ctx.strokeStyle = filled ? '#ff6b9d' : '#3a2a3a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- выход из корпоратива с подтверждением ----------
  _exitRects() {
    const W = this.W, H = this.H;
    const bw = Math.min(170, W * 0.3), bh = 40, gap = 16;
    return {
      yes: { x: W / 2 - bw - gap / 2, y: H / 2 + 22, w: bw, h: bh },
      no: { x: W / 2 + gap / 2, y: H / 2 + 22, w: bw, h: bh },
    };
  }

  // true — кадр занят диалогом (ввод не передаём дальше)
  _updateExitAsk(dt) {
    const live = ['playing', 'levelClear', 'dead', 'coopIntro'].includes(this.state);
    if (!live) { this._exitAsk = null; this.paused = null; return false; }
    if (!this._exitAsk) {
      if (this.paused) { this._updatePauseMenu(); return this.state === 'coopIntro'; }
      if (this._escPressed() && !TextField.active) {
        // после поражения команды — сразу вопрос о выходе, в игре — меню
        if (this.state === 'dead') this._exitAsk = { t: 0, sel: 1 };
        else this._openPause();
        AudioSys.play('menu_move');
        return true;
      }
      return false;
    }
    const a = this._exitAsk;
    a.t += dt;
    const ready = a.t >= 3;
    const R = this._exitRects();
    const mx = Input.mouse.x, my = Input.mouse.y;
    const inR = r => mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h;
    if (this._escPressed()) { this._exitAsk = null; return true; }
    if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA')) a.sel = 0;
    if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) a.sel = 1;
    if (inR(R.yes)) a.sel = 0; else if (inR(R.no)) a.sel = 1;
    let act = (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter')) ? a.sel : -1;
    if (Input.consumeClick()) act = inR(R.yes) ? 0 : inR(R.no) ? 1 : -1;
    if (act === 1) { this._exitAsk = null; AudioSys.play('menu_move'); }
    else if (act === 0 && ready) {
      AudioSys.play('menu_select');
      this.toMenu();
      this.coopUI.open();
      this.coopUI.flash('Вы покинули корпоратив');
      return true;
    }
    // мир продолжает жить (сетевую игру нельзя поставить на паузу)
    return this.state === 'coopIntro';
  }

  _drawExitAsk(ctx) {
    const W = this.W, H = this.H, a = this._exitAsk, M = this.menu;
    const ready = a.t >= 3;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(4,2,10,0.6)'; ctx.fillRect(0, 0, W, H);
    const pw = Math.min(420, W - 32), ph = 150;
    M.panel(ctx, W / 2 - pw / 2, H / 2 - 80, pw, ph, '#ff2a6d', 0.95);
    ctx.textAlign = 'center';
    M.glowText(ctx, 'ПОКИНУТЬ КОРПОРАТИВ?', W / 2, H / 2 - 44, '#ff2a6d', Math.min(22, W * 0.05), 'center', 12);
    ctx.font = '12px "Courier New", monospace'; ctx.fillStyle = '#c8c2e0';
    ctx.fillText(this.coop && this.coop.isHost ? 'Вы хост — игра закончится для всех.' : 'Напарники продолжат без вас.', W / 2, H / 2 - 16, pw - 24);
    const R = this._exitRects();
    const btn = (r, text, on, enabled, col) => {
      ctx.fillStyle = enabled ? (on ? col : 'rgba(10,5,22,0.9)') : 'rgba(40,36,56,0.7)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = enabled ? col : '#4a4460'; ctx.lineWidth = 1.5; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.font = `bold ${Math.min(16, r.w / 8)}px "Courier New", monospace`; ctx.textBaseline = 'middle';
      ctx.fillStyle = enabled ? '#fff' : '#7a7490';
      ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    };
    // «Да» становится доступной через 3 секунды
    const left = Math.max(0, 3 - a.t);
    btn(R.yes, ready ? 'ДА, ВЫЙТИ' : `ДА (${Math.ceil(left)})`, a.sel === 0, ready, '#ff2a6d');
    if (!ready) { ctx.fillStyle = 'rgba(255,42,109,0.5)'; ctx.fillRect(R.yes.x, R.yes.y + R.yes.h - 3, R.yes.w * (1 - left / 3), 3); }
    btn(R.no, 'НЕТ', a.sel === 1, true, '#05d9e8');
    ctx.restore();
  }

  render() {
    this._renderInner();
    if (this.state === 'dialogue' && this.dialogue) this.dialogue.draw(this.ctx, this.W, this.H);
    if (this.coop && ['playing', 'levelClear', 'dead', 'coopIntro'].includes(this.state)) {
      const ctx = this.ctx;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const scale = Math.min(1, this.W / 960);
      const rightMargin = (window.innerWidth < 800 ? 100 : 20) * scale;
      drawPing(ctx, this.W - rightMargin - 2, 10 * scale + 8, this.coop.net ? this.coop.net.ping : null, this.coop.isHost);
      ctx.restore();
      if (this._exitAsk) this._drawExitAsk(ctx);
    }
    if (this.paused && !this._exitAsk) this._drawPauseMenu(this.ctx);
  }

  // Неоновая полоса загрузки, по которой бегут три героя
  _drawLoadBar(ctx, x, y, w, frac, color, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, w, 10);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#05d9e8'); g.addColorStop(0.5, color); g.addColorStop(1, '#ff2a6d');
    ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.fillStyle = g; ctx.fillRect(x, y, w * frac, 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 12; i++) { const sx = x + ((t * 160 + i * w / 12) % (w * frac || 1)); ctx.fillRect(sx, y + 2, 6, 2); }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 11);
    // герои бегут за краем заполненной полосы
    const hx = x + w * frac;
    ['daur', 'gal', 'dani'].forEach((id, i) => {
      ctx.save();
      ctx.translate(Math.max(x + 12, hx - 14 - i * 26), y - 16);
      ctx.scale(1.3, 1.3);
      Sprites.drawHuman(ctx, Sprites.HEROES[id], { t: t + i, walk: t * 14 + i * 2, move: 1, weaponId: [null, null, 'm4s'][i] });
      ctx.restore();
    });
    ctx.restore();
  }

  _drawBootScreen(ctx) {
    const W = this.W, H = this.H, M = this.menu, t = this._bootT || 0;
    M.drawBackground(ctx, W, H, M.t, 0.25);
    const ts = Math.min(64, W * 0.09);
    M.drawLogo(ctx, W, H * 0.24 + ts * 0.6, ts);
    ctx.textAlign = 'center';
    ctx.font = `${Math.max(11, Math.min(15, W * 0.018))}px "Courier New", monospace`; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('— ПРЕПОДЫ. ПЕРЕЗАПУСК —', W / 2, H * 0.24 + ts * 2.05);
    const frac = this.assetsToLoad ? this.assetsLoaded / this.assetsToLoad : 0;
    const bw = Math.min(460, W * 0.6), bx = W / 2 - bw / 2, by = H * 0.68;
    this._drawLoadBar(ctx, bx, by, bw, frac, '#ffd319', t);
    ctx.font = `bold ${Math.min(14, W * 0.024)}px "Courier New", monospace`;
    if (!this.isReady) {
      ctx.fillStyle = '#c8c2e0';
      ctx.fillText(`ЗАГРУЗКА: ${this._bootLabel || 'старт'} — ${Math.round(frac * 100)}%`, W / 2, by + 34);
    } else {
      const k = 0.55 + 0.45 * Math.sin(t * 5);
      ctx.save(); ctx.globalAlpha = k; ctx.shadowColor = '#ffd319'; ctx.shadowBlur = 14; ctx.fillStyle = '#ffd319';
      ctx.font = `bold ${Math.min(20, W * 0.032)}px "Courier New", monospace`;
      ctx.fillText(Input.isMobile ? 'КОСНИТЕСЬ ЭКРАНА, ЧТОБЫ НАЧАТЬ' : 'НАЖМИТЕ ЛЮБУЮ КЛАВИШУ', W / 2, by + 40);
      ctx.restore();
    }
    const tips = this.menu.tips;
    const tip = tips[Math.floor(t / 3.5) % tips.length];
    ctx.font = `${Math.max(10, Math.min(13, W * 0.019))}px "Courier New", monospace`; ctx.fillStyle = '#05d9e8';
    ctx.fillText('СОВЕТ: ' + tip, W / 2, H - (Input.isMobile ? 60 : 30), W - 24);
  }

  _drawLevelLoad(ctx) {
    const W = this.W, H = this.H, M = this.menu, L = this._load;
    if (!L) return;
    const info = L.info || {}, col = info.color || '#ffd319';
    M.drawBackground(ctx, W, H, M.t, 0.6);
    ctx.fillStyle = 'rgba(4,2,10,0.55)'; ctx.fillRect(0, 0, W, H);
    // портрет героя
    const ids = ['dani', 'gal', 'daur'], img = this.images[ids[this.selectedChar] || 'dani'];
    const ps = Math.min(150, H * 0.28), px = W / 2 - ps / 2, py = H * 0.16;
    if (img && img.complete && img.naturalWidth) {
      ctx.fillStyle = '#05030a'; ctx.fillRect(px - 4, py - 4, ps + 8, ps + 8);
      ctx.drawImage(img, px, py, ps, ps);
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(px - 3, py - 3, ps + 6, ps + 6);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(px, py + ((L.t * 90) % ps), ps, 5);
    }
    M.glowText(ctx, info.title || 'ЗАГРУЗКА', W / 2, py + ps + 46, col, Math.min(30, W * 0.045), 'center', 16);
    ctx.textAlign = 'center';
    ctx.font = `${Math.min(14, W * 0.024)}px "Courier New", monospace`; ctx.fillStyle = '#c8c2e0';
    ctx.fillText(info.sub || '', W / 2, py + ps + 72, W - 32);
    const frac = L.total ? L.done / L.total : 1;
    const bw = Math.min(460, W * 0.6), bx = W / 2 - bw / 2, by = H * 0.78;
    this._drawLoadBar(ctx, bx, by, bw, frac, col, L.t);
    ctx.font = `bold ${Math.min(13, W * 0.022)}px "Courier New", monospace`; ctx.fillStyle = '#9a94b8';
    ctx.fillText(L.ready ? 'ГОТОВО' : `ЗАГРУЖАЕМ ${L.label || '…'} — ${Math.round(frac * 100)}%`, W / 2, by + 32);
  }

  _renderInner() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    if (this.state === 'loading') { this._drawBootScreen(ctx); ctx.drawImage(this.scanlines, 0, 0); return; }
    if (this.state === 'levelLoad') { this._drawLevelLoad(ctx); ctx.drawImage(this.scanlines, 0, 0); return; }

    if (this.state === 'menu') {
      this.menu.draw(ctx, this.W, this.H);
      ctx.drawImage(this.scanlines, 0, 0);
      return;
    }

    if (this.state === 'charSelect') {
      this._renderCharSelect(ctx);
      ctx.drawImage(this.scanlines, 0, 0);
      return;
    }

    if (this.state === 'coop') {
      this.coopUI.draw(ctx, this.W, this.H);
      ctx.drawImage(this.scanlines, 0, 0);
      return;
    }

    if (this.state === 'storySelect') {
      this.storyUI.draw(ctx, this.W, this.H);
      ctx.drawImage(this.scanlines, 0, 0);
      return;
    }

    if (this.state === 'modes') {
      this.modesUI.draw(ctx, this.W, this.H);
      ctx.drawImage(this.scanlines, 0, 0);
      return;
    }

    if (this.state === 'kombat') {
      this.kombat.draw(ctx, this.W, this.H);
      ctx.drawImage(this.scanlines, 0, 0);
      return;
    }

    if (this.state === 'levelSelect') {
      this.campaignUI.draw(ctx, this.W, this.H);
      ctx.drawImage(this.scanlines, 0, 0);
      return;
    }

    if (this.state === 'coopIntro' && this.coop) {
      this.coop.drawIntro(ctx, this.W, this.H, this.introT);
      ctx.drawImage(this.scanlines, 0, 0);
      return;
    }

    if (!this.player || !this.level || !this.cam) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.W, this.H);
      return;
    }

    const b = this.bctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.imageSmoothingEnabled = false;
    b.fillStyle = P.bg;
    b.fillRect(0, 0, this.W, this.H);

    let shX = 0, shY = 0;
    if (this.shake > 0) {
      shX = (Math.random() - 0.5) * 12 * this.shake;
      shY = (Math.random() - 0.5) * 12 * this.shake;
    }

    b.save();
    this.cam.apply(b);
    b.translate(shX, shY);
    this.level.draw(b, this.cam, this.player);

    const pcx = this.player.x + this.player.w / 2;
    const pcy = this.player.y + this.player.h / 2;
    // Враги видны в комнате игрока и в соседних комнатах за открытыми дверями/арками
    const { lit } = this.level.getLitRooms(this.player);
    Effects.drawFloor(b);

    for (const e of this.enemies) {
      const er = this.level.getRoomAt(e.cx(), e.cy());
      if (e.dead || e.stunned || (er && lit.has(er)) || Utils.dist(pcx, pcy, e.cx(), e.cy()) < 200) {
        e.draw(b);
      }
    }

    for (const p of this.pickups) p.draw(b);
    if (this.coop) for (const r of this.coop.remotes.values()) r.draw(b);
    this._drawFireTrail(b);
    for (const a of this.allies) a.draw(b);
    this._drawPulls(b);
    this.player.draw(b);
    for (const bullet of this.bullets) bullet.draw(b);
    for (const bullet of this.fxBullets) if (!bullet.dead) bullet.draw(b);
    for (const pr of this.projectiles) pr.draw(b);
    Flames.draw(b);
    this.level.drawEffects(b);
    Effects.drawTop(b);
    this._drawMuzzleLights(b, lit);
    b.restore();

    const fc = this.fogCtx;
    fc.setTransform(1, 0, 0, 1, 0, 0);
    fc.clearRect(0, 0, this.W, this.H);
    fc.save();
    this.cam.apply(fc);
    this.level.drawFog(fc, this.cam, this.player);
    fc.restore();

    b.setTransform(1, 0, 0, 1, 0, 0);
    b.drawImage(this.fogCanvas, 0, 0);
    if (this.coop) {
      b.save(); this.cam.apply(b); b.translate(shX, shY);
      this.coop.drawWorldOverlay(b);
      b.restore();
    }
    if (this.tutorial || this.mission) {
      b.save(); this.cam.apply(b); b.translate(shX, shY);
      if (this.tutorial) this.tutorial.drawWorld(b);
      if (this.mission) this.mission.drawWorld(b);
      b.restore();
    }

    // Эффект "хроматической аберрации" при тряске
    if (this.chromaticOffset > 0) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.buf, -this.chromaticOffset, 0);
      ctx.drawImage(this.buf, this.chromaticOffset, 0);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(this.buf, 0, 0);
    }

    // Мерцание ламп
    const flicker = Math.sin(this.lightFlicker) * 0.05 + 0.95;
    ctx.fillStyle = `rgba(0,0,0,${1 - flicker})`;
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 4; i++) {
      const y = Math.random() * this.H;
      const h = 4 + Math.random() * 20;
      ctx.drawImage(this.buf, 0, y, this.W, h, (Math.random() - 0.5) * 8, y, this.W, h);
    }
    ctx.globalAlpha = 1;

    ctx.drawImage(this.scanlines, 0, 0);

    const g = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.3, this.W / 2, this.H / 2, this.H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);

    Effects.drawScreen(ctx, this.W, this.H);
    // красная виньетка при последнем сердце
    if (this.player && !this.player.dead && this.player.hp === 1) {
      const pulse = 0.25 + 0.15 * Math.sin(performance.now() / 180);
      const rg = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.35, this.W / 2, this.H / 2, this.H * 0.8);
      rg.addColorStop(0, 'rgba(255,0,40,0)');
      rg.addColorStop(1, `rgba(255,0,40,${pulse})`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    this._drawModeFx(ctx);
    const scale = Math.min(1, this.W / 960);
    const rightMargin = (window.innerWidth < 800 ? 100 : 20) * scale;
    this._drawHud(ctx, scale, rightMargin);
    if (this.tutorial) this.tutorial.drawHud(ctx, this.W, this.H, scale);
    if (this.mission) this.mission.drawHud(ctx, this.W, this.H, scale);
    this.radio.draw(ctx);
    this.thoughts.draw(ctx);

    if (this.coop) {
      this.coop.drawPartyHud(ctx, this.W, scale);
      this.coop.drawChat(ctx, this.W, this.H);
      if (this.player.dead && this.state === 'playing') {
        ctx.save();
        ctx.font = `bold ${22 * scale}px "Courier New", monospace`; ctx.textAlign = 'center';
        ctx.shadowColor = '#ff2a6d'; ctx.shadowBlur = 12; ctx.fillStyle = '#ff2a6d';
        ctx.fillText('ВЫ РАНЕНЫ', this.W / 2, this.H - 70 * scale);
        ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = `${14 * scale}px "Courier New", monospace`;
        const prog = this.coop.revive[this.coop.pid] || 0;
        ctx.fillText(prog > 0 ? `Напарник поднимает вас… ${Math.round(prog * 100)}%` : 'Напарник может поднять вас — пусть постоит рядом 2.5 сек', this.W / 2, this.H - 48 * scale);
        ctx.restore();
      }
    }
    this._drawBossHud(ctx, scale);
    this._drawLevelBanner(ctx, scale);


    if (this.state === 'levelClear') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = P.yellow;
      ctx.font = `bold ${Math.min(48, this.W * 0.08)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('УРОВЕНЬ ЗАЧИЩЕН', this.W / 2, this.H / 2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.min(24, this.W * 0.04)}px "Courier New", monospace`;
      ctx.fillText('Тап / ENTER для продолжения', this.W / 2, this.H / 2 + 30);
    }

    if (this.state === 'dead' && this.coop) { this._drawTeamOver(ctx); return; }

    if (this.state === 'victory') { this._drawVictory(ctx); return; }

    if (this.state === 'dead') {
      // затемнение наступает плавно — чтобы была видна анимация смерти
      const dk = Utils.clamp(((this.deathT || 0) - 0.4) / 0.8, 0, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.85 * dk})`;
      ctx.fillRect(0, 0, this.W, this.H);
      if (dk < 1) return;
      ctx.fillStyle = P.player;
      ctx.font = `bold ${Math.min(48, this.W * 0.08)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('ВЫ ПОГИБЛИ', this.W / 2, this.H / 2 - 100);

      ctx.fillStyle = P.yellow;
      ctx.font = `${Math.min(28, this.W * 0.05)}px "Courier New", monospace`;
      ctx.fillText(`ОЧКИ: ${this.score}`, this.W / 2, this.H / 2 - 50);

      {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(24, this.W * 0.04)}px "Courier New", monospace`;
        ctx.fillText(`Результат записан: ${this.playerName || Nick.get() || 'ИГРОК'}`, this.W / 2, this.H / 2 + 20);
        if (this.campaignIdx !== null) {
          ctx.fillStyle = '#9a94b8'; ctx.font = `${Math.min(16, this.W * 0.03)}px "Courier New", monospace`;
          ctx.fillText(`Уровень: ${CAMPAIGN[this.campaignIdx].name}`, this.W / 2, this.H / 2 + 44);
        }

        ctx.fillStyle = P.yellow;
        ctx.fillRect(this.W/2 - 120, this.H/2 + 60, 240, 50);
        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.min(20, this.W * 0.035)}px "Courier New", monospace`;
        ctx.fillText('ЗАНОВО (R)', this.W / 2, this.H / 2 + 92);

        ctx.fillStyle = P.player;
        ctx.fillRect(this.W/2 - 120, this.H/2 + 130, 240, 50);
        ctx.fillStyle = '#000';
        ctx.fillText('ВЫЙТИ (ESC)', this.W / 2, this.H / 2 + 162);
      }
    }
  }

  // Граната/ракета/огонь от героя. Клиент корпоратива только сообщает хосту.
  _spawnFired(f, by, client) {
    if (f.type === 'flame') {
      Flames.spawn(f.x, f.y, f.a, !client, by);
      this.player._ffT = 0.15;
      return;
    }
    if (client) {
      if (f.type === 'grenade') this.coop.event({ t: 'gren', x: Math.round(f.x), y: Math.round(f.y), vx: Math.round(f.vx), vy: Math.round(f.vy) });
      else this.coop.event({ t: 'rocket', x: Math.round(f.x), y: Math.round(f.y), a: +f.a.toFixed(3) });
      return;
    }
    this.projectiles.push(f.type === 'grenade' ? new Grenade(f.x, f.y, f.vx, f.vy, by) : new Rocket(f.x, f.y, f.a, by));
  }

  // Полоса здоровья босса и предупреждение о его появлении
  _drawBossHud(ctx, scale) {
    const boss = this.enemies.find(e => e.isBoss && !e.dead);
    // полоса появляется, когда босс рядом или уже ранен
    if (boss && !boss._met && this.player) {
      const lit = this.level.getLitRooms(this.player).lit;
      const br = this.level.getRoomAt(boss.cx(), boss.cy());
      if ((br && lit.has(br)) || boss.hp < boss.maxHp || Utils.dist(boss.x, boss.y, this.player.x, this.player.y) < 320) boss._met = true;
    }
    if (boss && boss._met) {
      const bw = Math.min(420, this.W * 0.5), bh = 12;
      const x = this.W / 2 - bw / 2, y = this.H - 34 * scale;
      ctx.save();
      ctx.font = `bold ${14 * scale}px "Courier New", monospace`; ctx.textAlign = 'center';
      ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 10; ctx.fillStyle = '#ff4a4a';
      ctx.fillText(boss.bossName, this.W / 2, y - 8);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 3, y - 3, bw + 6, bh + 6);
      ctx.fillStyle = '#3a0a10'; ctx.fillRect(x, y, bw, bh);
      const k = Utils.clamp(boss.hp / boss.maxHp, 0, 1);
      const g = ctx.createLinearGradient(x, 0, x + bw, 0);
      g.addColorStop(0, '#ff2a2a'); g.addColorStop(1, '#ffb040');
      ctx.fillStyle = g; ctx.fillRect(x, y, bw * k, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, bw * k, 3);
      ctx.restore();
    }
    const bn = this.bossDirector && this.bossDirector.banner;
    if (bn) {
      const k = Math.min(1, (3.2 - bn.t) * 3, bn.t * 2);
      ctx.save();
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = 'rgba(40,0,6,0.7)'; ctx.fillRect(0, this.H * 0.32, this.W, this.H * 0.22);
      ctx.fillStyle = '#ff2a2a'; ctx.fillRect(0, this.H * 0.32, this.W, 3); ctx.fillRect(0, this.H * 0.54 - 3, this.W, 3);
      ctx.textAlign = 'center';
      ctx.font = `bold ${14 * scale}px "Courier New", monospace`; ctx.fillStyle = '#ffd319';
      ctx.fillText(Math.floor(performance.now() / 250) % 2 ? '!!! ВНИМАНИЕ !!!' : 'ПОЯВИЛСЯ БОСС', this.W / 2, this.H * 0.37);
      ctx.font = `bold ${Math.min(56, this.W * 0.08)}px "Courier New", monospace`;
      ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 24; ctx.fillStyle = '#ffffff';
      ctx.fillText(bn.name, this.W / 2 + (Math.random() - 0.5) * 4, this.H * 0.46);
      ctx.shadowBlur = 0;
      ctx.font = `${14 * scale}px "Courier New", monospace`; ctx.fillStyle = '#ff8080';
      ctx.fillText(bn.title, this.W / 2, this.H * 0.51);
      ctx.restore();
    }
  }

  // Название уровня при старте
  _drawLevelBanner(ctx, scale) {
    if (this.campaignIdx !== null && this.storyIdx === null && !this.coop && this.state === 'playing') {
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = `bold ${12 * scale}px "Courier New", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(`${this.campaignIdx + 1}. ${CAMPAIGN[this.campaignIdx].name}`, this.W / 2, 24 * scale);
      ctx.restore();
    }
    if (this._roomLabel && this.state === 'playing' && !this.levelBanner && !this.tutorial) {
      const r = this._roomLabel;
      ctx.save(); ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, r.t * 2, (2.2 - r.t) * 4);
      ctx.font = `bold ${14 * scale}px "Courier New", monospace`;
      ctx.shadowColor = '#05d9e8'; ctx.shadowBlur = 8; ctx.fillStyle = '#e8f8ff';
      const pb = this.mission && this.mission.panelBottom;
      ctx.fillText(r.text.toUpperCase(), this.W / 2, pb ? pb + 18 * scale : 44 * scale, this.W * 0.5);
      ctx.restore();
    }
    const b = this.levelBanner;
    if (!b || this.state !== 'playing') return;
    const k = Math.min(1, b.t * 1.5, (3 - b.t) * 3);
    ctx.save();
    ctx.globalAlpha = Math.max(0, k);
    ctx.fillStyle = 'rgba(4,2,10,0.6)'; ctx.fillRect(0, this.H * 0.38, this.W, this.H * 0.16);
    ctx.fillStyle = b.color; ctx.fillRect(0, this.H * 0.38, this.W * k, 2); ctx.fillRect(this.W * (1 - k), this.H * 0.54 - 2, this.W, 2);
    ctx.textAlign = 'center';
    ctx.font = `bold ${13 * scale}px "Courier New", monospace`; ctx.fillStyle = '#ffffff';
    ctx.fillText(b.sub, this.W / 2, this.H * 0.42);
    ctx.font = `bold ${Math.min(52, this.W * 0.07)}px "Courier New", monospace`;
    ctx.shadowColor = b.color; ctx.shadowBlur = 22; ctx.fillStyle = b.color;
    ctx.fillText(b.name, this.W / 2, this.H * 0.51);
    ctx.restore();
  }

  // Экран победы на уровне кампании
  _drawVictory(ctx) {
    const W = this.W, H = this.H, M = this.menu;
    const k = Utils.clamp(this.victoryT / 0.6, 0, 1);
    ctx.fillStyle = `rgba(4,2,10,${0.85 * k})`; ctx.fillRect(0, 0, W, H);
    if (k < 1) return;
    const story = this.storyIdx !== null;
    const ch = story ? STORY[this.storyIdx] : null;
    const L = story ? { name: ch.title, color: ch.color } : CAMPAIGN[this.campaignIdx];
    const last = story ? this.storyIdx >= STORY.length - 1 : this.campaignIdx >= CAMPAIGN.length - 1;
    const nextName = last ? '' : story ? STORY[this.storyIdx + 1].title : CAMPAIGN[this.campaignIdx + 1].name;
    M.glowText(ctx, last ? (story ? 'СЮЖЕТ ПРОЙДЕН!' : 'КАМПАНИЯ ПРОЙДЕНА!') : (story ? 'ГЛАВА ПРОЙДЕНА' : 'УРОВЕНЬ ПРОЙДЕН'), W / 2, H * 0.22, L.color, Math.min(46, W * 0.06), 'center', 22);
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.min(22, W * 0.035)}px "Courier New", monospace`; ctx.fillStyle = '#ffffff';
    ctx.fillText(L.name, W / 2, H * 0.3, W - 32);
    ctx.font = `bold ${Math.min(28, W * 0.045)}px "Courier New", monospace`; ctx.fillStyle = '#ffd319';
    ctx.fillText(`ОЧКИ: ${this.score}`, W / 2, H * 0.42);
    ctx.font = `${Math.min(16, W * 0.03)}px "Courier New", monospace`; ctx.fillStyle = '#9a94b8';
    ctx.fillText(`Убито врагов: ${this.kills} / ${this.totalEnemies}`, W / 2, H * 0.48);
    if (!last) {
      ctx.fillStyle = '#05d9e8';
      ctx.fillText(`Открыто: ${nextName}`, W / 2, H * 0.54, W - 32);
    }
    const bx = W / 2 - 150, by = H * 0.62;
    const btn = (y, text, c) => {
      ctx.fillStyle = c; ctx.fillRect(bx, y, 300, 46);
      ctx.fillStyle = '#05030a'; ctx.font = `bold ${Math.min(18, W * 0.03)}px "Courier New", monospace`;
      ctx.fillText(text, W / 2, y + 30);
    };
    btn(by, last ? 'В МЕНЮ (ENTER)' : (story ? 'СЛЕДУЮЩАЯ ГЛАВА (ENTER)' : `ДАЛЕЕ: ${nextName} (ENTER)`), L.color);
    if (!last) btn(by + 58, 'В МЕНЮ (ESC)', '#9a94b8');
  }

  // Итог корпоратива
  _drawTeamOver(ctx) {
    const W = this.W, H = this.H, M = this.menu;
    ctx.fillStyle = 'rgba(4,2,10,0.86)'; ctx.fillRect(0, 0, W, H);
    M.glowText(ctx, 'КОРПОРАТИВ ОКОНЧЕН', W / 2, H * 0.18, '#ff2a6d', Math.min(44, W * 0.06), 'center', 22);
    ctx.font = `bold ${Math.min(30, W * 0.045)}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd319';
    ctx.fillText(`ОБЩИЙ СЧЁТ: ${this.score}`, W / 2, H * 0.28);
    ctx.font = '14px "Courier New", monospace'; ctx.fillStyle = '#9a94b8';
    ctx.fillText(`Дошли до этажа ${this.coop.levelNo}`, W / 2, H * 0.33);
    const ps = this.coop.players.slice().sort((a, b) => a.slot - b.slot);
    const cw = Math.min(180, (W - 80) / 3), gap = 20;
    const x0 = W / 2 - (ps.length * cw + (ps.length - 1) * gap) / 2;
    ps.forEach((p, i) => {
      const x = x0 + i * (cw + gap), y = H * 0.38;
      M.panel(ctx, x, y, cw, cw * 1.15, SLOT_COLORS[p.slot % 3], 0.85);
      const img = this.images[p.char];
      const is = cw - 40;
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x + 20, y + 14, is, is);
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px "Courier New", monospace'; ctx.fillStyle = SLOT_COLORS[p.slot % 3];
      ctx.fillText(p.name, x + cw / 2, y + is + 36, cw - 12);
      ctx.font = '12px "Courier New", monospace'; ctx.fillStyle = '#fff';
      ctx.fillText(CHAR_NAMES[p.char] || '', x + cw / 2, y + is + 54);
    });
    ctx.textAlign = 'center';
    ctx.font = '14px "Courier New", monospace'; ctx.fillStyle = '#05d9e8';
    ctx.fillText(this.coop.isHost ? 'Результат команды записан в таблицу лидеров' : 'Хост записал результат команды в таблицу лидеров', W / 2, H - 60);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const n = this.coop.lobbyIn;
    if (this.coop.isHost) {
      const R = this._teamOverRects();
      this._pauseBtn(ctx, R.again, 'НАЧАТЬ ЗАНОВО', (this._toSel || 0) === 0, '#3dff8a');
      this._pauseBtn(ctx, R.lobby, `В ЛОББИ (${n})`, this._toSel === 1, '#05d9e8');
    } else ctx.fillText('Хост может начать заново или вернуть всех в лобби…', W / 2, H - 34);
  }

  _teamOverRects() {
    const W = this.W, H = this.H, bw = Math.min(200, W * 0.32), bh = 36, gap = 14;
    return { again: { x: W / 2 - bw - gap / 2, y: H - 58, w: bw, h: bh }, lobby: { x: W / 2 + gap / 2, y: H - 58, w: bw, h: bh } };
  }

  // ---------- тихая дорожка: зачистка уровня, паузы, справочник ----------
  _wantQuiet() {
    if (this.paused) return true;
    if (this.state === 'levelClear' || this.state === 'victory') return true;
    if (this.state === 'menu' && this.menu.showHelp) return true;
    if (this.state === 'kombat' && this.kombat.screen === 'battle' && this.kombat.paused) return true;
    return false;
  }

  _syncQuiet() {
    const want = this._wantQuiet();
    if (want === !!this._quiet) return;
    if (want) {
      this._quiet = { resume: AudioSys.lastTrack };
      AudioSys.playMusic(QUIET_TRACK);
    } else {
      const q = this._quiet;
      this._quiet = null;
      // возвращаем прежнюю музыку, если за это время никто не включил другую
      if (AudioSys.lastTrack === QUIET_TRACK && q.resume) AudioSys.playMusic(q.resume);
    }
  }

  // ---------- меню паузы (ESC) ----------
  // одиночная игра стоит; в корпоративе мир живёт дальше, просто открыто меню
  _escPressed() {
    if (!(Input.wasPressed('Escape') || Input.wasPressed('MobileEscape'))) return false;
    const now = performance.now();
    if (now - (this._escAt || 0) < 300) return false;     // кнопка паузы на телефоне держится несколько кадров
    this._escAt = now;
    return true;
  }

  _openPause() { this.paused = { sel: 0 }; }

  _pauseItems() {
    const list = [{ id: 'resume', text: 'ПРОДОЛЖИТЬ' }];
    if (!this.coop || this.coop.isHost) list.push({ id: 'restart', text: 'НАЧАТЬ ЗАНОВО' });
    list.push({ id: 'music', text: AudioSys.musicEnabled ? 'МУЗЫКА: ВКЛ' : 'МУЗЫКА: ВЫКЛ' });
    list.push({ id: 'menu', text: 'В ГЛАВНОЕ МЕНЮ' });
    return list;
  }

  _pauseRects() {
    const n = this._pauseItems().length, bw = Math.min(300, this.W * 0.6), bh = 40, gap = 12;
    const y0 = this.H / 2 - (n * bh + (n - 1) * gap) / 2 + 20;
    return Array.from({ length: n }, (_, i) => ({ x: this.W / 2 - bw / 2, y: y0 + i * (bh + gap), w: bw, h: bh }));
  }

  _updatePauseMenu() {
    const P = this.paused, items = this._pauseItems(), n = items.length;
    if (P.sel >= n) P.sel = n - 1;
    if (this._escPressed()) { this.paused = null; return; }
    if (Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW') || Input.wasPressed('MobileUp')) { P.sel = (P.sel + n - 1) % n; AudioSys.play('menu_move'); }
    if (Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS') || Input.wasPressed('MobileDown')) { P.sel = (P.sel + 1) % n; AudioSys.play('menu_move'); }
    const R = this._pauseRects(), mx = Input.mouse.x, my = Input.mouse.y;
    const hit = R.findIndex(r => mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h);
    if (hit >= 0 && (this._pmx || 0) !== mx + my) P.sel = hit;
    this._pmx = mx + my;
    let act = (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter')) ? P.sel : -1;
    if (Input.consumeClick()) act = hit;
    if (act < 0) return;
    const id = items[act].id;
    AudioSys.play('menu_select');
    if (id === 'resume') this.paused = null;
    else if (id === 'music') {
      const on = AudioSys.toggleMusic();
      if (on && AudioSys.lastTrack) { AudioSys.currentTrack = null; AudioSys.playMusic(AudioSys.lastTrack); }
      const mi = this.menu.items.findIndex(s => s.startsWith('МУЗЫКА'));
      if (mi >= 0) this.menu.items[mi] = on ? 'МУЗЫКА: ВКЛ' : 'МУЗЫКА: ВЫКЛ';
    } else if (id === 'restart') {
      this.paused = null;
      if (this.coop) { this.coopUI.restart(); return; }
      if (this.tutorial) { this._startTutorialNow(Math.max(0, TUTORIALS.indexOf(this.tutorial.def))); return; }
      this.startRun();
    } else if (id === 'menu') {
      this.paused = null;
      if (this.coop) this._exitAsk = { t: 0, sel: 1 };
      else this.toMenu();
    }
  }

  _pauseBtn(ctx, r, text, on, col) {
    ctx.fillStyle = on ? col : 'rgba(10,5,22,0.9)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    ctx.font = `bold ${Math.min(16, r.w / 10)}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = on ? '#05030a' : '#ffffff';
    ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  _drawPauseMenu(ctx) {
    const W = this.W, H = this.H, M = this.menu, items = this._pauseItems(), R = this._pauseRects();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.coop ? 'rgba(4,2,10,0.55)' : 'rgba(4,2,10,0.72)'; ctx.fillRect(0, 0, W, H);
    M.glowText(ctx, this.coop ? 'МЕНЮ' : 'ПАУЗА', W / 2, R[0].y - 44, '#ffd319', Math.min(40, W * 0.06), 'center', 16);
    ctx.font = '12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#c8c2e0';
    ctx.fillText(this.coop ? 'Игра не остановлена — напарники продолжают бой' : 'Игра остановлена', W / 2, R[0].y - 16);
    items.forEach((it, i) => this._pauseBtn(ctx, R[i], it.text, i === this.paused.sel, it.id === 'menu' ? '#ff2a6d' : it.id === 'restart' ? '#3dff8a' : '#05d9e8'));
    if (!Input.isMobile) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText('W/S — выбор   ENTER — выбрать   ESC — продолжить', W / 2, R[R.length - 1].y + 66); }
    ctx.restore();
  }

  // Вспышки выстрелов освещают всё вокруг
  _drawMuzzleLights(ctx, lit) {
    const shooters = [this.player, ...this.enemies];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of shooters) {
      if (!s || s.dead || !(s.flashTimer > 0) || !s.weapon || s.weapon.type !== 'ranged') continue;
      if (s !== this.player) {
        const er = this.level.getRoomAt(s.x + s.w / 2, s.y + s.h / 2);
        if (!er || !lit.has(er)) continue;
      }
      const mx = s.x + s.w / 2 + Math.cos(s.angle) * 22;
      const my = s.y + s.h / 2 + Math.sin(s.angle) * 22;
      const r = 70;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, r);
      g.addColorStop(0, 'rgba(255,220,140,0.45)');
      g.addColorStop(0.4, 'rgba(255,160,60,0.15)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(mx - r, my - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  _renderCharSelect(ctx) {
    const M = this.menu;
    const t = performance.now() / 1000;
    M.drawBackground(ctx, this.W, this.H, t, 0.45);

    const chars = [
      { id: 'dani', name: 'ДАНИ', perk: 'Теневой', desc: 'Каб. 316. M4 с глушителем. КЛОНЫ [F] и идеальный клон за 10 убийств', hp: 6, speed: 1, weapon: 'm4s' },
      { id: 'gal', name: 'ГАЛА', perk: 'Поджигатель', desc: 'Каб. 321. Огнемёт, огненный РЫВОК [F] и БАБАХ [E] за 10 убийств', hp: 6, speed: 1, weapon: 'flamer' },
      { id: 'daur', name: 'ДАУР', perk: 'Стрелок', desc: 'Каб. 319. Два Uzi, АРСЕНАЛ [F] и ЯРОСТЬ с аурой смерти за 10 убийств', hp: 6, speed: 1, weapon: 'uzi' },
    ];

    const isMobile = this.W < 800;
    const spacing = isMobile ? 200 : 280;
    const startX = this.W / 2 - spacing;
    const cardW = isMobile ? 170 : 220;
    const cardH = isMobile ? 260 : 330;
    const imgSize = isMobile ? 110 : 150;
    const baseY = isMobile ? 150 : 200;

    const descH = isMobile ? 0 : 92;
    // на невысоком экране сжимаем всю сцену, чтобы карточки и подсказка помещались
    const fitK = Math.min(1, (this.H - 44) / (baseY - 80 + cardH + descH + 14));
    ctx.save();
    ctx.translate(this.W / 2, 0); ctx.scale(fitK, fitK); ctx.translate(-this.W / 2, 0);
    M.glowText(ctx, 'ВЫБОР ПЕРСОНАЖА', this.W / 2, isMobile ? 46 : 70, '#05d9e8', isMobile ? 26 : 38);

    for (let i = 0; i < 3; i++) {
      const c = chars[i];
      const x = startX + i * spacing;
      const isSel = i === this.selectedChar;
      const bob = isSel ? Math.sin(this.charSelectAnim) * 6 : 0;
      const top = baseY - 80 + bob;
      this._charRects = this._charRects || [];
      this._charRects[i] = { x: this.W / 2 + (x - cardW / 2 - this.W / 2) * fitK, y: (baseY - 80) * fitK, w: cardW * fitK, h: (cardH + descH) * fitK };

      ctx.save();
      if (isSel) {
        ctx.translate(x, top + cardH / 2); ctx.scale(1.04, 1.04); ctx.translate(-x, -(top + cardH / 2));
      } else ctx.globalAlpha = 0.72;
      M.panel(ctx, x - cardW / 2, top, cardW, cardH + descH, isSel ? '#ffd319' : 'rgba(5,217,232,0.5)', 0.82);

      const img = this.images[c.id];
      const ix = x - imgSize / 2, iy = top + 14;
      ctx.fillStyle = '#05030a'; ctx.fillRect(ix - 3, iy - 3, imgSize + 6, imgSize + 6);
      if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, ix, iy, imgSize, imgSize);
      ctx.strokeStyle = isSel ? '#ffd319' : '#3a2a5a'; ctx.lineWidth = 2; ctx.strokeRect(ix - 2, iy - 2, imgSize + 4, imgSize + 4);

      // живой спрайт героя под портретом
      ctx.save();
      ctx.translate(x + imgSize / 2 - 16, iy + imgSize - 16);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 4, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(-Math.PI / 2 + (isSel ? Math.sin(t * 2) * 0.4 : 0));
      ctx.scale(1.6, 1.6);
      Sprites.drawHuman(ctx, Sprites.HEROES[c.id], { t, walk: t * 10, move: isSel ? 0.9 : 0, weaponId: c.weapon });
      ctx.restore();

      let ty = iy + imgSize + (isMobile ? 26 : 34);
      ctx.textAlign = 'center';
      if (isSel) M.glowText(ctx, c.name, x, ty, '#ffd319', isMobile ? 20 : 26, 'center', 12);
      else { ctx.font = `bold ${isMobile ? 20 : 26}px "Courier New", monospace`; ctx.fillStyle = '#b8b0d0'; ctx.fillText(c.name, x, ty); }
      ty += isMobile ? 18 : 22;
      ctx.font = `bold ${isMobile ? 11 : 13}px "Courier New", monospace`; ctx.fillStyle = '#ff2a6d';
      ctx.fillText(c.perk.toUpperCase(), x, ty);
      ty += isMobile ? 14 : 18;

      // сердца и скорость
      for (let k = 0; k < c.hp; k++) {
        const hx = x - (c.hp - 1) * 9 + k * 18, hy = ty;
        ctx.fillStyle = '#ff2a6d';
        ctx.beginPath(); ctx.moveTo(hx, hy + 2); ctx.bezierCurveTo(hx - 6, hy - 4, hx - 10, hy + 3, hx, hy + 9); ctx.bezierCurveTo(hx + 10, hy + 3, hx + 6, hy - 4, hx, hy + 2); ctx.fill();
      }
      ty += isMobile ? 18 : 22;
      const bw = cardW - 50;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x - bw / 2, ty, bw, 5);
      ctx.fillStyle = '#05d9e8'; ctx.fillRect(x - bw / 2, ty, bw * (c.speed / 1.2), 5);
      ctx.font = `10px "Courier New", monospace`; ctx.fillStyle = '#9a94b8';
      ctx.fillText('СКОРОСТЬ', x, ty + 16);
      if (!isMobile) {
        // описание подбираем по размеру, чтобы не вылезало за карточку
        const avail = top + cardH + descH - 14 - (ty + 34);
        let fs = 12;
        for (; fs > 9; fs--) {
          ctx.font = `${fs}px "Courier New", monospace`;
          if ((this._countLines(ctx, c.desc, cardW - 28) - 1) * (fs + 3) <= avail) break;
        }
        ctx.fillStyle = isSel ? '#e8e4f8' : '#8a84a0';
        this._wrapText(ctx, c.desc, x, ty + 34, cardW - 28, fs + 3);
      }
      ctx.restore();
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.font = `14px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('A/D — выбор    ENTER / тап по карточке — старт    ESC — назад', this.W / 2, this.H - 24);
  }

  _countLines(ctx, text, maxWidth) {
    let n = 1, line = '';
    for (const word of text.split(' ')) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line) { n++; line = word + ' '; } else line = test;
    }
    return n;
  }

  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let offsetY = 0;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y + offsetY);
        line = words[n] + ' ';
        offsetY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y + offsetY);
  }
}

const MODE_KILLS = 10;   // убийств до ярости Даура / лотереи Дани (заряд копится между уровнями)
const MODE_OF = { daur: 'rage', dani: 'clone', gal: 'babah' };   // что даёт заряд каждому герою
const COMBO_CAP = 10;     // множитель очков за комбо не больше x10

// Надпись и эффекты при включении режима
function announceMode(pl, m) {
  const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
  const T = { rage: ['ЯРОСТЬ!', '#ff2a40', '255,30,40'], clone: ['ИДЕАЛЬНЫЙ КЛОН!', '#ffd319', '255,215,80'], babah: ['БАБАХ ЗАРЯЖЕН!', '#ff8a30', '255,120,30'] }[m];
  if (!T) return;
  Effects.popup(cx, cy - 30, T[0], T[1], 16);
  Effects.ring(cx, cy, T[2], 60);
  Effects.screenFlash(0.3, T[2]);
  AudioSys.play(m === 'rage' ? 'sniper_charge' : 'pickup_weapon');
}
