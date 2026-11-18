class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
    this.state = 'loading';
    this.menu = new Menu(this);
    this.zoom = 1.45;

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

  startRun() {
    this.score = 0;
    this.kills = 0;
    this.playerName = "";
    this.nameSubmitted = false;

    AudioSys.stopMusic();
    AudioSys.playMusic('/static/audio/game_music.mp3');
    AudioSys.play('game_start');

    this.startLevel();
  }

  startLevel() {
    AudioSys.init();
    const worldW = TILE * 60;
    const worldH = TILE * 45;
    try { this.level = new Level(worldW, worldH); }
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

    let sp = this.level.spawnPoint();
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

    this.player = new Player(sp.x, sp.y, charId);
    if (charId === 'daur') this.player.weapon = makeWeapon('shotgun');

    this.cam = new Camera(this.W, this.H, this.zoom);
    const viewW = this.W / this.zoom;
    const viewH = this.H / this.zoom;
    const maxX = Math.max(0, worldW - viewW);
    const maxY = Math.max(0, worldH - viewH);
    this.cam.x = Utils.clamp(this.player.x - viewW / 2, 0, maxX);
    this.cam.y = Utils.clamp(this.player.y - viewH / 2, 0, maxY);

    this.enemies = this.level.spawnPoints.map(p => new Enemy(p.x, p.y, p.behavior, p.waypoints, p.type));
    this.totalEnemies = this.enemies.length;
    this.bullets = [];
    this.pickups = [];

    this.kills = 0;

    const weaponPool = ['m4', 'ak47', 'uzi', 'bat', 'pipe', 'knife', 'sword'];
    for (let i = 0; i < 5; i++) {
      const r = Utils.choice(this.level.rooms);
      if (r === this.level.playerRoom) continue;
      const p = this.level.randomFreePoint(r);
      if (p) this.pickups.push(new Pickup(p.x, p.y, makeWeapon(Utils.choice(weaponPool))));
    }
    for (let i = 0; i < 2; i++) {
      const r = Utils.choice(this.level.rooms);
      const p = this.level.randomFreePoint(r);
      if (p) this.pickups.push(new Pickup(p.x, p.y, null, true));
    }

    Effects.reset();
    this.combo = 0;
    this.comboTimer = 0;
    this.state = 'playing';
    this.restartTimer = 0;
    this.shake = 0;
    this.levelClearTimer = 0;
  }

  toMenu() {
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

    if (this.state === 'charSelect') {
      this.charSelectAnim += dt * 10;

      const oldChar = this.selectedChar;
      if (Input.wasPressed('MobileUp') || Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA')) this.selectedChar = (this.selectedChar + 2) % 3;
      if (Input.wasPressed('MobileDown') || Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) this.selectedChar = (this.selectedChar + 1) % 3;

      if (this.selectedChar !== oldChar) {
        AudioSys.play('char_select');
      }

      if (Input.wasPressed('MobileEnter') || Input.wasPressed('Enter') || Input.wasPressed('Space')) this.startRun();
      if (Input.wasPressed('Escape')) this.toMenu();

      if (Input.consumeClick()) {
        const mx = Input.mouse.x;
        const my = Input.mouse.y;
        const spacing = 280;
        const startX = this.W / 2 - spacing;
        for (let i = 0; i < 3; i++) {
          const x = startX + i * spacing;
          const y = 200;
          if (mx > x - 100 && mx < x + 100 && my > y - 80 && my < y + 220) {
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
      if (Input.wasPressed('Escape') && this.state !== 'levelClear' && !(this.state === 'dead' && !this.nameSubmitted)) { this.toMenu(); return; }
    }

    if (this.state === 'menu') { this.menu.update(dt); return; }
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    if (!this.player || !this.level || !this.cam) return;

    if (this.state === 'levelClear') {
      this.levelClearTimer -= dt;
      if (this.levelClearTimer <= 0 || Input.wasPressed('MobileEnter') || Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.consumeClick()) {
        this.startLevel();
      }
      return;
    }

    if (this.state === 'dead') {
      // Кровь/частицы и тряска продолжают затухать после смерти
      this.player.updateParticles(dt);
      Effects.update(dt, this.level);
      this.shake = Math.max(0, this.shake - dt * 2);

      if (!this.nameSubmitted) {
        if (!Input.touch.moveActive) {
          if (Input.wasPressed('Enter')) {
            if (this.playerName.length > 0) {
              this.submitScore(this.playerName);
              this.nameSubmitted = true;
            }
          } else {
            for (let key in Input._pressedThisFrame) {
              if (!Input._pressedThisFrame[key]) continue;
              if (key.startsWith('Key') && key.length === 4) {
                this.playerName += key[3];
                if (this.playerName.length > 12) this.playerName = this.playerName.slice(0, 12);
              } else if (key === 'Backspace') {
                this.playerName = this.playerName.slice(0, -1);
              }
            }
          }
        } else {
          if (Input.consumeClick()) {
            const name = prompt("Введите ваше имя:", "PLAYER");
            if (name) {
              this.playerName = name.substring(0, 12).toUpperCase();
              this.submitScore(this.playerName);
              this.nameSubmitted = true;
            }
          }
        }
      } else {
        if (Input.wasPressed('KeyR') || Input.wasPressed('Enter') || Input.wasPressed('Space')) this.startRun();
        if (Input.wasPressed('Escape')) this.toMenu();

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
      if (!this.player.dead) {
        try {
          this.player.update(dt, this.level, this.cam, this.bullets, this.enemies, this.pickups);
        } catch (e) { console.error('PLAYER UPDATE ERROR:', e); }
        if (this.player._thrownPickup) { this.pickups.push(this.player._thrownPickup); this.player._thrownPickup = null; }
      }
      this.player.updateParticles(dt);

      try { this.level.update(dt, this.enemies, this.player); } catch (e) { console.error('LEVEL UPDATE ERROR:', e); }

      for (const e of this.enemies) {
        try { e.update(dt, this.level, this.player, this.bullets, this.enemies, this.pickups); }
        catch (err) { console.error('ENEMY UPDATE ERROR:', err); }
      }

      const pcx = this.player.x + this.player.w / 2;
      const pcy = this.player.y + this.player.h / 2;
      for (const b of this.bullets) {
        try { b.update(dt, this.level); } catch (err) { console.error('BULLET UPDATE ERROR:', err); }
        if (!b.dead && !b.isPlayer && !this.player.dead) {
          // Проверка по отрезку, чтобы быстрые пули не пролетали сквозь игрока
          if (Utils.segDist(b.px, b.py, b.x, b.y, pcx, pcy) < 12) {
            this.player.takeDamage(1); b.dead = true; this.shake = Math.max(this.shake, 0.6);
            this.chromaticOffset = 10;
          }
        }
      }

      // pickups может пополняться во время обхода (дроп из убитых врагов) — идём по индексу
      for (let i = 0; i < this.pickups.length; i++) {
        const p = this.pickups[i];
        try { p.update(dt, this.level, this.enemies, this.pickups); } catch (err) { console.error('PICKUP UPDATE ERROR:', err); }
        if (p.pickedUp || p.thrown || p.groundTimer > 0) continue;
        const dist = Utils.dist(p.x, p.y, this.player.x + this.player.w/2, this.player.y + this.player.h/2);
        if (dist < 24 && !this.player.dead) {
          if (p.isHealth) {
            if (this.player.hp < this.player.maxHp) {
              this.player.hp++;
              p.pickedUp = true;
              AudioSys.play('pickup_health');
            }
          } else if (!this.player.weapon && p.weapon) {
            this.player.weapon = p.weapon;
            p.pickedUp = true;
            AudioSys.play('pickup_weapon');
          }
        }
      }

      // Очки с комбо: убийства подряд (до 3 сек между ними) умножают награду
      for (const e of this.enemies) {
        if (!e.dead || e._scored) continue;
        e._scored = true;
        this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
        this.comboTimer = 3;
        const pts = 100 * this.combo;
        this.score += pts;
        this.kills++;
        Effects.popup(e.cx(), e.cy() - 14, `+${pts}`, this.combo > 1 ? '#ff2a6d' : '#ffd319', 13 + Math.min(this.combo, 5) * 2);
        if (this.combo > 1) Effects.popup(e.cx(), e.cy() - 30, `x${this.combo} КОМБО`, '#05d9e8', 11);
        Effects.screenFlash(0.08, '255,255,255');
        this.shake = Math.max(this.shake, 0.35);
      }

      this.pickups = this.pickups.filter(p => !p.pickedUp);
      this.bullets = this.bullets.filter(b => !b.dead);
      if (this.bullets.length > 300) this.bullets = this.bullets.slice(-300);

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

      if (this.player.dead) { this.state = 'dead'; this.shake = 1.0; this.nameSubmitted = false; this.playerName = ""; }
      if (this.enemies.every(e => e.dead) && this.state === 'playing') { this.state = 'levelClear'; this.levelClearTimer = 1.0; }
    }

    this.shake = Math.max(0, this.shake - dt * 2);
  }

  submitScore(name) {
    try {
      fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || 'ANON', score: Math.floor(this.score) }),
      }).catch(() => {});
    } catch (e) {}
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

  render() {
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

    for (const e of this.enemies) {
      const er = this.level.getRoomAt(e.cx(), e.cy());
      if (e.dead || e.stunned || (er && lit.has(er)) || Utils.dist(pcx, pcy, e.cx(), e.cy()) < 200) {
        e.draw(b);
      }
    }

    Effects.drawFloor(b);
    for (const p of this.pickups) p.draw(b);
    this.player.draw(b);
    for (const bullet of this.bullets) bullet.draw(b);
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

    const scale = Math.min(1, this.W / 960);
    const wname = this.player.weapon ? this.player.weapon.name : '— КУЛАКИ —';
    const ammoText = this.player.weapon && this.player.weapon.type === 'ranged' ? `   ${this.player.weapon.ammo} / ${this.player.weapon.maxAmmo}` : '';

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10 * scale, 10 * scale, 380 * scale, 30 * scale);
    ctx.fillStyle = P.accent;
    ctx.font = `bold ${15 * scale}px "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`WEAPON: ${wname}${ammoText}`, 20 * scale, 31 * scale);

    this._drawHearts(ctx);

    ctx.fillStyle = P.yellow;
    ctx.font = `bold ${18 * scale}px "Courier New", monospace`;
    ctx.textAlign = 'right';
    const rightMargin = (window.innerWidth < 800 ? 100 : 20) * scale;
    ctx.fillText(`УБИТО: ${this.kills} / ${this.totalEnemies}`, this.W - rightMargin, 30 * scale);

    ctx.fillStyle = P.white;
    ctx.fillText(`ОЧКИ: ${this.score}`, this.W - rightMargin, 55 * scale);

    // индикатор комбо
    if (this.combo > 1 && this.comboTimer > 0) {
      const k = this.comboTimer / 3;
      const cs = (22 + Math.min(this.combo, 6) * 2) * scale;
      ctx.save();
      ctx.font = `bold ${cs}px "Courier New", monospace`;
      ctx.textAlign = 'right';
      ctx.shadowColor = '#ff2a6d'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff2a6d';
      ctx.fillText(`x${this.combo} КОМБО`, this.W - rightMargin, 88 * scale);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(this.W - rightMargin - 120 * scale, 96 * scale, 120 * scale, 4 * scale);
      ctx.fillStyle = '#05d9e8';
      ctx.fillRect(this.W - rightMargin - 120 * scale, 96 * scale, 120 * scale * k, 4 * scale);
    }

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

    if (this.state === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = P.player;
      ctx.font = `bold ${Math.min(48, this.W * 0.08)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('ВЫ ПОГИБЛИ', this.W / 2, this.H / 2 - 100);

      ctx.fillStyle = P.yellow;
      ctx.font = `${Math.min(28, this.W * 0.05)}px "Courier New", monospace`;
      ctx.fillText(`ОЧКИ: ${this.score}`, this.W / 2, this.H / 2 - 50);

      if (!this.nameSubmitted) {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(20, this.W * 0.035)}px "Courier New", monospace`;
        ctx.fillText('Введите имя и нажмите ENTER:', this.W / 2, this.H / 2 + 20);

        ctx.font = `bold ${Math.min(32, this.W * 0.06)}px "Courier New", monospace`;
        ctx.fillStyle = P.accent;
        const nameStr = this.playerName + (Math.floor(performance.now() / 500) % 2 === 0 ? '_' : '');
        ctx.fillText(nameStr, this.W / 2, this.H / 2 + 70);
      } else {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(24, this.W * 0.04)}px "Courier New", monospace`;
        ctx.fillText('Очки сохранены!', this.W / 2, this.H / 2 + 20);

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
      { id: 'dani', name: 'ДАНИ', perk: 'Хладнокровие', desc: '+15% скорость, враги замечают позже', hp: 3, speed: 1.15, weapon: 'glock' },
      { id: 'gal', name: 'ГАЛ', perk: 'Танк', desc: '+1 HP, мощный ближний бой', hp: 4, speed: 1, weapon: null },
      { id: 'daur', name: 'ДАУР', perk: 'Оружейник', desc: 'Дробовик со старта, но только 2 HP', hp: 2, speed: 1, weapon: 'shotgun' },
    ];

    const isMobile = this.W < 800;
    const spacing = isMobile ? 200 : 280;
    const startX = this.W / 2 - spacing;
    const cardW = isMobile ? 170 : 220;
    const cardH = isMobile ? 260 : 330;
    const imgSize = isMobile ? 110 : 150;
    const baseY = isMobile ? 150 : 200;

    M.glowText(ctx, 'ВЫБОР ПЕРСОНАЖА', this.W / 2, isMobile ? 46 : 70, '#05d9e8', isMobile ? 26 : 38);

    for (let i = 0; i < 3; i++) {
      const c = chars[i];
      const x = startX + i * spacing;
      const isSel = i === this.selectedChar;
      const bob = isSel ? Math.sin(this.charSelectAnim) * 6 : 0;
      const top = baseY - 80 + bob;

      ctx.save();
      if (isSel) {
        ctx.translate(x, top + cardH / 2); ctx.scale(1.04, 1.04); ctx.translate(-x, -(top + cardH / 2));
      } else ctx.globalAlpha = 0.72;
      M.panel(ctx, x - cardW / 2, top, cardW, cardH, isSel ? '#ffd319' : 'rgba(5,217,232,0.5)', 0.82);

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
      ctx.fillStyle = '#05d9e8'; ctx.fillRect(x - bw / 2, ty, bw * (c.speed / 1.15), 5);
      ctx.font = `10px "Courier New", monospace`; ctx.fillStyle = '#9a94b8';
      ctx.fillText('СКОРОСТЬ', x, ty + 16);
      if (!isMobile) {
        ctx.font = `12px "Courier New", monospace`; ctx.fillStyle = isSel ? '#e8e4f8' : '#777';
        this._wrapText(ctx, c.desc, x, ty + 34, cardW - 30, 15);
      }
      ctx.restore();
    }

    ctx.textAlign = 'center';
    ctx.font = `14px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('A/D — выбор    ENTER / тап по карточке — старт    ESC — назад', this.W / 2, this.H - 24);
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
