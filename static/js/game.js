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
    this.soloMode = 0;          // номер уровня кампании или 'endless'
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

  async _loadAssets() {
    const imagePromises = [
      new Promise(res => { this.images.dani.onload = res; this.images.dani.onerror = res; }),
      new Promise(res => { this.images.gal.onload = res; this.images.gal.onerror = res; }),
      new Promise(res => { this.images.daur.onload = res; this.images.daur.onerror = res; })
    ];

    this.images.dani.src = '/static/img/dani.png';
    this.images.gal.src = '/static/img/gal.png';
    this.images.daur.src = '/static/img/daur.png';

    this.assetsToLoad = imagePromises.length + 1;

    for (let p of imagePromises) {
      await p;
      this.assetsLoaded++;
    }

    if (typeof AudioSys !== 'undefined') {
      AudioSys.init();
      await AudioSys.preload();
      this.assetsLoaded++;
    }

    this.isReady = true;
  }

  // Все живые/раненые игроки: свой герой + напарники
  allPlayers() {
    const list = this.player ? [this.player] : [];
    if (this.coop) for (const r of this.coop.remotes.values()) if (r.hasState) list.push(r);
    return list;
  }

  startRun() {
    this.coop = null;
    this.campaignIdx = typeof this.soloMode === 'number' ? this.soloMode : null;
    // боссы по очкам — в бесконечном режиме; в кампании у каждого уровня свой босс
    this.bossDirector = this.campaignIdx === null ? new BossDirector() : null;
    this.score = 0;
    this.kills = 0;
    this.playerName = "";
    this.nameSubmitted = true;
    this.runSubmitted = false;

    AudioSys.stopMusic();
    AudioSys.playMusic('/static/audio/game_music.mp3');
    AudioSys.play('game_start');

    this.player = null;   // новый забег — заряд способностей и счёт убийств с нуля
    this.startLevel();
  }

  startLevel() {
    AudioSys.init();
    const L = this.campaignIdx !== null ? CAMPAIGN[this.campaignIdx] : null;
    if (L) Utils.withSeed(L.seed, () => this._buildLevel(L));
    else this._buildLevel();
    this._spawnPlayer(0);
    this._afterLevelStart();
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
    this.state = 'coopIntro';
    this.introT = 0;
    this.startCoopLevel(info.seed);
  }

  // Уровень корпоратива строится из общего seed — у всех одинаковый
  startCoopLevel(seed) {
    const intro = this.state === 'coopIntro';
    Utils.withSeed(seed, () => this._buildLevel());
    this._spawnPlayer(this.coop.me.slot || 0);
    this.coop.prepareLevel();
    this._afterLevelStart();
    if (intro) this.state = 'coopIntro';
  }

  _afterLevelStart() {
    this._waves = 0; this._waveT = undefined; this._huntT = 0;
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
  _buildLevel(layout) {
    // уровни крупнее: случайные — больше площадь, статичные — растянутая планировка
    const k = layout ? CAMPAIGN_SCALE : RANDOM_SCALE;
    const worldW = TILE * Math.ceil(60 * k + (k > 1 ? 2 : 0));
    const worldH = TILE * Math.ceil(45 * k + (k > 1 ? 2 : 0));
    const L = layout ? scaledLayout(layout, CAMPAIGN_SCALE) : null;
    // в корпоративе врагов больше: +30% за каждого напарника
    const enemyMul = this.coop ? 1 + 0.3 * (this.coop.players.length - 1) : 1;
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
    if (prev) { this.player.charge = prev.charge || 0; this.player.kills = prev.kills || 0; }

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
      if (this.isReady) {
        this.state = 'menu';
        AudioSys.playMusic('/static/audio/menu_music.mp3');
      }
      return;
    }

    // Эффекты
    this.lightFlicker += dt * 15;
    this.chromaticOffset = Math.max(0, this.chromaticOffset - dt * 20);

    const gameUI = document.getElementById('mobile-game-controls');
    const menuUI = document.getElementById('mobile-menu-controls');
    if (gameUI && menuUI) {
      if (this.state === 'playing' || this.state === 'levelClear') {
        gameUI.classList.add('active');
        menuUI.classList.remove('active');
      } else {
        gameUI.classList.remove('active');
        menuUI.classList.add('active');
      }
    }

    if (this.state === 'coop') { this.coopUI.update(dt); return; }
    if (this.state === 'levelSelect') { this.campaignUI.update(dt); return; }

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

    if (this.coop && this._updateExitAsk(dt)) return;
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
      if (Input.wasPressed('Escape')) { this.campaignUI.open(); return; }

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
      if (!this.coop && Input.wasPressed('Escape') && this.state !== 'levelClear' && !(this.state === 'dead' && !this.nameSubmitted)) { this.toMenu(); return; }
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
      const last = this.campaignIdx >= CAMPAIGN.length - 1;
      const next = () => { this.campaignIdx++; this.soloMode = this.campaignIdx; this.startLevel(); };
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
        if (this.coop && this.coop.isHost && (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter') || Input.consumeClick())) {
          this.coopUI.backToLobby();
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
        const frozen = this._exitAsk ? [Input.keys, Input._pressedThisFrame, Input.mouse.down, Input.mouse.right] : null;
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
        this._updatePacing(dt);
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
      }
      if (coopClient) this.coop.clientBulletHits();
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
            if (slot === 'health') { pl.hp++; AudioSys.play('pickup_health'); }
            else if (slot === 'grenade') { pl.grenades++; AudioSys.play('pickup_weapon'); Effects.popup(pl.x + 9, pl.y - 8, '+ГРАНАТА', '#8aff8a', 11); }
            else if (slot === 'armor') { pl.armor = 2; AudioSys.play('pickup_weapon'); Effects.popup(pl.x + 9, pl.y - 8, '+БРОНЯ', '#5aa8ff', 12); Effects.ring(pl.x + 9, pl.y + 9, '90,170,255', 28); }
            else if (slot === 'w1') { pl.weapon = prepWeapon(pl.charId, p.weapon); AudioSys.play('pickup_weapon'); }
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
      if (!coopClient && this.state === 'playing' && this.enemies.every(e => e.dead)) {
        if (this.campaignIdx !== null && !this.coop) {
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

  // Личный счёт убийств героя: Гала лечится за каждого 5-го,
  // у Даура и Дани каждые 10 убийств (заряд) включают особый режим.
  _creditKill(e) {
    if (!e.killedBy) return;
    const pl = this.allPlayers().find(p => p && p.charId === e.killedBy);
    if (!pl) return;
    pl.kills = (pl.kills || 0) + 1;
    if (pl !== this.player && this.coop) this.coop.sendTo(pl.pid, { t: 'kc', n: pl.kills });
    if ((pl.charId === 'daur' || pl.charId === 'dani') && !pl.dead && !(pl.rageT > 0) && !(pl.lottoT > 0)) {
      pl.charge = (pl.charge || 0) + 1;
      if (pl !== this.player && this.coop) this.coop.sendTo(pl.pid, { t: 'chg', n: pl.charge });
      if (pl.charge >= MODE_KILLS) { pl.charge = 0; this._triggerMode(pl, pl.charId === 'daur' ? 'rage' : 'lotto'); }
    }
    if (pl.charId !== 'gal' || pl.kills % GAL_HEAL_EVERY !== 0 || pl.dead || pl.hp >= pl.maxHp) return;
    pl.hp++;
    Effects.popup(pl.x + 9, pl.y - 10, '+1 HP', '#3dff8a', 13);
    Effects.ring(pl.x + 9, pl.y + 9, '60,255,140', 26);
    if (pl === this.player) AudioSys.play('pickup_health');
    else if (this.coop) this.coop.sendTo(pl.pid, { t: 'heal' });
  }

  // Ярость Даура / лотерея Дани (на хосте — и для напарников)
  _triggerMode(pl, m) {
    if (m === 'rage') pl.rageT = MODE_TIME; else { pl.lottoT = MODE_TIME; pl._lottoId = Math.random(); }
    if (pl === this.player) announceMode(pl, m);
    else if (this.coop) this.coop.sendTo(pl.pid, { t: 'mode', m });
  }

  // Лотерея: враги вокруг Дани могут лопнуть, холодное оружие на полу — стать аптечкой
  _updateLottery(dt) {
    if (this.coop && !this.coop.isHost) return;
    for (const pl of this.allPlayers()) {
      if (!pl || pl.dead || !(pl.lottoT > 0)) continue;
      if (pl !== this.player) pl.lottoT = Math.max(0, pl.lottoT - dt);
      const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
      for (const e of this.enemies) {
        if (e.dead || e.isBoss || e._lotto === pl._lottoId) continue;
        if (Utils.dist(cx, cy, e.cx(), e.cy()) > LOTTO_RADIUS) continue;
        e._lotto = pl._lottoId;
        if (Math.random() < 0.25) { e._popAt = Utils.rand(0.1, 0.7); e._popBy = pl.charId; }
      }
      for (const p of this.pickups) {
        if (p._lotto === pl._lottoId || p.pickedUp || p.thrown || !p.weapon || p.weapon.type !== 'melee') continue;
        if (Utils.dist(cx, cy, p.x, p.y) > LOTTO_RADIUS) continue;
        p._lotto = pl._lottoId;
        if (Math.random() < 0.35) {
          p.weapon = null; p.isHealth = true;
          Effects.burst(p.x, p.y, '255,210,60', 16, 160);
          Effects.popup(p.x, p.y - 12, 'АПТЕЧКА!', '#ffd319', 11);
        }
      }
    }
    for (const e of this.enemies) {
      if (e._popAt === undefined || e.dead) continue;
      e._popAt -= dt;
      if (e._popAt > 0) continue;
      delete e._popAt;
      for (const c of ['255,210,60', '255,80,180', '80,220,255', '120,255,120']) Effects.burst(e.cx(), e.cy(), c, 8, 260);
      Effects.ring(e.cx(), e.cy(), '255,210,60', 34);
      Effects.popup(e.cx(), e.cy() - 26, 'ПОП!', '#ffd319', 14);
      AudioSys.playAt('punch', e.cx(), e.cy());
      e.die(this.pickups, { kind: 'explosion', angle: Math.random() * Math.PI * 2, by: e._popBy });
    }
  }

  // Темп: последние враги сами идут на игроков, в бесконечном режиме и корпоративе — волны подкрепления
  _updatePacing(dt) {
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
    if (pl.lottoT > 0) {
      const k = Math.min(1, pl.lottoT / 0.6);
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
    const INFO = { dani: ['ДАНИ', 'ТРОФЕЙЩИК'], gal: ['ГАЛА', 'ТАРАН'], daur: ['ДАУР', 'СТРЕЛОК'] };
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
    const ph = headH + ws.length * rowH + (pl.weapon2 ? 12 * s : 0) + 4 * s;
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
    // способность: пинок Галы / прогресс до режима Даура и Дани
    {
      const ay = y0 + 40 * s, ax = tx, aw = x0 + pw - 10 * s - ax;
      let label, frac, c2;
      if (pl.charId === 'gal') {
        const ready = pl.kickCd <= 0;
        label = ready ? 'ПИНОК [F] — ГОТОВ' : 'ПИНОК [F]'; frac = 1 - pl.kickCd / KICK_CD; c2 = ready ? '#3dff8a' : '#9a94b8';
      } else {
        const on = pl.charId === 'daur' ? pl.rageT : pl.lottoT;
        const name = pl.charId === 'daur' ? 'ЯРОСТЬ' : 'ЛОТЕРЕЯ';
        if (on > 0) { label = `${name}! ${on.toFixed(1)} С`; frac = on / MODE_TIME; c2 = pl.charId === 'daur' ? '#ff2a40' : '#ffd319'; }
        else { const n = Math.min(MODE_KILLS, pl.charge || 0); label = `${name} ${n}/${MODE_KILLS}`; frac = n / MODE_KILLS; c2 = n >= MODE_KILLS - 2 ? '#ffd319' : '#9a94b8'; }
      }
      ctx.font = font(8); ctx.textAlign = 'left'; ctx.fillStyle = c2;
      ctx.fillText(label, ax, ay - 1 * s);
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
        ctx.fillText(empty ? (blink ? 'ПУСТО·Q' : '') : `${w.ammo}/${w.maxAmmo}`, right, y + 10 * s);
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
        ctx.fillText(w ? 'ближний бой' : (pl.charId === 'gal' ? 'убивает с удара' : 'оглушает'), nx, y + 19 * s);
      }
      if (ws.length > 1) {
        ctx.font = font(7, false); ctx.fillStyle = '#6a6488'; ctx.textAlign = 'left';
        ctx.fillText(wi ? 'Л' : 'П', ix + 2 * s, y + 8 * s);
      }
      y += rowH;
    });
    if (pl.weapon2) {
      ctx.font = font(8); ctx.textAlign = 'left';
      ctx.fillStyle = pl.dualSpread ? '#ffd319' : '#6a6488';
      ctx.fillText(pl.dualSpread ? '◄ ► ВРАЗБРОС' : 'ПКМ/CTRL — вразброс', x0 + 10 * s, y + 7 * s);
    }
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
    if (!live) { this._exitAsk = null; return false; }
    if (!this._exitAsk) {
      if ((Input.wasPressed('Escape') || Input.wasPressed('MobileEscape')) && !TextField.active) {
        this._exitAsk = { t: 0, sel: 1 };
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
    if (Input.wasPressed('Escape') || Input.wasPressed('MobileEscape')) { this._exitAsk = null; return true; }
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
    if (this.coop && ['playing', 'levelClear', 'dead', 'coopIntro'].includes(this.state)) {
      const ctx = this.ctx;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const scale = Math.min(1, this.W / 960);
      const rightMargin = (window.innerWidth < 800 ? 100 : 20) * scale;
      drawPing(ctx, this.W - rightMargin - 2, 10 * scale + 8, this.coop.net ? this.coop.net.ping : null, this.coop.isHost);
      ctx.restore();
      if (this._exitAsk) this._drawExitAsk(ctx);
    }
  }

  _renderInner() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    if (this.state === 'loading') {
      ctx.fillStyle = P.bg;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = P.accent;
      ctx.font = 'bold 30px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ЗАГРУЗКА...', this.W / 2, this.H / 2 - 20);

      const barW = 300;
      const barH = 10;
      const progress = this.assetsToLoad > 0 ? this.assetsLoaded / this.assetsToLoad : 1;
      ctx.fillStyle = '#333';
      ctx.fillRect(this.W / 2 - barW / 2, this.H / 2 + 20, barW, barH);
      ctx.fillStyle = P.yellow;
      ctx.fillRect(this.W / 2 - barW / 2, this.H / 2 + 20, barW * progress, barH);
      return;
    }

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
    if (this.campaignIdx !== null && !this.coop && this.state === 'playing') {
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = `bold ${12 * scale}px "Courier New", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(`${this.campaignIdx + 1}. ${CAMPAIGN[this.campaignIdx].name}`, this.W / 2, 24 * scale);
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
    const L = CAMPAIGN[this.campaignIdx];
    const last = this.campaignIdx >= CAMPAIGN.length - 1;
    M.glowText(ctx, last ? 'КАМПАНИЯ ПРОЙДЕНА!' : 'УРОВЕНЬ ПРОЙДЕН', W / 2, H * 0.22, L.color, Math.min(46, W * 0.06), 'center', 22);
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.min(22, W * 0.035)}px "Courier New", monospace`; ctx.fillStyle = '#ffffff';
    ctx.fillText(L.name, W / 2, H * 0.3);
    ctx.font = `bold ${Math.min(28, W * 0.045)}px "Courier New", monospace`; ctx.fillStyle = '#ffd319';
    ctx.fillText(`ОЧКИ: ${this.score}`, W / 2, H * 0.42);
    ctx.font = `${Math.min(16, W * 0.03)}px "Courier New", monospace`; ctx.fillStyle = '#9a94b8';
    ctx.fillText(`Убито врагов: ${this.kills} / ${this.totalEnemies}`, W / 2, H * 0.48);
    if (!last) {
      ctx.fillStyle = '#05d9e8';
      ctx.fillText(`Открыт уровень: ${CAMPAIGN[this.campaignIdx + 1].name}`, W / 2, H * 0.54);
    }
    const bx = W / 2 - 150, by = H * 0.62;
    const btn = (y, text, c) => {
      ctx.fillStyle = c; ctx.fillRect(bx, y, 300, 46);
      ctx.fillStyle = '#05030a'; ctx.font = `bold ${Math.min(18, W * 0.03)}px "Courier New", monospace`;
      ctx.fillText(text, W / 2, y + 30);
    };
    btn(by, last ? 'В МЕНЮ (ENTER)' : `ДАЛЕЕ: ${CAMPAIGN[this.campaignIdx + 1].name} (ENTER)`, L.color);
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
    ctx.fillText(this.coop.isHost ? `ENTER / клик — в лобби сейчас (авто через ${n} с)` : 'Хост скоро вернёт всех в лобби…', W / 2, H - 34);
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
      { id: 'dani', name: 'ДАНИ', perk: 'Трофейщик', desc: 'Бесшумная M4, оружие боссов. Каждые 10 убийств — ЛОТЕРЕЯ: враги вокруг лопаются', hp: 6, speed: 1, weapon: 'm4s' },
      { id: 'gal', name: 'ГАЛА', perk: 'Таран', desc: 'Кулаки на 50% быстрее, пинок-вертушка [F]. +1 HP за каждого 5-го убитого', hp: 7, speed: 1.2, weapon: null },
      { id: 'daur', name: 'ДАУР', perk: 'Стрелок', desc: 'Два Uzi, +30% патронов. Каждые 10 убийств — ЯРОСТЬ: патроны бесконечны', hp: 6, speed: 1, weapon: 'uzi' },
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
const GAL_HEAL_EVERY = 5; // Гала лечится за каждого 5-го убитого (при 3 он был почти бессмертным)
const COMBO_CAP = 10;     // множитель очков за комбо не больше x10

// Надпись и эффекты при включении режима
function announceMode(pl, m) {
  const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
  if (m === 'rage') {
    Effects.popup(cx, cy - 30, 'ЯРОСТЬ!', '#ff2a40', 18);
    Effects.ring(cx, cy, '255,30,40', 60);
    Effects.screenFlash(0.35, '255,20,30');
    AudioSys.play('sniper_charge');
  } else {
    Effects.popup(cx, cy - 30, 'ЛОТЕРЕЯ!', '#ffd319', 18);
    Effects.ring(cx, cy, '255,210,60', LOTTO_RADIUS);
    Effects.screenFlash(0.3, '255,220,80');
    AudioSys.play('pickup_weapon');
  }
}
