// =====================================================================
// РАССЛЕДОВАНИЕ АУЛЕТА — движок сюжетного DLC.
// Пиксельный мир 480×270 (тайл 16), растянутый ×2 на холст 960×540.
// Исследование (клик или WASD), диалоги с внутренними голосами и проверками,
// блокнот (дело, улики, мысли, люди), самообладание, сохранения.
// Контент (карты и диалоги) — в story_ch*.js, формат описан в story_ch0.js.
// =====================================================================

const AW = 480, AH = 270, TS = 16;
const AFONT = 'Georgia, "Times New Roman", serif';
const AMONO = '"Courier New", monospace';
const ASAVE = 'aulet_save';

// Четыре стороны Аулета
const AVOICE = {
  R: { name: 'РАССУДОК', color: '#8fb8ff', desc: 'Холодная логика. Детали, протоколы, время и расстояния. Не умеет утешать.' },
  I: { name: 'ЧУТЬЁ',    color: '#d39cff', desc: 'Люди. Ложь, страх, усталость, то, что говорят руки, пока рот молчит.' },
  H: { name: 'ХВАТКА',   color: '#ff7a5c', desc: 'Тело и улица. Давление, угроза, решимость. Иногда — кулак раньше мысли.' },
  M: { name: 'ПАМЯТЬ',   color: '#e8c76a', desc: 'Город и прошлое. Знает больше всех. Ранит сильнее всех.' },
};

// Реестр контента: главы дополняют его через Object.assign
const AuletStory = { maps: {}, dlg: {}, clues: {}, items: {}, people: {}, thoughts: {}, tasks: {}, chars: {}, chapters: {} };

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
const aDiff = (dc) => dc <= 8 ? 'Легко' : dc <= 10 ? 'Средне' : dc <= 12 ? 'Сложно' : dc <= 14 ? 'Очень сложно' : 'Почти невозможно';

// ---------------------------------------------------------------------
// Диалог: стек шагов, журнал реплик, выборы и проверки
// ---------------------------------------------------------------------
class ADialog {
  constructor(eng, id) {
    this.e = eng; this.stack = []; this.log = []; this.choices = null; this.waiting = false;
    this.speaker = null; this.scroll = 0; this.csel = -1; this.age = 0;
    this.push(id); this.run();
  }
  push(id) {
    const steps = AuletStory.dlg[id];
    if (!steps) { console.warn('AULET: нет диалога', id); return; }
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
    this.log.push({ who, text, kind: kind || 'line', t: 0 });
    this.scroll = 0;
    if (who && AuletStory.chars[who]) this.speaker = who;
  }

  exec(st, fr) {
    const E = this.e, S = E.S;
    if (Array.isArray(st)) {
      let [who, text] = st;
      const pm = /^([RIHM])\?(\d+)$/.exec(who);
      if (pm) {                                   // пассивная проверка: голос говорит, если достаточно силён
        if (E.voiceLvl(pm[1]) + 6 < +pm[2]) return;
        this.say(pm[1], text, 'passive');
      } else this.say(who, text, AVOICE[who] ? 'voice' : who === 'n' ? 'narr' : 'line');
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
    if (st.chk) {
      const ok = this.roll(st.chk, st.dc, st.label);
      const branch = ok ? st.ok : st.no;
      if (typeof branch === 'string') { this.stack = []; this.push(branch); }
      else if (branch) this.pushSteps(branch, fr.id);
      return;
    }
    if (st.set) { if (typeof st.set === 'string') S.flags[st.set] = true; else Object.assign(S.flags, st.set); }
    if (st.unset) delete S.flags[st.unset];
    if (st.add) for (const k in st.add) S.flags[k] = (S.flags[k] || 0) + st.add[k];
    if (st.clue) E.addClue(st.clue, this);
    if (st.item) E.addItem(st.item, this);
    if (st.take) E.takeItem(st.take, this);
    if (st.task) E.setTask(st.task, this);
    if (st.done) E.doneTask(st.done, this);
    if (st.person) E.addPerson(st.person);
    if (st.nerve) E.nerve(st.nerve, this);
    if (st.voice) for (const k in st.voice) { S.voices[k] = (S.voices[k] || 0) + st.voice[k]; this.say('', `${AVOICE[k].name} ${st.voice[k] > 0 ? '+' : ''}${st.voice[k]} (теперь ${S.voices[k]})`, 'sys'); }
    if (st.time) S.time = st.time;
    if (st.music) AuletMusic.play(st.music);
    if (st.sfx) ASfx[st.sfx] && ASfx[st.sfx]();
    if (st.map) E.pendingMap = st;
    if (st.card) E.pendingCard = st.card;
    if (st.fn) st.fn(E, this);
    if (st.thought) S.thoughts[st.thought] = 1;
    if (st.face) E.faceNpc(st.face);
    if (st.sys) this.say('', st.sys, 'sys');
    if (st.go) { this.stack = []; this.push(st.go); return; }
    if (st.call) { this.push(st.call); return; }
    if (st.end) return 'end';
  }

  ckey(ch, fr) { return ch.id || (fr.id + '|' + ch.t); }

  chance(v, dc) {
    const lvl = this.e.voiceLvl(v);
    let n = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === 12 || (a + b !== 2 && a + b + lvl >= dc)) n++;
    return Math.round(n / 36 * 100);
  }
  roll(v, dc, label) {
    const lvl = this.e.voiceLvl(v);
    const a = 1 + (Math.random() * 6 | 0), b = 1 + (Math.random() * 6 | 0);
    const ok = a + b === 12 || (a + b !== 2 && a + b + lvl >= dc);
    this.say(v, `${AVOICE[v].name} · ${aDiff(dc)} ${dc} — кости ${a}+${b}, навык ${lvl}: ${a + b + lvl}. ${ok ? 'УСПЕХ' : 'ПРОВАЛ'}`, ok ? 'rollok' : 'rollno');
    ok ? ASfx.ok() : ASfx.no();
    this.e.S.stats = this.e.S.stats || { ok: 0, no: 0 };
    this.e.S.stats[ok ? 'ok' : 'no']++;
    return ok;
  }

  choose(ch) {
    const S = this.e.S;
    if (ch.once !== false) S.used[ch._k] = 1;
    this.choices = null; this.csel = -1;
    const isAct = ch.t[0] === '[' || ch.t[0] === '(';
    this.say(isAct ? '' : 'aulet', ch.t, isAct ? 'act' : 'line');
    ASfx.tick();
    if (ch.go) { this.stack = []; this.push(ch.go); }
    if (ch.chk) {
      const ok = this.roll(ch.chk[0], ch.chk[1]);
      const br = ok ? ch.ok : ch.no;
      if (typeof br === 'string') { this.stack = []; this.push(br); }
      else if (br) this.pushSteps(br);
    } else if (ch.do) this.pushSteps(ch.do);
    if (ch.end) this.stack = [];
    this.run();
  }

  next() { if (this.waiting) { this.waiting = false; this.run(); } }
}

// ---------------------------------------------------------------------
// Главный объект DLC
// ---------------------------------------------------------------------
const AULET = {
  active: false, inited: false, state: 'title', t: 0,

  init(canvas) {
    if (this.inited) return;
    this.inited = true;
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.lo = aMk(AW, AH); this.lctx = this.lo.getContext('2d');
    this.dark = aMk(AW, AH); this.dctx = this.dark.getContext('2d');
    this.grain = aMk(240, 136);
    this.toasts = []; this.sel = 0; this.rain = [];
    canvas.addEventListener('wheel', (e) => {
      if (!this.active) return;
      if (this.dlg) this.dlg.scroll = Math.max(0, this.dlg.scroll + (e.deltaY > 0 ? -40 : 40));
      if (this.state === 'journal') this.jScroll = Math.max(0, (this.jScroll || 0) + (e.deltaY > 0 ? 40 : -40));
    }, { passive: true });
  },

  // ---------- вход и выход из DLC ----------
  enter() {
    this.init(document.getElementById('game'));
    this.active = true;
    document.body.classList.add('aulet');
    document.title = 'РАССЛЕДОВАНИЕ АУЛЕТА';
    try { localStorage.cs_mode = 'aulet'; } catch (e) {}
    AudioSys.stopMusic();
    this.toTitle();
  },
  leave() {
    if (this.state === 'play' || this.state === 'pause' || this.state === 'journal') this.save();
    this.active = false; this.dlg = null;
    document.body.classList.remove('aulet');
    document.title = 'CRITICAL STRIKE';
    try { localStorage.cs_mode = 'cs'; } catch (e) {}
    AuletMusic.stop();
    AudioSys.currentTrack = null;
    AudioSys.playMusic('/static/audio/menu_music.mp3');
  },
  canSwitch() { return this.state === 'title'; },

  toTitle() {
    this.state = 'title'; this.sel = 0; this.confirmNew = false; this.dlg = null;
    AuletMusic.play('title');
  },
  hasSave() { try { return !!localStorage.getItem(ASAVE); } catch (e) { return false; } },

  newGame() {
    this.S = {
      v: 1, chapter: 'ch0', map: null, x: 0, y: 0, dir: 0, time: '03:12',
      flags: {}, clues: [], items: [], tasks: {}, taskOrder: [], people: [], thoughts: {},
      voices: { R: 3, I: 2, H: 3, M: 4 }, nerve: 5, used: {}, newClues: 0,
    };
    this.startChapter('ch0');
  },
  showComing() {
    this.showCard({ kicker: 'РАССЛЕДОВАНИЕ ПРОДОЛЖАЕТСЯ', title: 'Продолжение следует', sub: 'Следующая глава ещё пишется',
      lines: ['Твоё дело сохранено. Когда выйдет новая глава, оно продолжится с этого места.'], then: () => this.toTitle() });
  },
  loadGame() {
    try {
      const s = JSON.parse(localStorage.getItem(ASAVE));
      if (!s || !AuletStory.maps[s.map]) { this.newGame(); return; }
      this.S = s;
      if (s.chapter && !AuletStory.chapters[s.chapter]) { this.showComing(); return; }
      this.transition(() => { this.loadMap(s.map, s.x / TS, s.y / TS, s.dir, true); this.state = 'play'; });
    } catch (e) { this.newGame(); }
  },
  save() {
    if (!this.S || !this.map) return;
    this.S.map = this.map.id; this.S.x = this.pl.x; this.S.y = this.pl.y; this.S.dir = this.pl.dir;
    try { localStorage.setItem(ASAVE, JSON.stringify(this.S)); } catch (e) {}
  },
  checkpoint() { this.save(); try { this.cp = localStorage.getItem(ASAVE); } catch (e) {} },

  startChapter(id) {
    const ch = AuletStory.chapters[id];
    this.S.chapter = id;
    if (!ch) { this.save(); this.showComing(); return; }
    if (ch.time) this.S.time = ch.time;
    this.showCard({
      kicker: ch.kicker, title: ch.title, sub: ch.sub, lines: ch.intro || [],
      then: () => {
        this.loadMap(ch.start.map, ch.start.x, ch.start.y, ch.start.dir || 0);
        this.state = 'play';
        this.checkpoint();
        if (ch.startDlg) this.startDialog(ch.startDlg);
      },
    });
  },

  // ---------- карточки (главы, интерлюдии) ----------
  showCard(card) {
    this.toasts = [];
    this.card = { ...card, t: 0, idx: 0 };
    this.state = 'card';
    if (card.music) AuletMusic.play(card.music);
  },

  transition(fn) { this.fadeT = 0; this.fadeFn = fn; this.fading = true; },

  // ---------- карты ----------
  loadMap(id, tx, ty, dir, exact) {
    const def = AuletStory.maps[id];
    if (!def) { console.warn('AULET: нет карты', id); return; }
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
    this.rain = [];
    if (def.music) AuletMusic.play(typeof def.music === 'function' ? def.music(this) : def.music);
    AuletMusic.weather(def.rain ? 1 : def.wind ? 0.5 : 0);
    this.placeLabel = { text: def.name, t: 0 };
    if (def.onEnter) setTimeout(() => {}, 0);
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

  // ---------- состояние сюжета ----------
  _condCache: {},
  cond(expr) {
    if (expr === undefined || expr === null || expr === '') return true;
    if (typeof expr === 'function') return !!expr(this.S, this);
    let fn = this._condCache[expr];
    if (!fn) {
      try { fn = new Function('f', 'c', 'i', 'v', 'S', 'return (' + expr + ');'); } catch (e) { console.warn('AULET cond', expr, e); fn = () => false; }
      this._condCache[expr] = fn;
    }
    const S = this.S;
    const c = {}; S.clues.forEach(k => c[k] = 1);
    const i = {}; S.items.forEach(k => i[k] = 1);
    try { return !!fn(S.flags, c, i, S.voices, S); } catch (e) { return false; }
  },
  voiceLvl(v) {
    let l = this.S.voices[v] || 0;
    if (this.S.flags.drank && v === 'R') l -= 1;
    if (this.S.flags.drank && v === 'H') l += 1;
    if (this.S.nerve <= 1) l -= 1;
    return l;
  },
  toast(text, color) { this.toasts.push({ text, color: color || '#e8d8b0', t: 0 }); },
  addClue(id, dlg) {
    if (this.S.clues.includes(id)) return;
    this.S.clues.push(id); this.S.newClues = (this.S.newClues || 0) + 1;
    const c = AuletStory.clues[id];
    const name = c ? c.name : id;
    if (dlg) dlg.say('', 'Улика в блокнот: ' + name, 'sys');
    this.toast('УЛИКА: ' + name, '#e8c76a'); ASfx.page();
    // новые мысли
    for (const k in AuletStory.thoughts) {
      const th = AuletStory.thoughts[k];
      if (!this.S.thoughts[k] && !this.S.flags['thr_' + k] && this.thoughtReady(th)) {
        this.S.flags['thr_' + k] = 1;
        this.toast('НОВАЯ МЫСЛЬ: ' + th.title, '#d39cff');
      }
    }
  },
  thoughtReady(th) { return (th.needs || []).every(n => this.S.clues.includes(n)) && (!th.if || this.cond(th.if)); },
  addItem(id, dlg) {
    if (this.S.items.includes(id)) return;
    this.S.items.push(id);
    const it = AuletStory.items[id];
    if (dlg) dlg.say('', 'Взято: ' + (it ? it.name : id), 'sys');
    this.toast('ВЗЯТО: ' + (it ? it.name : id));
  },
  takeItem(id, dlg) {
    const i = this.S.items.indexOf(id);
    if (i < 0) return;
    this.S.items.splice(i, 1);
    const it = AuletStory.items[id];
    if (dlg) dlg.say('', 'Больше нет: ' + (it ? it.name : id), 'sys');
  },
  setTask(id, dlg) {
    if (this.S.tasks[id]) return;
    this.S.tasks[id] = 'active'; this.S.taskOrder.push(id);
    const t = AuletStory.tasks[id];
    if (dlg) dlg.say('', 'Новая задача: ' + (t ? t.name : id), 'sys');
    this.toast('ЗАДАЧА: ' + (t ? t.name : id), '#8fb8ff');
  },
  doneTask(id, dlg) {
    if (this.S.tasks[id] === 'done') return;
    if (!this.S.tasks[id]) this.S.taskOrder.push(id);
    this.S.tasks[id] = 'done';
    const t = AuletStory.tasks[id];
    if (dlg) dlg.say('', 'Задача выполнена: ' + (t ? t.name : id), 'sys');
  },
  addPerson(id) { if (!this.S.people.includes(id)) this.S.people.push(id); },
  nerve(d, dlg) {
    const S = this.S, before = S.nerve;
    S.nerve = Math.max(0, Math.min(5, S.nerve + d));
    if (S.nerve === before) return;
    if (dlg) dlg.say('', `Самообладание ${d > 0 ? '+' : ''}${d} (${S.nerve} из 5)`, d > 0 ? 'sysgood' : 'sysbad');
    this.toast(`САМООБЛАДАНИЕ ${d > 0 ? '+' : ''}${d}`, d > 0 ? '#9fe0a0' : '#ff7a5c');
    if (S.nerve <= 0) this.pendingBreak = true;
    if (d < 0) this.shake = 0.35;
  },
  activeTask() {
    const o = this.S.taskOrder;
    for (let i = o.length - 1; i >= 0; i--) if (this.S.tasks[o[i]] === 'active') return AuletStory.tasks[o[i]];
    return null;
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
    if (this.pendingBreak) { this.pendingBreak = false; this.state = 'break'; this.breakT = 0; AuletMusic.play('tension'); return; }
    if (this.pendingCard) {
      const c = this.pendingCard; this.pendingCard = null;
      const after = this.pendingMap; this.pendingMap = null;
      if (c.chapter) {
        this.save();
        if (c.lines || c.title) this.showCard({ ...c, then: () => this.startChapter(c.chapter) });
        else this.startChapter(c.chapter);
        return;
      }
      this.showCard({ ...c, then: () => { this.state = 'play'; if (after) this.goMap(after); else this.checkpoint(); } });
      return;
    }
    if (this.pendingMap) { const pm = this.pendingMap; this.pendingMap = null; this.goMap(pm); return; }
    this.checkpoint();
  },
  goMap(st) {
    this.transition(() => {
      this.loadMap(st.map, st.x, st.y, st.dir);
      this.checkpoint();
    });
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
      out.push({ kind: 'npc', ref: n, name: n.name || (AuletStory.chars[n.ch] || {}).name || '?', dlg: n.dlg,
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
    if (st === 'title') this.updTitle(dt);
    else if (st === 'card') this.updCard(dt);
    else if (st === 'play') this.updPlay(dt);
    else if (st === 'pause') this.updPause(dt);
    else if (st === 'journal') this.updJournal(dt);
    else if (st === 'break') this.updBreak(dt);
    else if (st === 'help') { if (this.anyKey()) this.state = 'title'; }
  },
  anyKey() { return Input.consumeClick() || Input.wasPressed('Escape') || Input.wasPressed('Enter') || Input.wasPressed('Space'); },
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

  titleItems() {
    const l = [];
    if (this.hasSave()) l.push({ id: 'cont', text: 'ПРОДОЛЖИТЬ ДЕЛО' });
    l.push({ id: 'new', text: this.confirmNew ? 'ТОЧНО? СТАРОЕ ДЕЛО СОТРЁТСЯ' : 'НОВОЕ ДЕЛО' });
    l.push({ id: 'help', text: 'КАК ИГРАТЬ' });
    l.push({ id: 'music', text: AudioSys.musicEnabled ? 'МУЗЫКА: ВКЛ' : 'МУЗЫКА: ВЫКЛ' });
    l.push({ id: 'cs', text: 'ВЕРНУТЬСЯ В CRITICAL STRIKE' });
    return l;
  },
  updTitle() {
    const items = this.titleItems();
    if (this.sel >= items.length) this.sel = 0;
    this.menuList(items, (it) => {
      ASfx.select();
      if (it.id === 'cont') this.loadGame();
      else if (it.id === 'new') {
        if (this.hasSave() && !this.confirmNew) { this.confirmNew = true; return; }
        this.confirmNew = false; this.newGame();
      } else if (it.id === 'help') this.state = 'help';
      else if (it.id === 'music') { AudioSys.toggleMusic(); AuletMusic.setOn(AudioSys.musicEnabled); }
      else if (it.id === 'cs') window.switchMode && window.switchMode('cs');
    });
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
    if (Input.wasPressed('Tab') || Input.wasPressed('KeyJ')) { this.openJournal(); return; }
    if (Input.wasPressed('KeyC')) { this.smoke(); return; }

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
      this.save();
      this.transition(() => { this.loadMap(ex.to, ex.tx, ex.ty, ex.dir); this.checkpoint(); });
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
    return Math.max(0, Math.min(mh - VH, this.pl.y - 8 - VH / 2));
  },
  updCam(dt) {
    const k = Math.min(1, dt * 5);
    this.cam.x += (this.camTX() - this.cam.x) * k;
    this.cam.y += (this.camTY() - this.cam.y) * k;
  },

  updRain(dt) {
    const d = this.map && this.map.def;
    if (!d || !d.rain) { this.rain.length = 0; return; }
    while (this.rain.length < 140) this.rain.push({ x: Math.random() * (AW + 60), y: Math.random() * AH, s: 220 + Math.random() * 120 });
    for (const r of this.rain) { r.y += r.s * dt; r.x -= r.s * 0.25 * dt; if (r.y > AH) { r.y = -10; r.x = Math.random() * (AW + 60); } }
  },

  // сигарета: −1 из пачки, +1 самообладание
  smoke() {
    if (this.dlg) return;
    if (!(this.S.cigs > 0)) { this.toast('СИГАРЕТ НЕТ', '#ff7a5c'); return; }
    this.startDialog('smoke');
  },
  // клики по кнопкам интерфейса (блокнот, пауза, сигарета)
  uiClick(x, y) {
    if (y > 488 && x < 250 && this.S.cigs > 0) { this.smoke(); return true; }
    if (y < 44 && x > 960 - 60) { this.state = 'pause'; this.sel = 0; return true; }
    if (y < 44 && x > 960 - 190 && x < 960 - 66) { this.openJournal(); return true; }
    return false;
  },

  // ---------- диалоговый ввод ----------
  updDialog(dt) {
    const d = this.dlg;
    d.age += dt;
    for (const l of d.log) l.t += dt;
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
      if ((Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('KeyE')) && d.csel >= 0) { d.choose(d.choices[d.csel]); return; }
    } else if (d.waiting) {
      if (d.age > 0.12 && (Input.consumeClick() || Input.wasPressed('Space') || Input.wasPressed('Enter') || Input.wasPressed('KeyE'))) { d.age = 0; d.next(); }
    }
    if (Input.wasPressed('Escape')) { this.state = 'pause'; this.sel = 0; }
  },

  // ---------- пауза ----------
  pauseItems() {
    return [
      { id: 'back', text: 'ПРОДОЛЖИТЬ' },
      { id: 'journal', text: 'БЛОКНОТ' },
      { id: 'music', text: AudioSys.musicEnabled ? 'МУЗЫКА: ВКЛ' : 'МУЗЫКА: ВЫКЛ' },
      { id: 'cp', text: 'ВЕРНУТЬСЯ К СОХРАНЕНИЮ' },
      { id: 'menu', text: 'СОХРАНИТЬ И ВЫЙТИ В МЕНЮ' },
    ];
  },
  updPause() {
    if (Input.wasPressed('Escape')) { this.state = 'play'; return; }
    this.menuList(this.pauseItems(), (it) => {
      ASfx.select();
      if (it.id === 'back') this.state = 'play';
      else if (it.id === 'journal') this.openJournal();
      else if (it.id === 'music') { AudioSys.toggleMusic(); AuletMusic.setOn(AudioSys.musicEnabled); }
      else if (it.id === 'cp') this.restoreCheckpoint();
      else if (it.id === 'menu') { if (!this.dlg) this.save(); this.dlg = null; this.toTitle(); }
    });
  },
  restoreCheckpoint() {
    if (!this.cp) return;
    try { localStorage.setItem(ASAVE, this.cp); } catch (e) {}
    this.dlg = null;
    this.loadGame();
  },
  updBreak(dt) {
    this.breakT += dt;
    if (this.breakT > 1.5 && this.anyKey()) {
      this.S.nerve = 2;
      this.restoreCheckpoint();
    }
  },

  // ---------- блокнот ----------
  JTABS: [['case', 'ДЕЛО'], ['clues', 'УЛИКИ'], ['thoughts', 'МЫСЛИ'], ['people', 'ЛЮДИ'], ['self', 'АУЛЕТ']],
  openJournal(tab) {
    this.prevState = this.state === 'pause' ? 'play' : this.state;
    this.state = 'journal'; this.jTab = tab || this.jTab || 'case'; this.jSel = 0; this.jScroll = 0;
    if (this.jTab === 'clues') this.S.newClues = 0;
    ASfx.page();
  },
  jItems() {
    const S = this.S, T = this.jTab;
    if (T === 'case') {
      const o = S.taskOrder.slice().reverse();
      return o.map(id => ({ id, title: (AuletStory.tasks[id] || {}).name || id, done: S.tasks[id] === 'done', text: (AuletStory.tasks[id] || {}).text || '' }))
        .sort((a, b) => a.done - b.done);
    }
    if (T === 'clues') return S.clues.slice().reverse().map(id => { const c = AuletStory.clues[id] || {}; return { id, title: c.name || id, text: c.text || '' }; });
    if (T === 'thoughts') {
      const l = [];
      for (const k in AuletStory.thoughts) {
        const th = AuletStory.thoughts[k];
        const done = !!S.thoughts[k], ready = this.thoughtReady(th);
        if (!done && !ready && !(th.needs || []).some(n => S.clues.includes(n))) continue;
        const res = done && th.result ? th.result(S) : '';
        l.push({ id: k, title: th.title, done, ready: ready && !done, text: done ? (res || th.doneText || 'Обдумано.') : ready ? th.q : th.q + '\n\nНе хватает улик, чтобы об этом думать.' });
      }
      return l.sort((a, b) => (b.ready - a.ready) || (a.done - b.done));
    }
    if (T === 'people') return S.people.map(id => { const p = AuletStory.people[id] || {}; return { id, title: p.name || id, text: typeof p.text === 'function' ? p.text(S) : (p.text || '') }; });
    if (T === 'self') {
      const l = Object.keys(AVOICE).map(k => ({ id: k, title: `${AVOICE[k].name}  ${'■'.repeat(this.voiceLvl(k))}${'□'.repeat(Math.max(0, 6 - this.voiceLvl(k)))}`, text: AVOICE[k].desc + `\n\nУровень: ${S.voices[k]}${this.voiceLvl(k) !== S.voices[k] ? ` (сейчас ${this.voiceLvl(k)})` : ''}.\nВ проверках: две кости + уровень против сложности.`, color: AVOICE[k].color }));
      l.push({ id: 'nerve', title: `САМООБЛАДАНИЕ  ${'●'.repeat(S.nerve)}${'○'.repeat(5 - S.nerve)}`, text: 'Сколько ещё Аулет выдержит, прежде чем сорвётся. Тяжёлые воспоминания и провалы отнимают его. Сигарета, чай, сон — возвращают. На нуле — срыв.' });
      if (S.items.length) l.push({ id: 'items', title: 'КАРМАНЫ', text: S.items.map(i => '— ' + ((AuletStory.items[i] || {}).name || i) + ((AuletStory.items[i] || {}).text ? ': ' + AuletStory.items[i].text : '')).join('\n') });
      return l;
    }
    return [];
  },
  updJournal() {
    if (Input.wasPressed('Escape') || Input.wasPressed('Tab') || Input.wasPressed('KeyJ')) { this.state = 'play'; ASfx.page(); return; }
    const tabs = this.JTABS.map(t => t[0]);
    let ti = tabs.indexOf(this.jTab);
    if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA') || Input.wasPressed('KeyQ')) { this.jTab = tabs[(ti + tabs.length - 1) % tabs.length]; this.jSel = 0; this.jScroll = 0; ASfx.tick(); }
    if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) { this.jTab = tabs[(ti + 1) % tabs.length]; this.jSel = 0; this.jScroll = 0; ASfx.tick(); }
    if (this.jTab === 'clues') this.S.newClues = 0;
    const items = this.jItems();
    if (this.navUp() && items.length) { this.jSel = (this.jSel + items.length - 1) % items.length; this.jScroll = 0; }
    if (this.navDown() && items.length) { this.jSel = (this.jSel + 1) % items.length; this.jScroll = 0; }
    if (this.jSel >= items.length) this.jSel = 0;
    const mx = Input.mouse.x, my = Input.mouse.y;
    if (Input.consumeClick()) {
      const r = this._jRects || {};
      if (r.close && this.inR(mx, my, r.close)) { this.state = 'play'; return; }
      (r.tabs || []).forEach((rr, i) => { if (this.inR(mx, my, rr)) { this.jTab = tabs[i]; this.jSel = 0; this.jScroll = 0; ASfx.tick(); } });
      (r.items || []).forEach((rr, i) => { if (this.inR(mx, my, rr)) { this.jSel = i; this.jScroll = 0; ASfx.tick(); } });
      if (r.think && this.inR(mx, my, r.think)) { this.think(items[this.jSel]); return; }
    }
    const it = items[this.jSel];
    if (this.jTab === 'thoughts' && it && it.ready && (Input.wasPressed('Enter') || Input.wasPressed('Space'))) this.think(it);
  },
  inR(x, y, r) { return x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3]; },
  think(it) {
    if (!it || !it.ready) return;
    const th = AuletStory.thoughts[it.id];
    this.state = 'play';
    this.startDialog(th.dlg);
  },

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
    if (st === 'title' || st === 'help') this.drawTitle(ctx);
    else if (st === 'card') { if (this.card) this.drawCard(ctx); }
    else if (this.map) {
      this.drawWorld();
      const sh = this.shake > 0 ? this.shake * 10 : 0;
      ctx.drawImage(this.lo, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 960, 540);
      this.drawPost(ctx);
      this.drawHud(ctx);
      if (this.dlg) this.drawDialog(ctx);
      if (st === 'pause') this.drawPause(ctx);
      if (st === 'journal') this.drawJournal(ctx);
      if (st === 'break') this.drawBreak(ctx);
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
    c.imageSmoothingEnabled = false;
    c.fillStyle = m.def.void || '#050507'; c.fillRect(0, 0, AW, AH);
    const cx = Math.round(cam.x * z) / z, cy = Math.round(cam.y * z) / z;
    c.save(); c.scale(z, z); c.translate(-cx, -cy);
    c.drawImage(m.bg, 0, 0);
    // море — анимированное
    const x0 = Math.floor(cx / TS) - 1, x1 = x0 + AW / z / TS + 3, y0 = Math.floor(cy / TS) - 1, y1 = y0 + AH / z / TS + 3;
    for (const [sx, sy] of m.sea) if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) Art.sea(c, sx, sy, t, m);
    // объекты и персонажи по глубине
    const list = [];
    for (const p of m.props) {
      if (p.if && !this.cond(p.if)) continue;
      const P = Art.props[p.k]; if (!P) continue;
      list.push({ y: (p.y + P.h) * TS + (P.z || 0), draw: () => P.draw(c, p.x * TS, p.y * TS, p, t, this) });
    }
    for (const n of m.npcs) {
      if (!this.npcVisible(n)) continue;
      const L = (AuletStory.chars[n.ch] || {}).look;
      const px = (n.x + 0.5) * TS, py = (n.y + 0.5) * TS + 6;
      list.push({ y: py, draw: () => Art.char(c, L, n.dir, 0, px, py, n.pose, n.bob) });
    }
    const pl = this.pl;
    const PL = AuletStory.playerLook ? AuletStory.playerLook(this.S) : AuletStory.chars.aulet.look;
    list.push({ y: pl.y, draw: () => Art.char(c, PL, pl.dir, pl.step, pl.x, pl.y, null, t) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
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
    if (this.clickMark) {
      const k = this.clickMark.t / 0.6;
      c.strokeStyle = `rgba(255,236,190,${0.6 * (1 - k)})`;
      c.beginPath(); c.ellipse(this.clickMark.x, this.clickMark.y, 3 + k * 5, 1.5 + k * 2.5, 0, 0, 7); c.stroke();
    }
    c.restore();
    this.drawLight(c, cx, cy);
    // дождь
    if (this.rain.length) {
      c.strokeStyle = 'rgba(170,190,215,0.28)'; c.lineWidth = 1; c.beginPath();
      for (const r of this.rain) { c.moveTo(r.x, r.y); c.lineTo(r.x - 2, r.y + 7); }
      c.stroke();
    }
  },

  drawLight(c, cx, cy) {
    const m = this.map, d = this.dctx, def = m.def;
    const amb = def.dark === undefined ? 0.5 : def.dark;
    if (amb <= 0) return;
    d.globalCompositeOperation = 'source-over';
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
    c.drawImage(this.dark, 0, 0);
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
    const S = this.S;
    if (this.dlg || this.state === 'journal') { /* в диалоге — только самообладание */ }
    ctx.textBaseline = 'alphabetic';
    if (!this.dlg) {
      ctx.textAlign = 'left';
      ctx.font = `bold 13px ${AMONO}`; ctx.fillStyle = '#e8d8b0';
      ctx.fillText(`${S.time}  ·  ${(this.map.def.name || '').toUpperCase()}`, 18, 26);
      const task = this.activeTask();
      if (task) { ctx.font = `italic 14px ${AFONT}`; ctx.fillStyle = 'rgba(232,216,176,0.75)'; ctx.fillText('— ' + task.name, 18, 46); }
      // кнопки
      const btn = (x, w, label, hot) => {
        ctx.fillStyle = 'rgba(10,10,14,0.65)'; ctx.fillRect(x, 10, w, 28);
        ctx.strokeStyle = hot ? '#e8c76a' : 'rgba(232,216,176,0.4)'; ctx.strokeRect(x + 0.5, 10.5, w - 1, 27);
        ctx.fillStyle = hot ? '#e8c76a' : '#e8d8b0'; ctx.font = `bold 12px ${AMONO}`; ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, 29);
      };
      const ready = Object.keys(AuletStory.thoughts).some(k => !S.thoughts[k] && this.thoughtReady(AuletStory.thoughts[k]));
      btn(960 - 190, 120, 'БЛОКНОТ [TAB]' + (ready ? ' •' : ''), ready || S.newClues > 0);
      btn(960 - 60, 46, 'II', false);
      // место
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
    }
    // самообладание
    ctx.textAlign = 'left'; ctx.font = `bold 11px ${AMONO}`; ctx.fillStyle = 'rgba(232,216,176,0.65)';
    const by = 528;
    ctx.fillText('САМООБЛАДАНИЕ', 18, by - 14);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < S.nerve ? (S.nerve <= 1 ? '#ff7a5c' : '#e8d8b0') : 'rgba(232,216,176,0.18)';
      ctx.fillRect(18 + i * 18, by - 8, 13, 8);
    }
    if (S.cigs > 0 && !this.dlg) {
      ctx.fillStyle = 'rgba(232,216,176,0.55)'; ctx.font = `bold 11px ${AMONO}`;
      ctx.fillText(`C — ЗАКУРИТЬ (${S.cigs})`, 118, by);
    }
  },

  drawToasts(ctx) {
    if (this.state === 'pause' || this.state === 'journal') return;
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
    const d = this.dlg;
    const X = 556, W = 404, PAD = 22, TW = W - PAD * 2;
    const g = ctx.createLinearGradient(X - 70, 0, X + 10, 0);
    g.addColorStop(0, 'rgba(6,6,9,0)'); g.addColorStop(1, 'rgba(6,6,9,0.95)');
    ctx.fillStyle = g; ctx.fillRect(X - 70, 0, 80, 540);
    ctx.fillStyle = 'rgba(6,6,9,0.95)'; ctx.fillRect(X + 10, 0, W, 540);
    // портрет
    const sp = d.speaker && AuletStory.chars[d.speaker];
    const lastLine = d.log[d.log.length - 1];
    const voice = lastLine && AVOICE[lastLine.who];
    ctx.textAlign = 'left';
    if (voice) {
      Art.voiceGlyph(ctx, lastLine.who, X + PAD, 18, 84, this.t);
      ctx.fillStyle = voice.color; ctx.font = `bold 17px ${AMONO}`; ctx.fillText(voice.name, X + PAD + 100, 48);
      ctx.fillStyle = 'rgba(232,216,176,0.55)'; ctx.font = `italic 13px ${AFONT}`; ctx.fillText('внутренний голос', X + PAD + 100, 68);
    } else if (sp) {
      ctx.fillStyle = '#000'; ctx.fillRect(X + PAD - 2, 16, 88, 88);
      Art.portrait(ctx, sp.look, X + PAD, 18, 84 / 36, sp.color);
      ctx.strokeStyle = sp.color || '#e8d8b0'; ctx.strokeRect(X + PAD - 1.5, 16.5, 87, 87);
      ctx.fillStyle = sp.color || '#e8d8b0'; ctx.font = `bold 17px ${AMONO}`; ctx.fillText(sp.name, X + PAD + 100, 48);
      ctx.fillStyle = 'rgba(232,216,176,0.55)'; ctx.font = `italic 13px ${AFONT}`;
      aWrap(ctx, sp.role || '', TW - 100).forEach((l, i) => ctx.fillText(l, X + PAD + 100, 68 + i * 16));
    }
    ctx.fillStyle = 'rgba(232,216,176,0.2)'; ctx.fillRect(X + PAD, 116, TW, 1);

    // выборы снизу
    const rects = [];
    let chH = 0;
    const chLines = [];
    ctx.font = `15px ${AFONT}`;
    if (d.choices) {
      d.choices.forEach((ch, i) => {
        let pre = '';
        if (ch.chk) pre = `[${AVOICE[ch.chk[0]].name} · ${aDiff(ch.chk[1])} · ${d.chance(ch.chk[0], ch.chk[1])}%] `;
        const lines = aWrap(ctx, `${i + 1}. ${pre}${ch.t}`, TW - 6);
        chLines.push({ lines, pre, ch });
        chH += lines.length * 19 + 8;
      });
    } else if (d.waiting) chH = 30;
    const bottom = 532;
    let cy = bottom - chH;
    if (d.choices) {
      chLines.forEach((cl, i) => {
        const h = cl.lines.length * 19 + 4;
        const hot = d.csel === i;
        rects.push([X + PAD - 6, cy - 2, TW + 12, h + 2]);
        if (hot) { ctx.fillStyle = 'rgba(232,199,106,0.12)'; ctx.fillRect(X + PAD - 6, cy - 2, TW + 12, h + 2); }
        cl.lines.forEach((l, j) => {
          const col = cl.ch.chk ? AVOICE[cl.ch.chk[0]].color : '#d8c08a';
          ctx.fillStyle = hot ? '#fff3d0' : (j === 0 && cl.pre ? col : '#d8c08a');
          if (j === 0 && cl.pre) {
            // префикс проверки — цветом голоса
            const num = `${i + 1}. `;
            ctx.fillStyle = hot ? '#fff3d0' : '#d8c08a'; ctx.fillText(num, X + PAD, cy + 14);
            const nw = ctx.measureText(num).width;
            ctx.fillStyle = col; ctx.fillText(cl.pre, X + PAD + nw, cy + 14);
            const pw = ctx.measureText(cl.pre).width;
            ctx.fillStyle = hot ? '#fff3d0' : '#d8c08a'; ctx.fillText(l.slice(num.length + cl.pre.length), X + PAD + nw + pw, cy + 14);
          } else ctx.fillText(l, X + PAD, cy + 14);
          cy += 19;
        });
        cy += 8;
      });
    } else if (d.waiting) {
      const a = 0.55 + 0.45 * Math.sin(this.t * 4);
      ctx.fillStyle = `rgba(232,199,106,${a})`; ctx.font = `bold 13px ${AMONO}`; ctx.textAlign = 'right';
      ctx.fillText(Input.isMobile ? 'ДАЛЕЕ ▸' : 'ДАЛЕЕ ▸  (пробел / клик)', X + PAD + TW, bottom - 8);
      ctx.textAlign = 'left';
      rects.length = 0;
    }
    this._choiceRects = rects;

    // журнал реплик — снизу вверх
    const top = 128, logBottom = bottom - chH - 12;
    ctx.save(); ctx.beginPath(); ctx.rect(X, top, W + 10, logBottom - top); ctx.clip();
    let y = logBottom + d.scroll;
    for (let i = d.log.length - 1; i >= 0 && y > top - 40; i--) {
      const L = d.log[i];
      const latest = i === d.log.length - 1;
      const blocks = this.fmtLine(ctx, L, TW);
      const h = blocks.h;
      y -= h;
      const fade = latest ? Math.min(1, L.t * 5) : (d.log.length - 1 - i > 10 ? 0.45 : 0.75);
      ctx.globalAlpha = fade;
      blocks.draw(X + PAD, y);
      y -= 10;
    }
    ctx.globalAlpha = 1; ctx.restore();
    // затемнение верха журнала
    const fg = ctx.createLinearGradient(0, top, 0, top + 40);
    fg.addColorStop(0, 'rgba(6,6,9,0.95)'); fg.addColorStop(1, 'rgba(6,6,9,0)');
    ctx.fillStyle = fg; ctx.fillRect(X + 10, top, W, 40);
  },

  fmtLine(ctx, L, TW) {
    const kind = L.kind;
    let head = '', headCol = '#e8d8b0', font = `15px ${AFONT}`, col = '#e6dcc6';
    const ch = AuletStory.chars[L.who];
    if (kind === 'narr') { font = `italic 15px ${AFONT}`; col = '#a9a294'; }
    else if (kind === 'act') { font = `italic 15px ${AFONT}`; col = '#8f8a80'; }
    else if (kind === 'sys' || kind === 'sysgood' || kind === 'sysbad') { font = `bold 12px ${AMONO}`; col = kind === 'sysgood' ? '#9fe0a0' : kind === 'sysbad' ? '#ff8a6c' : '#c9b27a'; }
    else if (kind === 'rollok' || kind === 'rollno') { font = `bold 12px ${AMONO}`; col = kind === 'rollok' ? '#9fe0a0' : '#ff8a6c'; }
    else if (AVOICE[L.who]) { head = AVOICE[L.who].name + (kind === 'passive' ? ' [пассивно]' : ''); headCol = AVOICE[L.who].color; col = '#d9d0bd'; }
    else if (ch) { head = ch.name; headCol = ch.color || '#e8d8b0'; }
    ctx.font = font;
    const text = head ? head + ' — ' + L.text : L.text;
    const lines = aWrap(ctx, text, TW);
    const lh = kind.startsWith('sys') || kind.startsWith('roll') ? 16 : 20;
    return {
      h: lines.length * lh,
      draw: (x, y) => {
        ctx.font = font; ctx.textAlign = 'left';
        lines.forEach((l, i) => {
          const yy = y + (i + 1) * lh - 5;
          if (i === 0 && head) {
            ctx.font = `bold 13px ${AMONO}`;
            ctx.fillStyle = headCol;
            // голова набрана другим шрифтом — пересчитываем ширину
            ctx.font = font;
            const hw = ctx.measureText(head).width;
            ctx.fillStyle = headCol; ctx.fillText(head, x, yy);
            ctx.fillStyle = col; ctx.fillText(l.slice(head.length), x + hw, yy);
          } else { ctx.fillStyle = col; ctx.fillText(l, x, yy); }
        });
      },
    };
  },

  // ---------- титульный экран ----------
  drawTitle(ctx) {
    const c = this.lctx, t = this.t;
    Art.titleScene(c, t);
    ctx.drawImage(this.lo, 0, 0, 960, 540);
    this.drawPost(ctx);
    const lg = ctx.createLinearGradient(0, 0, 560, 0);
    lg.addColorStop(0, 'rgba(3,4,8,0.82)'); lg.addColorStop(1, 'rgba(3,4,8,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, 560, 540);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(232,216,176,0.6)'; ctx.font = `bold 13px ${AMONO}`;
    ctx.fillText('CRITICAL STRIKE · СЮЖЕТНОЕ ДОПОЛНЕНИЕ', 64, 92);
    ctx.fillStyle = '#efe2c0'; ctx.font = `bold 50px ${AFONT}`;
    ctx.fillText('РАССЛЕДОВАНИЕ', 60, 148);
    ctx.fillStyle = '#e8c76a'; ctx.font = `bold 64px ${AFONT}`;
    ctx.fillText('АУЛЕТА', 60, 212);
    ctx.fillStyle = 'rgba(232,216,176,0.7)'; ctx.font = `italic 19px ${AFONT}`;
    ctx.fillText('Каспий не возвращает.', 64, 246);
    if (this.state === 'help') { this.drawHelp(ctx); return; }
    const items = this.titleItems();
    const rects = [];
    items.forEach((it, i) => {
      const y = 316 + i * 40, hot = this.sel === i;
      ctx.font = `${hot ? 'bold ' : ''}18px ${AMONO}`;
      ctx.fillStyle = hot ? '#e8c76a' : 'rgba(232,216,176,0.75)';
      ctx.fillText((hot ? '▸ ' : '  ') + it.text, 60, y);
      rects.push([50, y - 26, 440, 36]);
    });
    this._menuRects = rects;
    ctx.fillStyle = 'rgba(232,216,176,0.35)'; ctx.font = `12px ${AMONO}`; ctx.textAlign = 'right';
    ctx.fillText('Актау, ноябрь. Без стрельбы. Только слова, улики и то, что ты помнишь.', 940, 528);
  },
  drawHelp(ctx) {
    ctx.fillStyle = 'rgba(6,6,9,0.9)'; ctx.fillRect(40, 270, 880, 250);
    ctx.textAlign = 'left'; ctx.font = `15px ${AFONT}`; ctx.fillStyle = '#e6dcc6';
    const L = [
      'Ходите кликом мыши или WASD (Shift — быстрее). Кликните по человеку или предмету — Аулет подойдёт сам. E — то, что перед вами.',
      'Диалоги идут справа. Пробел или клик — дальше. Выбор — клик или цифры 1–9.',
      'Четыре внутренних голоса — РАССУДОК, ЧУТЬЁ, ХВАТКА и ПАМЯТЬ — вмешиваются в разговоры. Цветные варианты — проверки: две кости + уровень голоса против сложности. Каждая проверка — один шанс, и провал тоже ведёт историю дальше.',
      'Блокнот (Tab или J): задачи, улики, люди и МЫСЛИ — вопросы, которые можно обдумать, когда улик достаточно.',
      'САМООБЛАДАНИЕ — пять делений внизу слева. На нуле Аулет срывается, и вы вернётесь к сохранению. Игра сохраняется сама.',
    ];
    let y = 300;
    for (const p of L) { aWrap(ctx, p, 840).forEach(l => { ctx.fillText(l, 60, y); y += 20; }); y += 6; }
    ctx.fillStyle = 'rgba(232,199,106,0.8)'; ctx.font = `bold 12px ${AMONO}`; ctx.fillText('клик или Esc — назад', 60, 510);
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
    ctx.fillText('Город подождёт. Он всегда ждёт.', 480, 178);
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

  drawBreak(ctx) {
    const a = Math.min(1, this.breakT / 1.2);
    ctx.fillStyle = `rgba(20,0,0,${0.85 * a})`; ctx.fillRect(0, 0, 960, 540);
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff7a5c'; ctx.font = `bold 40px ${AFONT}`; ctx.fillText('АУЛЕТ СОРВАЛСЯ', 480, 220);
    ctx.fillStyle = '#e6dcc6'; ctx.font = `italic 17px ${AFONT}`;
    ['Руки дрожат. Голоса говорят все разом, и ни один не говорит правду.', 'Ты сидишь на полу и не помнишь, как сел.', 'Начни этот кусок ночи заново.']
      .forEach((l, i) => ctx.fillText(l, 480, 270 + i * 26));
    if (this.breakT > 1.5) { ctx.fillStyle = 'rgba(232,199,106,0.8)'; ctx.font = `bold 13px ${AMONO}`; ctx.fillText('пробел / клик — вернуться к сохранению', 480, 400); }
    ctx.globalAlpha = 1;
  },

  drawJournal(ctx) {
    ctx.fillStyle = 'rgba(4,4,7,0.88)'; ctx.fillRect(0, 0, 960, 540);
    // бумага
    const X = 40, Y = 30, W = 880, H = 480;
    ctx.fillStyle = '#1a1712'; ctx.fillRect(X, Y, W, H);
    ctx.strokeStyle = 'rgba(232,199,106,0.35)'; ctx.strokeRect(X + 0.5, Y + 0.5, W - 1, H - 1);
    const R = { tabs: [], items: [] };
    let tx = X + 20;
    ctx.textAlign = 'left';
    const ready = Object.keys(AuletStory.thoughts).some(k => !this.S.thoughts[k] && this.thoughtReady(AuletStory.thoughts[k]));
    this.JTABS.forEach(([id, label]) => {
      ctx.font = `bold 14px ${AMONO}`;
      const mark = (id === 'clues' && this.S.newClues > 0) || (id === 'thoughts' && ready) ? ' •' : '';
      const w = ctx.measureText(label + mark).width + 24;
      const on = this.jTab === id;
      ctx.fillStyle = on ? 'rgba(232,199,106,0.18)' : 'rgba(0,0,0,0)'; ctx.fillRect(tx, Y + 14, w, 30);
      ctx.fillStyle = on ? '#e8c76a' : 'rgba(232,216,176,0.6)'; ctx.fillText(label + mark, tx + 12, Y + 34);
      if (on) { ctx.fillStyle = '#e8c76a'; ctx.fillRect(tx, Y + 43, w, 2); }
      R.tabs.push([tx, Y + 10, w, 36]);
      tx += w + 6;
    });
    ctx.fillStyle = 'rgba(232,216,176,0.6)'; ctx.font = `bold 16px ${AMONO}`; ctx.textAlign = 'right';
    ctx.fillText('✕', X + W - 18, Y + 34); R.close = [X + W - 44, Y + 10, 40, 36];
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(232,216,176,0.2)'; ctx.fillRect(X + 20, Y + 52, W - 40, 1);
    const items = this.jItems();
    if (!items.length) {
      ctx.fillStyle = 'rgba(232,216,176,0.5)'; ctx.font = `italic 16px ${AFONT}`;
      ctx.fillText(this.jTab === 'thoughts' ? 'Пока не о чем думать. Собирай улики.' : 'Пусто.', X + 30, Y + 90);
    }
    // список
    let y = Y + 80;
    items.forEach((it, i) => {
      if (y > Y + H - 20) return;
      const on = i === this.jSel;
      ctx.font = `${on ? 'bold ' : ''}14px ${AFONT}`;
      const lines = aWrap(ctx, it.title, 290);
      const h = lines.length * 18 + 8;
      if (on) { ctx.fillStyle = 'rgba(232,199,106,0.12)'; ctx.fillRect(X + 20, y - 15, 310, h); }
      ctx.fillStyle = it.color || (it.done ? 'rgba(232,216,176,0.4)' : it.ready ? '#d39cff' : on ? '#efe2c0' : 'rgba(232,216,176,0.8)');
      lines.forEach((l, j) => ctx.fillText((j === 0 ? (it.done ? '✓ ' : it.ready ? '◆ ' : '— ') : '   ') + l, X + 28, y + j * 18));
      R.items.push([X + 20, y - 15, 310, h]);
      y += h + 2;
    });
    ctx.fillStyle = 'rgba(232,216,176,0.2)'; ctx.fillRect(X + 345, Y + 64, 1, H - 84);
    const it = items[this.jSel];
    if (it) {
      ctx.fillStyle = it.color || '#efe2c0'; ctx.font = `bold 20px ${AFONT}`;
      let yy = Y + 92;
      aWrap(ctx, it.title, 480).forEach(l => { ctx.fillText(l, X + 370, yy); yy += 24; });
      yy += 8;
      ctx.fillStyle = '#d9d0bd'; ctx.font = `15px ${AFONT}`;
      aWrap(ctx, it.text, 490).forEach(l => { ctx.fillText(l, X + 370, yy); yy += 21; });
      if (this.jTab === 'thoughts' && it.ready) {
        yy += 20;
        ctx.fillStyle = 'rgba(211,156,255,0.15)'; ctx.fillRect(X + 370, yy - 22, 200, 34);
        ctx.strokeStyle = '#d39cff'; ctx.strokeRect(X + 370.5, yy - 21.5, 199, 33);
        ctx.fillStyle = '#d39cff'; ctx.font = `bold 14px ${AMONO}`; ctx.fillText('ОБДУМАТЬ [ENTER]', X + 392, yy);
        R.think = [X + 370, yy - 22, 200, 34];
      }
    }
    ctx.fillStyle = 'rgba(232,216,176,0.35)'; ctx.font = `12px ${AMONO}`;
    ctx.fillText('←/→ — разделы · ↑/↓ — записи · Tab или Esc — закрыть', X + 20, Y + H - 12);
    this._jRects = R;
  },
};

// Переключение Critical Strike ⇄ DLC (кнопка в левом нижнем углу)
window.switchMode = function (mode) {
  const g = window.game;
  if (mode === 'aulet') {
    if (g && g.state !== 'menu') return;
    AULET.enter();
  } else {
    if (!AULET.canSwitch()) return;
    AULET.leave();
  }
  syncModeBtn();
};
window.AULET = AULET;
window.toggleMode = () => window.switchMode(AULET.active ? 'cs' : 'aulet');
function syncModeBtn() {
  const b = document.getElementById('mode-btn');
  if (!b) return;
  const g = window.game;
  const show = AULET.active ? AULET.canSwitch() : (g && g.state === 'menu' && !(g.menu && (g.menu.showHelp || g.menu.showLeaderboard)));
  b.classList.toggle('show', !!show);
  b.classList.toggle('dlc', AULET.active);
  const html = AULET.active ? '<small>◀ ВЕРНУТЬСЯ</small><b>CRITICAL STRIKE</b>' : '<small>DLC</small><b>РАССЛЕДОВАНИЕ АУЛЕТА</b>';
  if (b._html !== html) { b._html = html; b.innerHTML = html; }
}
// DLC забирает цикл игры целиком: подменяем update/render, как только игра создана
// (так не нужно трогать main.js, который у игроков может лежать в кэше браузера)
if (typeof Game === 'function' && !Game.prototype._auletHooked) {
  const upd = Game.prototype.update, ren = Game.prototype.render;
  Game.prototype._auletHooked = true;
  Game.prototype.update = function (dt) { return AULET.active ? AULET.update(dt) : upd.call(this, dt); };
  Game.prototype.render = function () { return AULET.active ? AULET.render() : ren.call(this); };
}

// если игрок вышел из игры, находясь в DLC, — вернуть его туда, как только загрузится меню
let _autoAulet = false;
try { _autoAulet = localStorage.cs_mode === 'aulet'; } catch (e) {}
setInterval(() => {
  const g = window.game;
  if (_autoAulet && g && g.state === 'menu' && !AULET.active) { _autoAulet = false; window.switchMode('aulet'); }
  syncModeBtn();
}, 250);
