// =====================================================================
// SAMSA KOMBAT — 2D-файтинг один на один.
//  • бой до двух побед в раундах, 60 секунд на раунд;
//  • рука / нога / блок / приём, серии ударов, апперкот и подсечка из приседа;
//  • после решающего раунда — «ДОБЕЙ ЕГО!»: одна кнопка запускает фаталити бойца;
//  • 1 игрок против компьютера или 2 игрока за одной клавиатурой.
// Мир: x — по горизонтали (единицы ≈ пиксели при высоте экрана 540), y — высота над полом.
// =====================================================================

const K_GRAV = 3400, K_JUMP = 1060, K_ROUND_TIME = 60, K_WINS = 2;

const K_KEYS = {
  p1: { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], punch: ['KeyJ'], kick: ['KeyK'], block: ['KeyL'], special: ['KeyI'], fatal: ['KeyF'] },
  p2: { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], punch: ['Numpad1', 'Comma'], kick: ['Numpad2', 'Period'], block: ['Numpad3', 'Slash'], special: ['Numpad4', 'Semicolon'], fatal: ['Numpad0', 'Quote'] },
};
// в одиночной игре первому игроку подходят и стрелки
K_KEYS.solo = { ...K_KEYS.p1, left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'] };

const KMOVES = {
  jab: { pose: 'jab', dur: 0.26, a0: 0.06, a1: 0.13, dmg: 5, reach: 74, zone: 'high', kb: 110, stun: 0.26, y: 150 },
  cross: { pose: 'cross', dur: 0.32, a0: 0.08, a1: 0.16, dmg: 6, reach: 80, zone: 'high', kb: 150, stun: 0.3, y: 145 },
  hook: { pose: 'hook', dur: 0.42, a0: 0.12, a1: 0.2, dmg: 9, reach: 70, zone: 'high', kb: 300, stun: 0.42, heavy: true, y: 150 },
  upper: { pose: 'upper', dur: 0.62, a0: 0.1, a1: 0.22, dmg: 11, reach: 64, zone: 'mid', launch: true, y: 150 },
  kick: { pose: 'kick', dur: 0.44, a0: 0.14, a1: 0.25, dmg: 8, reach: 108, zone: 'mid', kb: 230, stun: 0.36, kick: true, y: 120 },
  kick2: { pose: 'kick2', dur: 0.5, a0: 0.12, a1: 0.24, dmg: 9, reach: 104, zone: 'high', kb: 320, stun: 0.4, kick: true, heavy: true, y: 150 },
  sweep: { pose: 'sweep', dur: 0.55, a0: 0.14, a1: 0.26, dmg: 7, reach: 116, zone: 'low', knock: true, kick: true, y: 20 },
  jkick: { pose: 'jkick', air: true, dur: 0.5, a0: 0.05, a1: 0.42, dmg: 9, reach: 96, zone: 'over', kb: 260, stun: 0.4, kick: true, y: 120 },
  jpunch: { pose: 'jpunch', air: true, dur: 0.36, a0: 0.05, a1: 0.3, dmg: 7, reach: 74, zone: 'over', kb: 160, stun: 0.3, y: 140 },
  // приёмы
  sdash: { pose: 'jab', dur: 0.24, a0: 0, a1: 0.24, dmg: 4, reach: 72, zone: 'mid', kb: 40, stun: 0.5, dash: 780, next: 'supper', special: true, y: 140 },
  supper: { pose: 'upper', dur: 0.6, a0: 0.04, a1: 0.18, dmg: 12, reach: 72, zone: 'mid', launch: true, special: true, y: 150 },
  sfire: { pose: 'throw', dur: 0.5, shoot: [0.18], special: true },
  suzi: { pose: 'throw', dur: 0.72, shoot: [0.14, 0.22, 0.3, 0.38, 0.46], special: true, gun: true },
  sfolder: { pose: 'throw', dur: 0.5, shoot: [0.18], special: true },
  szap: { pose: 'throw', dur: 0.62, zap: 0.2, special: true },
  stele: { pose: 'cross', dur: 0.78, tele: 0.24, a0: 0.34, a1: 0.46, dmg: 9, reach: 84, zone: 'mid', kb: 300, stun: 0.45, heavy: true, special: true, unblock: true, y: 140 },
};
// всё резче, как в Tekken / Mortal Kombat: обычные удары на 28% быстрее, приёмы — на 15%
for (const m of Object.values(KMOVES)) {
  const k = m.special ? 0.85 : 0.72;
  for (const key of ['dur', 'a0', 'a1', 'tele', 'zap']) if (m[key] !== undefined) m[key] *= k;
  if (m.shoot) m.shoot = m.shoot.map(v => v * k);
}
const K_SPEED = 1.45;     // скорость ходьбы от характеристики бойца

const K_SPECIAL = { asik: 'sdash', gal: 'sfire', daur: 'suzi', dani: 'stele', aseke: 'szap', ulzhan: 'sfolder' };
const K_PUNCH_CHAIN = ['jab', 'cross', 'hook', 'upper'];

class KFighter {
  constructor(id, side) {
    this.id = id; this.def = KF[id]; this.side = side;
    this.wins = 0;
    this.reset(0);
  }
  reset(x) {
    this.x = x; this.z = 0; this.vx = 0; this.vz = 0;
    this.dir = this.side === 0 ? 1 : -1;
    this.hp = 100; this.trail = 100;
    this.state = 'idle'; this.act = null; this.chain = 0; this.queued = null;
    this.stun = 0; this.downT = 0; this.cd = 1; this.inv = 0;
    this.crouch = false; this.blocking = false; this.walk = 0; this.walkPh = 0;
    this.burnT = 0; this.burnTick = 0; this.zapT = 0; this.alpha = 1;
    this.pose = { ...KPOSE.stance }; this.rot = 0; this.t = Math.random() * 5;
    this.fx = {}; this.fpose = null; this.koed = false; this.comboN = 0; this.comboT = 0;
    this.ai = { t: 0, hold: {}, holdT: 0 };
  }
  get grounded() { return this.z <= 0.01; }
  height() { return this.crouch ? 98 : 170; }
}

class SamsaKombat {
  constructor(game) {
    this.game = game;
    this.screen = 'select';
    this.twoP = false;
    this.pick = [0, 1];       // курсоры выбора
    this.locked = [false, false];
    this.stageSel = 0;
    this.t = 0;
  }

  // ---------- вход / выход ----------
  open() {
    const g = this.game;
    const items = [...Assets.gameplayList(), ...['asik', 'aseke', 'ulzhan'].map(name => ({ type: 'portrait', name }))];
    g._loadThen(items, { title: 'SAMSA KOMBAT', sub: 'разминаем кулаки…', color: '#ff5a1a' }, () => {
      g.state = 'kombat';
      this.screen = 'select';
      if (!this.net) this.locked = [false, false];    // в сети выбор соперника мог прийти, пока шла загрузка
      this.paused = false;
      if (Input.isMobile) this.twoP = false;
    });
  }

  exit() { if (this.net) { this._netQuit(); return; } this.game.toMenu(); this.game.modesUI.open(); }

  // фото бойца: герои — из static/img, остальные — из static/img/story; нет фото — рисуем сами
  _face(ctx, id, x, y, w, h, t, flip = false) {
    const img = typeof StoryAssets !== 'undefined' ? StoryAssets.portrait(this.game, id) : null;
    if (img) {
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      ctx.save();
      if (flip) { ctx.translate(x + w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(x + w / 2), 0); }
      ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
      ctx.restore();
      return;
    }
    ctx.save();
    if (flip) { ctx.translate(x + w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(x + w / 2), 0); }
    KArt.portrait(ctx, id, x + w / 2, y + h * 0.5, w * 0.62, t);
    ctx.restore();
  }

  // ===== сеть: хост считает бой, клиент присылает ввод и рисует снимки =====
  openNet(role, pid, names) {
    const C = this.game.coopUI;
    this.net = { role, send: (m, fast) => C.net && C.net.send(role === 'host' ? pid : 'host', m, fast) };
    this._li = role === 'host' ? 0 : 1;
    this._rin = { h: [0, 0, 0, 0], p: [0, 0, 0, 0, 0] };
    this._evOut = []; this._snap = null; this.netNames = names || ['ХОСТ', 'ГОСТЬ'];
    this.twoP = false; this.pick = [0, 1]; this.stageSel = 0; this.locked = [false, false];
    this.open();
  }

  _emit(ev) {
    if (!this.net || this.net.role !== 'host' || this.screen !== 'battle' || this.phase === 'fatality' || this._replay) return;
    if (ev[0] === 'sp' && (this._spEm = (this._spEm || 0) + 1) > 30) return;
    this._evOut.push(ev);
  }

  _snd(name, vol) { AudioSys.play(name, vol); this._emit(['s', name, vol === undefined ? 1 : vol]); }

  _sendSnap() {
    const F = (f) => [Math.round(f.x), Math.round(f.z), f.dir, +f.hp.toFixed(1), f.state, f.act ? f.act.name : '', f.act ? +f.act.t.toFixed(3) : 0,
      f.crouch ? 1 : 0, f.blocking ? 1 : 0, +f.cd.toFixed(2), f.wins, +f.alpha.toFixed(2), f.burnT > 0 ? 1 : 0, +f.zapT.toFixed(2), f.koed ? 1 : 0, f.dashDir || 0];
    this.net.send({
      t: 'Ks', ph: this.phase, pt: +this.pt.toFixed(2), tm: +this.timer.toFixed(2), rd: this.round, sh: +this.shake.toFixed(1),
      fw: this.finishW ? this.finishW.side : -1, f: this.f.map(F),
      pr: this.proj.map(q => [q.kind, Math.round(q.x), Math.round(q.y), +(q.spin || 0).toFixed(2), q.owner.side]),
    }, true);
    if (this._evOut.length) { this.net.send({ t: 'Ke', e: this._evOut }); this._evOut = []; }
    this._spEm = 0;
  }

  _applySnap(sn) {
    this.round = sn.rd; this.timer = sn.tm; this.shake = Math.max(this.shake, sn.sh);
    if (this.fatal) return;                      // фаталити клиент проигрывает сам
    if (sn.ph === 'fatality' && sn.fw >= 0) { this._startFatality(this.f[sn.fw], this.f[1 - sn.fw]); return; }
    this.phase = sn.ph; this.pt = sn.pt; this.finishW = sn.fw >= 0 ? this.f[sn.fw] : null;
    if (sn.ph === 'over' && !this.winner) this.winner = this.f[0].wins >= this.f[1].wins ? this.f[0] : this.f[1];
    sn.f.forEach((a, i) => {
      const f = this.f[i], ox = f.x;
      f.x = a[0]; f.z = a[1]; f.dir = a[2]; f.hp = a[3]; f.state = a[4];
      if (a[5]) { if (!f.act || f.act.name !== a[5]) f.act = { name: a[5], m: KMOVES[a[5]], t: a[6], hit: true, shots: 99, zapped: true, teled: true }; else f.act.t = a[6]; }
      else f.act = null;
      f.crouch = !!a[7]; f.blocking = !!a[8]; f.cd = a[9]; f.wins = a[10]; f.alpha = a[11]; f.burnT = a[12] ? 1 : 0; f.zapT = a[13]; f.koed = !!a[14]; f.dashDir = a[15];
      f._dx = f.x - ox;
    });
    this.proj = sn.pr.map(q => ({ kind: q[0], x: q[1], y: q[2], spin: q[3], owner: this.f[q[4]] }));
  }

  _applyEv(e) {
    this._replay = true;
    const [k, ...a] = e;
    if (k === 'b') this._bleed(...a);
    else if (k === 'g') this._gib(...a);
    else if (k === 'p') this._pop(...a);
    else if (k === 'n') this._banner(...a);
    else if (k === 's') AudioSys.play(a[0], a[1]);
    else if (k === 'sp') this._spark(...a);
    else if (k === 'z') this.zapFx = { x0: a[0], y0: a[1], x1: a[2], y1: a[3], t: 0.28 };
    this._replay = false;
  }

  onNet(m) {
    const o = 1 - this._li;
    if (m.t === 'Kpick') { this.pick[o] = m.i; if (m.l && !this.locked[o]) this._lock(o); this.locked[o] = !!m.l; }
    else if (m.t === 'Kin') { this._rin.h = m.h; m.p.forEach((v, i) => { if (v) this._rin.p[i] = 1; }); }
    else if (m.t === 'Ks') { if (this.screen === 'battle') this._snap = m; }
    else if (m.t === 'Ke') { if (this.screen === 'battle' && this.f) for (const e of m.e) this._applyEv(e); }
    else if (m.t === 'Kgo') { this.stageSel = m.st; this.pick = m.pk.slice(); this.locked = [true, true]; this.screen = 'vs'; this.t = 0; this.paused = false; }
    else if (m.t === 'Ksel') { this.screen = 'select'; this.locked = [false, false]; this.paused = false; AudioSys.stopMusic(); AudioSys.playMusic('/static/audio/menu_music.mp3'); }
    else if (m.t === 'Kquit') { this.net.send({ t: 'Kend' }); this._backToLobby('Соперник вышел в лобби'); }
    else if (m.t === 'Kend') this._backToLobby('Хост вернул всех в лобби');
  }

  _netQuit() {
    if (!this.net) return;
    this.net.send({ t: this.net.role === 'host' ? 'Kend' : 'Kquit' });
    this._backToLobby();
  }

  _backToLobby(msg) {
    if (!this.net) return;
    this.net = null; this.screen = 'select'; this.paused = false; this.locked = [false, false];
    const C = this.game.coopUI;
    C.inMatch = false;
    C.open(); C.screen = 'lobby';
    if (msg) C.flash(msg);
    if (C.isHost) C.broadcastLobby();
    AudioSys.stopMusic(); AudioSys.playMusic('/static/audio/menu_music.mp3');
  }

  _updateSelectNet(dt) {
    const li = this._li, n = KF_IDS.length, P = this._keys(K_KEYS.solo);
    if (this._esc()) { this._netQuit(); return; }
    let changed = false;
    if (!this.locked[li]) {
      const mv = (d) => { this.pick[li] = (this.pick[li] + d + n) % n; changed = true; this._snd('menu_move'); };
      if (P.pr('left') || Input.wasPressed('MobileUp')) mv(-1);
      if (P.pr('right') || Input.wasPressed('MobileDown')) mv(1);
      let ok = P.pr('punch') || Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter');
      if (Input.consumeClick()) {
        const mx = Input.mouse.x, my = Input.mouse.y;
        this._tiles(this.game.W, this.game.H).forEach((r, i) => {
          if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) { if (this.pick[li] === i) ok = true; else { this.pick[li] = i; changed = true; } }
        });
      }
      if (ok) { this._lock(li); changed = true; }
    }
    this._pickHb = (this._pickHb || 0) + dt;
    if (changed || this._pickHb > 0.5) { this._pickHb = 0; this.net.send({ t: 'Kpick', i: this.pick[li], l: this.locked[li] ? 1 : 0 }); }
    if (this.locked[0] && this.locked[1] && this.net.role === 'host') { this.screen = 'stage'; this.t = 0; }
  }

  _overLabels() {
    if (this.net) return this.net.role === 'host' ? ['РЕВАНШ', 'ДРУГИЕ БОЙЦЫ', 'В ЛОББИ'] : ['В ЛОББИ'];
    return ['РЕВАНШ', 'ДРУГИЕ БОЙЦЫ', 'В МЕНЮ'];
  }

  // ---------- ввод ----------
  _keys(set) {
    const any = (arr, fn) => arr.some(c => fn(c));
    const down = (n) => any(set[n], c => Input.isDown(c));
    const pr = (n) => any(set[n], c => Input.wasPressed(c));
    return { down, pr };
  }

  _readHuman(idx) {
    if (this.net && this.net.role === 'host' && idx === 1) {
      const r = this._rin, o = { left: !!r.h[0], right: !!r.h[1], down: !!r.h[2], block: !!r.h[3], up: !!r.p[0], punch: !!r.p[1], kick: !!r.p[2], special: !!r.p[3], fatal: !!r.p[4] };
      r.p = [0, 0, 0, 0, 0];
      return o;
    }
    if (this.net && this.paused) return {};
    const set = this.net ? K_KEYS.solo : this.twoP ? (idx === 0 ? K_KEYS.p1 : K_KEYS.p2) : K_KEYS.solo;
    const k = this._keys(set);
    const tm = Input.touch, mob = (this.net ? idx === this._li : idx === 0) && Input.isMobile;
    const inp = {
      left: k.down('left') || (mob && tm.moveActive && tm.moveX < -0.35),
      right: k.down('right') || (mob && tm.moveActive && tm.moveX > 0.35),
      down: k.down('down') || (mob && tm.moveActive && tm.moveY > 0.55),
      block: k.down('block'),
      up: k.pr('up') || (mob && this._mobJump),
      punch: k.pr('punch'), kick: k.pr('kick'), special: k.pr('special'), fatal: k.pr('fatal'),
    };
    if (mob) this._mobJump = false;
    return inp;
  }

  // ---------- выбор бойцов ----------
  _tiles(w, h) {
    const n = KF_IDS.length, gap = 8;
    const ts = Math.min(92, (w - 40 - gap * (n - 1)) / n, h * 0.17);
    const x0 = w / 2 - (n * ts + (n - 1) * gap) / 2, y = h * 0.72;
    return KF_IDS.map((_, i) => ({ x: x0 + i * (ts + gap), y, w: ts, h: ts }));
  }

  _updateSelect(dt) {
    if (this.net) return this._updateSelectNet(dt);
    const n = KF_IDS.length;
    const who = this.locked[0] ? 1 : 0;
    if (this._esc()) {
      if (this.locked[0]) { this.locked[0] = false; this._snd('menu_move'); }
      else { this.exit(); }
      return;
    }
    if (!Input.isMobile && Input.wasPressed('Tab') && !this.locked[0]) { this.twoP = !this.twoP; this._snd('menu_move'); }
    const P1 = this._keys(this.twoP ? K_KEYS.p1 : K_KEYS.solo), P2 = this._keys(K_KEYS.p2);
    const ctl = who === 0 || !this.twoP ? P1 : P2;
    const move = (d) => { this.pick[who] = (this.pick[who] + d + n) % n; this._snd('menu_move'); };
    if (who === 0 || this.twoP) {
      if (ctl.pr('left') || Input.wasPressed('MobileUp')) move(-1);
      if (ctl.pr('right') || Input.wasPressed('MobileDown')) move(1);
      const ok = ctl.pr('punch') || Input.wasPressed('MobileEnter') || (who === 0 && (Input.wasPressed('Enter') || Input.wasPressed('Space'))) || (who === 1 && Input.wasPressed('NumpadEnter'));
      if (ok) this._lock(who);
    }
    // клик/тап по плитке
    const click = Input.consumeClick(), mx = Input.mouse.x, my = Input.mouse.y;
    if (click) {
      this._tiles(this.game.W, this.game.H).forEach((r, i) => {
        if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) { if (this.pick[who] === i) this._lock(who); else { this.pick[who] = i; this._snd('menu_move'); } }
      });
      const mr = this._modeRect(this.game.W, this.game.H);
      if (!Input.isMobile && mx > mr.x && mx < mr.x + mr.w && my > mr.y && my < mr.y + mr.h && !this.locked[0]) { this.twoP = !this.twoP; this._snd('menu_move'); }
    }
    // компьютер выбирает «рулеткой»
    if (this.locked[0] && !this.twoP && !this.locked[1]) {
      this._roul = (this._roul || 0) + dt;
      if (Math.floor(this._roul * 14) !== this._roulStep) { this._roulStep = Math.floor(this._roul * 14); this.pick[1] = Math.floor(Math.random() * n); this._snd('menu_move', 0.4); }
      if (this._roul > 0.9) { if (this.pick[1] === this.pick[0] && Math.random() < 0.7) this.pick[1] = (this.pick[0] + 1 + Math.floor(Math.random() * (n - 1))) % n; this._lock(1); }
    }
    if (this.locked[0] && this.locked[1]) { this.screen = 'stage'; this.t = 0; }
  }

  _lock(who) {
    this.locked[who] = true; this._roul = 0;
    this._snd('char_select');
    const f = KF[KF_IDS[this.pick[who]]];
    this._shout = { text: f.name, t: 0, col: f.color };
  }

  _modeRect(w, h) { return { x: w / 2 - 120, y: 74, w: 240, h: 24 }; }

  _drawSelect(ctx, w, h) {
    const t = this.t;
    this._drawFireBg(ctx, w, h, t);
    this._logo(ctx, w / 2, 46, Math.min(46, w * 0.06));
    // режим
    if (!Input.isMobile) {
      const r = this._modeRect(w, h);
      ctx.font = 'bold 13px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = '#ff5a1a'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.fillStyle = '#ffd319'; ctx.fillText(this.twoP ? '◄ 2 ИГРОКА ►  [TAB]' : '◄ 1 ИГРОК VS CPU ►  [TAB]', w / 2, r.y + r.h / 2 + 1);
    }
    // большие бойцы по бокам
    const k = Math.min(1.25, h / 540 * 1.1), fy = h * 0.66;
    for (let s = 0; s < 2; s++) {
      const id = KF_IDS[this.pick[s]], show = s === 0 || this.locked[0] || this.twoP;
      if (!show) continue;
      const x = s === 0 ? w * 0.15 : w * 0.85;
      const P = this.locked[s] ? kLerpPose(KPOSE.stance, KPOSE.win, 0.5 + 0.5 * Math.sin(t * 3)) : this._idlePose(t + s);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(x, fy, 46 * k, 9 * k, 0, 0, Math.PI * 2); ctx.fill();
      KArt.render(ctx, id, P, x, fy, k, s === 0 ? 1 : -1, { t });
      ctx.textAlign = 'center'; ctx.font = `bold ${Math.round(20 * Math.min(1, w / 900))}px "Courier New", monospace`;
      ctx.fillStyle = KF[id].color;
      ctx.fillText(KF[id].name, x, fy + 24);
      ctx.font = '11px "Courier New", monospace'; ctx.fillStyle = this.locked[s] ? '#3dff8a' : '#c8c2e0';
      ctx.fillText(this.locked[s] ? 'ГОТОВ' : (s === 0 ? 'ИГРОК 1' : (this.twoP ? 'ИГРОК 2' : 'CPU')), x, fy + 40);
    }
    // описание бойца, которого сейчас выбирают
    const who = this.locked[0] ? 1 : 0, id = KF_IDS[this.pick[who]], F = KF[id];
    const cx = w / 2, iw = Math.min(400, w * 0.44), ix = cx - iw / 2, iy = h * 0.2;
    this.game.menu.panel(ctx, ix, iy, iw, h * 0.46, F.color, 0.8);
    ctx.textAlign = 'center';
    this.game.menu.glowText(ctx, F.name, cx, iy + 34, F.color, Math.min(30, w * 0.04), 'center', 14);
    ctx.font = 'bold 13px "Courier New", monospace'; ctx.fillStyle = '#ffd319';
    ctx.fillText(`СТИЛЬ: ${F.style}`, cx, iy + 56);
    ctx.font = '12px "Courier New", monospace'; ctx.fillStyle = '#c8c2e0';
    this.game.menu._wrapText(ctx, F.bio, cx, iy + 78, iw - 30, 15);
    ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2ff';
    F.feats.forEach((s, i) => ctx.fillText('• ' + s, ix + 18, iy + 116 + i * 17, iw - 30));
    ctx.fillStyle = '#05d9e8'; ctx.fillText(`ПРИЁМ: ${F.special}`, ix + 18, iy + 176, iw - 30);
    ctx.fillStyle = '#ff2a40'; ctx.fillText(`ФАТАЛИТИ: ${F.fatality}`, ix + 18, iy + 194, iw - 30);
    // плитки
    this._tiles(w, h).forEach((r, i) => {
      const fid = KF_IDS[i];
      ctx.fillStyle = 'rgba(10,4,16,0.85)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      bg.addColorStop(0, KF[fid].color + '55'); bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg; ctx.fillRect(r.x, r.y, r.w, r.h);
      this._face(ctx, fid, r.x, r.y, r.w, r.h, t);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.font = `bold ${Math.max(9, Math.round(r.w / 8))}px "Courier New", monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff'; ctx.fillText(KF[fid].name, r.x + r.w / 2, r.y + r.h - 5);
      for (let s = 0; s < 2; s++) {
        if (this.pick[s] !== i || (s === 1 && !this.locked[0] && !this.twoP)) continue;
        const col = s === 0 ? '#ff2a40' : '#05d9e8', pul = 0.6 + 0.4 * Math.sin(t * 10);
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = this.locked[s] ? 1 : pul;
        ctx.strokeRect(r.x - 2 - s * 4, r.y - 2 - s * 4, r.w + 4 + s * 8, r.h + 4 + s * 8);
        ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillText(s === 0 ? 'P1' : (this.twoP ? 'P2' : 'CPU'), r.x + r.w / 2, r.y - 8 - s * 4);
      }
    });
    this._drawShout(ctx, w, h);
    ctx.font = '12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    if (!Input.isMobile) {
      const hint = this.twoP && this.locked[0] ? 'ИГРОК 2: ← → выбор, «,» или NUM1 — готов' : 'A/D — выбор   J или ENTER — готов   ESC — назад';
      ctx.fillText(hint, w / 2, h - 12);
    } else ctx.fillText('нажмите на бойца дважды — выбрать', w / 2, h * 0.7 - 8);
  }

  _drawShout(ctx, w, h) {
    const s = this._shout;
    if (!s) return;
    s.t += 1 / 60;
    if (s.t > 0.8) { this._shout = null; return; }
    ctx.save();
    ctx.globalAlpha = 1 - s.t / 0.8;
    const sz = Math.min(70, w * 0.09) * (1 + s.t * 0.4);
    this.game.menu.glowText(ctx, s.text + '!', w / 2, h * 0.5, s.col, sz, 'center', 30);
    ctx.restore();
  }

  _logo(ctx, x, y, size) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px "Courier New", monospace`;
    const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    g.addColorStop(0, '#fff2a0'); g.addColorStop(0.5, '#ff9a1a'); g.addColorStop(1, '#c01010');
    ctx.shadowColor = '#ff3a10'; ctx.shadowBlur = 22;
    ctx.lineWidth = 6; ctx.strokeStyle = '#2a0404'; ctx.strokeText('SAMSA KOMBAT', x, y);
    ctx.fillStyle = g; ctx.fillText('SAMSA KOMBAT', x, y);
    ctx.restore();
  }

  _drawFireBg(ctx, w, h, t) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a0204'); g.addColorStop(0.7, '#2a0608'); g.addColorStop(1, '#4a0a04');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const ph = (t * 0.35 + i * 0.137) % 1, x = (i * 97.3 % w), y = h - ph * h * 0.8;
      ctx.fillStyle = `rgba(255,${120 + (i % 5) * 20},30,${0.25 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(x + Math.sin(t * 2 + i) * 20, y, (3 + (i % 4) * 2) * (1 - ph * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // дракон-самса на фоне
    ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#ffb040';
    ctx.translate(w / 2, h * 0.5); const s = Math.min(w, h) * 0.5;
    ctx.beginPath(); ctx.moveTo(-s, s * 0.55); ctx.lineTo(0, -s * 0.75); ctx.lineTo(s, s * 0.55); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  _idlePose(t) {
    const P = { ...KPOSE.stance };
    const b = Math.sin(t * 6.5);
    P.fk -= 0.12 * b; P.bk -= 0.08 * b; P.fe += 0.1 * b; P.be += 0.08 * b; P.lean += 0.05 * b; P.fs += 0.05 * b;
    return P;
  }

  // ---------- выбор арены ----------
  _stageRects(w, h) {
    const n = KSTAGES.length, gap = 14;
    const cw = Math.min(210, (w - 40 - gap * (n - 1)) / n), ch = cw * 0.75;
    const x0 = w / 2 - (n * cw + (n - 1) * gap) / 2, y = h * 0.34;
    return KSTAGES.map((_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  }

  _updateStage(dt) {
    const n = KSTAGES.length, P1 = this._keys(this.twoP ? K_KEYS.p1 : K_KEYS.solo);
    if (this._esc()) { this.screen = 'select'; this.locked = [false, false]; this._snd('menu_move'); if (this.net) this.net.send({ t: 'Ksel' }); return; }
    if (P1.pr('left') || Input.wasPressed('MobileUp')) { this.stageSel = (this.stageSel + n - 1) % n; this._snd('menu_move'); }
    if (P1.pr('right') || Input.wasPressed('MobileDown')) { this.stageSel = (this.stageSel + 1) % n; this._snd('menu_move'); }
    let go = P1.pr('punch') || Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter');
    if (Input.consumeClick()) {
      const mx = Input.mouse.x, my = Input.mouse.y;
      this._stageRects(this.game.W, this.game.H).forEach((r, i) => {
        if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) { if (this.stageSel === i) go = true; else { this.stageSel = i; this._snd('menu_move'); } }
      });
    }
    if (go && this.t > 0.15) {
      this._snd('menu_select'); this.screen = 'vs'; this.t = 0;
      if (this.net) this.net.send({ t: 'Kgo', st: this.stageSel, pk: this.pick });
    }
  }

  _drawStage(ctx, w, h) {
    this._drawFireBg(ctx, w, h, this.t);
    this._logo(ctx, w / 2, 46, Math.min(40, w * 0.05));
    this.game.menu.glowText(ctx, 'ВЫБЕРИТЕ АРЕНУ', w / 2, h * 0.24, '#ffd319', Math.min(26, w * 0.04), 'center', 12);
    this._stageRects(w, h).forEach((r, i) => {
      const S = KSTAGES[i], active = i === this.stageSel;
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      ctx.translate(r.x, r.y); ctx.scale(r.w / w, r.h / h);
      S.draw(ctx, w, h, h * 0.86, h / 540, this.t, this.game);
      ctx.restore();
      ctx.strokeStyle = active ? S.color : 'rgba(255,255,255,0.25)'; ctx.lineWidth = active ? 3 : 1;
      ctx.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      ctx.textAlign = 'center'; ctx.font = `bold ${Math.min(16, r.w / 10)}px "Courier New", monospace`;
      ctx.fillStyle = active ? S.color : '#e8e2ff'; ctx.fillText(S.name, r.x + r.w / 2, r.y + r.h + 22);
      ctx.font = '11px "Courier New", monospace'; ctx.fillStyle = '#c8c2e0';
      this.game.menu._wrapText(ctx, S.sub, r.x + r.w / 2, r.y + r.h + 40, r.w, 13);
    });
    ctx.font = '12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    if (!Input.isMobile) ctx.fillText('A/D — выбор   J или ENTER — в бой   ESC — к бойцам', w / 2, h - 12);
  }

  // ---------- экран «VS» ----------
  _updateVs(dt) {
    const skip = this.t > 0.6 && (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('KeyJ') || Input.wasPressed('MobileEnter') || Input.consumeClick());
    if (this.t > 2.4 || skip) this._startMatch();
  }

  _drawVs(ctx, w, h) {
    const t = this.t;
    this._drawFireBg(ctx, w, h, t);
    const slide = Math.min(1, t * 3), ps = Math.min(h * 0.5, w * 0.3);
    for (let s = 0; s < 2; s++) {
      const id = KF_IDS[this.pick[s]], F = KF[id];
      const x = s === 0 ? -ps + slide * (w * 0.27 + ps) : w + ps - slide * (w * 0.27 + ps);
      ctx.save();
      ctx.translate(x, h * 0.45);
      if (s === 1) ctx.scale(-1, 1);
      ctx.fillStyle = F.color + '33'; ctx.beginPath(); ctx.arc(0, 0, ps * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, ps * 0.55, 0, Math.PI * 2); ctx.clip();
      this._face(ctx, id, -ps * 0.55, -ps * 0.55, ps * 1.1, ps * 1.1, t);
      ctx.restore();
      ctx.strokeStyle = F.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, ps * 0.55, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.textAlign = 'center';
      this.game.menu.glowText(ctx, F.name, x, h * 0.45 + ps * 0.62, F.color, Math.min(34, w * 0.045), 'center', 16);
      ctx.font = '12px "Courier New", monospace'; ctx.fillStyle = '#e8e2ff'; ctx.fillText(F.style, x, h * 0.45 + ps * 0.62 + 24);
    }
    if (t > 0.35) {
      const k = Math.min(1, (t - 0.35) * 5), sz = Math.min(90, w * 0.11) * (2 - k);
      ctx.save(); ctx.globalAlpha = k;
      this.game.menu.glowText(ctx, 'VS', w / 2, h * 0.47, '#ff3a10', sz, 'center', 30);
      ctx.restore();
    }
    const S = KSTAGES[this.stageSel];
    ctx.font = 'bold 14px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = S.color;
    ctx.fillText(`АРЕНА: ${S.name}`, w / 2, h - 30);
  }

  // ---------- матч ----------
  _startMatch() {
    this.f = [new KFighter(KF_IDS[this.pick[0]], 0), new KFighter(KF_IDS[this.pick[1]], 1)];
    this.stage = KSTAGES[this.stageSel];
    this.round = 1;
    this.blood = []; this.pools = []; this.gibs = []; this.sparks = []; this.proj = []; this.pops = []; this.ghosts = []; this.marks = [];
    this.screen = 'battle';
    AudioSys.stopMusic();
    AudioSys.playMusic('/static/audio/game_music.mp3');
    this._startRound();
  }

  _startRound() {
    const aw = this.arenaW();
    this.f[0].reset(aw * 0.32); this.f[1].reset(aw * 0.68);
    this.proj = []; this.ghosts = [];
    this.phase = 'intro'; this.pt = 0; this.timer = K_ROUND_TIME;
    this.hitstop = 0; this.shake = 0; this.slow = 1; this.slowT = 0;
    this.banner = null; this.fatal = null; this.result = null; this.winner = null;
    this.paused = false;
    this._banner(`РАУНД ${this.round}`, this.round === 1 ? `${this.f[0].def.name} против ${this.f[1].def.name}` : '', '#ffd319', 1.15);
  }

  arenaW() { return this.game.W / this.k(); }
  k() { return this.game.H / 540 * 1.22; }   // бойцы крупнее: ~40% высоты экрана
  gy() { return this.game.H * 0.86; }

  _isHuman(i) { return i === 0 || this.twoP || !!this.net; }

  update(dt) {
    this.t += dt;
    if (this.screen === 'select') return this._updateSelect(dt);
    if (this.screen === 'stage') return this._updateStage(dt);
    if (this.screen === 'vs') return this._updateVs(dt);
    if (this.net && this.net.role === 'client') return this._updateBattleClient(dt);
    this._updateBattle(dt);
    if (this.net && this.screen === 'battle') this._sendSnap();
  }

  _updateBattleClient(dt) {
    if (this.paused) this._updatePause();
    else if (this._esc() && this.phase !== 'over') { this.paused = true; this.pauseSel = 0; }
    const inp = this.paused ? {} : this._readHuman(1);
    const h = [inp.left ? 1 : 0, inp.right ? 1 : 0, inp.down ? 1 : 0, inp.block ? 1 : 0];
    const pz = [inp.up ? 1 : 0, inp.punch ? 1 : 0, inp.kick ? 1 : 0, inp.special ? 1 : 0, inp.fatal ? 1 : 0];
    const key = h.join('') + pz.join('');
    this._hb = (this._hb || 0) + 1;
    if (key !== this._lastKey || pz.some(v => v) || this._hb > 15) { this.net.send({ t: 'Kin', h, p: pz }); this._lastKey = key; this._hb = 0; }
    if (this._snap) { this._applySnap(this._snap); this._snap = null; }
    this.shake = Math.max(0, this.shake - dt * 40);
    for (let i = 0; i < 2; i++) {
      const f = this.f[i];
      if (f.state === 'fatal') { this._updateFighter(f, this.f[1 - i], {}, dt); continue; }
      const sp = Math.abs(f._dx || 0) / Math.max(dt, 0.001);
      if (f.state === 'idle' && sp > 30) { f.walk = Math.min(1, f.walk + dt * 8); f.walkPh += dt * 17 * Math.sign((f._dx || 0) * f.dir); }
      else f.walk = Math.max(0, f.walk - dt * 8);
      f._dx = 0;
      f.t += dt;
      this._poseFor(f, dt);
    }
    if (this.phase === 'fatality') { this.pt += dt; this._updateFatality(dt); }
    for (const q of this.proj) if (q.kind === 'fire' && Math.random() < 0.6) this._spark(q.x, q.y + Utils.rand(-6, 6), 0, Utils.rand(-20, 40), 0.3, 'fire');
    this._updateParticles(dt);
    if (this.phase === 'over') this._updateOver();
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
  }

  draw(ctx, w, h) {
    ctx.save();
    if (this.screen === 'select') this._drawSelect(ctx, w, h);
    else if (this.screen === 'stage') this._drawStage(ctx, w, h);
    else if (this.screen === 'vs') this._drawVs(ctx, w, h);
    else this._drawBattle(ctx, w, h);
    ctx.restore();
  }

  _updateBattle(rdt) {
    // пауза
    if (this.paused) { this._updatePause(); if (!this.net) return; }
    else if (this._esc() && this.phase !== 'over') { this.paused = true; this.pauseSel = 0; AudioSys.play('menu_move'); if (!this.net) return; }
    if (this.hitstop > 0) { this.hitstop -= rdt; this._updateParticles(rdt * 0.15); return; }
    if (this.slowT > 0) { this.slowT -= rdt; if (this.slowT <= 0) this.slow = 1; }
    const dt = rdt * this.slow;
    this.pt += dt;
    this.shake = Math.max(0, this.shake - rdt * 40);
    const [a, b] = this.f;

    // ввод
    const inp = [0, 1].map(i => this._isHuman(i) ? this._readHuman(i) : this._ai(this.f[i], this.f[1 - i], dt));
    const control = this.phase === 'fight' || this.phase === 'finish';
    if (this.phase === 'intro') {
      if (this.pt > 1.2 && this.pt - dt <= 1.2) { this._banner('БОЙ!', '', '#ff2a40', 0.8, true); this._snd('game_start'); }
      if (this.pt > 1.6) { this.phase = 'fight'; this.pt = 0; }
    }
    if (this.phase === 'fight') {
      this.timer -= dt;
      if (this.timer <= 0) { this.timer = 0; this._timeUp(); }
    }

    for (let i = 0; i < 2; i++) this._updateFighter(this.f[i], this.f[1 - i], control ? inp[i] : {}, dt);
    this._separate(a, b);
    this._updateProjectiles(dt);
    this._updateParticles(dt);

    // фаза добивания
    if (this.phase === 'finish') {
      const W = this.finishW, L = this.f[1 - W.side];
      const fatalPressed = this._isHuman(W.side) ? inp[W.side].fatal : (this.pt > 1.3 && !this._cpuNoFatal);
      if (fatalPressed && L.state === 'dizzy') this._startFatality(W, L);
      else if (L.state !== 'dizzy' && L.state !== 'fatal') { this._endMatch(W, false); }
      else if (this.pt > 6) { L.state = 'air'; L.vz = 260; L.vx = W.dir * 120; L.koed = true; this._endMatch(W, false); }
    }
    if (this.phase === 'fatality') this._updateFatality(dt);
    if (this.phase === 'ko') {
      const L = this.koLoser;
      if (this.pt > 0.9 && this.koWinner.state === 'idle') this.koWinner.state = 'win';
      if (L.state === 'ko' && this.pt > 1.4) {
        if (this.pt > 3.4) { this.round++; this._startRound(); }
      }
    }
    if (this.phase === 'over') this._updateOver();
    if (this.banner) { this.banner.t += rdt; if (this.banner.t > this.banner.dur) this.banner = null; }
  }

  // ---------- боец ----------
  _updateFighter(f, o, inp, dt) {
    f.t += dt;
    f.cd = Math.max(0, f.cd - dt);
    f.inv = Math.max(0, f.inv - dt);
    f.comboT = Math.max(0, f.comboT - dt); if (f.comboT <= 0) f.comboN = 0;
    f.trail += (f.hp - f.trail) * Math.min(1, dt * (f.trail > f.hp ? 2.2 : 10));
    if (f.burnT > 0) {
      f.burnT -= dt; f.burnTick -= dt;
      if (Math.random() < 0.6) this._spark(f.x + Utils.rand(-14, 14), Utils.rand(20, 150) + f.z, Utils.rand(-30, 30), Utils.rand(60, 160), 0.4, 'fire');
      if (f.burnTick <= 0 && f.hp > 1 && this.phase === 'fight') { f.burnTick = 0.35; f.hp = Math.max(1, f.hp - 1); }
    }
    f.zapT = Math.max(0, f.zapT - dt);
    if (f.state === 'fatal') { this._physics(f, dt); this._poseFor(f, dt); return; }

    const st = f.state;
    if (st === 'idle') {
      f.dir = o.x > f.x ? 1 : -1;
      f.crouch = !!inp.down;
      f.blocking = !!inp.block;
      const mv = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      // двойное нажатие в сторону — рывок вперёд или отскок назад
      if (mv && f.prevMv !== mv) {
        if (f.tapDir === mv && f.t - f.tapT < 0.26 && !f.crouch && !f.blocking) { f.prevMv = mv; f.tapDir = 0; this._dash(f, mv); return this._afterFighter(f, dt); }
        f.tapDir = mv; f.tapT = f.t;
      }
      f.prevMv = mv;
      const spd = f.def.speed * K_SPEED;
      if (!f.crouch && !f.blocking && mv) {
        const back = mv !== f.dir;
        f.vx = mv * spd * (back ? 0.8 : 1);
        f.walkPh += dt * 17 * (back ? -1 : 1);
        f.walk = Math.min(1, f.walk + dt * 8);
      } else { f.vx *= 0.7; f.walk = Math.max(0, f.walk - dt * 8); }
      if (inp.up && !f.crouch && !f.blocking) {
        f.state = 'jump'; f.vz = K_JUMP; f.vx = mv * spd * 0.95; f.crouch = false;
        this._snd('melee_swing', 0.4);
      } else if (inp.special && f.cd <= 0) {
        this._doMove(f, K_SPECIAL[f.id]); f.cd = f.def.cd;
      } else if (inp.punch) this._doMove(f, f.crouch ? 'upper' : 'jab');
      else if (inp.kick) this._doMove(f, f.crouch ? 'sweep' : 'kick');
    } else if (st === 'dash') {
      f.dashT -= dt; f.vx *= Math.exp(-dt * 4);
      if (Math.random() < 0.5) this._spark(f.x - f.vx * 0.02, 6, -f.vx * 0.1, Utils.rand(10, 50), 0.35, 'dust');
      if (f.dashDir === f.dir && (inp.punch || inp.kick)) this._doMove(f, inp.punch ? 'jab' : 'kick');
      else if (f.dashT <= 0) f.state = 'idle';
    } else if (st === 'jump') {
      f.crouch = false; f.blocking = false;
      if (!f.act && inp.punch) this._doMove(f, 'jpunch', true);
      else if (!f.act && inp.kick) this._doMove(f, 'jkick', true);
      if (f.act) this._stepMove(f, o, dt, inp);
      if (f.grounded && f.vz <= 0) { f.state = 'idle'; f.act = null; f.vx *= 0.3; this._dust(f.x); }
    } else if (st === 'attack') {
      f.blocking = false;
      this._stepMove(f, o, dt, inp);
    } else if (st === 'hit') {
      f.stun -= dt; f.vx *= Math.exp(-dt * 7);
      if (f.stun <= 0) f.state = 'idle';
    } else if (st === 'air') {
      if (f.grounded && f.vz <= 0) {
        this._dust(f.x); this.shake = Math.max(this.shake, 5); this._snd('tank_hit', 0.5);
        f.vx *= 0.3;
        if (f.koed) { f.state = 'ko'; } else { f.state = 'down'; f.downT = 0.75; }
      }
    } else if (st === 'down') {
      f.vx *= Math.exp(-dt * 8);
      f.downT -= dt; if (f.downT <= 0) { f.state = 'getup'; f.downT = 0.32; f.inv = 0.5; }
    } else if (st === 'getup') {
      f.downT -= dt; if (f.downT <= 0) f.state = 'idle';
    } else if (st === 'ko') {
      f.vx *= Math.exp(-dt * 8);
    } else if (st === 'dizzy') {
      f.vx *= 0.8; f.crouch = false; f.blocking = false;
    } else if (st === 'win') {
      f.vx *= 0.8;
    }
    this._afterFighter(f, dt);
  }

  _afterFighter(f, dt) {
    this._physics(f, dt);
    this._poseFor(f, dt);
  }

  _dash(f, mv) {
    const fwd = mv === f.dir;
    f.state = 'dash'; f.dashDir = mv; f.dashT = fwd ? 0.2 : 0.22;
    f.vx = mv * (fwd ? 780 : 660);
    if (!fwd) f.inv = 0.14;
    this.ghosts.push({ id: f.id, P: { ...f.pose }, x: f.x, z: f.z, dir: f.dir, a: 0.45 });
    this._dust(f.x);
    this._snd('melee_swing', 0.4);
  }

  _physics(f, dt) {
    if (!f.grounded || f.vz > 0) { f.vz -= K_GRAV * dt; f.z = Math.max(0, f.z + f.vz * dt); if (f.z <= 0 && f.vz < 0) f.vz = 0; }
    f.x += f.vx * dt;
    const aw = this.arenaW();
    f.x = Utils.clamp(f.x, 40, aw - 40);
  }

  _separate(a, b) {
    if (a.state === 'fatal' || b.state === 'fatal') return;
    const d = b.x - a.x, min = 46;
    if (Math.abs(d) < min && Math.abs(a.z - b.z) < 110 && !['down', 'ko'].includes(a.state) && !['down', 'ko'].includes(b.state)) {
      const push = (min - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1);
      a.x -= push; b.x += push;
      const aw = this.arenaW();
      a.x = Utils.clamp(a.x, 40, aw - 40); b.x = Utils.clamp(b.x, 40, aw - 40);
    }
  }

  _doMove(f, name, air = false) {
    const m = KMOVES[name];
    if (!m) return;
    f.act = { name, m, t: 0, hit: false, shots: 0 };
    if (!air) { f.state = 'attack'; f.crouch = name === 'upper' || name === 'sweep' ? f.crouch : false; }
    f.chain = K_PUNCH_CHAIN.indexOf(name);
    f.queued = null;
    if (m.special && name !== 'supper') this._pop(KF[f.id].special, f.x, 200 + f.z, KF[f.id].color, 13);
    if (!m.shoot && !m.zap) this._snd('melee_swing', 0.6);
    if (m.dash) f.vx = f.dir * m.dash;
    if (name === 'sfolder' || name === 'sfire') this._snd('throw');
  }

  _stepMove(f, o, dt, inp) {
    const a = f.act, m = a.m;
    a.t += dt;
    if (!m.dash && !m.air) f.vx *= Math.exp(-dt * 10);
    // серия: следующая кнопка, нажатая во время удара
    if (inp.punch && f.chain >= 0 && f.chain < f.def.combo - 1 && a.t > (m.a0 || 0)) f.queued = K_PUNCH_CHAIN[f.chain + 1];
    if (inp.kick && a.name === 'kick' && a.t > m.a0) f.queued = 'kick2';
    // попадание
    if (m.dmg && !a.hit && a.t >= m.a0 && a.t <= m.a1) this._checkHit(f, o, a);
    if (inp.special && a.hit && !m.special && f.cd <= 0 && f.state === 'attack') { f.act = null; this._doMove(f, K_SPECIAL[f.id]); f.cd = f.def.cd; return; }
    // выстрелы / броски
    if (m.shoot) while (a.shots < m.shoot.length && a.t >= m.shoot[a.shots]) { this._shoot(f, a.name); a.shots++; }
    if (m.zap !== undefined && !a.zapped && a.t >= m.zap) { a.zapped = true; this._zap(f, o); }
    if (m.tele !== undefined && !a.teled && a.t >= m.tele) { a.teled = true; this._teleport(f, o); }
    if (m.tele !== undefined) f.alpha = a.t < m.tele ? 1 - a.t / m.tele : Math.min(1, (a.t - m.tele) * 8);
    if (m.dash && a.t > m.a1 * 0.9) f.vx *= 0.5;
    if (a.t >= m.dur || (m.dash && a.hit)) {
      f.alpha = 1;
      const nxt = m.next || f.queued;
      f.act = null;
      if (f.state === 'attack') {
        if (nxt) { this._doMove(f, nxt); }
        else f.state = 'idle';
      }
    }
  }

  _checkHit(f, o, a) {
    const m = a.m;
    if (['down', 'getup', 'ko', 'fatal'].includes(o.state) || o.inv > 0) return;
    const reach = m.reach * f.def.reach;
    const dx = (o.x - f.x) * f.dir;
    if (dx < -12 || dx > reach + 26) return;
    if (Math.abs((o.z) - (f.z)) > 140) return;
    if (m.zone === 'high' && o.crouch && o.grounded) return;
    if (m.zone === 'low' && o.z > 30) return;
    a.hit = true;
    const mul = m.special ? 1 : (m.kick ? f.def.kick : f.def.punch);
    this._resolveHit(f, o, { ...m, dmg: m.dmg * mul, y: (m.y || 130) + o.z });
  }

  // общая логика попадания (удары, снаряды, электрокабель)
  _resolveHit(att, o, h) {
    const facing = o.dir === (att.x > o.x ? 1 : -1);
    const canBlock = o.state === 'idle' && o.blocking && o.grounded && facing && !h.unblock;
    const blocked = canBlock && (h.zone !== 'low' || o.crouch) && (h.zone !== 'over' || !o.crouch);
    const hx = o.x - att.dir * 10, hy = Math.min(h.y || 130, o.height() - 10 + o.z);
    if (blocked) {
      o.hp = Math.max(1, o.hp - h.dmg * 0.12);
      o.vx = att.dir * (h.kb || 150) * 0.7;
      for (let i = 0; i < 8; i++) this._spark(hx, hy, att.dir * Utils.rand(40, 200), Utils.rand(-80, 180), 0.25, 'spark');
      this._snd('tank_hit', 0.4);
      this.hitstop = 0.03;
      return 'block';
    }
    const dmg = h.dmg * o.def.armor;
    o.hp = Math.max(0, o.hp - dmg);
    o.act = null; o.alpha = 1; o.crouch = false; o.blocking = false;
    att.comboN++; att.comboT = 1.1;
    if (att.comboN >= 3) this._pop(`${att.comboN} УДАРА!`, att.x, 210, '#ffd319', 14);
    // кровь — много
    const power = 0.6 + dmg / 10;
    this._bleed(hx, hy, Math.round(10 + dmg * 5), att.dir, power);
    this.hitstop = 0.035 + dmg * 0.0045;
    this.shake = Math.max(this.shake, 3 + dmg * 0.7);
    this._snd(dmg >= 9 ? 'tank_hit' : 'punch');
    if (Math.random() < 0.4) this._snd('player_hurt', 0.5);
    if (h.burn) { o.burnT = 1.6; o.burnTick = 0.3; }
    if (h.zap) o.zapT = 0.9;
    if (o.hp <= 0) { this._ko(att, o); return 'ko'; }
    if (h.launch || h.knock) {
      o.state = 'air'; o.vz = h.launch ? 820 : 380; o.vx = att.dir * (h.launch ? 150 : 260);
    } else if (h.heavy && dmg >= 9 && Math.random() < 0.45) {
      o.state = 'air'; o.vz = 360; o.vx = att.dir * 320;
    } else {
      o.state = o.grounded ? 'hit' : 'air'; o.stun = h.stun || 0.3; o.vx = att.dir * (h.kb || 150);
      if (!o.grounded) o.vz = Math.max(o.vz, 200);
    }
    return 'hit';
  }

  _ko(att, o) {
    if (this.phase !== 'fight') {
      // добили «оглушённого»: просто падает
      if (o.state === 'dizzy' || this.phase === 'finish') { o.state = 'air'; o.vz = 420; o.vx = att.dir * 260; o.koed = true; }
      return;
    }
    att.wins++;
    this.proj = [];
    this._snd('enemy_death');
    if (att.wins >= K_WINS) {
      o.state = 'dizzy'; o.z = 0; o.vz = 0; o.vx = att.dir * 120; o.hp = 0;
      this.phase = 'finish'; this.pt = 0; this.finishW = att;
      this._cpuNoFatal = Math.random() < 0.12;
      this._banner(o.def.pron === 'ЕЁ' ? 'ДОБЕЙ ЕЁ!' : 'ДОБЕЙ ЕГО!', this._isHuman(att.side) ? (Input.isMobile ? 'кнопка ФАТАЛИТИ' : `нажмите ${this.net || att.side === 0 || !this.twoP ? 'F' : '« \' » или NUM0'}`) : '', '#ff2a40', 6, true);
      this.slow = 0.35; this.slowT = 0.6;
    } else {
      o.state = 'air'; o.vz = 560; o.vx = att.dir * 300; o.koed = true;
      this.phase = 'ko'; this.pt = 0; this.koLoser = o;
      this.slow = 0.3; this.slowT = 0.9;
      this._banner('НОКАУТ!', `${att.def.name} берёт раунд`, att.def.color, 3.2, true);
      this.koWinner = att;
    }
  }

  _timeUp() {
    const [a, b] = this.f;
    const w = a.hp >= b.hp ? a : b, l = w === a ? b : a;
    this._banner('ВРЕМЯ!', '', '#ffd319', 1.2);
    this.phase = 'fight';
    l.hp = 0;
    this._ko(w, l);
  }

  // ---------- приёмы ----------
  _handPos(f, back = true) {
    const J = KArt.joints(f.pose), hip = KArt.hipHeight(f.pose);
    const p = back ? J.ba[2] : J.fa[2];
    return { x: f.x + f.dir * p[0], y: hip + f.z - p[1] };
  }

  _shoot(f, name) {
    const h = this._handPos(f);
    if (name === 'sfire') this.proj.push({ kind: 'fire', owner: f, x: h.x, y: h.y, vx: f.dir * 520, vy: 0, g: 0, dmg: 10, burn: true, life: 3 });
    else if (name === 'suzi') { this.proj.push({ kind: 'bullet', owner: f, x: h.x + f.dir * 12, y: h.y + 2, vx: f.dir * 1100, vy: 0, g: 0, dmg: 3, life: 2 }); this._snd('shoot_uzi', 0.6); this._spark(h.x + f.dir * 16, h.y, f.dir * 100, 0, 0.08, 'flash'); }
    else if (name === 'sfolder') this.proj.push({ kind: 'folder', owner: f, x: h.x, y: h.y + 10, vx: f.dir * 470, vy: 150, g: 700, dmg: 9, life: 3, spin: 0 });
  }

  _zap(f, o) {
    const h = this._handPos(f);
    const reach = 270;
    const dx = (o.x - f.x) * f.dir;
    const hit = dx > 0 && dx < reach && !['down', 'getup', 'ko', 'fatal'].includes(o.state) && o.inv <= 0 && !(o.z > 120);
    const tx = hit ? o.x : f.x + f.dir * reach, ty = hit ? Math.min(o.height() * 0.65 + o.z, 130) : h.y;
    this.zapFx = { x0: h.x, y0: h.y, x1: tx, y1: ty, t: 0.28 };
    this._emit(['z', Math.round(h.x), Math.round(h.y), Math.round(tx), Math.round(ty)]);
    this._snd('stun');
    if (hit) this._resolveHit(f, o, { dmg: 8, zone: 'mid', kb: 90, stun: 0.95, zap: true, y: ty });
  }

  _teleport(f, o) {
    this.ghosts.push({ id: f.id, P: { ...f.pose }, x: f.x, z: f.z, dir: f.dir, a: 0.7 });
    const aw = this.arenaW();
    const side = f.x < o.x ? 1 : -1;      // окажемся по другую сторону от соперника
    f.x = Utils.clamp(o.x + side * 66, 40, aw - 40);
    if (Math.abs(f.x - o.x) < 40) f.x = Utils.clamp(o.x - side * 66, 40, aw - 40);
    f.dir = o.x > f.x ? 1 : -1;
    for (let i = 0; i < 14; i++) this._spark(f.x + Utils.rand(-20, 20), Utils.rand(20, 160), Utils.rand(-60, 60), Utils.rand(-40, 120), 0.5, 'shadow');
  }

  _updateProjectiles(dt) {
    for (const p of this.proj) {
      p.life -= dt;
      p.x += p.vx * dt; p.vy -= p.g * dt; p.y += p.vy * dt;
      if (p.spin !== undefined) p.spin += dt * 14;
      if (p.kind === 'fire' && Math.random() < 0.8) this._spark(p.x - Math.sign(p.vx) * 10, p.y + Utils.rand(-6, 6), -p.vx * 0.15, Utils.rand(-20, 40), 0.35, 'fire');
      if (p.kind === 'folder' && Math.random() < 0.15) this._spark(p.x, p.y, Utils.rand(-40, 40), Utils.rand(-20, 60), 0.9, 'paper');
      const o = this.f[1 - p.owner.side];
      const top = o.z + o.height(), hitW = p.kind === 'bullet' ? 18 : 26;
      if (!p.dead && Math.abs(p.x - o.x) < hitW && p.y > o.z && p.y < top && !['down', 'getup', 'ko', 'fatal'].includes(o.state) && o.inv <= 0) {
        p.dead = true;
        this._resolveHit(p.owner, o, { dmg: p.dmg, zone: 'mid', kb: p.kind === 'bullet' ? 60 : 200, stun: p.kind === 'bullet' ? 0.16 : 0.4, burn: p.burn, y: p.y });
        if (p.kind === 'fire') for (let i = 0; i < 18; i++) this._spark(p.x, p.y, Utils.rand(-160, 160), Utils.rand(-60, 200), 0.5, 'fire');
        if (p.kind === 'folder') for (let i = 0; i < 12; i++) this._spark(p.x, p.y, Utils.rand(-160, 160), Utils.rand(0, 200), 1.2, 'paper');
      }
      if (p.y <= 0 && p.g) { p.dead = true; for (let i = 0; i < 10; i++) this._spark(p.x, 2, Utils.rand(-120, 120), Utils.rand(40, 200), 1.2, 'paper'); }
      if (p.life <= 0 || p.x < -50 || p.x > this.arenaW() + 50) p.dead = true;
    }
    // встречные снаряды гасят друг друга
    for (const p of this.proj) for (const q of this.proj) {
      if (p !== q && !p.dead && !q.dead && p.owner !== q.owner && Math.abs(p.x - q.x) < 20 && Math.abs(p.y - q.y) < 30) {
        p.dead = q.dead = true;
        for (let i = 0; i < 16; i++) this._spark(p.x, p.y, Utils.rand(-200, 200), Utils.rand(-100, 200), 0.4, 'spark');
      }
    }
    this.proj = this.proj.filter(p => !p.dead);
  }

  // ---------- кровь, искры, ошмётки ----------
  _bleed(x, y, n, dir, power = 1) {
    this._emit(['b', Math.round(x), Math.round(y), n, dir, +power.toFixed(2)]);
    for (let i = 0; i < n; i++) {
      this.blood.push({
        x: x + Utils.rand(-4, 4), y: y + Utils.rand(-6, 6),
        vx: dir * Utils.rand(40, 420) * power + Utils.rand(-60, 60), vy: Utils.rand(-60, 520) * power,
        s: Utils.rand(2, 5), c: Math.random() < 0.3 ? '#ff2030' : (Math.random() < 0.5 ? '#c00818' : '#8a0410'),
      });
    }
    if (this.blood.length > 1600) this.blood.splice(0, this.blood.length - 1600);
  }

  _pool(x, s) {
    for (const p of this.pools) if (Math.abs(p.x - x) < p.w * 0.6 + 4) { p.w = Math.min(70, p.w + s * 0.35); return; }
    this.pools.push({ x, w: s * 1.8, d: Math.random() * 6 });
    if (this.pools.length > 180) this.pools.shift();
  }

  _spark(x, y, vx, vy, life, kind) {
    this._emit(['sp', Math.round(x), Math.round(y), Math.round(vx), Math.round(vy), life, kind]);
    this.sparks.push({ x, y, vx, vy, life, max: life, kind, s: Utils.rand(2, 5), r: Math.random() * 6 });
    if (this.sparks.length > 900) this.sparks.splice(0, this.sparks.length - 900);
  }

  _dust(x) { for (let i = 0; i < 8; i++) this._spark(x + Utils.rand(-20, 20), 4, Utils.rand(-90, 90), Utils.rand(10, 60), 0.5, 'dust'); }

  _gib(x, y, vx, vy, kind, color, size = 8, id = null) {
    this._emit(['g', Math.round(x), Math.round(y), Math.round(vx), Math.round(vy), kind, color, size, id]);
    this.gibs.push({ x, y, vx, vy, rot: 0, vr: Utils.rand(-12, 12), kind, color, size, id, rest: false });
  }

  _pop(text, x, y, col, size = 14) { this._emit(['p', text, Math.round(x), Math.round(y), col, size]); this.pops.push({ text, x, y, col, size, t: 0 }); }

  _banner(text, sub, col, dur, big = false) { this._emit(['n', text, sub, col, dur, big]); this.banner = { text, sub, col, dur, t: 0, big }; }

  _updateParticles(dt) {
    for (const b of this.blood) {
      b.vy -= 1500 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y <= 0) { b.dead = true; this._pool(b.x, b.s); }
    }
    this.blood = this.blood.filter(b => !b.dead);
    for (const s of this.sparks) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.kind === 'fire' || s.kind === 'shadow') s.vy += 60 * dt;
      else if (s.kind === 'paper') { s.vy = Math.max(-60, s.vy - 400 * dt); s.vx *= 0.98; s.r += dt * 6; if (s.y < 1) { s.y = 1; s.vy = 0; s.vx *= 0.8; } }
      else if (s.kind !== 'flash') { s.vy -= 900 * dt; if (s.y < 0) { s.y = 0; s.vy *= -0.3; } }
    }
    this.sparks = this.sparks.filter(s => s.life > 0);
    for (const g of this.gibs) {
      if (g.rest) continue;
      g.vy -= 1800 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vr * dt;
      if (Math.random() < 0.5) this.blood.push({ x: g.x, y: g.y, vx: Utils.rand(-30, 30), vy: Utils.rand(-20, 60), s: 2.5, c: '#a00814' });
      if (g.y <= g.size * 0.4) {
        g.y = g.size * 0.4;
        if (Math.abs(g.vy) > 120) this._pool(g.x, 6);
        g.vy = -g.vy * 0.35; g.vx *= 0.55; g.vr *= 0.5;
        if (Math.abs(g.vy) < 70) { g.rest = true; g.vy = 0; }
      }
      const aw = this.arenaW();
      if (g.x < 10 || g.x > aw - 10) { g.vx = -g.vx * 0.5; g.x = Utils.clamp(g.x, 10, aw - 10); }
    }
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter(p => p.t < 1.2);
    for (const g of this.ghosts) g.a -= dt * 1.6;
    this.ghosts = this.ghosts.filter(g => g.a > 0);
    if (this.zapFx) { this.zapFx.t -= dt; if (this.zapFx.t <= 0) this.zapFx = null; }
  }

  // ---------- позы ----------
  _poseFor(f, dt) {
    let T, k = 42, rot = 0;
    const st = f.state, t = f.t;
    if (f.fpose) { T = typeof f.fpose === 'string' ? KPOSE[f.fpose] : f.fpose; k = 40; rot = f.frot || 0; }
    else if (f.act) {
      const m = f.act.m, P = KPOSE[m.pose] || KPOSE.stance, base = f.grounded ? KPOSE.stance : KPOSE.jump;
      const a0 = m.a0 !== undefined ? m.a0 : (m.shoot ? m.shoot[0] : (m.zap || 0.15));
      const a1 = m.a1 !== undefined ? m.a1 : m.dur * 0.75;
      const p = f.act.t;
      T = p < a0 ? kLerpPose(base, P, Math.min(1, p / Math.max(0.01, a0))) : p <= a1 ? P : kLerpPose(P, base, Math.min(1, (p - a1) / Math.max(0.05, m.dur - a1)));
      if (m.gun) T = { ...T, fs: 1.6, fe: 0.06 };
      k = 80;
    } else if (st === 'jump') T = KPOSE.jump;
    else if (st === 'hit') { T = KPOSE.hit; k = 60; }
    else if (st === 'dash') { T = f.dashDir === f.dir ? { ...KPOSE.stance, lean: 0.45, fh: 0.9, fk: -0.9, bh: -0.7, bk: -0.5, fs: 0.9, fe: 1.9 } : { ...KPOSE.stance, lean: -0.3, fh: 0.6, fk: -0.6, bh: -0.1, bk: -0.6 }; k = 50; }
    else if (st === 'air') { T = KPOSE.air; rot = -0.5; }
    else if (st === 'down' || st === 'ko') { T = KPOSE.dizzy; rot = -1.5; }
    else if (st === 'getup') { T = KPOSE.crouch; rot = -1.5 * Math.max(0, f.downT / 0.32); }
    else if (st === 'dizzy') {
      T = { ...KPOSE.dizzy, lean: KPOSE.dizzy.lean + Math.sin(t * 2.6) * 0.18, head: KPOSE.dizzy.head + Math.sin(t * 3.1) * 0.3 };
    } else if (st === 'win') T = KPOSE.win;
    else if (f.crouch) T = f.blocking ? KPOSE.cblock : KPOSE.crouch;
    else if (f.blocking) T = KPOSE.block;
    else {
      T = this._idlePose(t);
      if (f.walk > 0.05) {
        const ph = f.walkPh, s = Math.sin(ph);
        T = { ...T, fh: 0.1 + 0.52 * s, bh: 0.02 - 0.52 * s, fk: -0.2 - 0.6 * Math.max(0, -Math.cos(ph)), bk: -0.2 - 0.6 * Math.max(0, Math.cos(ph)) };
      }
    }
    if (f.zapT > 0) T = { ...T, fs: T.fs + Utils.rand(-0.4, 0.4), bs: T.bs + Utils.rand(-0.4, 0.4), head: T.head + Utils.rand(-0.3, 0.3) };
    f.pose = kLerpPose(f.pose, T, Math.min(1, dt * k));
    f.rot += (rot - f.rot) * Math.min(1, dt * 14);
  }

  // ---------- ИИ ----------
  _ai(f, o, dt) {
    const A = f.ai, inp = { ...A.hold };
    A.holdT -= dt; if (A.holdT <= 0) A.hold = {};
    A.t -= dt;
    if (this.phase === 'finish' && this.finishW === f) return inp;    // фаталити — по таймеру
    if (A.t > 0 || f.state !== 'idle') return inp;
    A.t = Utils.rand(0.07, 0.18);
    const dist = Math.abs(o.x - f.x), fwd = o.x > f.x ? 'right' : 'left', back = fwd === 'right' ? 'left' : 'right';
    const hold = (keys, tm) => { A.hold = keys; A.holdT = tm; };
    const threat = (o.state === 'attack' || (o.state === 'jump' && o.act)) && dist < 170;
    const projIn = this.proj.some(p => p.owner === o && Math.abs(p.x - f.x) < 220 && Math.sign(f.x - p.x) === Math.sign(p.vx));
    const r = Math.random();
    if ((threat && r < 0.5) || (projIn && r < 0.6)) { hold({ block: true, down: o.act && o.act.m.zone === 'low' }, 0.35); return { block: true }; }
    if (o.state === 'dizzy') { hold({ [fwd]: true }, 0.2); return inp; }
    const ranged = f.id === 'gal' || f.id === 'daur' || f.id === 'ulzhan' || f.id === 'aseke';
    if (dist > 220 && r < 0.18 && f.state === 'idle') { this._dash(f, fwd === 'right' ? 1 : -1); return {}; }
    if (dist > 280) {
      if (f.cd <= 0 && (ranged || r < 0.25) && (f.id !== 'aseke' || dist < 260)) return { special: true };
      hold({ [fwd]: true }, Utils.rand(0.2, 0.45)); return inp;
    }
    if (dist > 135) {
      if (r < 0.14) return { up: true, [fwd]: true };
      if (f.cd <= 0 && r < 0.35) return { special: true };
      hold({ [fwd]: true }, 0.2); return inp;
    }
    if (o.state === 'down' || o.state === 'getup') { hold({ [back]: true }, 0.2); return inp; }
    if (r < 0.34) return { punch: true };
    if (r < 0.54) return { kick: true };
    if (r < 0.63) return { down: true, kick: true };
    if (r < 0.7) return { down: true, punch: true };
    if (r < 0.8) { hold({ [back]: true }, 0.3); return inp; }
    if (r < 0.88) { hold({ block: true }, 0.3); return { block: true }; }
    if (f.cd <= 0) return { special: true };
    return { punch: true };
  }

  // ---------- конец матча ----------
  _endMatch(W, fatality) {
    if (this.phase === 'over') return;
    this.phase = 'over'; this.pt = 0;
    this.winner = W; W.alpha = 1;
    if (fatality) W.fpose = 'win';
    this._banner(`${W.def.name} ПОБЕЖДАЕТ`, fatality ? '' : (this._isHuman(W.side) && this.phase === 'over' ? 'без фаталити — пожалели' : ''), W.def.color, 99, true);
    this.overSel = 0;
  }

  _updateOver() {
    const W = this.winner;
    if (this.pt > 0.7 && W.state === 'idle') W.state = 'win';
    if (this.pt < 1.4) return;
    const labels = this._overLabels(), opts = labels.length;
    if (this.overSel >= opts) this.overSel = 0;
    if (Input.wasPressed('KeyW') || Input.wasPressed('ArrowUp') || Input.wasPressed('MobileUp')) { this.overSel = (this.overSel + opts - 1) % opts; this._snd('menu_move'); }
    if (Input.wasPressed('KeyS') || Input.wasPressed('ArrowDown') || Input.wasPressed('MobileDown')) { this.overSel = (this.overSel + 1) % opts; this._snd('menu_move'); }
    let go = Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('KeyJ') || Input.wasPressed('MobileEnter');
    if (Input.consumeClick()) {
      const mx = Input.mouse.x, my = Input.mouse.y;
      this._overRects(this.game.W, this.game.H).forEach((r, i) => { if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) { this.overSel = i; go = true; } });
    }
    if (this._esc()) { this.exit(); return; }
    if (!go) return;
    this._snd('menu_select');
    const pick = labels[this.overSel];
    if (pick === 'РЕВАНШ') { this.screen = 'vs'; this.t = 0; if (this.net) this.net.send({ t: 'Kgo', st: this.stageSel, pk: this.pick }); }
    else if (pick === 'ДРУГИЕ БОЙЦЫ') { this.screen = 'select'; this.locked = [false, false]; if (this.net) this.net.send({ t: 'Ksel' }); AudioSys.stopMusic(); AudioSys.playMusic('/static/audio/menu_music.mp3'); }
    else this.exit();
  }

  _overRects(w, h) {
    const bw = Math.min(260, w * 0.4), bh = 34;
    return [0, 1, 2].map(i => ({ x: w / 2 - bw / 2, y: h * 0.5 + i * (bh + 10), w: bw, h: bh }));   // до трёх кнопок
  }

  _esc() {
    if (!Input.wasPressed('Escape') || this.t - (this._escT || -1) < 0.3) return false;
    this._escT = this.t; return true;
  }

  _updatePause() {
    if (this._esc()) { this.paused = false; return; }
    if (Input.wasPressed('KeyW') || Input.wasPressed('ArrowUp') || Input.wasPressed('MobileUp') || Input.wasPressed('KeyS') || Input.wasPressed('ArrowDown') || Input.wasPressed('MobileDown')) { this.pauseSel = 1 - this.pauseSel; this._snd('menu_move'); }
    let go = Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter');
    if (Input.consumeClick()) {
      const mx = Input.mouse.x, my = Input.mouse.y;
      this._overRects(this.game.W, this.game.H).slice(0, 2).forEach((r, i) => { if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) { this.pauseSel = i; go = true; } });
    }
    if (!go) return;
    this._snd('menu_select');
    if (this.pauseSel === 0) this.paused = false; else this.exit();
  }

  // ---------- фаталити ----------
  _startFatality(W, L) {
    this.phase = 'fatality'; this.pt = 0;
    this.banner = null;
    this.fatal = { id: W.id, t: 0, ev: {}, W, L };
    W.state = 'fatal'; L.state = 'fatal'; W.act = null; L.act = null; W.vx = L.vx = 0; W.z = L.z = 0;
    W.dir = L.x > W.x ? 1 : -1; L.dir = -W.dir;
    const aw = this.arenaW();
    L.x = Utils.clamp(L.x, 160, aw - 160);
    W.x = Utils.clamp(L.x - W.dir * (W.id === 'ulzhan' ? 200 : 110), 50, aw - 50);
    W.dir = L.x > W.x ? 1 : -1; L.dir = -W.dir;
    L.fpose = 'dizzy'; W.fpose = 'stance';
    this.proj = [];
    AudioSys.stopMusic();
    this.shake = 6;
  }

  _updateFatality(dt) {
    const F = this.fatal, W = F.W, L = F.L;
    F.t += dt;
    const t = F.t, once = (key, at) => { if (t >= at && !F.ev[key]) { F.ev[key] = 1; return true; } return false; };
    const head = () => ({ x: L.x + L.dir * 4, y: 158 });
    const fx = L.fx;
    if (!fx.hidden && L.fpose === 'dizzy') L.fpose = { ...KPOSE.dizzy, lean: -0.12 + Math.sin(t * 2.6) * 0.15, head: -0.3 + Math.sin(t * 3) * 0.3 };
    const D = { asik: 4.6, gal: 4.8, daur: 4.8, dani: 4.6, aseke: 4.6, ulzhan: 4.8 }[F.id];

    if (F.id === 'asik') {
      if (t < 0.7) { W.fpose = 'win'; if (once('wh', 0.1)) { this._pop('ФЬЮТЬ!', W.x, 210, '#ffffff', 18); this._snd('menu_select'); } }
      else if (t < 2.1) {
        const ph = Math.floor((t - 0.7) / 0.11);
        W.fpose = ph % 2 ? 'cross' : 'jab';
        if (ph !== F.ph) {
          F.ph = ph; const h = head();
          this._bleed(h.x, h.y - Utils.rand(0, 40), 14, W.dir, 0.9); this._snd('punch', 0.8); this.shake = 5;
          L.fpose = { ...KPOSE.hit, head: -0.6 + Math.random() * 0.4 };
          L.x += W.dir * 2;
        }
      } else if (t < 3.2) {
        W.fpose = 'upper';
        if (once('off', 2.2)) {
          const h = head();
          fx.noHead = true;
          this._gib(h.x, h.y, W.dir * 180, 980, 'head', null, 14, L.id);
          this._bleed(h.x, h.y - 10, 140, W.dir, 1.3);
          this._snd('tank_hit'); this.shake = 16; this.hitstop = 0.12;
          L.fpose = 'dizzy';
        }
      }
      if (t > 2.2 && t < 3.6 && !fx.down) for (let i = 0; i < 4; i++) this.blood.push({ x: L.x + L.dir * 4, y: 140, vx: Utils.rand(-70, 70), vy: Utils.rand(420, 820), s: Utils.rand(2, 4.5), c: Math.random() < 0.5 ? '#c00818' : '#ff2030' });
      if (once('fall', 3.3)) { fx.down = true; L.fpose = 'dizzy'; L.frot = 1.5; this._dust(L.x); this._snd('tank_hit', 0.5); }
      if (t > 3.4) W.fpose = 'win';
    }

    if (F.id === 'gal') {
      W.fpose = t < 2.4 ? 'throw' : 'win';
      if (t > 0.3 && t < 2.3) {
        const h = this._handPos(W);
        for (let i = 0; i < 5; i++) this._spark(h.x + W.dir * 6, h.y + Utils.rand(-4, 4), W.dir * Utils.rand(380, 520), Utils.rand(-70, 70), 0.32, 'fire');
        if (Math.random() < 0.4) { const b = head(); this._bleed(L.x, Utils.rand(60, 150), 2, -L.dir, 0.4); }
        L.fpose = { ...KPOSE.hit, fs: Math.sin(t * 20) * 1.2, bs: Math.cos(t * 17) * 1.2, head: -0.4 + Math.sin(t * 12) * 0.3 };
        fx.burn = Math.min(1, (t - 0.3) / 1.6);
        if (once('fs', 0.3)) this._snd('throw');
        if (Math.floor(t * 5) !== F.snd) { F.snd = Math.floor(t * 5); this._snd('player_hurt', 0.4); }
      }
      if (t > 0.5 && t < 3.3) for (let i = 0; i < 3; i++) this._spark(L.x + Utils.rand(-18, 18), Utils.rand(10, 170), Utils.rand(-20, 20), Utils.rand(80, 220), 0.5, 'fire');
      if (once('skel', 2.3)) { fx.skeleton = true; fx.burn = 0; L.fpose = 'dizzy'; this._pop('ДО КОСТЕЙ!', L.x, 220, '#ff9a3a', 16); }
      if (once('ash', 3.3)) {
        fx.hidden = true;
        for (let i = 0; i < 9; i++) this._gib(L.x + Utils.rand(-10, 10), Utils.rand(40, 150), Utils.rand(-160, 160), Utils.rand(100, 420), i === 0 ? 'skull' : 'bone', '#f4efe0', i === 0 ? 12 : Utils.rand(8, 14));
        this.marks.push({ kind: 'ash', x: L.x });
        for (let i = 0; i < 30; i++) this._spark(L.x + Utils.rand(-20, 20), Utils.rand(0, 100), Utils.rand(-40, 40), Utils.rand(20, 120), 1.4, 'dust');
        this._snd('tank_hit', 0.6);
      }
    }

    if (F.id === 'daur') {
      W.fpose = { ...KPOSE.throw, fs: 1.57, fe: 0.05, bs: 1.57, be: 0.05 };
      if (once('guns', 0)) F.guns = [{ x: W.x - W.dir * 300, y: 420 }, { x: W.x + W.dir * 40, y: 460 }];
      if (t < 0.7) {
        const h1 = this._handPos(W, false), h2 = this._handPos(W, true), k = Math.min(1, t / 0.6);
        F.guns[0].x += (h1.x - F.guns[0].x) * k; F.guns[0].y += (h1.y - F.guns[0].y) * k;
        F.guns[1].x += (h2.x - F.guns[1].x) * k; F.guns[1].y += (h2.y - F.guns[1].y) * k;
      } else F.guns = null;
      if (t > 0.7 && t < 2.5) {
        const n = Math.floor((t - 0.7) / 0.05);
        if (n !== F.n) {
          F.n = n;
          const h = this._handPos(W, n % 2 === 0), hy = Utils.rand(50, 165);
          this.tracer = { x0: h.x + W.dir * 14, y0: h.y, x1: L.x, y1: hy, t: 0.05 };
          this._spark(h.x + W.dir * 16, h.y, 0, 0, 0.06, 'flash');
          this._bleed(L.x - W.dir * 4, hy, 7, W.dir, 0.8);
          if (n % 2 === 0) this._snd('shoot_uzi', 0.6);
          L.fpose = { ...KPOSE.hit, lean: -0.3 + Math.sin(t * 30) * 0.25, head: -0.5 + Math.cos(t * 26) * 0.3, fs: Math.sin(t * 22), bs: Math.cos(t * 19) };
          L.x += W.dir * 0.6; this.shake = 3;
        }
      }
      if (once('boom', 2.55)) this._explode(L, W.dir);
      if (t > 2.8) W.fpose = 'win';
    }

    if (F.id === 'dani') {
      W.alpha = t < 0.5 ? 1 - t / 0.5 : t > 2 ? Math.min(1, (t - 2) * 3) : 0;
      if (t < 0.5 && Math.random() < 0.6) this._spark(W.x + Utils.rand(-20, 20), Utils.rand(10, 170), 0, Utils.rand(20, 80), 0.6, 'shadow');
      if (once('cl', 0.5)) {
        F.clones = [{ x: L.x - 80, z: 0, dir: 1 }, { x: L.x + 80, z: 0, dir: -1 }, { x: L.x - L.dir * 30, z: 200, dir: -L.dir }];
        this._snd('stun');
      }
      if (F.clones) {
        F.clones.forEach((c, i) => {
          const at = 0.85 + i * 0.3;
          c.pose = t > at && t < at + 0.2 ? (i === 2 ? 'jkick' : 'cross') : (i === 2 ? 'jump' : 'stance');
          if (i === 2) c.z = Math.max(0, 200 - Math.max(0, t - 0.6) * 300);
          if (once('s' + i, at + 0.06)) {
            this.slash = { x: L.x, y: 100, a: i === 2 ? 1.57 : (c.dir > 0 ? -0.6 : 0.6), t: 0.18 };
            this._bleed(L.x, Utils.rand(80, 150), 40, c.dir, 1); this._snd('melee_swing'); this._snd('punch'); this.shake = 6;
            L.fpose = { ...KPOSE.hit, lean: -0.3 * c.dir * L.dir };
          }
        });
        if (t > 2) F.clones = null;
      }
      if (once('cut', 1.85)) { fx.cut = { dx: 0, dy: 0, rot: 0 }; this._snd('tank_hit'); this.shake = 12; this._bleed(L.x, 90, 120, 1, 0.8); this._bleed(L.x, 90, 120, -1, 0.8); L.fpose = 'dizzy'; }
      if (fx.cut) {
        const c = fx.cut, k = Math.min(1, (t - 1.85) / 0.7);
        c.dx = k * 22; c.dy = k * k * 30; c.rot = k * 1.2;
        if (t < 3.2) for (let i = 0; i < 3; i++) this.blood.push({ x: L.x, y: 88, vx: Utils.rand(-90, 90), vy: Utils.rand(300, 600), s: 3, c: '#c00818' });
      }
      if (t > 2.2) W.fpose = 'win';
    }

    if (F.id === 'aseke') {
      W.fpose = t < 2.8 ? 'throw' : 'win';
      if (t > 0.4 && t < 2.6) {
        const h = this._handPos(W);
        this.zapFx = { x0: h.x, y0: h.y, x1: L.x, y1: 110, t: 0.05 };
        fx.xray = Math.sin(t * 40) > 0;
        L.fpose = { ...KPOSE.hit, fs: Utils.rand(-1, 2), bs: Utils.rand(-1, 2), head: Utils.rand(-0.6, 0.3), lean: Utils.rand(-0.4, 0.1) };
        L.shakeX = Utils.rand(-3, 3);
        if (Math.random() < 0.5) this._spark(L.x + Utils.rand(-20, 20), Utils.rand(20, 170), Utils.rand(-120, 120), Utils.rand(-60, 160), 0.25, 'zap');
        if (Math.floor(t * 2.5) !== F.snd) { F.snd = Math.floor(t * 2.5); this._snd('stun', 0.7); }
        F.pct = Math.min(99, Math.round((t - 0.4) / 2.2 * 100));
      }
      if (once('boom', 2.6)) { fx.xray = false; L.shakeX = 0; F.pct = null; this._explode(L, W.dir, true); this._pop('ОШИБКА 404', L.x, 200, '#05d9e8', 20); }
    }

    if (F.id === 'ulzhan') {
      W.fpose = t < 0.6 ? 'win' : t < 3 ? 'stance' : 'win';
      if (once('order', 0.1)) this._pop('ПРИКАЗ № 1', W.x, 220, '#ff7ad9', 16);
      // печать: висит над головой, потом падает
      const top = 620;
      if (t > 0.5) {
        let y;
        if (t < 1.2) y = top - (t - 0.5) / 0.7 * 220;
        else if (t < 1.4) y = 400 - (t - 1.2) / 0.2 * 400;
        else if (t < 2.9) y = 0;
        else y = Math.min(top, (t - 2.9) * 700);
        F.stamp = { x: L.x, y };
      }
      if (once('crush', 1.4)) {
        fx.squash = 0.07; L.fpose = 'stance';
        this._bleed(L.x, 6, 180, 1, 1.1); this._bleed(L.x, 6, 180, -1, 1.1);
        for (let i = 0; i < 40; i++) this._pool(L.x + Utils.rand(-80, 80), 6);
        this._snd('tank_hit'); this._snd('player_death', 0.6); this.shake = 22; this.hitstop = 0.15;
      }
      if (once('mark', 2.9)) this.marks.push({ kind: 'stamp', x: L.x });
      if (t > 3.6) F.stamp = null;
    }

    if (t > D * 0.78 && once('FT', D * 0.78)) { this._banner('ФАТАЛИТИ!', KF[F.id].fatality, '#ff1020', 99, true); this._snd('player_death'); }
    if (t > D + 0.8 && this.phase === 'fatality') {
      this._replay = true; this._endMatch(W, true); this._replay = false;   // клиент доигрывает фаталити сам
      this.banner = { text: 'ФАТАЛИТИ!', sub: `${W.def.name} ПОБЕЖДАЕТ`, col: '#ff1020', dur: 99, t: 1, big: true };
      AudioSys.playMusic('/static/audio/menu_music.mp3');
    }
  }

  _explode(L, dir, pixels = false) {
    L.fx.hidden = true;
    const look = L.def.look;
    const cols = [look.top, look.pants, look.skin, look.topDk, look.skinDk, look.shirt];
    for (let i = 0; i < 16; i++) this._gib(L.x + Utils.rand(-14, 14), Utils.rand(30, 160), dir * Utils.rand(-80, 420), Utils.rand(200, 900), 'chunk', cols[i % cols.length], Utils.rand(8, 15));
    this._gib(L.x, 150, dir * 220, 900, 'head', null, 14, L.id);
    this._bleed(L.x, 100, 260, 1, 1.4); this._bleed(L.x, 100, 260, -1, 1.4);
    if (pixels) for (let i = 0; i < 60; i++) this._spark(L.x + Utils.rand(-20, 20), Utils.rand(20, 170), Utils.rand(-300, 300), Utils.rand(-100, 400), 1.2, 'pixel');
    this._snd('tank_hit'); this._snd('enemy_death');
    this.shake = 20; this.hitstop = 0.12;
  }

  // ---------- отрисовка боя ----------
  _drawBattle(ctx, w, h) {
    const k = this.k(), gy = this.gy();
    const sx = this.shake > 0 ? Utils.rand(-this.shake, this.shake) : 0, sy = this.shake > 0 ? Utils.rand(-this.shake, this.shake) * 0.6 : 0;
    ctx.save();
    ctx.translate(sx, sy);
    this.stage.draw(ctx, w, h, gy, k, this.t, this.game);
    const X = (x) => x * k, Y = (y) => gy - y * k;
    // лужи крови и следы на полу
    for (const p of this.pools) {
      ctx.fillStyle = '#5a0208';
      ctx.beginPath(); ctx.ellipse(X(p.x), gy + (4 + p.d) * k, p.w * k, p.w * 0.22 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(200,20,30,0.55)';
      ctx.beginPath(); ctx.ellipse(X(p.x) - p.w * 0.2 * k, gy + (3 + p.d) * k, p.w * 0.5 * k, p.w * 0.1 * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const m of this.marks) {
      if (m.kind === 'ash') { ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.ellipse(X(m.x), gy + 4 * k, 34 * k, 8 * k, 0, Math.PI, 0); ctx.fill(); }
      if (m.kind === 'stamp') {
        ctx.save(); ctx.translate(X(m.x), gy + 10 * k); ctx.scale(1, 0.3);
        ctx.strokeStyle = 'rgba(220,20,40,0.85)'; ctx.lineWidth = 5 * k; ctx.strokeRect(-110 * k, -40 * k, 220 * k, 80 * k);
        ctx.fillStyle = 'rgba(220,20,40,0.85)'; ctx.font = `900 ${Math.round(54 * k)}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('УВОЛЕН', 0, 2 * k);
        ctx.restore();
      }
    }
    // тени
    for (const f of this.f) {
      if (f.fx.hidden) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      const s = 1 - Math.min(0.6, f.z / 400);
      ctx.beginPath(); ctx.ellipse(X(f.x), gy + 2 * k, 38 * s * k, 7 * s * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    // остаточные образы
    for (const g of this.ghosts) KArt.render(ctx, g.id, g.P, X(g.x), gy, k, g.dir, { z: g.z, shadow: '#6a3ab8', alpha: g.a * 0.6, t: this.t });
    // тени-клоны Дани (фаталити)
    if (this.fatal && this.fatal.clones) for (const c of this.fatal.clones) KArt.render(ctx, 'dani', KPOSE[c.pose || 'stance'], X(c.x), gy, k, c.dir, { z: c.z, shadow: '#4a2a8a', alpha: 0.85, t: this.t });
    // бойцы: тот, кто бьёт, — сверху
    const order = [...this.f].sort((a, b) => (a.act ? 1 : 0) - (b.act ? 1 : 0));
    for (const f of order) this._drawFighter(ctx, f, X, gy, k);
    // снаряды
    for (const p of this.proj) this._drawProj(ctx, p, X(p.x), Y(p.y), k);
    // ошмётки
    for (const g of this.gibs) this._drawGib(ctx, g, X(g.x), Y(g.y), k);
    // кровь
    for (const b of this.blood) { ctx.fillStyle = b.c; ctx.fillRect(X(b.x), Y(b.y), b.s * k, b.s * k); }
    // искры
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of this.sparks) {
      const a = s.life / s.max, x = X(s.x), y = Y(s.y);
      if (s.kind === 'fire') { ctx.fillStyle = `rgba(255,${Math.round(110 + 120 * a)},40,${a})`; ctx.beginPath(); ctx.arc(x, y, (3 + (1 - a) * 6) * k, 0, Math.PI * 2); ctx.fill(); }
      else if (s.kind === 'spark') { ctx.fillStyle = `rgba(255,230,140,${a})`; ctx.fillRect(x, y, 3 * k, 3 * k); }
      else if (s.kind === 'zap') { ctx.fillStyle = `rgba(140,220,255,${a})`; ctx.fillRect(x, y, 3 * k, 3 * k); }
      else if (s.kind === 'flash') { ctx.fillStyle = `rgba(255,220,120,${a})`; ctx.beginPath(); ctx.arc(x, y, 12 * k, 0, Math.PI * 2); ctx.fill(); }
      else if (s.kind === 'shadow') { ctx.fillStyle = `rgba(140,80,255,${a * 0.6})`; ctx.beginPath(); ctx.arc(x, y, 6 * k, 0, Math.PI * 2); ctx.fill(); }
      else if (s.kind === 'pixel') { ctx.fillStyle = `rgba(5,217,232,${a})`; ctx.fillRect(x, y, 5 * k, 5 * k); }
    }
    ctx.restore();
    for (const s of this.sparks) {
      const a = s.life / s.max, x = X(s.x), y = Y(s.y);
      if (s.kind === 'dust') { ctx.fillStyle = `rgba(180,170,160,${a * 0.5})`; ctx.beginPath(); ctx.arc(x, y, (4 + (1 - a) * 8) * k, 0, Math.PI * 2); ctx.fill(); }
      else if (s.kind === 'paper') { ctx.save(); ctx.translate(x, y); ctx.rotate(s.r); ctx.fillStyle = '#f4f4ec'; ctx.fillRect(-4 * k, -5 * k, 8 * k, 10 * k); ctx.fillStyle = '#8a8a9a'; ctx.fillRect(-3 * k, -3 * k, 6 * k, 1); ctx.fillRect(-3 * k, 0, 5 * k, 1); ctx.restore(); }
    }
    // электричество и трассеры
    if (this.zapFx) this._lightning(ctx, X(this.zapFx.x0), Y(this.zapFx.y0), X(this.zapFx.x1), Y(this.zapFx.y1), k);
    if (this.tracer) { ctx.strokeStyle = 'rgba(255,230,140,0.8)'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(X(this.tracer.x0), Y(this.tracer.y0)); ctx.lineTo(X(this.tracer.x1), Y(this.tracer.y1)); ctx.stroke(); this.tracer.t -= 1 / 60; if (this.tracer.t <= 0) this.tracer = null; }
    if (this.slash) {
      const s = this.slash; ctx.save(); ctx.translate(X(s.x), Y(s.y)); ctx.rotate(s.a);
      ctx.strokeStyle = `rgba(200,160,255,${s.t / 0.18})`; ctx.lineWidth = 6 * k; ctx.beginPath(); ctx.moveTo(-70 * k, 0); ctx.lineTo(70 * k, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2 * k; ctx.stroke(); ctx.restore();
      s.t -= 1 / 60; if (s.t <= 0) this.slash = null;
    }
    // фаталити: летящие стволы, печать, проценты
    const F = this.fatal;
    if (F && F.guns) for (const g of F.guns) {
      ctx.strokeStyle = 'rgba(90,200,255,0.5)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(X(F.W.x), Y(150)); ctx.lineTo(X(g.x), Y(g.y)); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.translate(X(g.x), Y(g.y)); ctx.rotate(this.t * 12); ctx.scale(1.6 * k, 1.6 * k); Sprites.drawWeapon(ctx, 'uzi', true); ctx.restore();
    }
    if (F && F.id === 'daur' && F.t >= 0.7 && F.t < 3) for (const back of [false, true]) {
      const hnd = this._handPos(F.W, back);
      ctx.save(); ctx.translate(X(hnd.x), Y(hnd.y)); ctx.scale(F.W.dir * 1.6 * k, 1.6 * k); Sprites.drawWeapon(ctx, 'uzi', true); ctx.restore();
    }
    if (F && F.stamp) this._drawStamp(ctx, X(F.stamp.x), Y(F.stamp.y), k);
    if (F && F.pct !== null && F.pct !== undefined) {
      ctx.font = `bold ${Math.round(12 * k)}px "Courier New", monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(X(F.L.x) - 70 * k, Y(232), 140 * k, 34 * k);
      ctx.fillStyle = '#05d9e8'; ctx.fillText(`ПЕРЕЗАГРУЗКА ${F.pct}%`, X(F.L.x), Y(215));
      ctx.fillStyle = 'rgba(5,217,232,0.25)'; ctx.fillRect(X(F.L.x) - 60 * k, Y(205), 120 * k, 6 * k);
      ctx.fillStyle = '#05d9e8'; ctx.fillRect(X(F.L.x) - 60 * k, Y(205), 120 * k * F.pct / 100, 6 * k);
    }
    // всплывающий текст
    for (const p of this.pops) {
      ctx.save(); ctx.globalAlpha = 1 - p.t / 1.2;
      ctx.font = `bold ${Math.round(p.size * k)}px "Courier New", monospace`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(p.text, X(p.x), Y(p.y + p.t * 40));
      ctx.fillStyle = p.col; ctx.fillText(p.text, X(p.x), Y(p.y + p.t * 40));
      ctx.restore();
    }
    ctx.restore();
    this._drawHud(ctx, w, h);
    if (this.banner) this._drawBanner(ctx, w, h);
    if (this.phase === 'over' && this.pt > 1.4) this._drawOverMenu(ctx, w, h);
    if (this.paused) this._drawPause(ctx, w, h);
  }

  _drawFighter(ctx, f, X, gy, k) {
    if (f.fx.hidden) return;
    const opt = { z: f.z, t: f.t, alpha: f.alpha, noHead: f.fx.noHead, burn: f.fx.burn, skeleton: f.fx.skeleton || f.fx.xray || (f.zapT > 0 && Math.sin(f.t * 50) > 0.3), xray: f.fx.xray || f.zapT > 0, squash: f.fx.squash };
    let rot = f.fx.down ? 0 : f.rot;
    if (rot) { opt.rot = rot; opt.hipH = 16 + (1 - Math.min(1, Math.abs(rot) / 1.5)) * 60; }
    if (f.fx.down) { opt.rot = -1.5; opt.hipH = 16; }
    if (f.burnT > 0 && f.state !== 'fatal') opt.burn = 0.25;
    const x = X(f.x) + (f.shakeX || 0) * k;
    if (f.fx.cut) {
      KArt.render(ctx, f.id, f.pose, x, gy, k, f.dir, { ...opt, clip: { part: 'bottom', at: 12 } });
      KArt.render(ctx, f.id, f.pose, x, gy, k, f.dir, { ...opt, clip: { part: 'top', at: 12, dx: -f.fx.cut.dx, dy: f.fx.cut.dy, rot: -f.fx.cut.rot } });
      return;
    }
    KArt.render(ctx, f.id, f.pose, x, gy, k, f.dir, opt);
    // Даур дымит сигарой
    if (f.id === 'daur' && !opt.skeleton && !f.fx.noHead && Math.random() < 0.08) this._spark(f.x + f.dir * 22, KArt.hipHeight(f.pose) + f.z + 66, f.dir * 10, 40, 1.2, 'dust');
    // Uzi в руке во время очереди
    if (f.act && f.act.m.gun) {
      const hnd = this._handPos(f);
      ctx.save(); ctx.translate(X(hnd.x), gy - hnd.y * k); ctx.scale(f.dir * 1.5 * k, 1.5 * k); Sprites.drawWeapon(ctx, 'uzi', true); ctx.restore();
    }
  }

  _drawProj(ctx, p, x, y, k) {
    if (p.kind === 'fire') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26 * k);
      g.addColorStop(0, 'rgba(255,250,200,0.95)'); g.addColorStop(0.4, 'rgba(255,140,30,0.8)'); g.addColorStop(1, 'rgba(200,30,10,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26 * k, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (p.kind === 'bullet') {
      ctx.fillStyle = '#ffe080'; ctx.fillRect(x - 8 * k, y - 1.5 * k, 16 * k, 3 * k);
    } else if (p.kind === 'folder') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.spin);
      ctx.fillStyle = '#0a0612'; ctx.fillRect(-15 * k, -11 * k, 30 * k, 22 * k);
      ctx.fillStyle = '#c8202e'; ctx.fillRect(-13 * k, -9 * k, 26 * k, 18 * k);
      ctx.fillStyle = '#f4f4ec'; ctx.fillRect(-10 * k, -11 * k, 20 * k, 4 * k);
      ctx.fillStyle = '#ffd319'; ctx.fillRect(-4 * k, -2 * k, 8 * k, 4 * k);
      ctx.restore();
    }
  }

  _drawGib(ctx, g, x, y, k) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(g.rot);
    if (g.kind === 'head') { ctx.scale(k * 1.05, k * 1.05); KArt.drawHead(ctx, g.id, [0, 0], 0, { look: KF[g.id].look }); ctx.fillStyle = '#a00814'; ctx.fillRect(-6, 14, 12, 5); }
    else if (g.kind === 'skull') { const s = g.size * k; ctx.fillStyle = '#f4efe0'; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1a1410'; ctx.fillRect(s * 0.1, -s * 0.3, s * 0.4, s * 0.4); }
    else if (g.kind === 'bone') { const s = g.size * k; ctx.fillStyle = '#f4efe0'; ctx.fillRect(-s, -s * 0.18, s * 2, s * 0.36); ctx.beginPath(); ctx.arc(-s, 0, s * 0.3, 0, Math.PI * 2); ctx.arc(s, 0, s * 0.3, 0, Math.PI * 2); ctx.fill(); }
    else { const s = g.size * k; ctx.fillStyle = '#2a0408'; ctx.fillRect(-s / 2 - 1, -s / 2 - 1, s + 2, s * 0.8 + 2); ctx.fillStyle = g.color; ctx.fillRect(-s / 2, -s / 2, s, s * 0.8); ctx.fillStyle = '#b00818'; ctx.fillRect(-s / 2, s * 0.1, s, s * 0.2); }
    ctx.restore();
  }

  _drawStamp(ctx, x, y, k) {
    ctx.save(); ctx.translate(x, y);
    // тень на полу
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, (y < this.gy() ? this.gy() - y : 0) + 2 * k, 120 * k, 14 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0612'; ctx.fillRect(-124 * k, -64 * k, 248 * k, 66 * k);
    ctx.fillStyle = '#c01830'; ctx.fillRect(-120 * k, -24 * k, 240 * k, 24 * k);
    ctx.fillStyle = '#ffe0e0'; ctx.font = `900 ${Math.round(16 * k)}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('УВОЛЕН', 0, -12 * k); ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#6a3a1a'; ctx.fillRect(-100 * k, -60 * k, 200 * k, 36 * k);
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-100 * k, -60 * k, 200 * k, 8 * k);
    ctx.fillStyle = '#0a0612'; ctx.fillRect(-22 * k, -150 * k, 44 * k, 92 * k);
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(-18 * k, -146 * k, 36 * k, 88 * k);
    ctx.fillStyle = '#0a0612'; ctx.beginPath(); ctx.arc(0, -160 * k, 34 * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.arc(0, -160 * k, 30 * k, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _lightning(ctx, x0, y0, x1, y1, k) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? 'rgba(255,255,255,0.9)' : 'rgba(90,190,255,0.7)';
      ctx.lineWidth = (pass ? 1.5 : 5) * k;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      const n = 9;
      for (let i = 1; i < n; i++) ctx.lineTo(x0 + (x1 - x0) * i / n + Utils.rand(-6, 6) * k, y0 + (y1 - y0) * i / n + Utils.rand(-14, 14) * k);
      ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.restore();
  }

  _drawHud(ctx, w, h) {
    const s = Math.min(1, w / 960), bh = 18 * s + 4, top = 16 * s, ps = Math.round(bh * 2 + 10);
    const bw = Math.min(360, w * 0.37 - ps);
    for (let i = 0; i < 2; i++) {
      const f = this.f[i], x = i === 0 ? 16 + ps + 8 : w - 16 - ps - 8 - bw;
      // портрет бойца
      const px = i === 0 ? 16 : w - 16 - ps, py = top - 4;
      ctx.fillStyle = '#0a0612'; ctx.fillRect(px - 3, py - 3, ps + 6, ps + 6);
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, ps, ps); ctx.clip();
      ctx.fillStyle = f.def.color + '44'; ctx.fillRect(px, py, ps, ps);
      this._face(ctx, f.id, px, py, ps, ps, this.t, i === 1);
      if (f.hp <= 0) { ctx.fillStyle = 'rgba(160,0,10,0.45)'; ctx.fillRect(px, py, ps, ps); }
      ctx.restore();
      ctx.strokeStyle = f.def.color; ctx.lineWidth = 2; ctx.strokeRect(px - 1, py - 1, ps + 2, ps + 2);
      ctx.fillStyle = '#0a0612'; ctx.fillRect(x - 3, top - 3, bw + 6, bh + 6);
      ctx.fillStyle = '#5a0a0e'; ctx.fillRect(x, top, bw, bh);
      const fr = (v) => Math.max(0, v) / 100 * bw;
      ctx.fillStyle = '#ffffff';
      if (i === 0) ctx.fillRect(x, top, fr(f.trail), bh); else ctx.fillRect(x + bw - fr(f.trail), top, fr(f.trail), bh);
      const g = ctx.createLinearGradient(0, top, 0, top + bh);
      g.addColorStop(0, f.hp > 30 ? '#7aff4a' : '#ffd319'); g.addColorStop(1, f.hp > 30 ? '#2a9a1a' : '#c07a0a');
      ctx.fillStyle = g;
      if (i === 0) ctx.fillRect(x, top, fr(f.hp), bh); else ctx.fillRect(x + bw - fr(f.hp), top, fr(f.hp), bh);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, top + 2, bw, 2);
      ctx.font = `bold ${Math.round(14 * s + 2)}px "Courier New", monospace`; ctx.textAlign = i === 0 ? 'left' : 'right'; ctx.textBaseline = 'top';
      ctx.lineWidth = 3; ctx.strokeStyle = '#000';
      const nm = f.def.name + (this.net && this.netNames ? ` · ${this.netNames[i]}` : this._isHuman(i) ? '' : ' (CPU)');
      ctx.strokeText(nm, i === 0 ? x : x + bw, top + bh + 6); ctx.fillStyle = f.def.color; ctx.fillText(nm, i === 0 ? x : x + bw, top + bh + 6);
      // победы — самсы
      for (let j = 0; j < K_WINS; j++) {
        const cx = i === 0 ? x + bw - 14 - j * 22 : x + 14 + j * 22, cy = top + bh + 14;
        ctx.fillStyle = '#0a0612'; ctx.beginPath(); ctx.moveTo(cx - 10, cy + 7); ctx.lineTo(cx, cy - 9); ctx.lineTo(cx + 10, cy + 7); ctx.fill();
        ctx.fillStyle = j < f.wins ? '#f0a030' : '#3a2a30';
        ctx.beginPath(); ctx.moveTo(cx - 7, cy + 5); ctx.lineTo(cx, cy - 6); ctx.lineTo(cx + 7, cy + 5); ctx.fill();
      }
      // перезарядка приёма
      const cdF = 1 - f.cd / f.def.cd;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, top + bh + 26 * s + 8, bw * 0.4, 4);
      ctx.fillStyle = f.cd <= 0 ? '#05d9e8' : '#3a6a8a';
      if (i === 0) ctx.fillRect(x, top + bh + 26 * s + 8, bw * 0.4 * cdF, 4); else ctx.fillRect(x + bw * 0.6 + bw * 0.4 * (1 - cdF), top + bh + 26 * s + 8, bw * 0.4 * cdF, 4);
    }
    // таймер
    const tw = 54 * s + 10;
    ctx.fillStyle = '#0a0612'; ctx.fillRect(w / 2 - tw / 2, top - 4, tw, bh + 16);
    ctx.strokeStyle = '#ff5a1a'; ctx.strokeRect(w / 2 - tw / 2 + 0.5, top - 3.5, tw - 1, bh + 15);
    ctx.font = `bold ${Math.round(24 * s + 4)}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.timer < 10 && Math.sin(this.t * 10) > 0 ? '#ff2a40' : '#ffd319';
    ctx.fillText(String(Math.ceil(this.timer)), w / 2, top + bh / 2 + 4);
    ctx.textBaseline = 'alphabetic';
    // подсказка управления
    if (!Input.isMobile && this.round === 1 && (this.phase === 'fight' || this.phase === 'intro') && this.timer > K_ROUND_TIME - 8) {
      ctx.font = '11px "Courier New", monospace'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
      const line = this.twoP
        ? 'И1: WASD, J рука, K нога, L блок, I приём, F фаталити   •   И2: стрелки, «,» рука, «.» нога, «/» блок, «;» приём, «\'» фаталити'
        : 'A/D — ход (дважды — рывок)   W — прыжок   S — присед   J — рука   K — нога   L — блок   I — приём   F — фаталити   (присед+J — апперкот, присед+K — подсечка)';
      ctx.fillText(line, w / 2, h - 10, w - 20);
    }
  }

  _drawBanner(ctx, w, h) {
    const b = this.banner, t = b.t;
    const pop = Math.min(1, t * 6), size = (b.big ? Math.min(84, w * 0.1) : Math.min(60, w * 0.075)) * (1.6 - 0.6 * pop);
    const alpha = b.dur < 50 ? Math.min(1, (b.dur - t) * 3) : 1;
    ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(size)}px "Courier New", monospace`;
    const y = h * 0.36;
    ctx.lineWidth = 8; ctx.strokeStyle = '#1a0204'; ctx.strokeText(b.text, w / 2, y);
    ctx.shadowColor = b.col; ctx.shadowBlur = 26;
    ctx.fillStyle = b.col; ctx.fillText(b.text, w / 2, y);
    ctx.shadowBlur = 0;
    // капли крови под «ФАТАЛИТИ»
    if (b.text.startsWith('ФАТАЛИТИ')) {
      const tw = ctx.measureText(b.text).width;
      ctx.fillStyle = '#c00818';
      for (let i = 0; i < 12; i++) {
        const dx = w / 2 - tw / 2 + (i + 0.5) * tw / 12, len = (8 + (i * 37 % 23)) * Math.min(1, t * 0.8) * (size / 60);
        ctx.fillRect(dx - 2, y + size * 0.32, 4, len);
        ctx.beginPath(); ctx.arc(dx, y + size * 0.32 + len, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (b.sub) {
      ctx.font = `bold ${Math.round(Math.min(20, w * 0.028))}px "Courier New", monospace`;
      ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(b.sub, w / 2, y + size * 0.75);
      ctx.fillStyle = '#ffffff'; ctx.fillText(b.sub, w / 2, y + size * 0.75);
    }
    ctx.restore();
  }

  _menuButtons(ctx, w, h, labels, sel) {
    this._overRects(w, h).slice(0, labels.length).forEach((r, i) => {
      const a = i === sel;
      ctx.fillStyle = a ? 'rgba(255,58,16,0.85)' : 'rgba(10,4,16,0.85)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = a ? '#ffd319' : 'rgba(255,90,26,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.font = 'bold 15px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; ctx.fillText(labels[i], r.x + r.w / 2, r.y + r.h / 2 + 1);
    });
    ctx.textBaseline = 'alphabetic';
  }

  _drawOverMenu(ctx, w, h) {
    this._menuButtons(ctx, w, h, this._overLabels(), this.overSel);
    if (this.net && this.net.role === 'client') { ctx.font = '12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('реванш или выбор бойцов — за хостом', w / 2, h * 0.5 - 12); }
  }

  _drawPause(ctx, w, h) {
    ctx.fillStyle = this.net ? 'rgba(4,2,10,0.45)' : 'rgba(4,2,10,0.7)'; ctx.fillRect(0, 0, w, h);
    this.game.menu.glowText(ctx, this.net ? 'МЕНЮ' : 'ПАУЗА', w / 2, h * 0.36, '#ffd319', Math.min(48, w * 0.07), 'center', 18);
    this._menuButtons(ctx, w, h, ['ПРОДОЛЖИТЬ', this.net ? 'В ЛОББИ' : 'ВЫЙТИ В МЕНЮ'], this.pauseSel);
    if (this.net) { ctx.font = '12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#c8c2e0'; ctx.fillText('сетевой бой не останавливается', w / 2, h * 0.36 + 34); }
  }
}
