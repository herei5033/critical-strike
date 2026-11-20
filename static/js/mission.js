// =====================================================================
// Миссии сюжета: цепочка заданий на уровне вместо «убей всех».
//   goto    — дойти до места;           collect — собрать предметы по комнатам;
//   hold    — удержать точку N секунд;  kill    — уложить N врагов;
//   boss    — победить босса уровня.
// По ходу — сообщения по рации (союзники) и мысли героя.
// Плюс «мысли» героев во всех режимах: на низком здоровье, у босса, на серии убийств и т.п.
// =====================================================================

// ---------- мысли героев ----------
const THOUGHTS = {
  dani: {
    idle: ['Интересно, зарплата уже пришла?', 'Сейчас бы энергетик…', 'После этого — точно короткий день.', 'Студентов надо было отпустить пораньше.', 'Тихо работаем. Как я люблю.',
      'Надо будет журнал заполнить. Потом.', 'Кто-нибудь видел мой пропуск?', 'Главное — не шуметь.', 'Тени не задают лишних вопросов.', 'Хорошо, что у меня глушитель.'],
    lowhp: ['Так, без паники… где самса?', 'Ещё чуть-чуть — и на больничный.', 'Клоны, прикройте!', 'Это было лишнее.'],
    samsa: ['Самса! Горячая!', 'Вот это обед.', 'С картошкой. Идеально.'], armor: ['Бронежилет. Теперь можно работать.', 'Так-то лучше.'],
    boss: ['Ну и здоровяк…', 'Вот он, главный по зарплатам.', 'Сейчас мы его тихонько…'], streak: ['Я сегодня в ударе!', 'Кто следующий?', 'Тишина и порядок.'],
    clones: ['Клоны, работаем!', 'Нас теперь четверо.', 'Тени, вперёд.'], clone: ['Наконец-то кто-то поработает за меня.', 'Идеальный — весь в меня.'],
    level: ['Ладно, по-быстрому.', 'Тихо заходим, тихо выходим.', 'Новый этаж — новые проблемы.'], weapon: ['Трофей! Пригодится.'],
    empty: ['Патроны всё. Неловко.', 'Пусто. Ищу другой ствол.'], wave: ['Их стало больше… Плохо.', 'Ещё гости. Прекрасно.'],
  },
  gal: {
    idle: ['Спокойно. Только спокойно.', 'Вот бы сейчас в футбол.', 'Главное — адекватность.', 'Нормально же работали…',
      'Кто-то должен быть взрослым в этой команде.', 'Огнемёт — тоже педагогический инструмент.', 'Вечером — чай и тишина.', 'Только бы не задели проектор.'],
    lowhp: ['Неприятно. Но терпимо.', 'Надо подлечиться.', 'Так, дыши.'], samsa: ['Самса — это святое.', 'Горячая. Как я люблю.'], armor: ['Броня. Отлично.'],
    boss: ['Сейчас поговорим.', 'Здоровый. Тем лучше горит.', 'Без резких движений, дружище.'], streak: ['Огонь!', 'Жарковато тут стало.', 'Разогрелся.'],
    babah: ['Чувствую — сейчас рванёт.', 'Внутри всё горит. В хорошем смысле.'], level: ['Погнали.', 'Ну, показывайте, что тут у вас.'], weapon: ['Возьму. Пригодится.'],
    empty: ['Пусто. Неадекватно.', 'Кончились. Ладно.'], wave: ['Подкрепление? Серьёзно?', 'Ну давайте, давайте.'],
  },
  daur: {
    idle: ['Всё, после этого — точно в айти.', 'Мышки тут, конечно, ужас.', 'Кто вообще так проектирует здания?', 'Машину бы не поцарапать.',
      'Это не перестрелка, это стресс-тест.', 'Интернет тут, кстати, тоже так себе.', 'Мне бы кофе. Литр.', 'Резюме уже почти готово.'],
    lowhp: ['Ну вот, опять…', 'Я же говорил — надо было в айти.', 'Критическая ошибка.'], samsa: ['Самса — лучший патч.', 'Хотфикс здоровья.'], armor: ['Апгрейд брони установлен.'],
    boss: ['Это не босс, это баг.', 'Сейчас отладим.', 'Ну и легаси…'], streak: ['Чистый код!', 'Отработано.', 'Оптимизация.'], rage: ['Ну всё, держитесь.', 'Режим продакшена.'],
    level: ['Ладно, раз уж приехали.', 'Ещё один релиз.'], weapon: ['Хороший ствол.', 'Беру.'],
    empty: ['Пусто. Где второй?', 'Патроны — всё.'], wave: ['Нагрузка растёт.', 'DDoS какой-то.'],
  },
};

// Реакции на действия напарников в корпоративе ({n} — имя напарника)
const REACTS = {
  dani: {
    mateDown: ['{n}, держись! Иду!', '{n} лежит… Клоны, прикройте его!'], mateUp: ['{n} снова в строю.', 'С возвращением, {n}.'],
    mateRage: ['{n} в ярости. Отойду-ка в сторонку.', 'Даур опять включил режим «не подходи».'], mateBabah: ['{n} сейчас рванёт… Все назад!', 'Гала горит. Это нормально?'],
    mateClone: ['Мой клон, кстати, лучше.', 'Ещё один Дани? Перебор.'],
  },
  gal: {
    mateDown: ['{n}! Держись, поднимаю!', 'Без паники, {n}, я рядом.'], mateUp: ['Вот так, {n}. Аккуратнее.', '{n}, рад видеть.'],
    mateRage: ['{n}, полегче!', 'Даур в ярости. Адекватно отойдём.'], mateBabah: ['Это мой коронный…', '{n}, только меня не задень!'],
    mateClone: ['Клоны Дани опять работают за него.', 'Два Дани — это уже слишком.'],
  },
  daur: {
    mateDown: ['{n} упал. Перезагружаю его!', '{n}, не уходи в оффлайн!'], mateUp: ['{n} снова онлайн.', 'Рестарт прошёл успешно, {n}.'],
    mateRage: ['Ещё один в ярости?', 'Нас двое таких — это уже баг.'], mateBabah: ['Гала сейчас перегреется.', '{n} в огне. Буквально.'],
    mateClone: ['Дани опять размножился.', 'Клоны — это читерство, {n}.'],
  },
};

class Thoughts {
  constructor(game) { this.g = game; this.cur = null; this.cd = {}; this.idleT = 30; }

  say(text, dur = 3.2) { this.cur = { text, t: 0, dur }; }

  // событие героя: случайная фраза, не чаще раза в 20 секунд на событие
  event(name) {
    const p = this.g.player;
    if (!p || p.dead) return;
    const pool = (THOUGHTS[p.charId] || {})[name];
    if (!pool) return;
    const now = performance.now() / 1000;
    if (this.cd[name] && now - this.cd[name] < 20) return;
    this.cd[name] = now;
    this.say(Utils.choice(pool));
  }

  // реакция на действие напарника (видят все — мысли уходят по сети)
  react(kind, name) {
    const p = this.g.player;
    if (!p || p.dead) return;
    const pool = (REACTS[p.charId] || {})[kind];
    if (!pool) return;
    const now = performance.now() / 1000;
    if (this.cd[kind] && now - this.cd[kind] < 10) return;
    this.cd[kind] = now;
    this.say(Utils.choice(pool).replace('{n}', name || 'напарник'), 3.4);
  }

  update(dt) {
    if (this.cur) { this.cur.t += dt; if (this.cur.t > this.cur.dur) this.cur = null; }
    const g = this.g;
    if (g.state !== 'playing' || !g.player) return;
    this.idleT -= dt;
    if (this.idleT <= 0) { this.idleT = Utils.rand(30, 48); this.event('idle'); }
    const p = g.player;
    if (p.hp <= 2 && !p.dead && !this._low) { this._low = true; this.event('lowhp'); }
    if (p.hp > 2) this._low = false;
    const empty = p.weapon && p.weapon.type === 'ranged' && p.weapon.ammo <= 0 && !(p.rageT > 0);
    if (empty && !this._empty) this.event('empty');
    this._empty = empty;
  }

  // неоновый текст над головой (без подложки)
  static bubble(ctx, g, sx, sy, text, t, dur, accent) {
    const shown = text.slice(0, Math.floor(t * 40));
    const k = Math.min(1, t * 6, (dur - t) * 3);
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, k));
    ctx.font = 'italic bold 13px "Courier New", monospace';
    const tw = Math.min(280, ctx.measureText(text).width);
    const x = Utils.clamp(sx - tw / 2, 8, g.W - tw - 8), y = Math.max(18, sy - 14);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(2,6,16,0.85)'; ctx.lineJoin = 'round';
    ctx.strokeText(shown, x, y, 280);
    ctx.shadowColor = accent || '#05d9e8'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#9aeeff';
    ctx.fillText(shown, x, y, 280);
    ctx.shadowBlur = 0;
    // три точки-«пузырька» к голове
    ctx.fillStyle = accent || '#05d9e8';
    const dx = Utils.clamp(sx, x + 6, x + tw - 6);
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(dx + i * 3, y + 6 + i * 5, 2 - i * 0.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  draw(ctx) {
    const g = this.g, c = this.cur, p = g.player;
    if (!c || !p || !g.cam || g.state !== 'playing') return;
    const sx = (p.x + p.w / 2 - g.cam.x) * g.cam.zoom, sy = (p.y - g.cam.y) * g.cam.zoom - 18;
    Thoughts.bubble(ctx, g, sx, sy, c.text, c.t, c.dur);
  }
}

// ---------- рация: короткие сообщения союзников, не останавливают игру ----------
class Radio {
  constructor(game) { this.g = game; this.q = []; this.cur = null; }
  push(id, text) { this.q.push({ id, text }); }
  update(dt) {
    if (this.cur) { this.cur.t += dt; if (this.cur.t > 4.6) this.cur = null; }
    if (!this.cur && this.q.length) { this.cur = { ...this.q.shift(), t: 0 }; AudioSys.play('menu_move', 0.5); }
  }
  draw(ctx) {
    const r = this.cur, g = this.g;
    if (!r || g.state !== 'playing') return;
    const c = CAST[r.id] || CAST[''];
    const W = g.W, H = g.H, s = Math.min(1, W / 960);
    const pw = Math.min(420, W * 0.5), ph = 62 * s, px = 12 * s, py = H - ph - (Input.isMobile ? 90 : 14) * s;
    const k = Math.min(1, r.t * 5, (4.6 - r.t) * 3);
    ctx.save(); ctx.globalAlpha = Math.max(0, k);
    g.menu.panel(ctx, px, py, pw, ph, c.color, 0.9);
    const ps = ph - 14, img = StoryAssets.portrait(g, r.id);
    if (img) { const m = Math.min(img.naturalWidth, img.naturalHeight); ctx.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) * 0.2, m, m, px + 7, py + 7, ps, ps); }
    else drawPortraitStub(ctx, px + 7, py + 7, ps, r.id);
    ctx.strokeStyle = c.color; ctx.strokeRect(px + 6.5, py + 6.5, ps + 1, ps + 1);
    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.round(11 * s + 2)}px "Courier New", monospace`; ctx.fillStyle = c.color;
    ctx.fillText(`📻 ${c.name}`, px + ps + 16, py + 18 * s);
    ctx.font = `${Math.round(11 * s + 1)}px "Courier New", monospace`; ctx.fillStyle = '#fff';
    g.menu._wrapText(ctx, r.text.slice(0, Math.floor(r.t * 50)), px + ps + 16, py + 34 * s, pw - ps - 28, 14 * s + 2);
    ctx.restore();
  }
}

// ---------- миссия главы ----------
const ITEM_NAMES = { folder: 'ведомость', laptop: 'ноутбук', bag: 'мешок с зарплатой', key: 'часть ключа', phone: 'телефон курьера', case: 'чемодан' };

class Mission {
  constructor(game, ch) {
    this.g = game; this.ch = ch;
    this.list = ch.objectives && ch.objectives.length ? ch.objectives : [{ type: 'boss', label: 'Победите босса' }];
    this.i = -1; this.complete = false; this.doneT = -1;
    this.next();
  }

  get obj() { return this.list[this.i]; }

  // комната по номеру из планировки или 'near' | 'mid' | 'far' относительно старта
  room(spec, used = []) {
    const L = this.g.level, rooms = L.rooms;
    if (typeof spec === 'number') return rooms[spec] || rooms[0];
    const pr = L.playerRoom;
    const list = rooms.filter(r => !r.hall && r !== pr && !used.includes(r))
      .map(r => ({ r, d: Utils.dist(r.cx, r.cy, pr.cx, pr.cy) })).sort((a, b) => a.d - b.d);
    if (!list.length) return pr;
    if (spec === 'near') return list[0].r;
    if (spec === 'far') return list[list.length - 1].r;
    if (spec === 'random') return Utils.choice(list).r;
    return list[Math.floor(list.length / 2)].r;
  }

  spot(room) {
    const L = this.g.level;
    const p = L.randomFreePoint(room);
    return p || { x: (room.cx + 0.5) * TILE, y: (room.cy + 0.5) * TILE };
  }

  next() {
    const g = this.g;
    this.i++; this.doneT = -1;
    const o = this.obj;
    if (!o) { this.complete = true; return; }
    this.target = null; this.items = []; this.prog = 0; this.base = g.kills;
    if (o.type === 'goto' || o.type === 'hold') {
      const r = this.room(o.room === undefined ? 'mid' : o.room);
      const s = o.type === 'hold' ? { x: (r.cx + 0.5) * TILE, y: (r.cy + 0.5) * TILE } : this.spot(r);
      this.target = this._free(s.x, s.y);
    } else if (o.type === 'collect') {
      const used = [];
      for (let k = 0; k < o.n; k++) {
        const spec = o.rooms ? o.rooms[k % o.rooms.length] : 'random';
        const r = this.room(spec, used); used.push(r);
        const s = this.spot(r);
        this.items.push({ x: s.x, y: s.y, taken: false, kind: o.item || 'folder', think: o.thinks && o.thinks[k] });
      }
    }
    if (o.radio) for (let k = 0; k < o.radio.length; k += 2) g.radio.push(o.radio[k], o.radio[k + 1]);
    if (o.think) g.thoughts.say(o.think, 3.6);
    if (o.type === 'boss') g.thoughts.event('boss');
    if (o.ambush) this._ambush(o.ambush);
    AudioSys.play('menu_select', 0.6);
  }

  _free(x, y) {
    const lv = this.g.level;
    if (!lv.collides(x - 10, y - 10, 20, 20)) return { x, y };
    for (let rr = 8; rr < 140; rr += 8) for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, nx = x + Math.cos(a) * rr, ny = y + Math.sin(a) * rr;
      if (!lv.collides(nx - 10, ny - 10, 20, 20)) return { x: nx, y: ny };
    }
    return { x, y };
  }

  // засада: несколько врагов выбегают из соседних комнат и идут на героя
  _ambush(n) {
    const g = this.g, p = g.player, L = g.level;
    const near = L.rooms.filter(r => !r.hall).map(r => ({ r, d: Utils.dist((r.cx + 0.5) * TILE, (r.cy + 0.5) * TILE, p.x, p.y) }))
      .filter(o => o.d > 220).sort((a, b) => a.d - b.d).slice(0, 3);
    for (let k = 0; k < n && near.length; k++) {
      const pt = L.randomFreePoint(near[k % near.length].r);
      if (!pt) continue;
      const e = new Enemy(pt.x - 9, pt.y - 9, 'static', null, Math.random() < 0.2 ? 'hound' : 'normal');
      if (e.type === 'normal') e.weapon = makeWeapon(Utils.choice(['ak47', 'uzi', 'shotgun', 'bat', 'pipe']));
      e.state = 'investigate'; e.noiseTarget = { x: p.x + 9, y: p.y + 9 }; e.investigateTimer = 10;
      g.enemies.push(e);
    }
    g.totalEnemies = g.enemies.length;
    g.radio.push('', 'ЗАСАДА! Враги идут на шум.');
    AudioSys.play('ambush');
  }

  update(dt) {
    const g = this.g, p = g.player, o = this.obj;
    if (this.complete || !o || !p || g.state !== 'playing') return;
    if (this.doneT >= 0) { this.doneT += dt; if (this.doneT > 1.1) this.next(); return; }
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    let done = false;
    if (o.type === 'goto') done = Utils.dist(pcx, pcy, this.target.x, this.target.y) < 30;
    else if (o.type === 'hold') {
      const inside = Utils.dist(pcx, pcy, this.target.x, this.target.y) < 60;
      if (inside) {
        if (this.prog === 0) g.level.addNoise(this.target.x, this.target.y, 600);
        this.prog += dt;
        if (o.midAmbush && !this._mid && this.prog > o.t / 2) { this._mid = true; this._ambush(o.midAmbush); }
      } else this.prog = Math.max(0, this.prog - dt * 0.3);
      done = this.prog >= o.t;
    } else if (o.type === 'collect') {
      for (const it of this.items) {
        if (it.taken || Utils.dist(pcx, pcy, it.x, it.y) > 22) continue;
        it.taken = true;
        AudioSys.play('item_take');
        Effects.popup(it.x, it.y - 12, `+ ${ITEM_NAMES[it.kind] || 'предмет'}`, '#ffd319', 11);
        if (it.think) g.thoughts.say(it.think, 3.2);
      }
      done = this.items.every(it => it.taken);
    } else if (o.type === 'kill') done = g.kills - this.base >= o.n;
    else if (o.type === 'boss') done = !g.enemies.some(e => e.isBoss && !e.dead);
    if (done) {
      this.doneT = 0;
      AudioSys.play('objective_done');
      Effects.popup(pcx, pcy - 22, 'ЗАДАНИЕ ВЫПОЛНЕНО', '#3dff8a', 13);
      if (o.doneRadio) for (let k = 0; k < o.doneRadio.length; k += 2) g.radio.push(o.doneRadio[k], o.doneRadio[k + 1]);
      if (o.doneThink) g.thoughts.say(o.doneThink, 3.4);
    }
  }

  // метки в мире
  drawWorld(ctx) {
    const o = this.obj, t = performance.now() / 1000;
    if (!o || this.complete) return;
    ctx.save();
    if (this.target && (o.type === 'goto' || o.type === 'hold')) {
      const m = this.target, k = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.globalCompositeOperation = 'lighter';
      const R = o.type === 'hold' ? 60 : 20;
      ctx.strokeStyle = `rgba(255,211,25,${0.45 + 0.35 * k})`; ctx.lineWidth = 3;
      ctx.setLineDash(o.type === 'hold' ? [10, 8] : []); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.arc(m.x, m.y, R + k * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      if (o.type === 'hold' && this.prog > 0) {
        ctx.strokeStyle = 'rgba(61,255,138,0.9)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(m.x, m.y, R - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.prog / o.t)); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,211,25,0.12)'; ctx.beginPath(); ctx.arc(m.x, m.y, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const it of this.items) {
      if (it.taken) continue;
      const bob = Math.sin(t * 3 + it.x) * 2;
      ctx.save(); ctx.translate(it.x, it.y + bob);
      ctx.fillStyle = 'rgba(255,211,25,0.25)'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      drawMissionItem(ctx, it.kind);
      ctx.restore();
    }
    ctx.restore();
  }

  // панель задания и стрелка к цели
  drawHud(ctx, W, H, s) {
    const o = this.obj, g = this.g;
    this.panelBottom = 0;
    if (!o || this.complete || g.state !== 'playing') return;
    const rm = (window.innerWidth < 800 ? 100 : 20) * s;
    const left = 10 * s + 210 * s + 10, right = W - rm - 150 * s - 10;
    let pw = Math.min(520, right - left), px = left + (right - left - pw) / 2, py = 10 * s;
    if (pw < 280) { pw = Math.min(520, W - 20 * s - rm); px = 10 * s; py = (g._hudBottom || 90 * s) + 8 * s; }
    let prog = '';
    if (o.type === 'collect') prog = `  ${this.items.filter(i => i.taken).length}/${this.items.length}`;
    else if (o.type === 'hold') prog = `  ${Math.floor(Math.min(1, this.prog / o.t) * 100)}%`;
    else if (o.type === 'kill') prog = `  ${Math.min(o.n, g.kills - this.base)}/${o.n}`;
    const ph = 44 * s;
    this.panelBottom = py + ph;     // надпись комнаты рисуется под панелью задания
    g.menu.panel(ctx, px, py, pw, ph, this.doneT >= 0 ? '#3dff8a' : this.ch.color, 0.88);
    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.max(9, Math.round(10 * s))}px "Courier New", monospace`; ctx.fillStyle = this.ch.color;
    ctx.fillText(`ЗАДАНИЕ ${this.i + 1}/${this.list.length}`, px + 12, py + 15 * s);
    ctx.font = `bold ${Math.max(11, Math.round(13 * s))}px "Courier New", monospace`; ctx.fillStyle = this.doneT >= 0 ? '#3dff8a' : '#fff';
    ctx.fillText((this.doneT >= 0 ? '✓ ' : '') + o.label + prog, px + 12, py + 34 * s, pw - 24);
    // стрелка к цели, если она за экраном
    let tgt = this.target;
    if (o.type === 'collect') { const it = this.items.find(i => !i.taken); tgt = it || null; }
    if (o.type === 'boss') { const b = g.enemies.find(e => e.isBoss && !e.dead); tgt = b ? { x: b.cx(), y: b.cy() } : null; }
    if (tgt && g.cam) {
      const sx = (tgt.x - g.cam.x) * g.cam.zoom, sy = (tgt.y - g.cam.y) * g.cam.zoom;
      if (sx < 20 || sy < 20 || sx > W - 20 || sy > H - 20) {
        const cx = W / 2, cy = H / 2, a = Math.atan2(sy - cy, sx - cx);
        const ex = Utils.clamp(cx + Math.cos(a) * W, 30, W - 30), ey = Utils.clamp(cy + Math.sin(a) * H, 70, H - 30);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
        ctx.fillStyle = this.ch.color; ctx.shadowColor = this.ch.color; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }
}

// Предметы заданий
function drawMissionItem(ctx, kind) {
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  if (kind === 'folder' || kind === 'case') {
    R(-9, -7, 18, 14, '#050407'); R(-8, -6, 16, 12, kind === 'case' ? '#3a2a1a' : '#c8a040'); R(-8, -6, 16, 3, kind === 'case' ? '#5a4a2a' : '#e8c060');
    if (kind === 'case') R(-3, -9, 6, 3, '#1a1a1a'); else { R(-5, -1, 10, 1, '#5a4010'); R(-5, 2, 7, 1, '#5a4010'); }
  } else if (kind === 'laptop') {
    R(-10, -7, 20, 14, '#050407'); R(-9, -6, 18, 12, '#2a2e3a'); R(-7, -4, 14, 7, '#5ad0ff');
  } else if (kind === 'bag') {
    ctx.fillStyle = '#050407'; ctx.beginPath(); ctx.ellipse(0, 1, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8b080'; ctx.beginPath(); ctx.ellipse(0, 1, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    R(-3, -9, 6, 3, '#8a7040');
    ctx.fillStyle = '#2a8a3a'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('₸', 0, 5);
  } else if (kind === 'key') {
    ctx.fillStyle = '#050407'; ctx.beginPath(); ctx.arc(-4, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd319'; ctx.beginPath(); ctx.arc(-4, 0, 5, 0, Math.PI * 2); ctx.fill();
    R(0, -1.5, 10, 3, '#ffd319'); R(6, 1, 2, 3, '#ffd319'); R(9, 1, 1.5, 3, '#ffd319');
    ctx.fillStyle = '#050407'; ctx.beginPath(); ctx.arc(-4, 0, 2, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'phone') {
    R(-5, -9, 10, 18, '#050407'); R(-4, -8, 8, 16, '#1a1a22'); R(-3, -6, 6, 11, '#5aff8a');
  }
}
