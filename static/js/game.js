class Game {
  constructor(canvas) {
    // ... (конструктор без изменений) ...
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
    this.state = 'menu'; // menu, charSelect, playing, dead, levelClear
    this.menu = new Menu(this);
    this.zoom = 1.15;

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
    this.images.dani.src = '/static/img/dani.png';
    this.images.gal.src = '/static/img/gal.png';
    this.images.daur.src = '/static/img/daur.png';
  }

  // ... (startRun, startLevel, toMenu, submitScore, _drawHearts без изменений) ...

  update(dt) {
    // Переключение UI для мобилок
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

    // ... дальше твой код update ...
// ... дальше идет остальная логика update (charSelect, playing и т.д.)

    if (this.state === 'charSelect') {
      this.charSelectAnim += dt * 10;
      if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA')) this.selectedChar = (this.selectedChar + 2) % 3;
      if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) this.selectedChar = (this.selectedChar + 1) % 3;
      if (Input.wasPressed('Enter') || Input.wasPressed('Space')) this.startRun();
      if (Input.wasPressed('Escape')) this.toMenu();
      return;
    }

    if (this.state === 'playing' || this.state === 'dead' || this.state === 'levelClear') {
      if (Input.wasPressed('Escape') && this.state !== 'levelClear') { this.toMenu(); return; }
    }

    if (this.state === 'menu') { this.menu.update(dt); return; }
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    if (!this.player || !this.level || !this.cam) return;

    if (this.state === 'levelClear') {
      this.levelClearTimer -= dt;
      if (this.levelClearTimer <= 0 || Input.wasPressed('Enter') || Input.wasPressed('Space')) {
        this.startLevel();
      }
      return;
    }

    if (this.state === 'dead') {
      if (!this.nameSubmitted && !Input.touch.moveActive) {
        if (Input.wasPressed('Enter')) { this.submitScore(this.playerName || 'PLAYER'); this.nameSubmitted = true; }
        else {
          for (let key in Input._pressedThisFrame) {
            if (key.startsWith('Key') && key.length === 4) {
              this.playerName += key[3];
              if (this.playerName.length > 12) this.playerName = this.playerName.slice(0, 12);
            } else if (key === 'Backspace') {
              this.playerName = this.playerName.slice(0, -1);
            }
          }
        }
      }
      if (this.nameSubmitted) {
        if (Input.wasPressed('Enter') || Input.wasPressed('Space')) this.toMenu();
        if (Input.wasPressed('KeyR')) this.startRun();
      }
      return;
    }

    // ... (логика playing без изменений) ...
    if (!this.player.dead) {
      try { this.player.update(dt, this.level, this.cam, this.bullets, this.enemies); } catch (e) {}
      if (this.player._thrownPickup) { this.pickups.push(this.player._thrownPickup); this.player._thrownPickup = null; }
    }

    try { this.level.update(dt, this.enemies); } catch (e) {}

    for (const e of this.enemies) { try { e.update(dt, this.level, this.player, this.bullets, this.enemies, this.pickups); } catch (err) {} }

    for (const b of this.bullets) {
      try { b.update(dt, this.level); } catch (err) {}
      if (!b.dead && !b.isPlayer && !this.player.dead) {
        if (Utils.dist(b.x, b.y, this.player.x + this.player.w/2, this.player.y + this.player.h/2) < 12) {
          this.player.takeDamage(1); b.dead = true; this.shake = Math.max(this.shake, 0.6);
        }
      }
    }

    for (const p of this.pickups) {
      try { p.update(dt, this.level, this.enemies); } catch (err) {}
      if (p.pickedUp || p.thrown || p.groundTimer > 0) continue;
      const dist = Utils.dist(p.x, p.y, this.player.x + this.player.w/2, this.player.y + this.player.h/2);
      if (dist < 24 && !this.player.dead) {
        if (p.isHealth) { if (this.player.hp < this.player.maxHp) { this.player.hp++; p.pickedUp = true; AudioSys.play('pickup'); } }
        else if (!this.player.weapon) { this.player.weapon = p.weapon; p.pickedUp = true; AudioSys.play('pickup'); }
      }
    }

    const alive = this.enemies.filter(e => !e.dead).length;
    const newKills = this.totalEnemies - alive;
    if (newKills > this.kills) { this.score += (newKills - this.kills) * 100; this.kills = newKills; }

    this.pickups = this.pickups.filter(p => !p.pickedUp);
    this.bullets = this.bullets.filter(b => !b.dead);
    if (this.bullets.length > 300) this.bullets = this.bullets.slice(-300);

    if (!this.player.dead) this.cam.follow(this.player, this.level, dt);
    if (this.player.dead) { this.state = 'dead'; this.shake = 1.0; }
    if (alive === 0 && this.state === 'playing') { this.state = 'levelClear'; this.levelClearTimer = 1.0; }

    this.shake = Math.max(0, this.shake - dt * 2);
  }

  // ... (render без изменений) ...
}