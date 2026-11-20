// =====================================================================
// SCENE — движок промежуточных сцен-локаций Critical Strike.
// Пиксельный мир 480×270 (тайл 16), рисуется с удвоенной точностью (RS)
// и растягивается на холст 960×540.
// Есть: карты и мебель, персонажи, свет и погода, ходьба кликом или WASD,
// взаимодействие с объектами, диалоги с выборами, карточки-заставки,
// пауза и настройки, процедурная музыка.
//
// Запуск:  SCENE.start('mapId', { x, y, dir, hero: 'charId', dlg, card, onExit })
// Выход:   SCENE.exit()  (или шаг диалога { exit: 1 }, или выход карты с to: '@exit')
// Контент: SceneData.maps / dlg / chars / items (Object.assign из файлов сцен).
//
// ФОРМАТ ДИАЛОГОВ (SceneData.dlg[id] = [шаги]):
//   ['кто', 'текст']        реплика. кто: 'n' — повествование, иначе id персонажа
//   { c: [выборы] }         выбор: { t, go | do:[шаги], if:'условие', once:false, end }
//                           выбор, начинающийся с '[' или '(', — действие, а не реплика
//   { if:'условие', then:[...], else:[...] }
//   { go:'id' } переход · { call:'id' } вызов · { end:1 } конец · { exit:1 } выйти из сцены
//   { set:'флаг' | {флаг: значение} } · { unset } · { add:{счётчик:1} }
//   { item } / { take } предметы · { music } · { sfx } · { sys:'строка' } · { face:'npcId' }
//   { map:'id', x, y, dir } переход после диалога · { card:{...} } карточка после диалога
//   { fn:(E, D) => {} }
// Условия — выражения JS: f.флаг, i.предмет, S (всё состояние сцены).
// =====================================================================

const AW = 480, AH = 270, TS = 16, RS = 2;   // RS — во сколько раз мир рисуется точнее базовой сетки
const AFONT = 'Georgia, "Times New Roman", serif';
const AMONO = '"Courier New", monospace';

// Реестр контента сцен
const SceneData = { maps: {}, dlg: {}, items: {}, chars: {} };

function aWrap(ctx, text, w) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > w && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}
function aMk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------------------------------------------------------------------
// Диалог: стек шагов, журнал реплик, выборы
// ---------------------------------------------------------------------
class ADialog {
  constructor(eng, id) {
    this.e = eng; this.stack = []; this.log = []; this.choices = null; this.waiting = false;
    this.speaker = null; this.scroll = 0; this.csel = -1; this.age = 0;
    this.push(id); this.run();
  }
  push(id) {
    const steps = SceneData.dlg[id];
    if (!steps) { console.warn('SCENE: нет диалога', id); return; }
    this.stack.push({ steps, i: 0, id });
  }
  pushSteps(steps, id) { this.stack.push({ steps: Array.isArray(steps) ? steps : [steps], i: 0, id: id || 'inline' }); }

  run() {
    let guard = 0;
    while (this.stack.length && guard++ < 2000) {
      const fr = this.stack[this.stack.length - 1];
      if (fr.i >= fr.steps.length) { this.stack.pop(); continue; }
      const r = this.exec(fr.steps[fr.i++], fr);
      if (r === 'wait' || r === 'choice') return;
      if (r === 'end') { this.stack.length = 0; break; }
    }
    this.e.endDialog(this);
  }

  say(who, text, kind) {
    const k = kind || 'line';
    const instant = k.startsWith('sys') || k === 'act';
    this.log.push({ who, text, kind: k, t: 0, shown: instant ? 1e9 : 0 });
    this.scroll = 0;
    if (who && SceneData.chars[who]) this.speaker = who;
  }
  // первая ещё не раскрытая реплика (печатается сейчас)
  pending() {
    for (const L of this.log) if (L.shown < L.text.length) return L;
    return null;
  }
  revealAll() { for (const L of this.log) L.shown = 1e9; }
  tick(dt) {
    const L = this.pending();
    if (!L) return;
    const cps = [32, 60, 120, 1e9][SCENE.opt('speed')];
    const before = L.shown | 0;
    L.shown += dt * cps;
    if ((L.shown | 0) > before && before % 3 === 0 && L.kind !== 'narr') ASfx.type();
  }
  busy() { return !!this.pending(); }

  exec(st, fr) {
    const E = this.e, S = E.S;
    if (Array.isArray(st)) {
      const [who, text] = st;
      this.say(who, text, who === 'n' ? 'narr' : 'line');
      this.waiting = true; ASfx.tick();
      return 'wait';
    }
    if (typeof st === 'string') { this.stack = []; this.push(st); return; }
    if (st.c) {
      const list = st.c.filter(ch => (!ch.if || E.cond(ch.if)) && !(S.used[this.ckey(ch, fr)]));
      if (!list.length) return;
      list.forEach(ch => { ch._k = this.ckey(ch, fr); });
      this.choices = list; this.csel = -1;
      return 'choice';
    }
    if (st.if !== undefined && (st.then || st.else)) {
      const branch = E.cond(st.if) ? st.then : st.else;
      if (branch) this.pushSteps(branch, fr.id);
      return;
    }
    if (st.set) { if (typeof st.set === 'string') S.flags[st.set] = true; else Object.assign(S.flags, st.set); }
    if (st.unset) delete S.flags[st.unset];
    if (st.add) for (const k in st.add) S.flags[k] = (S.flags[k] || 0) + st.add[k];
    if (st.item) E.addItem(st.item, this);
    if (st.take) E.takeItem(st.take, this);
    if (st.music) SceneMusic.play(st.music);
    if (st.sfx) ASfx[st.sfx] && ASfx[st.sfx]();
    if (st.map) E.pendingMap = st;
    if (st.card) E.pendingCard = st.card;
    if (st.exit) E.pendingExit = true;
    if (st.fn) st.fn(E, this);
    if (st.face) E.faceNpc(st.face);
    if (st.sys) this.say('', st.sys, 'sys');
    if (st.go) { this.stack = []; this.push(st.go); return; }
    if (st.call) { this.push(st.call); return; }
    if (st.end) return 'end';
  }

  ckey(ch, fr) { return ch.id || (fr.id + '|' + ch.t); }

  choose(ch) {
    const S = this.e.S;
    if (ch.once !== false) S.used[ch._k] = 1;
    this.choices = null; this.csel = -1;
    const isAct = ch.t[0] === '[' || ch.t[0] === '(';
    this.say(isAct ? '' : this.e.heroId, ch.t, isAct ? 'act' : 'said');
    ASfx.tick();
    if (ch.go) { this.stack = []; this.push(ch.go); }
    if (ch.do) this.pushSteps(ch.do);
    if (ch.end) this.stack = [];
    this.run();
  }

  next() { if (this.waiting) { this.waiting = false; this.run(); } }
}

// ---------------------------------------------------------------------
// Главный объект движка сцен
// ---------------------------------------------------------------------
const SCENE = {
  active: false, inited: false, state: 'play', t: 0,
  OPTS_DEF: { speed: 1, big: 0, music: 2, sfx: 2 },
  opt(k) {
    if (!this._opts) { try { this._opts = JSON.parse(localStorage.getItem('scene_opts') || '{}'); } catch (e) { this._opts = {}; } if (Input.isMobile && this._opts.big === undefined) this._opts.big = 1; }
    return this._opts[k] === undefined ? this.OPTS_DEF[k] : this._opts[k];
  },
  setOpt(k, v) {
    this.opt(k); this._opts[k] = v;
    try { localStorage.setItem('scene_opts', JSON.stringify(this._opts)); } catch (e) {}
    if (k === 'music') SceneMusic.applyVol();
  },
  volK(k) { return [0, 0.4, 0.7, 1][this.opt(k)]; },
  settingsItems() {
    const sp = ['МЕДЛЕННО', 'ОБЫЧНО', 'БЫСТРО', 'СРАЗУ'][this.opt('speed')];
    const bars = (n) => '■'.repeat(n) + '□'.repeat(3 - n);
    return [
      { id: 'speed', text: `СКОРОСТЬ ТЕКСТА: ${sp}` },
      { id: 'big', text: `РАЗМЕР ТЕКСТА: ${this.opt('big') ? 'КРУПНЫЙ' : 'ОБЫЧНЫЙ'}` },
      { id: 'music', text: `МУЗЫКА: ${bars(this.opt('music'))}` },
      { id: 'sfx', text: `ЗВУКИ: ${bars(this.opt('sfx'))}` },
      { id: 'back', text: 'НАЗАД' },
    ];
  },
  openSettings() { this.setBack = this.state; this.state = 'settings'; this.sel = 0; },
  updSettings() {
    if (Input.wasPressed('Escape')) { this.state = this.setBack || 'play'; this.sel = 0; return; }
    const cyc = (k, n, d) => { this.setOpt(k, (this.opt(k) + d + n) % n); ASfx.select(); };
    const items = this.settingsItems(), it = items[this.sel];
    const dirKey = Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA') ? -1 : Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD') ? 1 : 0;
    if (dirKey && it) {
      if (it.id === 'speed') cyc('speed', 4, dirKey); else if (it.id === 'big') cyc('big', 2, dirKey);
      else if (it.id === 'music') cyc('music', 4, dirKey); else if (it.id === 'sfx') cyc('sfx', 4, dirKey);
    }
    this.menuList(items, (x) => {
      if (x.id === 'back') { this.state = this.setBack || 'play'; this.sel = 0; return; }
      if (x.id === 'speed') cyc('speed', 4, 1); else if (x.id === 'big') cyc('big', 2, 1);
      else if (x.id === 'music') cyc('music', 4, 1); else if (x.id === 'sfx') cyc('sfx', 4, 1);
    });
  },
  drawSettings(ctx) {
    ctx.fillStyle = 'rgba(4,4,7,0.88)'; ctx.fillRect(0, 0, 960, 540);
    ctx.textAlign = 'center'; ctx.fillStyle = '#efe2c0'; ctx.font = `bold 32px ${AFONT}`;
    ctx.fillText('НАСТРОЙКИ', 480, 140);
    ctx.fillStyle = 'rgba(232,216,176,0.5)'; ctx.font = `italic 14px ${AFONT}`;
    ctx.fillText('Enter или ←/→ — изменить. Esc — назад.', 480, 168);
    const rects = [];
    this.settingsItems().forEach((it, i) => {
      const y = 230 + i * 44, hot = this.sel === i;
      ctx.font = `${hot ? 'bold ' : ''}18px ${AMONO}`;
      ctx.fillStyle = hot ? '#e8c76a' : 'rgba(232,216,176,0.75)';
      ctx.fillText(it.text, 480, y);
      rects.push([260, y - 26, 440, 38]);
    });
    this._menuRects = rects;
  },

  init(canvas) {
    if (this.inited) return;
    this.inited = true;
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.lo = aMk(AW * RS, AH * RS); this.lctx = this.lo.getContext('2d');
    this.dark = aMk(AW * RS, AH * RS); this.dctx = this.dark.getContext('2d');
    this.grain = aMk(240, 136);
    this.toasts = []; this.sel = 0; this.rain = [];
    canvas.addEventListener('wheel', (e) => {
      if (this.active && this.dlg) this.dlg.scroll = Math.max(0, this.dlg.scroll + (e.deltaY > 0 ? -40 : 40));
    }, { passive: true });
  },

  // ---------- запуск и выход из сцены ----------
  // o: { x, y, dir — старт на карте; hero — id персонажа игрока; dlg — диалог сразу;
  //      card — карточка-заставка перед сценой; state — общее состояние; onExit(S) }
  start(mapId, o = {}) {
    this.init(document.getElementById('game'));
    this.o = o;
    this.heroId = o.hero || 'hero';
    this.S = o.state || { flags: {}, items: [], used: {} };
    this.active = true; this.dlg = null; this.toasts = [];
    document.body.classList.add('in-scene');
    this._prevTrack = AudioSys.lastTrack;
    AudioSys.stopMusic();
    const go = () => {
      this.state = 'play';
      this.loadMap(mapId, o.x || 0, o.y || 0, o.dir || 0);
      if (o.dlg) this.startDialog(o.dlg);
    };
    if (o.card) this.showCard({ ...o.card, then: go }); else go();
  },
  exit() {
    if (!this.active) return;
    this.active = false; this.dlg = null; this.state = 'play';
    document.body.classList.remove('in-scene');
    SceneMusic.stop();
    if (AudioSys.musicGain) AudioSys.musicGain.gain.value = 0.3;
    AudioSys.currentTrack = null;
    if (this._prevTrack) AudioSys.playMusic(this._prevTrack);
    const cb = this.o && this.o.onExit;
    if (cb) cb(this.S);
  },
  heroLook() {
    const o = this.o || {};
    if (o.heroLook) return typeof o.heroLook === 'function' ? o.heroLook(this.S) : o.heroLook;
    return (SceneData.chars[this.heroId] || {}).look;
  },

  // ---------- карточки (заставки) ----------
  showCard(card) {
    this.toasts = [];
    this.card = { ...card, t: 0, idx: 0 };
    this.state = 'card';
    if (card.music) SceneMusic.play(card.music);
  },

  transition(fn) { this.fadeT = 0; this.fadeFn = fn; this.fading = true; },

  // ---------- карты ----------
  loadMap(id, tx, ty, dir, exact) {
    const def = SceneData.maps[id];
    if (!def) { console.warn('SCENE: нет карты', id); return; }
    const rows = def.tiles;
    const m = {
      id, def, w: rows[0].length, h: rows.length, grid: rows.map(r => r.split('')),
      props: (def.props || []).map((p, i) => ({ ...p, _i: i })),
      npcs: (def.npcs || []).map(n => ({ ...n, dir: n.dir || 0, bob: Math.random() * 6 })),
    };
    m.solid = new Uint8Array(m.w * m.h);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (Art.solidTile(m.grid[y][x])) m.solid[y * m.w + x] = 1;
    for (const p of m.props) {
      const P = Art.props[p.k];
      if (!P || p.walk || P.walk) continue;
      const sr = P.solid === undefined ? [0, 0, P.w, P.h] : P.solid;
      if (!sr) continue;
      for (let y = 0; y < sr[3]; y++) for (let x = 0; x < sr[2]; x++) {
        const gx = p.x + sr[0] + x, gy = p.y + sr[1] + y;
        if (gx >= 0 && gy >= 0 && gx < m.w && gy < m.h) m.solid[gy * m.w + gx] = 1;
      }
    }
    m.bg = Art.bakeMap(m);
    m.sea = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.grid[y][x] === '~') m.sea.push([x, y]);
    this.map = m;
    this.zoom = def.zoom || 1;
    this.S.map = id;
    this.pl = { x: exact ? tx * TS : (tx + 0.5) * TS, y: exact ? ty * TS : (ty + 0.5) * TS + 6, dir: dir || 0, step: 0, st: 0, path: null, moving: false };
    this.target = null; this.exitArm = false;
    this.cam = { x: 0, y: 0 }; this.snapCam();
    this.rain = []; this.splash = []; this.puffs = []; this.flash = 0;
    if (def.music) SceneMusic.play(typeof def.music === 'function' ? def.music(this) : def.music);
    SceneMusic.weather(def.rain ? 1 : def.wind ? 0.5 : 0);
    this.placeLabel = { text: def.name, t: 0 };
    this._enterDlg = def.onEnter || null;
  },

  npcVisible(n) { return !n.if || this.cond(n.if); },
  solidAt(gx, gy) {
    const m = this.map;
    if (gx < 0 || gy < 0 || gx >= m.w || gy >= m.h) return true;
    if (m.solid[gy * m.w + gx]) return true;
    for (const n of m.npcs) if (this.npcVisible(n) && Math.floor(n.x) === gx && Math.floor(n.y) === gy) return true;
    return false;
  },

  // поиск пути по клеткам (8 направлений, без срезания углов)
  findPath(sx, sy, goal) {
    const m = this.map, W = m.w, H = m.h;
    const prev = new Int32Array(W * H).fill(-1);
    const start = sy * W + sx;
    prev[start] = start;
    const q = [start];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi], cx = c % W, cy = (c / W) | 0;
      if (goal(cx, cy)) {
        const path = [];
        let k = c;
        while (k !== start) { path.push([k % W, (k / W) | 0]); k = prev[k]; }
        return path.reverse();
      }
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (prev[n] !== -1 || this.solidAt(nx, ny)) continue;
        if (dx && dy && (this.solidAt(cx + dx, cy) || this.solidAt(cx, cy + dy))) continue;
        prev[n] = c; q.push(n);
      }
    }
    return null;
  },

  // ---------- состояние сцены ----------
  _condCache: {},
  cond(expr) {
    if (expr === undefined || expr === null || expr === '') return true;
    if (typeof expr === 'function') return !!expr(this.S, this);
    let fn = this._condCache[expr];
    if (!fn) {
      try { fn = new Function('f', 'i', 'S', 'return (' + expr + ');'); } catch (e) { console.warn('SCENE cond', expr, e); fn = () => false; }
      this._condCache[expr] = fn;
    }
    const S = this.S;
    const i = {}; S.items.forEach(k => i[k] = 1);
    try { return !!fn(S.flags, i, S); } catch (e) { return false; }
  },
  toast(text, color) { this.toasts.push({ text, color: color || '#e8d8b0', t: 0 }); },
  addItem(id, dlg) {
    if (this.S.items.includes(id)) return;
    this.S.items.push(id);
    const it = SceneData.items[id];
    if (dlg) dlg.say('', 'Взято: ' + (it ? it.name : id), 'sys');
    this.toast('ВЗЯТО: ' + (it ? it.name : id));
  },
  takeItem(id, dlg) {
    const i = this.S.items.indexOf(id);
    if (i < 0) return;
    this.S.items.splice(i, 1);
    const it = SceneData.items[id];
    if (dlg) dlg.say('', 'Больше нет: ' + (it ? it.name : id), 'sys');
  },

  // ---------- диалоги ----------
  startDialog(id) {
    if (this.dlg) return;
    this.pl.path = null; this.pl.moving = false; this.target = null;
    this.dlg = new ADialog(this, id);
  },
  endDialog(d) {
    if (this.dlg !== d) return;
    this.dlg = null;
    if (this.pendingExit) { this.pendingExit = false; this.pendingCard = null; this.pendingMap = null; this.transition(() => this.exit()); return; }
    if (this.pendingCard) {
      const c = this.pendingCard; this.pendingCard = null;
      const after = this.pendingMap; this.pendingMap = null;
      this.showCard({ ...c, then: () => { this.state = 'play'; if (after) this.goMap(after); } });
      return;
    }
    if (this.pendingMap) { const pm = this.pendingMap; this.pendingMap = null; this.goMap(pm); }
  },
  goMap(st) {
    this.transition(() => this.loadMap(st.map, st.x, st.y, st.dir));
  },
  faceNpc(id) {
    const n = this.map.npcs.find(n => n.id === id);
    if (!n) return;
    const dx = this.pl.x - (n.x + 0.5) * TS, dy = this.pl.y - (n.y + 0.5) * TS;
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
  },

  // ---------- взаимодействие с миром ----------
  targets() {
    const m = this.map, out = [];
    for (const n of m.npcs) {
      if (!this.npcVisible(n) || !n.dlg) continue;
      const px = (n.x + 0.5) * TS, py = (n.y + 0.5) * TS + 6;
      out.push({ kind: 'npc', ref: n, name: n.name || (SceneData.chars[n.ch] || {}).name || '?', dlg: n.dlg,
        rx: n.x, ry: n.y, rw: 1, rh: 1, hit: [px - 7, py - 26, 14, 28], cx: px, cy: py - 12 });
    }
    const add = (o, isProp) => {
      if (!o.dlg || (o.if && !this.cond(o.if))) return;
      const P = isProp ? Art.props[o.k] : null;
      const w = o.w || (P ? P.w : 1), h = o.h || (P ? P.h : 1);
      const up = P && P.up ? P.up : 0;
      out.push({ kind: 'obj', ref: o, name: typeof o.name === 'function' ? o.name(this) : o.name, dlg: o.dlg,
        rx: o.x, ry: o.y, rw: w, rh: h, hit: [o.x * TS, o.y * TS - up, w * TS, h * TS + up], cx: (o.x + w / 2) * TS, cy: (o.y + h / 2) * TS - up / 2 });
    };
    for (const p of m.props) add(p, true);
    for (const o of (m.def.objs || [])) add(o, false);
    return out;
  },
  hoverTarget(wx, wy) {
    let best = null;
    for (const t of this.targets()) {
      const [x, y, w, h] = t.hit;
      if (wx >= x && wy >= y && wx < x + w && wy < y + h) { if (!best || t.kind === 'npc' || (best.kind !== 'npc' && w * h < best.hit[2] * best.hit[3])) best = t; }
    }
    return best;
  },
  approach(t) {
    const pgx = Math.floor(this.pl.x / TS), pgy = Math.floor((this.pl.y - 2) / TS);
    const near = (x, y) => x >= t.rx - 1 && x <= t.rx + t.rw && y >= t.ry - 1 && y <= t.ry + t.rh;
    if (near(pgx, pgy)) { this.interact(t); return; }
    const path = this.findPath(pgx, pgy, near);
    if (!path) { this.interact(t); return; }
    this.pl.path = path; this.target = t;
  },
  interact(t) {
    this.pl.path = null; this.target = null;
    const dx = t.cx - this.pl.x, dy = t.cy - this.pl.y;
    this.pl.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
    if (t.kind === 'npc') this.faceNpc(t.ref.id);
    this.startDialog(typeof t.dlg === 'function' ? t.dlg(this) : t.dlg);
  },

  // ---------- обновление ----------
  update(dt) {
    this.t += dt;
    this.toasts.slice(0, 4).forEach(x => { x.t += dt; });
    this.toasts = this.toasts.filter(x => x.t < 3.6);
    if (this.shake > 0) this.shake -= dt;
    if (this.fading) {
      this.fadeT += dt;
      if (this.fadeFn && this.fadeT >= 0.4) { const f = this.fadeFn; this.fadeFn = null; f(); }
      if (this.fadeT >= 0.8) this.fading = false;
      return;
    }
    const st = this.state;
    if (st === 'card') this.updCard(dt);
    else if (st === 'play') this.updPlay(dt);
    else if (st === 'pause') this.updPause(dt);
    else if (st === 'settings') this.updSettings();
  },
  navUp() { return Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW'); },
  navDown() { return Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS'); },
  navOk() { return Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('KeyE'); },

  menuList(items, onPick) {
    const n = items.length;
    if (this.navUp()) { this.sel = (this.sel + n - 1) % n; ASfx.tick(); }
    if (this.navDown()) { this.sel = (this.sel + 1) % n; ASfx.tick(); }
    const mx = Input.mouse.x, my = Input.mouse.y;
    const rects = this._menuRects || [];
    rects.forEach((r, i) => { if (mx > r[0] && mx < r[0] + r[2] && my > r[1] && my < r[1] + r[3] && this._lastMx !== mx + ',' + my) { if (this.sel !== i) ASfx.tick(); this.sel = i; } });
    this._lastMx = mx + ',' + my;
    if (Input.consumeClick()) {
      const i = rects.findIndex(r => mx > r[0] && mx < r[0] + r[2] && my > r[1] && my < r[1] + r[3]);
      if (i >= 0) { this.sel = i; onPick(items[i]); return; }
    }
    if (this.navOk()) onPick(items[this.sel]);
  },


  updCard(dt) {
    const c = this.card;
    c.t += dt;
    const lines = c.lines || [];
    const head = (c.title ? 1.6 : 0);
    const shown = c.t - head;
    const go = Input.consumeClick() || this.navOk();
    if (go) {
      if (c.t < head) c.t = head;
      else if (c.idx < lines.length - 1 && (shown - c.idx * 0) >= 0) {
        // показать строку целиком / следующую
        if (c.lt !== undefined && c.lt < (lines[c.idx] || '').length) c.lt = 1e9;
        else { c.idx++; c.lt = 0; }
      } else if (c.idx >= lines.length - 1 && (c.lt === undefined || c.lt >= (lines[c.idx] || '').length || !lines.length)) {
        const f = c.then; this.card = null;
        this.transition(() => { if (f) f(); });
        return;
      } else c.lt = 1e9;
    }
    if (c.t > head) c.lt = (c.lt || 0) + dt * 45;
  },

  updPlay(dt) {
    const m = this.map, pl = this.pl;
    for (const n of m.npcs) n.bob += dt;
    if (m.def.tick) m.def.tick(this, dt);
    if (this.placeLabel) this.placeLabel.t += dt;
    this.updRain(dt);
    this.updWeather(dt);

    if (this.dlg) {
      this.updDialog(dt);
      this.updCam(dt);
      return;
    }
    if (this._enterDlg) {
      const e = this._enterDlg; this._enterDlg = null;
      for (const ed of (Array.isArray(e) ? e : [e])) {
        if ((!ed.if || this.cond(ed.if)) && !(ed.once && this.S.flags['ent_' + ed.dlg])) {
          if (ed.once) this.S.flags['ent_' + ed.dlg] = 1;
          this.startDialog(ed.dlg); return;
        }
      }
    }
    if (Input.wasPressed('Escape')) { this.state = 'pause'; this.sel = 0; ASfx.tick(); return; }
    this.reveal = Input.isDown('KeyQ') || (this.revealT || 0) > 0;
    if (this.revealT > 0) this.revealT -= dt;

    // клик
    const z = this.zoom || 1;
    const wx = Input.mouse.x / 2 / z + this.cam.x, wy = Input.mouse.y / 2 / z + this.cam.y;
    this.hover = Input.mouse.x > 0 ? this.hoverTarget(wx, wy) : null;
    if (Input.mouse.justDown) {
      const ui = this.uiClick(Input.mouse.x, Input.mouse.y);
      Input.consumeClick();
      if (!ui) {
        if (this.hover) this.approach(this.hover);
        else {
          const gx = Math.floor(wx / TS), gy = Math.floor(wy / TS);
          const pgx = Math.floor(pl.x / TS), pgy = Math.floor((pl.y - 2) / TS);
          let path = this.findPath(pgx, pgy, (x, y) => x === gx && y === gy);
          if (!path && !this.solidAt(gx, gy) === false) {
            // клик в стену — ближайшая доступная клетка
            path = this.findPath(pgx, pgy, (x, y) => Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1);
          }
          if (path) { pl.path = path; this.target = null; this.clickMark = { x: wx, y: wy, t: 0 }; }
        }
      }
    }
    if (this.clickMark) { this.clickMark.t += dt; if (this.clickMark.t > 0.6) this.clickMark = null; }

    // E — ближайший объект перед героем
    if (Input.wasPressed('KeyE') || Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      const t = this.nearTarget();
      if (t) { this.interact(t); return; }
    }

    // движение
    const run = Input.isDown('ShiftLeft') || Input.isDown('ShiftRight');
    const spd = run ? 86 : 54;
    let mx = 0, my = 0;
    if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) mx -= 1;
    if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) mx += 1;
    if (Input.isDown('KeyW') || Input.isDown('ArrowUp')) my -= 1;
    if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) my += 1;
    pl.moving = false;
    if (mx || my) {
      pl.path = null; this.target = null;
      const l = Math.hypot(mx, my); mx /= l; my /= l;
      this.moveBy(mx * spd * dt, my * spd * dt);
      pl.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 1 : 2) : (my < 0 ? 3 : 0);
      pl.moving = true;
    } else if (pl.path && pl.path.length) {
      const [gx, gy] = pl.path[0];
      const tx = (gx + 0.5) * TS, ty = (gy + 0.5) * TS + 6;
      const dx = tx - pl.x, dy = ty - pl.y, d = Math.hypot(dx, dy);
      const s = (run || pl.path.length > 6 ? 80 : 56) * dt;
      if (d <= s) { pl.x = tx; pl.y = ty; pl.path.shift(); }
      else { pl.x += dx / d * s; pl.y += dy / d * s; }
      if (d > 0.5) pl.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      pl.moving = true;
      if (!pl.path.length) { pl.path = null; if (this.target) this.interact(this.target); }
    }
    if (pl.moving) {
      pl.st += dt * (run ? 9 : 6.5);
      const ns = Math.floor(pl.st) % 4;
      if (ns !== pl.step && (ns === 1 || ns === 3)) ASfx.step(m.def.outdoor);
      pl.step = ns;
    } else { pl.step = 0; pl.st = 0; }

    this.checkZones();
    this.updCam(dt);
  },

  moveBy(dx, dy) {
    const pl = this.pl;
    const blocked = (x, y) => {
      const pts = [[x - 4, y - 4], [x + 4, y - 4], [x - 4, y], [x + 4, y]];
      return pts.some(([px, py]) => this.solidAt(Math.floor(px / TS), Math.floor(py / TS)));
    };
    if (!blocked(pl.x + dx, pl.y)) pl.x += dx;
    if (!blocked(pl.x, pl.y + dy)) pl.y += dy;
  },
  nearTarget() {
    const pl = this.pl;
    const fx = pl.x + [0, -10, 10, 0][pl.dir], fy = pl.y - 4 + [10, 0, 0, -12][pl.dir];
    let best = null, bd = 1e9;
    for (const t of this.targets()) {
      const cx = Math.max(t.rx * TS, Math.min(fx, (t.rx + t.rw) * TS));
      const cy = Math.max(t.ry * TS, Math.min(fy, (t.ry + t.rh) * TS));
      const d = Math.hypot(cx - fx, cy - fy);
      if (d < 14 && d < bd) { bd = d; best = t; }
    }
    return best;
  },
  checkZones() {
    const m = this.map, pl = this.pl;
    const gx = Math.floor(pl.x / TS), gy = Math.floor((pl.y - 2) / TS);
    const inR = (r) => gx >= r.x && gx < r.x + (r.w || 1) && gy >= r.y && gy < r.y + (r.h || 1);
    let onExit = false;
    for (const ex of (m.def.exits || [])) {
      if (!inR(ex)) continue;
      onExit = true;
      if (!this.exitArm) continue;
      if (ex.if && !this.cond(ex.if)) {
        if (ex.lock) { this.exitArm = false; this.startDialog(ex.lock); }
        continue;
      }
      if (ex.dlg) { this.exitArm = false; this.startDialog(ex.dlg); return; }
      this.exitArm = false;
      if (ex.to === '@exit') { this.transition(() => this.exit()); return; }
      this.transition(() => this.loadMap(ex.to, ex.tx, ex.ty, ex.dir));
      ASfx.door();
      return;
    }
    if (!onExit) this.exitArm = true;
    for (const tr of (m.def.triggers || [])) {
      if (!inR(tr)) continue;
      const key = 'trg_' + m.id + '_' + tr.dlg;
      if (tr.once !== false && this.S.flags[key]) continue;
      if (tr.if && !this.cond(tr.if)) continue;
      this.S.flags[key] = 1;
      this.startDialog(tr.dlg);
      return;
    }
  },

  snapCam() {
    const m = this.map;
    this.cam.x = this.camTX(); this.cam.y = this.camTY();
  },
  camTX() {
    const z = this.zoom || 1, VW = AW / z, side = this.dlg ? 190 / z : 0, off = side / 2, mw = this.map.w * TS;
    if (mw <= VW - side) return (mw - VW) / 2 + off;
    return Math.max(-side, Math.min(mw - VW + side, this.pl.x - VW / 2 + off));
  },
  camTY() {
    const z = this.zoom || 1, VH = AH / z, mh = this.map.h * TS;
    if (mh <= VH) return (mh - VH) / 2;
    return Math.max(0, Math.min(mh - VH, this.pl.y - 8 - VH / 2 + (this.map.def.camOffY || 0)));
  },
  updCam(dt) {
    const k = Math.min(1, dt * 5);
    this.cam.x += (this.camTX() - this.cam.x) * k;
    this.cam.y += (this.camTY() - this.cam.y) * k;
  },

  updWeather(dt) {
    const d = this.map.def;
    if (this.flash > 0) this.flash -= dt * 2.2;
    if (d.rain && d.outdoor && !d.memory) {
      this.boltT = (this.boltT === undefined ? 12 + Math.random() * 20 : this.boltT) - dt;
      if (this.boltT <= 0) {
        this.boltT = 18 + Math.random() * 28; this.flash = 1;
        setTimeout(() => ASfx.thunder(), 500 + Math.random() * 1500);
      }
      const z = this.zoom || 1;
      for (let i = 0; i < 3; i++) this.splash.push({ x: this.cam.x + Math.random() * AW / z, y: this.cam.y + Math.random() * AH / z, t: 0 });
    }
    for (const p of this.splash) p.t += dt;
    this.splash = this.splash.filter(p => p.t < 0.25);
    // дым курящих
    for (const n of this.map.npcs) {
      if (!n.smoke || !this.npcVisible(n)) continue;
      n._puff = (n._puff || Math.random()) - dt;
      if (n._puff <= 0) { n._puff = 0.35 + Math.random() * 0.5; this.puffs.push({ x: (n.x + 0.5) * TS + (n.dir === 1 ? -3 : 3), y: (n.y + 0.5) * TS + 6 - (n.pose === 'sit' ? 16 : 21), t: 0 }); }
    }
    for (const p of this.puffs) { p.t += dt; p.y -= dt * 9; p.x += dt * 4; }
    this.puffs = this.puffs.filter(p => p.t < 1.6);
  },
  updRain(dt) {
    const d = this.map && this.map.def;
    if (!d || !d.rain) { this.rain.length = 0; return; }
    while (this.rain.length < 140) this.rain.push({ x: Math.random() * (AW + 60), y: Math.random() * AH, s: 220 + Math.random() * 120 });
    for (const r of this.rain) { r.y += r.s * dt; r.x -= r.s * 0.25 * dt; if (r.y > AH) { r.y = -10; r.x = Math.random() * (AW + 60); } }
  },

  // клики по кнопкам интерфейса (осмотр, пауза)
  uiClick(x, y) {
    if (y < 44 && x > 960 - 170 && x < 960 - 66) { this.revealT = 3; return true; }
    if (y < 44 && x > 960 - 60) { this.state = 'pause'; this.sel = 0; return true; }
    return false;
  },

  // ---------- диалоговый ввод ----------
  updDialog(dt) {
    const d = this.dlg;
    d.age += dt;
    for (const l of d.log) l.t += dt;
    d.tick(dt);
    if (Input.wasPressed('Escape')) { this.state = 'pause'; this.sel = 0; return; }
    if (Input.wasPressed('PageUp')) d.scroll += 120;
    if (Input.wasPressed('PageDown')) d.scroll = Math.max(0, d.scroll - 120);
    const anyKey = () => Input.wasPressed('Space') || Input.wasPressed('Enter') || Input.wasPressed('KeyE');
    // пока текст печатается — клик дописывает его целиком
    if (d.busy()) {
      if (d.age > 0.08 && (Input.consumeClick() || anyKey())) { d.revealAll(); d.age = 0; }
      return;
    }
    const mx = Input.mouse.x, my = Input.mouse.y;
    if (d.choices) {
      const n = d.choices.length;
      for (let i = 0; i < Math.min(9, n); i++) if (Input.wasPressed('Digit' + (i + 1)) || Input.wasPressed('Numpad' + (i + 1))) { d.choose(d.choices[i]); return; }
      if (this.navUp()) { d.csel = (d.csel + n - 1 + (d.csel < 0 ? 1 : 0)) % n; ASfx.tick(); }
      if (this.navDown()) { d.csel = (d.csel + 1) % n; ASfx.tick(); }
      const rects = this._choiceRects || [];
      let hov = -1;
      rects.forEach((r, i) => { if (mx > r[0] && mx < r[0] + r[2] && my > r[1] && my < r[1] + r[3]) hov = i; });
      if (hov >= 0 && this._lastHov !== hov) { d.csel = hov; ASfx.tick(); }
      this._lastHov = hov;
      if (Input.consumeClick()) { if (hov >= 0 && d.choices[hov]) { d.choose(d.choices[hov]); return; } }
      if (anyKey() && d.csel >= 0) { d.choose(d.choices[d.csel]); return; }
    } else if (d.waiting) {
      if (d.age > 0.12 && (Input.consumeClick() || anyKey())) { d.age = 0; d.next(); }
    }
  },

  // ---------- пауза ----------
  pauseItems() {
    return [
      { id: 'back', text: 'ПРОДОЛЖИТЬ' },
      { id: 'settings', text: 'НАСТРОЙКИ' },
    ].concat(this.o && this.o.canQuit === false ? [] : [{ id: 'quit', text: 'ВЫЙТИ ИЗ СЦЕНЫ' }]);
  },
  updPause() {
    if (Input.wasPressed('Escape')) { this.state = 'play'; return; }
    this.menuList(this.pauseItems(), (it) => {
      ASfx.select();
      if (it.id === 'back') this.state = 'play';
      else if (it.id === 'settings') this.openSettings();
      else if (it.id === 'quit') { this.dlg = null; this.state = 'play'; this.transition(() => this.exit()); }
    });
  },

  inR(x, y, r) { return x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3]; },

  // =================================================================
  // ОТРИСОВКА
  // =================================================================
  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 960, 540);
    const st = this.state;
    if (st === 'card') { if (this.card) this.drawCard(ctx); }
    else if (this.map) {
      this.drawWorld();
      const sh = this.shake > 0 ? this.shake * 10 : 0;
      if (this.map.def.memory) ctx.filter = 'sepia(0.75) contrast(1.15) brightness(1.05)';
      ctx.drawImage(this.lo, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 960, 540);
      ctx.filter = 'none';
      if (this.flash > 0) { ctx.fillStyle = `rgba(210,220,255,${Math.min(0.55, this.flash * 0.55)})`; ctx.fillRect(0, 0, 960, 540); }
      if (this.map.def.memory) {
        // края воспоминания размыты светом
        const g = ctx.createRadialGradient(480, 270, 200, 480, 270, 560);
        g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(1, 'rgba(255,236,200,0.28)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
      }
      this.drawPost(ctx);
      this.drawHud(ctx);
      if (this.dlg) this.drawDialog(ctx);
      if (st === 'pause') this.drawPause(ctx);
      if (st === 'settings') this.drawSettings(ctx);
    }
    this.drawToasts(ctx);
    if (this.fading) {
      const a = this.fadeT < 0.4 ? this.fadeT / 0.4 : 1 - (this.fadeT - 0.4) / 0.4;
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, a))})`; ctx.fillRect(0, 0, 960, 540);
    }
    ctx.restore();
  },

  drawWorld() {
    const c = this.lctx, m = this.map, cam = this.cam, t = this.t, z = this.zoom || 1;
    c.setTransform(RS, 0, 0, RS, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = m.def.void || '#050507'; c.fillRect(0, 0, AW, AH);
    const cx = Math.round(cam.x * z) / z, cy = Math.round(cam.y * z) / z;
    c.save(); c.scale(z, z); c.translate(-cx, -cy);
    c.drawImage(m.bg, 0, 0, m.w * TS, m.h * TS);
    // море — анимированное
    const x0 = Math.floor(cx / TS) - 1, x1 = x0 + AW / z / TS + 3, y0 = Math.floor(cy / TS) - 1, y1 = y0 + AH / z / TS + 3;
    for (const [sx, sy] of m.sea) if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) Art.sea(c, sx, sy, t, m);
    // объекты и персонажи по глубине
    const list = [];
    for (const p of m.props) {
      if (p.if && !this.cond(p.if)) continue;
      const P = Art.props[p.k]; if (!P) continue;
      // мягкая тень под мебелью
      if (!P.walk && !p.walk && P.solid !== null && (P.z || 0) > -100 && !P.noShadow) {
        const w = (p.w || P.w) * TS, by = (p.y + P.h) * TS;
        c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(p.x * TS + 1, by - 2, w - 2, 3);
        c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(p.x * TS - 1, by - 1, w + 2, 3);
      }
      list.push({ y: (p.y + P.h) * TS + (P.z || 0), draw: () => P.draw(c, p.x * TS, p.y * TS, p, t, this) });
    }
    for (const n of m.npcs) {
      if (!this.npcVisible(n)) continue;
      const L = (SceneData.chars[n.ch] || {}).look;
      const px = (n.x + 0.5) * TS, py = (n.y + 0.5) * TS + 6;
      list.push({ y: py, draw: () => Art.char(c, L, n.dir, 0, px, py, n.pose, n.bob) });
    }
    const pl = this.pl;
    const PL = this.heroLook();
    list.push({ y: pl.y, draw: () => Art.char(c, PL, pl.dir, pl.step, pl.x, pl.y, null, t) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
    // Q — показать всё, с чем можно взаимодействовать
    if (this.reveal && !this.dlg) {
      const k = 0.6 + 0.4 * Math.sin(t * 6);
      for (const tg of this.targets()) {
        c.fillStyle = `rgba(255,233,176,${k})`;
        const yy = tg.kind === 'npc' ? tg.hit[1] - 3 : tg.cy;
        c.fillRect(tg.cx - 1, yy - 1, 3, 3);
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(tg.cx, yy + 2, 1, 1);
      }
    }
    // подсветка цели
    const h = this.dlg ? null : this.hover;
    if (h) {
      c.strokeStyle = 'rgba(255,236,190,0.55)'; c.lineWidth = 1;
      if (h.kind === 'npc') {
        const yy = h.hit[1] - 4 + Math.sin(t * 5) * 1.5;
        c.fillStyle = '#ffe9b0'; c.fillRect(h.cx - 1, yy, 3, 2); c.fillRect(h.cx, yy + 2, 1, 1);
      } else {
        const [x, y, w, hh] = h.hit;
        c.strokeRect(x + 0.5, y + 0.5, w - 1, hh - 1);
      }
    }
    // брызги дождя и дым
    for (const p of this.splash) {
      const r = p.t * 12;
      c.fillStyle = `rgba(190,205,225,${0.5 * (1 - p.t / 0.25)})`;
      if (r < 1.5) c.fillRect(p.x, p.y, 0.5, 0.5); else { c.fillRect(p.x - r, p.y, 0.5, 0.5); c.fillRect(p.x + r, p.y, 0.5, 0.5); c.fillRect(p.x, p.y - r * 0.5, 0.5, 0.5); }
    }
    for (const p of this.puffs) {
      const a = 0.35 * (1 - p.t / 1.6), sz = 1 + p.t * 2;
      c.fillStyle = `rgba(200,200,205,${a})`; c.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    for (const n of this.map.npcs) if (n.smoke && this.npcVisible(n) && Math.sin(this.t * 1.3 + n.x) > -0.2) {
      const px = (n.x + 0.5) * TS + (n.dir === 1 ? -4 : n.dir === 2 ? 4 : 3), py = (n.y + 0.5) * TS + 6 - (n.pose === 'sit' ? 14 : 19);
      c.fillStyle = Math.sin(this.t * 5) > 0 ? '#ff8a3a' : '#ffcf6a'; c.fillRect(px, py, 1, 1);
    }
    if (this.clickMark) {
      const k = this.clickMark.t / 0.6;
      c.strokeStyle = `rgba(255,236,190,${0.6 * (1 - k)})`;
      c.beginPath(); c.ellipse(this.clickMark.x, this.clickMark.y, 3 + k * 5, 1.5 + k * 2.5, 0, 0, 7); c.stroke();
    }
    c.restore();
    this.drawLight(c, cx, cy);
    // дождь
    if (this.rain.length) {
      c.strokeStyle = 'rgba(170,190,215,0.3)'; c.lineWidth = 0.5; c.beginPath();
      for (const r of this.rain) { c.moveTo(r.x, r.y); c.lineTo(r.x - 2, r.y + 7); }
      c.stroke();
    }
  },

  drawLight(c, cx, cy) {
    const m = this.map, d = this.dctx, def = m.def;
    const amb = def.dark === undefined ? 0.5 : def.dark;
    if (amb <= 0) return;
    d.globalCompositeOperation = 'source-over';
    d.setTransform(RS, 0, 0, RS, 0, 0);
    d.clearRect(0, 0, AW, AH);
    d.fillStyle = def.tint || '#060914';
    d.globalAlpha = amb; d.fillRect(0, 0, AW, AH); d.globalAlpha = 1;
    d.globalCompositeOperation = 'destination-out';
    const lights = (def.lights || []).filter(l => !l.if || this.cond(l.if));
    const pl = this.pl;
    const z = this.zoom || 1;
    const all = lights.map(l => ({ x: (l.x * TS - cx) * z, y: (l.y * TS - cy) * z, r: l.r * z, a: l.a === undefined ? 1 : l.a, f: l.flick, c: l.c, beam: l.beam }));
    all.push({ x: (pl.x - cx) * z, y: (pl.y - 10 - cy) * z, r: (def.selfLight || 34) * z, a: 0.55 });
    for (const l of all) {
      let r = l.r, a = l.a;
      if (l.f) { const k = Math.sin(this.t * 13 + l.x) * Math.sin(this.t * 7.3 + l.y); a *= 0.85 + 0.15 * k; if (Math.sin(this.t * 1.7 + l.x) > 0.97) a *= 0.3; }
      if (l.beam) continue;
      const g = d.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.fillRect(l.x - r, l.y - r, r * 2, r * 2);
    }
    // луч маяка
    for (const l of all) if (l.beam) {
      const ang = this.t * 0.9;
      d.save(); d.translate(l.x, l.y);
      for (const s of [0, Math.PI]) {
        const g = d.createRadialGradient(0, 0, 0, 0, 0, l.r);
        g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = g; d.beginPath(); d.moveTo(0, 0); d.arc(0, 0, l.r, ang + s - 0.18, ang + s + 0.18); d.closePath(); d.fill();
      }
      d.restore();
    }
    d.globalCompositeOperation = 'source-over';
    c.drawImage(this.dark, 0, 0, AW, AH);
    // цветное свечение
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const l of all) {
      if (!l.c) continue;
      const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
      g.addColorStop(0, l.c); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = 0.16 * l.a; c.fillStyle = g; c.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    c.restore();
  },

  // зерно и виньетка поверх
  drawPost(ctx) {
    if (!this._grainT || this.t - this._grainT > 0.09) {
      this._grainT = this.t;
      const g = this.grain.getContext('2d'), id = g.createImageData(240, 136), a = id.data;
      for (let i = 0; i < a.length; i += 4) { const v = Math.random() * 255; a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 14; }
      g.putImageData(id, 0, 0);
    }
    ctx.drawImage(this.grain, 0, 0, 960, 540);
    if (!this._vig) {
      this._vig = aMk(960, 540);
      const v = this._vig.getContext('2d');
      const g = v.createRadialGradient(480, 270, 220, 480, 270, 620);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.72)');
      v.fillStyle = g; v.fillRect(0, 0, 960, 540);
    }
    ctx.drawImage(this._vig, 0, 0);
  },

  drawHud(ctx) {
    if (this.dlg) return;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = `bold 13px ${AMONO}`; ctx.fillStyle = '#e8d8b0';
    const head = [this.S.time, (this.map.def.name || '').toUpperCase()].filter(Boolean).join('  ·  ');
    if (head) ctx.fillText(head, 18, 26);
    if (this.S.goal) { ctx.font = `italic 14px ${AFONT}`; ctx.fillStyle = 'rgba(232,216,176,0.75)'; ctx.fillText('— ' + this.S.goal, 18, 46); }
    // кнопки
    const btn = (x, w, label, hot) => {
      ctx.fillStyle = 'rgba(10,10,14,0.65)'; ctx.fillRect(x, 10, w, 28);
      ctx.strokeStyle = hot ? '#e8c76a' : 'rgba(232,216,176,0.4)'; ctx.strokeRect(x + 0.5, 10.5, w - 1, 27);
      ctx.fillStyle = hot ? '#e8c76a' : '#e8d8b0'; ctx.font = `bold 12px ${AMONO}`; ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, 29);
    };
    btn(960 - 170, 104, 'ОСМОТР [Q]', this.reveal);
    btn(960 - 60, 46, 'II', false);
    // название места
    const pl = this.placeLabel;
    if (pl && pl.t < 4 && pl.text && this.state === 'play') {
      const a = pl.t < 0.5 ? pl.t / 0.5 : pl.t > 3 ? 4 - pl.t : 1;
      ctx.globalAlpha = Math.max(0, a);
      ctx.textAlign = 'center'; ctx.font = `italic 26px ${AFONT}`; ctx.fillStyle = '#e8d8b0';
      ctx.fillText(pl.text, 480, 110);
      ctx.fillStyle = 'rgba(232,216,176,0.5)'; ctx.fillRect(400, 122, 160, 1);
      ctx.globalAlpha = 1;
    }
    // подпись под курсором
    const h = this.hover;
    if (h && h.name) {
      ctx.font = `14px ${AFONT}`; ctx.textAlign = 'left';
      const w = ctx.measureText(h.name).width + 16;
      let x = Input.mouse.x + 14, y = Input.mouse.y + 8;
      if (x + w > 950) x = Input.mouse.x - w - 8;
      ctx.fillStyle = 'rgba(8,8,12,0.85)'; ctx.fillRect(x, y, w, 24);
      ctx.fillStyle = '#ffe9b0'; ctx.fillText(h.name, x + 8, y + 17);
    }
    // подсказка E
    const nt = this.nearTarget();
    if (nt && !Input.isMobile) {
      ctx.textAlign = 'center'; ctx.font = `13px ${AMONO}`; ctx.fillStyle = 'rgba(232,216,176,0.8)';
      ctx.fillText(`E — ${nt.name}`, 480, 520);
    }
  },

  drawToasts(ctx) {
    if (this.state === 'pause' || this.state === 'settings') return;
    let y = 70;
    ctx.textAlign = 'center';
    for (const t of this.toasts.slice(0, 4)) {
      const a = t.t < 0.3 ? t.t / 0.3 : t.t > 3 ? (3.6 - t.t) / 0.6 : 1;
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = `bold 14px ${AMONO}`;
      const w = ctx.measureText(t.text).width + 30;
      const x = this.dlg ? 290 : 480;
      ctx.fillStyle = 'rgba(8,8,12,0.88)'; ctx.fillRect(x - w / 2, y - 18, w, 28);
      ctx.fillStyle = t.color; ctx.fillRect(x - w / 2, y - 18, 3, 28);
      ctx.fillText(t.text, x, y);
      y += 34;
    }
    ctx.globalAlpha = 1;
  },

  // ---------- панель диалога (как книга справа) ----------
  drawDialog(ctx) {
    const d = this.dlg, big = this.opt('big');
    const W = big ? 470 : 404, X = 960 - W - 10, PAD = 22, TW = W - PAD * 2;
    const FS = big ? 18 : 15, LH = big ? 24 : 20;
    const g = ctx.createLinearGradient(X - 70, 0, X + 10, 0);
    g.addColorStop(0, 'rgba(6,6,9,0)'); g.addColorStop(1, 'rgba(6,6,9,0.95)');
    ctx.fillStyle = g; ctx.fillRect(X - 70, 0, 80, 540);
    ctx.fillStyle = 'rgba(6,6,9,0.95)'; ctx.fillRect(X + 10, 0, W, 540);
    // строки после печатающейся не показываем
    const pend = d.pending();
    const upto = pend ? d.log.indexOf(pend) : d.log.length - 1;
    // портрет того, кто говорит сейчас
    const cur = d.log[upto];
    const sp = cur && SceneData.chars[cur.who] ? SceneData.chars[cur.who] : (d.speaker && SceneData.chars[d.speaker]);
    ctx.textAlign = 'left';
    if (sp) {
      ctx.fillStyle = '#000'; ctx.fillRect(X + PAD - 2, 16, 88, 88);
      const look = sp === SceneData.chars[this.heroId] ? (this.heroLook() || sp.look) : sp.look;
      Art.portrait(ctx, look, X + PAD, 18, 84 / 36, sp.color);
      ctx.strokeStyle = sp.color || '#e8d8b0'; ctx.strokeRect(X + PAD - 1.5, 16.5, 87, 87);
      ctx.fillStyle = sp.color || '#e8d8b0'; ctx.font = `bold 17px ${AMONO}`; ctx.fillText(sp.name, X + PAD + 100, 48);
      ctx.fillStyle = 'rgba(232,216,176,0.55)'; ctx.font = `italic 13px ${AFONT}`;
      aWrap(ctx, (typeof sp.role === 'function' ? sp.role(this.S) : sp.role) || '', TW - 100).forEach((l, i) => ctx.fillText(l, X + PAD + 100, 68 + i * 16));
    }
    ctx.fillStyle = 'rgba(232,216,176,0.2)'; ctx.fillRect(X + PAD, 116, TW, 1);

    // выборы снизу — только когда всё допечатано
    const rects = [];
    let chH = 0;
    const chLines = [];
    const showCh = d.choices && !pend;
    ctx.font = `${FS}px ${AFONT}`;
    if (showCh) {
      d.choices.forEach((ch, i) => {
        const pre = '', modTxt = '';
        const lines = aWrap(ctx, `${i + 1}. ${pre}${ch.t}`, TW - 6);
        chLines.push({ lines, pre, ch, modTxt });
        chH += lines.length * (LH - 1) + 8 + (modTxt ? 14 : 0);
      });
    } else if (d.waiting && !pend) chH = 30;
    const bottom = 532;
    let cy = bottom - chH;
    if (showCh) {
      chLines.forEach((cl, i) => {
        const h = cl.lines.length * (LH - 1) + 4 + (cl.modTxt ? 14 : 0);
        const hot = d.csel === i;
        rects.push([X + PAD - 6, cy - 2, TW + 12, h + 2]);
        if (hot) { ctx.fillStyle = 'rgba(232,199,106,0.12)'; ctx.fillRect(X + PAD - 6, cy - 2, TW + 12, h + 2); }
        const col = '#d8c08a';
        ctx.font = `${FS}px ${AFONT}`;
        cl.lines.forEach((l, j) => {
          const base = hot ? '#fff3d0' : '#d8c08a';
          if (j === 0 && cl.pre) {
            const num = `${i + 1}. `;
            ctx.fillStyle = base; ctx.fillText(num, X + PAD, cy + FS - 1);
            const nw = ctx.measureText(num).width;
            ctx.fillStyle = col; ctx.fillText(cl.pre, X + PAD + nw, cy + FS - 1);
            const pw = ctx.measureText(cl.pre).width;
            ctx.fillStyle = base; ctx.fillText(l.slice(num.length + cl.pre.length), X + PAD + nw + pw, cy + FS - 1);
          } else { ctx.fillStyle = base; ctx.fillText(l, X + PAD, cy + FS - 1); }
          cy += LH - 1;
        });
        if (cl.modTxt) { ctx.font = `11px ${AMONO}`; ctx.fillStyle = 'rgba(232,216,176,0.5)'; ctx.fillText('    ' + cl.modTxt, X + PAD, cy + 9); ctx.font = `${FS}px ${AFONT}`; cy += 14; }
        cy += 8;
      });
    } else if (d.waiting && !pend) {
      const a = 0.55 + 0.45 * Math.sin(this.t * 4);
      ctx.fillStyle = `rgba(232,199,106,${a})`; ctx.font = `bold 13px ${AMONO}`; ctx.textAlign = 'right';
      ctx.fillText(Input.isMobile ? 'ДАЛЕЕ ▸' : 'ДАЛЕЕ ▸  (пробел / клик)', X + PAD + TW, bottom - 8);
      ctx.textAlign = 'left';
    }
    this._choiceRects = showCh ? rects : [];

    // журнал реплик — снизу вверх
    const top = 128, logBottom = bottom - chH - 12;
    ctx.save(); ctx.beginPath(); ctx.rect(X, top, W + 10, logBottom - top); ctx.clip();
    let y = logBottom + d.scroll, hidden = false;
    for (let i = upto; i >= 0; i--) {
      const L = d.log[i];
      const blocks = this.fmtLine(ctx, L, TW, FS, LH);
      y -= blocks.h;
      if (y + blocks.h < top) { hidden = true; break; }
      ctx.globalAlpha = i === upto ? Math.min(1, L.t * 6 + 0.3) : (upto - i > 8 ? 0.45 : 0.72);
      blocks.draw(X + PAD, y);
      y -= 10;
    }
    ctx.globalAlpha = 1; ctx.restore();
    const fg = ctx.createLinearGradient(0, top, 0, top + 40);
    fg.addColorStop(0, 'rgba(6,6,9,0.95)'); fg.addColorStop(1, 'rgba(6,6,9,0)');
    ctx.fillStyle = fg; ctx.fillRect(X + 10, top, W, 40);
    if (hidden || d.scroll > 0) {
      ctx.fillStyle = 'rgba(232,216,176,0.35)'; ctx.font = `11px ${AMONO}`; ctx.textAlign = 'right';
      ctx.fillText(d.scroll > 0 ? 'колесо / PgDn — к последней реплике' : 'колесо / PgUp — раньше', X + PAD + TW, 110);
      ctx.textAlign = 'left';
    }
  },

  fmtLine(ctx, L, TW, FS = 15, LH = 20) {
    const kind = L.kind;
    let head = '', headCol = '#e8d8b0', font = `${FS}px ${AFONT}`, col = '#e6dcc6';
    const ch = SceneData.chars[L.who];
    const small = kind.startsWith('sys');
    if (kind === 'narr') { font = `italic ${FS}px ${AFONT}`; col = '#a9a294'; }
    else if (kind === 'act') { font = `italic ${FS}px ${AFONT}`; col = '#8f8a80'; }
    else if (kind.startsWith('sys')) { font = `bold ${FS - 3}px ${AMONO}`; col = kind === 'sysgood' ? '#9fe0a0' : kind === 'sysbad' ? '#ff8a6c' : '#c9b27a'; }
    else if (ch) { head = ch.name; headCol = ch.color || '#e8d8b0'; if (kind === 'said') col = '#cfc4ad'; }
    ctx.font = font;
    const indent = 0;
    const text = head ? head + ' — ' + L.text : L.text;
    const lines = aWrap(ctx, text, TW - indent);
    const lh = small ? FS + 1 : LH;
    const h = lines.length * lh;
    return {
      h,
      draw: (x, y) => {
        ctx.font = font; ctx.textAlign = 'left';
        let budget = L.shown >= 1e8 ? 1e9 : Math.floor(L.shown) + (head ? head.length + 3 : 0);
        lines.forEach((l, i) => {
          if (budget <= 0) return;
          const part = l.slice(0, budget);
          budget -= l.length + 1;
          const yy = y + (i + 1) * lh - 5;
          if (i === 0 && head) {
            const hw = ctx.measureText(head).width;
            ctx.fillStyle = headCol; ctx.fillText(part.slice(0, head.length), x, yy);
            ctx.fillStyle = col; ctx.fillText(part.slice(head.length), x + hw, yy);
          } else { ctx.fillStyle = col; ctx.fillText(part, x + indent, yy); }
        });
      },
    };
  },


  drawCard(ctx) {
    const c = this.card;
    ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, 960, 540);
    this.drawPost(ctx);
    const a = Math.min(1, c.t / 1);
    ctx.textAlign = 'center';
    let y = 150;
    if (c.title) {
      ctx.globalAlpha = a;
      if (c.kicker) { ctx.fillStyle = 'rgba(232,199,106,0.8)'; ctx.font = `bold 14px ${AMONO}`; ctx.fillText(c.kicker, 480, y - 40); }
      ctx.fillStyle = '#efe2c0'; ctx.font = `bold 40px ${AFONT}`; ctx.fillText(c.title, 480, y);
      if (c.sub) { ctx.fillStyle = 'rgba(232,216,176,0.6)'; ctx.font = `italic 18px ${AFONT}`; ctx.fillText(c.sub, 480, y + 34); }
      ctx.globalAlpha = 1;
      y += 100;
    } else y = 180;
    const lines = c.lines || [];
    ctx.font = `italic 18px ${AFONT}`;
    if (!(c.title && c.t < 1.6)) {
      // показываем столько последних строк, сколько влезает до низа экрана
      const blocks = [];
      for (let i = 0; i <= Math.min(c.idx, lines.length - 1); i++) {
        let str = lines[i];
        if (i === c.idx) str = str.slice(0, Math.floor(c.lt || 0));
        const full = aWrap(ctx, lines[i], 720);
        blocks.push({ i, wl: aWrap(ctx, str, 720), h: full.length * 26 + 10 });
      }
      let total = blocks.reduce((a, b) => a + b.h, 0);
      while (blocks.length > 1 && y + total > 480) total -= blocks.shift().h;
      for (const b of blocks) {
        ctx.fillStyle = b.i === c.idx ? '#e6dcc6' : 'rgba(230,220,198,0.5)';
        let yy = y;
        b.wl.forEach(l => { ctx.fillText(l, 480, yy); yy += 26; });
        y += b.h;
      }
    }
    if (c.t > 1.2) {
      ctx.fillStyle = `rgba(232,199,106,${0.5 + 0.4 * Math.sin(this.t * 3)})`; ctx.font = `bold 12px ${AMONO}`;
      ctx.fillText('пробел / клик', 480, 510);
    }
  },

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(4,4,7,0.8)'; ctx.fillRect(0, 0, 960, 540);
    ctx.textAlign = 'center'; ctx.fillStyle = '#efe2c0'; ctx.font = `bold 34px ${AFONT}`;
    ctx.fillText('ПАУЗА', 480, 150);
    ctx.fillStyle = 'rgba(232,216,176,0.5)'; ctx.font = `italic 15px ${AFONT}`;
    ctx.fillText(this.o && this.o.pauseText || 'Сцена подождёт.', 480, 178);
    const rects = [];
    this.pauseItems().forEach((it, i) => {
      const y = 240 + i * 44, hot = this.sel === i;
      ctx.font = `${hot ? 'bold ' : ''}18px ${AMONO}`;
      ctx.fillStyle = hot ? '#e8c76a' : 'rgba(232,216,176,0.75)';
      ctx.fillText(it.text, 480, y);
      rects.push([300, y - 26, 360, 38]);
    });
    this._menuRects = rects;
  },


};

window.SCENE = SCENE;

// Пока идёт сцена, она забирает цикл игры целиком (main.js при этом не трогаем)
if (typeof Game === 'function' && !Game.prototype._sceneHooked) {
  const upd = Game.prototype.update, ren = Game.prototype.render;
  Game.prototype._sceneHooked = true;
  Game.prototype.update = function (dt) { return SCENE.active ? SCENE.update(dt) : upd.call(this, dt); };
  Game.prototype.render = function () { return SCENE.active ? SCENE.render() : ren.call(this); };
}
