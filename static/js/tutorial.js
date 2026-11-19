// =====================================================================
// ОБУЧЕНИЕ: три урока на полигоне НВП — по одному на каждого героя.
// Урок — список шагов: инструктор объясняет, игра ждёт выполнения задания.
// Шаг: { say: [реплики] } — диалог; { hint, keys, setup(T, g, p), goal(T, g, p) } — задание.
// В обучении нельзя погибнуть, а патроны пополняются сами.
// =====================================================================

// Полигон: пять комнат подряд (плац → класс → тир → склад → полигон)
const TUTORIAL_LAYOUT = {
  id: 'tutorial', name: 'ПОЛИГОН НВП', sub: 'Обучение', color: '#a8c070', seed: 909090,
  density: 0.1, mix: { tank: 0, hound: 0, sniper: 0 }, weapons: [],
  start: 0,
  rooms: [
    { x: 3, y: 14, w: 10, h: 14, type: 'lobby', name: 'Плац' },
    { x: 14, y: 14, w: 10, h: 14, type: 'classroom', name: 'Класс НВП' },
    { x: 25, y: 14, w: 12, h: 14, type: 'gym', name: 'Тир' },
    { x: 38, y: 14, w: 9, h: 14, type: 'storage', name: 'Склад' },
    { x: 48, y: 14, w: 9, h: 14, type: 'gym', name: 'Полигон' },
  ],
  links: [[0, 1, 'door'], [1, 2, 'door'], [2, 3, 'door'], [3, 4, 'door']],
};

// Мишень: стоит на месте, не атакует, получает урон и оглушается как обычный бандит
function makeDummy(x, y) {
  const e = new Enemy(x - 9, y - 9, 'static', null, 'normal');
  e.weapon = null;
  e._dummy = true;
  e.update = function (dt, level, player, bullets, enemies, pickups) {
    this._animTick(dt, level);
    if (this.dead) return;
    this._droppedWeapon = null;
    for (const b of bullets) {
      if (b.dead || !b.isPlayer) continue;
      if (Utils.segDist(b.px, b.py, b.x, b.y, this.cx(), this.cy()) < 12) {
        b.dead = true;
        this.takeDamage(b.dmg || 1, pickups, { kind: b.src === 'shotgun' ? 'shotgun' : 'bullet', angle: Math.atan2(b.vy, b.vx), by: b.owner });
        if (this.dead) return;
      }
    }
  };
  return e;
}

// Манекен-босс: не нападает, но оглушается и получает урон как босс
function makeDummyBoss(x, y) {
  const b = new Boss(x - 11, y - 11, 'watchman', 1);
  b.bossName = 'МАНЕКЕН-БОСС'; b.bossTitle = 'Тренировочный';
  b.maxHp = b.hp = 20;
  b._dummy = true;
  b.update = function (dt, level, player, bullets, enemies, pickups) {
    this._animTick(dt, level);
    if (this.dead) return;
    this._hitPlayerBullets(bullets, pickups);
    this._stunImmune = Math.max(0, (this._stunImmune || 0) - dt);
    if (this.phase === 'dazed') { this.phaseT -= dt; if (this.phaseT <= 0) this.phase = 'hunt'; }
    if (player) this.angle = Math.atan2(player.y - this.y, player.x - this.x);
  };
  return b;
}

// ---------- шаги, общие для всех ----------
const T_INTRO = (hero, extra) => ({ say: [
  ['ereke', 'Здравия желаю! Я Ереке, веду НВП. Прежде чем идти за зарплатой, пройдём полигон.'],
  [hero, extra],
  ['ereke', 'Слушай задание внизу экрана. Выполнил — переходим к следующему. Погибнуть здесь нельзя, патроны выдаю бесплатно.'],
] });

const T_BASICS = [
  { hint: 'WASD — движение. Дойдите до светящейся метки.', keys: ['W', 'A', 'S', 'D'],
    setup: (T) => { T.mark(0, 0.85, 0.2); }, goal: (T) => T.atMark() },
  { hint: 'Отлично. Теперь — к метке в другом углу плаца.', keys: ['W', 'A', 'S', 'D'],
    setup: (T) => { T.mark(0, 0.15, 0.85); }, goal: (T) => T.atMark() },
  { hint: 'Зажмите SHIFT — камера заглядывает вперёд, туда, куда смотрит прицел.', keys: ['SHIFT'],
    goal: (T, g, p) => { if (p.isLooking) T.track.look = (T.track.look || 0) + T.dt; return (T.track.look || 0) > 0.7; } },
  { hint: 'Двери толкаются телом: чем сильнее давите, тем шире открывается. Пройдите в класс.', keys: ['W', 'A', 'S', 'D'],
    setup: (T) => { T.mark(1, 0.5, 0.5); }, goal: (T) => T.atMark() },
];

// Самса и бронежилет — на складе
const T_HEAL = {
  hint: 'Склад: самса из столовой лечит сердце, бронежилет даёт 2 синих сердца (урон снимает их первыми). Возьмите оба.',
  setup: (T, g, p) => { p.hp = Math.max(1, p.maxHp - 3); p.armor = 0; T.item(3, 0.3, 0.3, 'health'); T.item(3, 0.7, 0.7, 'armor'); },
  goal: (T, g, p) => p.armor > 0 && p.hp > p.maxHp - 3,
};

// Граната — на складе
const T_GRENADE = {
  hint: 'G — граната летит к курсору, отскакивает от стен и взрывается через 1.8 с. Взорвите группу мишеней на складе.', keys: ['G'],
  setup: (T, g, p) => { p.grenades = Math.max(1, p.grenades || 0); for (const [fx, fy] of [[0.65, 0.4], [0.75, 0.5], [0.65, 0.6]]) T.dummy(3, fx, fy); },
  goal: (T, g, p) => {
    const left = T.alive();
    if (left && !p.grenades && !g.projectiles.length) { p.grenades = 1; Effects.popup(p.x + 9, p.y - 10, 'ЕЩЁ ГРАНАТА', '#8aff8a', 11); }
    return !left;
  },
};

// Кольцо мишеней для режимов (ярость / лотерея) на полигоне
function T_ringOfDummies(T, n = 10) {
  const r = T.g.level.rooms[4];
  const cx = (r.x + r.w / 2) * TILE, cy = (r.y + r.h / 2) * TILE;
  T.dummyAt(cx - r.w * TILE * 0.32, cy);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    T.dummyAt(cx + Math.cos(a) * 90, cy + Math.sin(a) * 70);
  }
}

const TUTORIALS = [
  // ===================== ДАНИ =====================
  {
    id: 'tut_dani', hero: 'dani', title: 'УРОК 1. ДАНИ — ТРОФЕЙЩИК', color: '#05d9e8',
    topics: 'Движение, обзор, двери, стрельба, бросок и подбор оружия, трофеи боссов, самса и броня, граната, ЛОТЕРЕЯ',
    steps: [
      T_INTRO('dani', 'Агай, а можно я как-нибудь потом? У меня окно... Ладно-ладно, иду.'),
      ...T_BASICS,
      { hint: 'Тир: наведите мышь и стреляйте — ЛКМ. Снимите 3 мишени.', keys: ['ЛКМ'],
        setup: (T) => { for (const fy of [0.25, 0.5, 0.75]) T.dummy(2, 0.75, fy); }, goal: (T) => !T.alive() },
      { say: [
        ['ereke', 'У тебя M4 с глушителем. Выстрелы почти не слышны — враги за стеной не поднимут тревогу.'],
        ['dani', 'То есть можно работать тихо и никого не беспокоить. Мой стиль.'],
      ] },
      { hint: 'Q — бросить оружие. Брошенное оружие сбивает врага с ног. Попадите оружием в мишень.', keys: ['Q'],
        setup: (T, g, p) => { if (!p.weapon) p.weapon = prepWeapon('dani', makeWeapon('m4s')); T.dummy(2, 0.78, 0.5); },
        goal: (T) => T.objs.every(e => e.stunned || e.dead) },
      { hint: 'Оружие подбирается само — просто подойдите к нему.',
        goal: (T, g, p) => !!p.weapon },
      { hint: 'Дани подбирает оружие боссов. Q — выбросьте M4, затем возьмите Золотой Uzi на складе.', keys: ['Q'],
        setup: (T) => { T.item(3, 0.4, 0.5, 'goldenUzi'); }, goal: (T, g, p) => p.weapon && p.weapon.id === 'goldenUzi' },
      T_HEAL,
      T_GRENADE,
      { say: [
        ['ereke', 'Теперь главное. Каждые 10 убийств у тебя копится заряд — ЛОТЕРЕЯ.'],
        ['ereke', 'Шесть секунд враги вокруг могут просто лопнуть — шанс 25%. А ножи и биты на полу иногда становятся самсой.'],
        ['dani', 'Вот это я понимаю — удача. Наконец-то.'],
      ] },
      { hint: 'Полигон: заряд почти полный (9/10). Убейте одну мишень — включится ЛОТЕРЕЯ.', keys: ['ЛКМ'],
        setup: (T, g, p) => { p.charge = MODE_KILLS - 1; T_ringOfDummies(T); }, goal: (T, g, p) => p.lottoT > 0 },
      { hint: 'ЛОТЕРЕЯ! Мишени в радиусе лопаются сами. Добейте остальных.', keys: ['ЛКМ'],
        goal: (T) => !T.alive() },
      { say: [
        ['ereke', 'Полигон пройден. Свободен, Данияр. На пару не опаздывай.'],
        ['dani', 'Агай, у меня сегодня как раз короткий день.'],
      ] },
    ],
  },
  // ===================== ГАЛА =====================
  {
    id: 'tut_gal', hero: 'gal', title: 'УРОК 2. ГАЛА — ТАРАН', color: '#ff2a6d',
    topics: 'Движение, обзор, двери, удары кулаком, сбивание на бегу, ПИНОК-ВЕРТУШКА, добивание, лечение за убийства, оглушение босса',
    steps: [
      T_INTRO('gal', 'Оружие мне не выдавайте, агай. Я по-простому.'),
      ...T_BASICS,
      { hint: 'Тир: ЛКМ — удар кулаком. Гала вырубает с одного удара. Уложите 3 мишени.', keys: ['ЛКМ'],
        setup: (T) => { for (const fy of [0.25, 0.5, 0.75]) T.dummy(2, 0.75, fy); }, goal: (T) => !T.alive() },
      { hint: 'Не бейте! Разбегитесь и врежьтесь в мишень — на бегу Гала сбивает бандитов с ног.', keys: ['W', 'A', 'S', 'D'],
        setup: (T) => { T.dummy(2, 0.55, 0.5); },
        goal: (T) => {
          if (T.objs[0] && T.objs[0].dead) { T.objs = []; T.dummy(2, 0.55, 0.5); Effects.popup(T.g.player.x + 9, T.g.player.y - 10, 'НЕ БИТЬ — ВРЕЗАТЬСЯ!', '#ffd319', 11); }
          return T.objs[0] && T.objs[0].stunned;
        } },
      { hint: 'Склад: встаньте в центр метки и нажмите F — ПИНОК-ВЕРТУШКА оглушает всех вокруг.', keys: ['F'],
        setup: (T) => {
          const m = T.mark(3, 0.5, 0.5);
          for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; T.dummyAt(m.x + Math.cos(a) * 26, m.y + Math.sin(a) * 26); }
        },
        goal: (T) => T.objs.filter(e => e.stunned || e.dead).length >= 3 },
      { hint: 'Оглушённые беззащитны — добейте их кулаком.', keys: ['ЛКМ'], goal: (T) => !T.alive() },
      { say: [
        ['ereke', 'В прыжке ты неуязвим, но пинок перезаряжается 2 секунды — не спамь.'],
        ['ereke', 'И ещё: каждого пятого уложенного ты переводишь дух — плюс одно сердце.'],
      ] },
      T_HEAL,
      { hint: 'Полигон: сердца на исходе. Уложите 5 мишеней — 5-я вернёт одно сердце.', keys: ['ЛКМ'],
        setup: (T, g, p) => { p.hp = 3; p.armor = 0; p.kills = 0; const r = g.level.rooms[4]; for (let i = 0; i < 5; i++) T.dummy(4, 0.3 + (i % 3) * 0.2, 0.3 + Math.floor(i / 3) * 0.4); T._hp0 = 3; },
        goal: (T, g, p) => !T.alive() && p.hp > T._hp0 },
      { hint: 'Манекен-босс: каждый 5-й удар кулаком оглушает босса (потом 5 с иммунитета). Оглушите его.', keys: ['ЛКМ'],
        setup: (T, g) => { const s = T.spot(4, 0.5, 0.5); const b = makeDummyBoss(s.x, s.y); g.enemies.push(b); T.objs.push(b); },
        goal: (T) => T.objs[0] && T.objs[0].phase === 'dazed' },
      { hint: 'Оглушил! Теперь добейте манекен-босса.', keys: ['ЛКМ'], goal: (T) => !T.alive() },
      T_GRENADE,
      { say: [
        ['ereke', 'Неплохо, Галымжан. Кулаки у тебя — штатное оружие.'],
        ['gal', 'Спасибо, агай. Пойду проверю, не пришла ли зарплата.'],
      ] },
    ],
  },
  // ===================== ДАУР =====================
  {
    id: 'tut_daur', hero: 'daur', title: 'УРОК 3. ДАУР — СТРЕЛОК', color: '#ffd319',
    topics: 'Движение, обзор, двери, два ствола, стрельба в стороны, порядок броска, второй ствол, самса и броня, граната, ЯРОСТЬ',
    steps: [
      T_INTRO('daur', 'Агай, я бы лучше код писал... Но два Uzi — это тоже аргумент.'),
      ...T_BASICS,
      { hint: 'Тир: у Даура два Uzi — ЛКМ стреляет из обоих. Снимите 3 мишени.', keys: ['ЛКМ'],
        setup: (T) => { for (const fy of [0.3, 0.5, 0.7]) T.dummy(2, 0.75, fy); }, goal: (T) => !T.alive() },
      { hint: 'Зажмите ПКМ (или CTRL) — руки в стороны. Смотрите вперёд, а стреляйте влево и вправо одновременно.', keys: ['ПКМ', 'CTRL'],
        setup: (T, g, p) => { T.dummy(2, 0.5, 0.12); T.dummy(2, 0.5, 0.88); },
        goal: (T, g, p) => { if (p.dualSpread) T.track.spread = true; return !T.alive() && T.track.spread; } },
      { say: [
        ['ereke', 'В любом стволе у тебя на 30% больше патронов — привычка запасливого человека.'],
        ['daur', 'Я просто разбираюсь в технике, агай.'],
      ] },
      { hint: 'Q бросает сначала худший ствол. У вас пустой Glock и полная M4 — нажмите Q.', keys: ['Q'], keepAmmo: true,
        setup: (T, g, p) => { p.weapon = prepWeapon('daur', makeWeapon('glock', 0)); p.weapon2 = prepWeapon('daur', makeWeapon('m4')); },
        goal: (T, g, p) => p.weapon && p.weapon.id === 'm4' && !p.weapon2 },
      { hint: 'Верно: пустой Glock улетел первым. Подберите второй ствол на складе — Даур держит по огнестрелу в каждой руке.',
        setup: (T) => { T.item(3, 0.4, 0.5, 'uzi'); }, goal: (T, g, p) => !!p.weapon2 },
      T_HEAL,
      T_GRENADE,
      { say: [
        ['ereke', 'Каждые 10 убийств копится заряд ЯРОСТИ. Шесть секунд — бесконечные патроны, стрельба быстрее на 35%, бег на 30%.'],
        ['daur', 'А в айти так можно?'],
        ['ereke', 'В айти — нет. Здесь — да.'],
      ] },
      { hint: 'Полигон: заряд почти полный (9/10). Убейте одну мишень — включится ЯРОСТЬ.', keys: ['ЛКМ'],
        setup: (T, g, p) => { p.charge = MODE_KILLS - 1; T_ringOfDummies(T); }, goal: (T, g, p) => p.rageT > 0 },
      { hint: 'ЯРОСТЬ! Патроны бесконечны — зачистите полигон, пока режим не кончился.', keys: ['ЛКМ'],
        goal: (T) => !T.alive() },
      { say: [
        ['ereke', 'Отлично стреляешь, Даурен. Может, и правда не уходи никуда.'],
        ['daur', 'Посмотрим, агай. Сначала зарплата.'],
      ] },
    ],
  },
];

const TutorialProgress = {
  done() { try { return JSON.parse(localStorage.getItem('cs_tutorial') || '[]'); } catch (e) { return []; } },
  mark(id) { try { const d = this.done(); if (!d.includes(id)) { d.push(id); localStorage.setItem('cs_tutorial', JSON.stringify(d)); } } catch (e) {} },
};

class Tutorial {
  constructor(game, def) {
    this.g = game; this.def = def;
    this.i = -1; this.t = 0; this.dt = 0;
    this.objs = []; this.marker = null; this.track = {};
    this.doneT = -1; this.finished = false;
    this._next();
  }

  get step() { return this.def.steps[this.i]; }
  get taskSteps() { return this.def.steps.filter(s => !s.say).length; }
  get taskNo() { return this.def.steps.slice(0, this.i + 1).filter(s => !s.say).length; }

  // Точка в комнате (доли ширины/высоты), сдвинутая на свободное место
  spot(ri, fx, fy) {
    const r = this.g.level.rooms[ri], lv = this.g.level;
    let x = (r.x + r.w * fx) * TILE, y = (r.y + r.h * fy) * TILE;
    return this._free(x, y);
  }
  _free(x, y) {
    const lv = this.g.level;
    if (!lv.collides(x - 9, y - 9, 18, 18)) return { x, y };
    for (let rr = 6; rr < 120; rr += 6) for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, nx = x + Math.cos(a) * rr, ny = y + Math.sin(a) * rr;
      if (!lv.collides(nx - 9, ny - 9, 18, 18)) return { x: nx, y: ny };
    }
    return { x, y };
  }
  mark(ri, fx, fy) { this.marker = this.spot(ri, fx, fy); return this.marker; }
  atMark() { const p = this.g.player; return this.marker && Utils.dist(p.x + 9, p.y + 9, this.marker.x, this.marker.y) < 26; }
  dummy(ri, fx, fy) { const s = this.spot(ri, fx, fy); return this.dummyAt(s.x, s.y); }
  dummyAt(x, y) { const s = this._free(x, y); const e = makeDummy(s.x, s.y); this.g.enemies.push(e); this.objs.push(e); Effects.ring(s.x, s.y, '168,192,112', 18); return e; }
  item(ri, fx, fy, kind) {
    const s = this.spot(ri, fx, fy);
    let p;
    if (kind === 'health') p = new Pickup(s.x, s.y, null, true);
    else if (kind === 'armor') { p = new Pickup(s.x, s.y, null); p.isArmor = true; }
    else p = new Pickup(s.x, s.y, makeWeapon(kind));
    this.g.pickups.push(p);
    return p;
  }
  alive() { return this.objs.filter(e => !e.dead).length; }

  _next() {
    const g = this.g;
    this.i++;
    this.t = 0; this.marker = null; this.track = {}; this.objs = []; this.doneT = -1;
    // старые мишени убираем, чтобы не мешали
    g.enemies = g.enemies.filter(e => !e.dead);
    const st = this.step;
    if (!st) { this._finish(); return; }
    const p = g.player;
    if (!st.say) p.charge = 0;
    if (st.setup) st.setup(this, g, p);
    g.totalEnemies = g.enemies.length;
    if (st.say) {
      g.dialogue = new Dialogue(g, st.say, { onDone: () => { g.dialogue = null; g.state = 'playing'; this._next(); } });
      g.state = 'dialogue';
    } else AudioSys.play('menu_move');
  }

  _finish() {
    if (this.finished) return;
    this.finished = true;
    TutorialProgress.mark(this.def.id);
    const g = this.g;
    g.tutorial = null;
    g.toMenu();
    g.storyUI.open('tutorial');
    g.storyUI.msg = `${this.def.title}: пройден!`; g.storyUI.msgT = 3;
    AudioSys.play('game_start');
  }

  update(dt) {
    const g = this.g, p = g.player, st = this.step;
    if (!st || st.say || g.state !== 'playing' || !p) return;
    this.dt = dt; this.t += dt;
    // в обучении патроны не кончаются
    if (!st.keepAmmo) for (const w of [p.weapon, p.weapon2]) if (w && w.type === 'ranged' && w.ammo <= 0) w.ammo = w.maxAmmo;
    if (this.doneT >= 0) {
      this.doneT += dt;
      if (this.doneT > 0.9) this._next();
      return;
    }
    if (st.goal && st.goal(this, g, p)) {
      this.doneT = 0;
      AudioSys.play('pickup_weapon');
      Effects.popup(p.x + 9, p.y - 14, 'ВЫПОЛНЕНО!', '#3dff8a', 14);
      Effects.ring(p.x + 9, p.y + 9, '60,255,140', 30);
    }
  }

  // В обучении нельзя погибнуть: урон не опускает ниже 1 сердца
  protect(p) {
    const orig = p.takeDamage.bind(p);
    p.takeDamage = (a, c) => {
      if (!p.armor && a >= p.hp) {
        a = p.hp - 1;
        if (a <= 0) { if (p.hurtCooldown <= 0) { p.hurtCooldown = 0.6; Effects.popup(p.x + 9, p.y - 10, 'В ОБУЧЕНИИ НЕ УМИРАЮТ', '#ffd319', 10); } return; }
      }
      orig(a, c);
    };
  }

  // Метка и стрелки над мишенями (в координатах мира)
  drawWorld(ctx) {
    const t = performance.now() / 1000;
    if (this.marker) {
      const m = this.marker, k = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(120,255,160,${0.5 + 0.4 * k})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(m.x, m.y, 18 + k * 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(120,255,160,0.15)'; ctx.beginPath(); ctx.arc(m.x, m.y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const e of this.objs) {
      if (e.dead) continue;
      const y = e.cy() - 26 - Math.abs(Math.sin(t * 4)) * 4;
      ctx.fillStyle = e.stunned ? '#ffd319' : '#ff5050';
      ctx.beginPath(); ctx.moveTo(e.cx() - 5, y - 6); ctx.lineTo(e.cx() + 5, y - 6); ctx.lineTo(e.cx(), y); ctx.closePath(); ctx.fill();
    }
  }

  // Панель задания вверху по центру
  drawHud(ctx, W, H, s) {
    const st = this.step;
    if (!st || st.say) return;
    const hint = Input.isMobile ? mobileHint(st.hint) : st.hint;
    const keys = st.keys && (Input.isMobile ? [...new Set(st.keys.map(k => MOBILE_KEYS[k] || k))] : st.keys);
    const M = this.g.menu;
    // между левым (герой) и правым (очки) блоками HUD; на узком экране — под левым блоком
    const rm = (window.innerWidth < 800 ? 100 : 20) * s;
    const left = 10 * s + 210 * s + 10, right = W - rm - 150 * s - 10;
    let pw = Math.min(560, right - left), px = left + (right - left - pw) / 2, py = 10 * s;
    if (pw < 300) { pw = Math.min(560, W - 20 * s - rm); px = 10 * s; py = (this.g._hudBottom || 90 * s) + 8 * s; }
    ctx.save();
    ctx.font = `${Math.max(11, Math.round(13 * s))}px "Courier New", monospace`;
    const lines = [];
    { const words = hint.split(' '); let line = '';
      for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > pw - 28 && line) { lines.push(line); line = w; } else line = test; }
      lines.push(line); }
    const lh = Math.max(14, 17 * s);
    const ph = 30 * s + lines.length * lh + (keys ? 28 * s : 6 * s);
    M.panel(ctx, px, py, pw, ph, this.doneT >= 0 ? '#3dff8a' : this.def.color, 0.9);
    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.max(10, Math.round(11 * s))}px "Courier New", monospace`;
    ctx.fillStyle = this.def.color;
    ctx.fillText(`${this.def.title} — ЗАДАНИЕ ${this.taskNo}/${this.taskSteps}`, px + 14, py + 18 * s, pw - 28);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(px + 14, py + 23 * s, pw - 28, 3);
    ctx.fillStyle = this.def.color; ctx.fillRect(px + 14, py + 23 * s, (pw - 28) * (this.taskNo - (this.doneT >= 0 ? 0 : 1)) / this.taskSteps, 3);
    ctx.font = `${Math.max(11, Math.round(13 * s))}px "Courier New", monospace`;
    ctx.fillStyle = this.doneT >= 0 ? '#3dff8a' : '#ffffff';
    lines.forEach((l, i) => ctx.fillText(l, px + 14, py + 30 * s + (i + 0.8) * lh));
    if (keys) {
      let kx = px + 14; const ky = py + 30 * s + lines.length * lh + 6 * s;
      for (const k of keys) kx += M._keyCap(ctx, kx, ky, k, 0.8 * s + 0.2) + 6;
    }
    ctx.restore();
  }
}

// Подписи кнопок и текст заданий для телефона
const MOBILE_KEYS = { W: 'ЛЕВЫЙ СТИК', A: 'ЛЕВЫЙ СТИК', S: 'ЛЕВЫЙ СТИК', D: 'ЛЕВЫЙ СТИК', 'ЛКМ': 'ПРАВЫЙ СТИК', Q: 'БРОС', G: 'ГРАН', F: 'ПИНОК', 'ПКМ': 'ВРАЗБРОС', CTRL: 'ВРАЗБРОС', SHIFT: 'ПРАВЫЙ СТИК ДО УПОРА' };
function mobileHint(t) {
  return t
    .replace('WASD — движение', 'Левый стик — движение')
    .replace('Зажмите SHIFT — камера заглядывает вперёд, туда, куда смотрит прицел.', 'Оттяните правый стик до упора — камера заглядывает вперёд.')
    .replace('наведите мышь и стреляйте — ЛКМ', 'тяните правый стик к цели — оттянули сильнее, пошла стрельба')
    .replace('ЛКМ — удар кулаком', 'Правый стик — удар кулаком')
    .replace('ЛКМ стреляет из обоих', 'правый стик стреляет из обоих')
    .replace('Зажмите ПКМ (или CTRL) — руки в стороны', 'Включите кнопку ВРАЗБРОС — руки в стороны')
    .replace(/нажмите F/g, 'нажмите ПИНОК')
    .replace(/нажмите Q/g, 'нажмите БРОС')
    .replace(/\bQ — /g, 'Кнопка БРОС — ')
    .replace(/\bG — /g, 'Кнопка ГРАН — ')
    .replace(/\bQ\b/g, 'БРОС')
    .replace(/кулаком\./g, 'кулаком (правый стик).');
}
