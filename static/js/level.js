const TILE = 32;
const DOOR_W = 2;

// Типы клеток сетки
const T_FLOOR = 0;  // пол
const T_WALL = 1;   // стена
const T_TALL = 3;   // высокая мебель: блокирует движение, пули и обзор
const T_OUT = 4;    // улица за пределами здания
const T_LOW = 5;    // низкая мебель: блокирует движение, но не пули и не обзор

const ROOM_THEMES = {
  office:   { name: 'Офис',      floor: 'carpet',   colors: ['#1b2232', '#232c40', '#151b28'], light: '#9fd8ff' },
  kitchen:  { name: 'Кухня',     floor: 'checker',  colors: ['#3b404b', '#262a33'],            light: '#e6f2ff' },
  bathroom: { name: 'Санузел',   floor: 'mosaic',   colors: ['#2a4a50', '#21393e', '#33585f'], light: '#7fffe0' },
  lounge:   { name: 'Гостиная',  floor: 'wood',     colors: ['#4a2e22', '#3f271c', '#55362a'], light: '#ff7fbf' },
  bar:      { name: 'Бар',       floor: 'checker',  colors: ['#3a1220', '#140a10'],            light: '#c060ff' },
  bedroom:  { name: 'Спальня',   floor: 'wood',     colors: ['#5a3a26', '#4d311f', '#664330'], light: '#ffb060' },
  storage:  { name: 'Склад',     floor: 'concrete', colors: ['#2a2a2f', '#25252a', '#303036'], light: '#ffe08a' },
  server:   { name: 'Серверная', floor: 'raised',   colors: ['#1b2232', '#141a27'],            light: '#40a0ff' },
  hall:     { name: 'Коридор',   floor: 'lino',     colors: ['#2b2232', '#32283b'],            light: '#ff9a5a' },
  // для статичных уровней
  classroom:{ name: 'Аудитория', floor: 'lino',     colors: ['#2a2c36', '#30323e'],            light: '#e8f0ff' },
  library:  { name: 'Библиотека',floor: 'wood',     colors: ['#3a2418', '#30200f', '#42291a'], light: '#ffd8a0' },
  gym:      { name: 'Спортзал',  floor: 'court',    colors: ['#5a3a20', '#52341c', '#5e3e22'], light: '#fff2d0' },
  lobby:    { name: 'Холл',      floor: 'marble',   colors: ['#3a3a44', '#2e2e38', '#46464e'], light: '#ffe8c0' },
  teller:   { name: 'Кассы',     floor: 'marble',   colors: ['#34343e', '#2a2a34', '#3e3e48'], light: '#fff0d0' },
  vault:    { name: 'Хранилище', floor: 'steel',    colors: ['#2a2e34', '#22262c'],            light: '#9fd0ff' },
  stage:    { name: 'Сцена',     floor: 'steel',    colors: ['#1a1622', '#14101c'],            light: '#c060ff' },
  club:     { name: 'Танцпол',   floor: 'dance',    colors: ['#ff2a6d', '#05d9e8', '#c060ff', '#ffd319', '#3fff7f'], light: '#ff3aa0' },
  // улица и джунгли
  street:   { name: 'Улица',     floor: 'asphalt',  colors: ['#26262c', '#2a2a31', '#232328'], light: '#ffd8a0' },
  parking:  { name: 'Парковка',  floor: 'asphalt',  colors: ['#2a2a30', '#2e2e35'],            light: '#ffe0a0' },
  plaza:    { name: 'Площадь',   floor: 'paving',   colors: ['#44424c', '#3c3a44', '#4a4852'], light: '#ffe8c0' },
  park:     { name: 'Сквер',     floor: 'grass',    colors: ['#1e3a1e', '#21401f', '#1b351c'], light: '#c8ffb0' },
  jungle:   { name: 'Джунгли',   floor: 'jungle',   colors: ['#14301a', '#17361d', '#112a16'], light: '#9affa0' },
  clearing: { name: 'Поляна',    floor: 'grass',    colors: ['#24461f', '#284d22', '#20401c'], light: '#e0ffb0' },
  ruins:    { name: 'Руины',     floor: 'stone',    colors: ['#3a3a36', '#34342f', '#40403b'], light: '#ffe0a0' },
};

// [предмет, мин, макс, 'wall' | 'center']
const ROOM_FURNITURE = {
  office:   [['deskPair', 0, 2, 'center'], ['desk', 2, 4, 'wall'], ['filing', 1, 2, 'wall'], ['bookshelf', 0, 1, 'wall'], ['cooler', 0, 1, 'wall'], ['plant', 1, 3, 'wall']],
  kitchen:  [['kitchenRun', 1, 1, 'wall'], ['fridge', 1, 1, 'wall'], ['dtable', 1, 1, 'center'], ['kitchenRun', 0, 1, 'wall'], ['plant', 0, 2, 'wall']],
  bathroom: [['tub', 0, 1, 'wall'], ['toilet', 1, 2, 'wall'], ['bsink', 1, 2, 'wall'], ['plant', 0, 1, 'wall']],
  lounge:   [['couch', 1, 2, 'wall'], ['tvstand', 1, 1, 'wall'], ['bookshelf', 0, 1, 'wall'], ['coffee', 0, 1, 'center'], ['pillar', 0, 2, 'center'], ['armchair', 0, 2, 'wall'], ['lamp', 1, 2, 'wall'], ['plant', 1, 2, 'wall']],
  bar:      [['bar', 1, 1, 'wall'], ['pool', 0, 1, 'center'], ['booth', 1, 2, 'wall'], ['arcade', 1, 2, 'wall'], ['pillar', 0, 2, 'center'], ['plant', 0, 1, 'wall']],
  bedroom:  [['bed', 1, 1, 'wall'], ['wardrobe', 1, 1, 'wall'], ['nightstand', 1, 2, 'wall'], ['desk', 0, 1, 'wall'], ['armchair', 0, 1, 'wall'], ['lamp', 0, 1, 'wall'], ['plant', 0, 1, 'wall']],
  storage:  [['shelfRack', 1, 3, 'wall'], ['pallet', 0, 2, 'center'], ['crate', 3, 7, 'wall'], ['barrel', 1, 3, 'wall'], ['crate', 0, 3, 'center']],
  server:   [['serverRow', 1, 3, 'center'], ['filing', 0, 2, 'wall'], ['shelfRack', 0, 1, 'wall']],
  hall:     [['plant', 1, 3, 'wall'], ['bench', 0, 2, 'wall'], ['vending', 0, 1, 'wall']],
  classroom:[['blackboard', 1, 1, 'wall'], ['teacherDesk', 1, 1, 'wall'], ['schoolDesk', 6, 14, 'center'], ['bookshelf', 0, 1, 'wall'], ['plant', 0, 2, 'wall']],
  library:  [['bookRow', 2, 4, 'center'], ['bookshelf', 3, 7, 'wall'], ['dtable', 0, 1, 'center'], ['lamp', 1, 2, 'wall'], ['armchair', 1, 2, 'wall'], ['plant', 1, 2, 'wall']],
  gym:      [['mat', 1, 3, 'center'], ['bench', 2, 4, 'wall'], ['lockers', 1, 2, 'wall'], ['crate', 0, 2, 'wall']],
  lobby:    [['pillar', 2, 4, 'center'], ['bench', 2, 3, 'wall'], ['plant', 2, 4, 'wall'], ['vending', 0, 1, 'wall'], ['coffee', 0, 1, 'center']],
  teller:   [['counter', 1, 2, 'wall'], ['filing', 1, 2, 'wall'], ['desk', 1, 2, 'wall'], ['plant', 0, 1, 'wall']],
  vault:    [['safe', 6, 12, 'wall'], ['pallet', 1, 2, 'center'], ['crate', 1, 3, 'wall']],
  club:     [['speaker', 2, 4, 'wall'], ['pillar', 0, 2, 'center'], ['booth', 0, 2, 'wall']],
  stage:    [['dj', 1, 1, 'wall'], ['speaker', 2, 4, 'wall']],
  street:   [['car', 1, 3, 'wall'], ['lampPost', 2, 4, 'wall'], ['trash', 1, 3, 'wall'], ['bench', 0, 2, 'wall'], ['car', 0, 1, 'center']],
  parking:  [['car', 2, 5, 'center'], ['car', 1, 3, 'wall'], ['lampPost', 1, 3, 'wall'], ['trash', 0, 1, 'wall']],
  plaza:    [['lampPost', 2, 4, 'wall'], ['bench', 1, 3, 'wall'], ['tree', 1, 2, 'center'], ['trash', 1, 2, 'wall'], ['plant', 1, 3, 'wall']],
  park:     [['tree', 2, 5, 'center'], ['bush', 3, 6, 'wall'], ['bench', 1, 2, 'wall'], ['lampPost', 1, 2, 'wall'], ['rock', 0, 2, 'center']],
  jungle:   [['tree', 3, 6, 'center'], ['palm', 2, 4, 'center'], ['bush', 4, 8, 'wall'], ['rock', 1, 3, 'center'], ['bush', 1, 3, 'center']],
  clearing: [['bush', 3, 5, 'wall'], ['palm', 1, 2, 'wall'], ['rock', 1, 2, 'center']],
  ruins:    [['pillar', 2, 4, 'center'], ['rock', 2, 4, 'center'], ['bush', 2, 4, 'wall'], ['palm', 0, 2, 'wall']],
};

// Чем догружать комнату после основного набора
const ROOM_FILLER = {
  office:   [['desk', 'wall'], ['filing', 'wall'], ['plant', 'wall'], ['cooler', 'wall'], ['deskPair', 'center'], ['bookshelf', 'wall']],
  kitchen:  [['kitchenRun', 'wall'], ['plant', 'wall'], ['dtable', 'center'], ['fridge', 'wall']],
  bathroom: [['bsink', 'wall'], ['toilet', 'wall'], ['plant', 'wall']],
  lounge:   [['armchair', 'wall'], ['plant', 'wall'], ['lamp', 'wall'], ['couch', 'wall'], ['bookshelf', 'wall'], ['coffee', 'center']],
  bar:      [['booth', 'wall'], ['arcade', 'wall'], ['plant', 'wall'], ['pillar', 'center']],
  bedroom:  [['plant', 'wall'], ['nightstand', 'wall'], ['armchair', 'wall'], ['bookshelf', 'wall'], ['lamp', 'wall']],
  storage:  [['crate', 'wall'], ['barrel', 'wall'], ['shelfRack', 'wall'], ['crate', 'center'], ['pallet', 'center']],
  server:   [['serverRow', 'center'], ['filing', 'wall'], ['crate', 'wall']],
  hall:     [['plant', 'wall'], ['bench', 'wall']],
  classroom:[['schoolDesk', 'center'], ['plant', 'wall']],
  library:  [['bookshelf', 'wall'], ['bookRow', 'center'], ['armchair', 'wall']],
  gym:      [['bench', 'wall'], ['mat', 'center']],
  lobby:    [['plant', 'wall'], ['bench', 'wall']],
  teller:   [['filing', 'wall'], ['desk', 'wall'], ['plant', 'wall']],
  vault:    [['safe', 'wall'], ['crate', 'wall']],
  club:     [['speaker', 'wall']],
};

// Сколько раз максимум предмет встречается в одной комнате
const ITEM_ROOM_MAX = { fridge: 1, tub: 1, bed: 1, bar: 1, pool: 1, tvstand: 1, wardrobe: 1, kitchenRun: 2, couch: 2, toilet: 3, cooler: 1, vending: 1, dtable: 1 };

// Сколько раз максимум встречается тип комнаты на уровне
const ROOM_TYPE_CAP = { bar: 1, lounge: 2, server: 1, bathroom: 2, kitchen: 2, bedroom: 3, office: 4, storage: 3 };

const ROOM_CLUTTER = {
  street:   ['can', 'paper', 'butt', 'stain', 'crack'],
  parking:  ['stain', 'can', 'crack', 'paper'],
  plaza:    ['paper', 'leaf', 'can'],
  park:     ['leaf', 'leaf', 'paper'],
  jungle:   ['leaf', 'leaf', 'leaf'],
  clearing: ['leaf', 'leaf'],
  ruins:    ['crack', 'leaf', 'crack'],
  office:   ['paper', 'paper', 'paper', 'butt', 'can', 'stain'],
  kitchen:  ['stain', 'can', 'bottle', 'shards', 'paper'],
  bathroom: ['puddle', 'paper', 'stain'],
  lounge:   ['can', 'bottle', 'butt', 'paper', 'stain'],
  bar:      ['bottle', 'shards', 'butt', 'can', 'stain', 'casing', 'shards'],
  bedroom:  ['paper', 'can', 'stain', 'bottle'],
  storage:  ['cardboard', 'stain', 'crack', 'casing', 'paper', 'crack'],
  server:   ['cable', 'cable', 'paper', 'crack'],
  hall:     ['paper', 'butt', 'leaf', 'can', 'stain'],
  classroom:['paper', 'paper', 'paper', 'can', 'stain'],
  library:  ['paper', 'paper', 'leaf'],
  gym:      ['can', 'paper', 'stain'],
  lobby:    ['paper', 'leaf', 'stain'],
  teller:   ['paper', 'paper', 'stain'],
  vault:    ['paper', 'casing', 'crack'],
  club:     ['bottle', 'shards', 'can', 'butt', 'stain', 'bottle'],
};

const ROOM_NEON = {
  bar:     [['BAR', '#ff2a6d'], ['COCKTAILS', '#c060ff'], ['OPEN 24/7', '#05d9e8']],
  lounge:  [['CHILL', '#ff7fbf'], ['VIBE', '#05d9e8']],
  kitchen: [['EAT', '#ffd319']],
  hall:    [['EXIT', '#3fff7f']],
  server:  [['NO ENTRY', '#ff3a3a']],
  club:    [['DANCE', '#ff2a6d'], ['NEON NIGHT', '#05d9e8']],
  lobby:   [['WELCOME', '#ffd319']],
  vault:   [['VAULT', '#ffd319']],
  gym:     [['SPORT', '#3fff7f']],
  library: [['SILENCE', '#ffd8a0']],
};

// Материал обломков и прочность мебели по умолчанию
const ITEM_MAT = {
  filing: 'metal', cooler: 'metal', fridge: 'metal', shelfRack: 'metal', serverRow: 'metal', vending: 'metal', arcade: 'metal',
  kitchenRun: 'metal', barrel: 'metal', lockers: 'metal', safe: 'metal', speaker: 'metal', dj: 'metal',
  coffee: 'glass', tvstand: 'glass', bsink: 'glass', toilet: 'glass', tub: 'glass',
  couch: 'fabric', armchair: 'fabric', bed: 'fabric', booth: 'fabric',
};

const RUG_COLORS = [['#3d0e23', '#ff2a6d'], ['#1a2a3d', '#05d9e8'], ['#2d1a3d', '#c060ff'], ['#3d2a1a', '#ffb060'], ['#1a3d2a', '#3fff7f']];

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

class Level {
  constructor(w, h, opts = {}) {
    this.w = w; this.h = h;
    this.opts = opts;
    this.theme = (opts.layout && opts.layout.theme) || null;   // 'city' | 'jungle' — уличный уровень
    this.holes = [];
    this.cols = Math.floor(w / TILE);
    this.rows = Math.floor(h / TILE);
    this.noiseEvents = [];
    this.sparks = [];
    this.time = 0;
    this.exploredRooms = new Set();

    this._staticCanvas = null;
    this._staticCtx = null;
    this._staticDirty = true;

    let ok = false;
    if (opts.layout) {
      ok = this._generateLayout(opts.layout);
      if (!ok) throw new Error('Layout build failed');
      return;
    }
    for (let attempt = 0; attempt < 12 && !ok; attempt++) {
      try { ok = this._generate(); } catch (e) { console.error('Level attempt failed:', e); ok = false; }
    }
    if (!ok) throw new Error('Level generation failed');
  }

  // ================= Сетка =================
  _setGrid(x, y, v) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    this.grid[y][x] = v;
    this._staticDirty = true;
  }

  _getGrid(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return T_OUT;
    return this.grid[y][x];
  }

  _rg(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return -1;
    return this.roomGrid[y * this.cols + x];
  }

  _isReserved(x, y) { return this.reserved[y * this.cols + x] === 1; }
  _reserve(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    this.reserved[y * this.cols + x] = 1;
  }
  _isDoorway(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return false;
    return this.doorway[y * this.cols + x] === 1;
  }

  // ================= Генерация =================
  _reset() {
    const C = this.cols, Rw = this.rows;
    this.grid = [];
    for (let y = 0; y < Rw; y++) { this.grid[y] = new Array(C).fill(T_OUT); }
    this.roomGrid = new Int16Array(C * Rw).fill(-1);
    this.reserved = new Uint8Array(C * Rw);
    this.doorway = new Uint8Array(C * Rw);
    this.occupied = new Uint8Array(C * Rw);
    this.itemGrid = new Int16Array(C * Rw).fill(-1);
    this.destroyed = [];
    this.brokenWindows = [];
  }

  _generate() {
    const C = this.cols, Rw = this.rows;
    this._reset();

    this.rooms = [];
    this.doors = [];
    this.arches = [];
    this.connections = [];
    this.spawnPoints = [];
    this.furniture = [];
    this.decor = this.furniture;
    this.decals = [];
    this.rugs = [];
    this.animated = [];
    this.windows = [];
    this.signs = [];
    this.playerRoom = null;
    this._roomGraph = null;
    this._staticDirty = true;

    // --- 1. BSP: делим здание на комнаты и коридоры ---
    const root = { x: 2, y: 2, w: C - 4, h: Rw - 4 };
    const leaves = [];
    this._split(root, 0, leaves);

    // --- 2. Неровный контур здания: убираем часть крайних комнат (там будет улица) ---
    const bx1 = root.x + root.w - 1, by1 = root.y + root.h - 1;
    const touchesEdge = L => L.x === root.x || L.y === root.y || L.x + L.w - 1 === bx1 || L.y + L.h - 1 === by1;
    const maxVoid = Utils.randInt(1, 3);
    let voids = 0;
    for (const L of shuffled(leaves.filter(l => !l.hall && touchesEdge(l)))) {
      if (voids >= maxVoid) break;
      if (leaves.filter(l => !l.void).length <= 8) break;
      if (Math.random() < 0.45) continue;
      L.void = true;
      if (this._leavesConnected(leaves)) voids++; else L.void = false;
    }

    // --- 3. Вырезаем комнаты ---
    for (const L of leaves) {
      if (L.void) continue;
      const id = this.rooms.length;
      for (let y = L.y; y < L.y + L.h; y++) {
        for (let x = L.x; x < L.x + L.w; x++) {
          const edge = x === L.x || y === L.y || x === L.x + L.w - 1 || y === L.y + L.h - 1;
          if (edge) { this.grid[y][x] = T_WALL; }
          else { this.grid[y][x] = T_FLOOR; this.roomGrid[y * C + x] = id; }
        }
      }
      const room = {
        id, x: L.x + 1, y: L.y + 1, w: L.w - 2, h: L.h - 2,
        hall: !!L.hall, type: L.hall ? 'hall' : null,
        lights: [], approach: [],
      };
      room.cx = Math.floor(room.x + room.w / 2);
      room.cy = Math.floor(room.y + room.h / 2);
      this.rooms.push(room);
    }
    if (this.rooms.length < 6) return false;

    // --- 4. Ищем общие стены и соединяем комнаты дверями/арками ---
    const pairs = this._findWallRuns();
    const parent = this.rooms.map((_, i) => i);
    const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const tree = [], extra = [];
    for (const p of shuffled(pairs)) {
      const ra = find(p.a), rb = find(p.b);
      if (ra !== rb) { parent[ra] = rb; tree.push(p); } else extra.push(p);
    }
    const root0 = find(0);
    for (let i = 1; i < this.rooms.length; i++) if (find(i) !== root0) return false;

    const chosen = tree.concat(extra.filter(() => Math.random() < 0.3));
    for (const p of chosen) {
      const A = this.rooms[p.a], B = this.rooms[p.b];
      let kind;
      if (A.hall && B.hall) kind = 'arch';
      else kind = Math.random() < ((A.hall || B.hall) ? 0.8 : 0.68) ? 'door' : 'arch';
      if (!this._makeOpening(p, kind)) return false;
    }

    // --- 5. Типы комнат ---
    this._assignRoomTypes();

    // --- 6. Комната игрока ---
    const startOpts = this.rooms.filter(r => !r.hall && ['bedroom', 'office', 'lounge', 'kitchen', 'storage'].includes(r.type) && r.w * r.h >= 30);
    this.playerRoom = Utils.choice(startOpts.length ? startOpts : this.rooms.filter(r => !r.hall));
    return this._populate({});
  }

  // Мебель, свет, окна и враги — общее для случайных и статичных уровней
  _populate(o) {
    {
      const t = this._nearestFree(this.playerRoom, this.playerRoom.cx, this.playerRoom.cy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this._reserve(t.x + dx, t.y + dy);
      this._playerTile = t;
    }

    // --- 7. Перегородки в больших комнатах ---
    for (const r of this.rooms) {
      if (r.hall || ['bathroom', 'club', 'gym', 'lobby', 'vault', 'classroom'].includes(r.type) || r === this.playerRoom || o.noPartitions) continue;
      if (r.w >= 9 && r.h >= 8 && Math.random() < 0.45) this._tryPartition(r);
    }

    // --- 8. Мебель, ковры, мусор, свет ---
    for (const r of this.rooms) {
      this._placeRug(r);
      const plan = ROOM_FURNITURE[r.type] || [];
      for (const [kind, mn, mx, place] of plan) {
        const n = Utils.randInt(mn, mx);
        for (let i = 0; i < n; i++) this._tryPlace(r, kind, place);
      }
      this._fillRoom(r);
      this._placeClutter(r);
      this._placeCeilingLights(r);
    }
    this._placeWindows();
    this._placeSigns();

    // --- 9. Враги ---
    this._buildRoomGraph();
    const nearPlayer = new Set((this._roomGraph.get(this.playerRoom.id) || []).map(e => e.room));
    const mix = o.mix || { tank: 0.06, hound: 0.07, sniper: 0.08 };
    const density = (o.density || 1) * (this.opts.enemyMul || 1);
    const classic = !!o.noPartitions;   // статичный уровень кампании
    for (const r of this.rooms) {
      if (r === this.playerRoom) continue;
      const free = this._freeTiles(r, true);
      if (!free.length) continue;
      let n;
      if (classic) {
        if (r.hall) n = Math.random() < 0.6 * density ? 1 + (free.length > 60 && Math.random() < 0.5 ? 1 : 0) : 0;
        else n = Utils.clamp(Math.round((free.length / 24 + Utils.randInt(0, 1)) * density), 1, 8);
      } else {
        if (r.hall) n = Math.random() < 0.65 * density ? 1 + Math.round(free.length / 70 * density) : 0;
        else n = Utils.clamp(Math.round((free.length / 19 + Utils.randInt(0, 1)) * density), 1, 8);
      }
      if (nearPlayer.has(r)) n = Math.min(n, 2);
      if (r === o.bossRoom) {
        // босс в последней комнате уровня, рядом с ним пара охранников
        const bt = this._nearestFree(r, r.cx, r.cy);
        this.spawnPoints.push({ x: bt.x * TILE + 5, y: bt.y * TILE + 5, boss: o.boss });
        n = Math.min(n, 4);
      }
      for (let i = 0; i < n && free.length; i++) {
        const t = free.splice(Math.floor(Math.random() * free.length), 1)[0];
        const roll = Math.random();
        let type = 'normal';
        if (roll < mix.tank) type = 'tank';
        else if (roll < mix.tank + mix.hound) type = 'hound';
        else if (roll < mix.tank + mix.hound + mix.sniper) type = 'sniper';

        const behavior = r.hall ? 'patrol' : Utils.choice(['static', 'patrol', 'patrol']);
        let waypoints = null;
        if (behavior === 'patrol') {
          waypoints = [];
          const k = Utils.randInt(2, 3);
          for (let j = 0; j < k; j++) {
            const wt = Utils.choice(free.length ? free : [t]);
            waypoints.push({ x: wt.x * TILE + 7, y: wt.y * TILE + 7 });
          }
        }
        const weapon = type === 'normal' && o.weapons ? Utils.choice(o.weapons) : null;
        this.spawnPoints.push({ x: t.x * TILE + 7, y: t.y * TILE + 7, behavior, waypoints, type, weapon });
      }
    }
    return true;
  }

  // Статичный уровень по заготовке: комнаты-прямоугольники и связи между ними.
  // Мебель и враги расставляются тем же движком, но с фиксированным seed — уровень всегда одинаковый.
  _generateLayout(L) {
    this._reset();
    const C = this.cols;
    this.rooms = []; this.doors = []; this.arches = []; this.connections = []; this.spawnPoints = [];
    this.furniture = []; this.decor = this.furniture; this.decals = []; this.rugs = []; this.animated = [];
    this.windows = []; this.signs = []; this._roomGraph = null; this._staticDirty = true;

    for (const [i, d] of L.rooms.entries()) {
      for (let y = d.y - 1; y <= d.y + d.h; y++) {
        for (let x = d.x - 1; x <= d.x + d.w; x++) {
          const inside = x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h;
          if (inside) { this.grid[y][x] = T_FLOOR; this.roomGrid[y * C + x] = i; }
          else if (this.grid[y][x] === T_OUT) this.grid[y][x] = T_WALL;
        }
      }
      const room = { id: i, x: d.x, y: d.y, w: d.w, h: d.h, hall: d.type === 'hall', type: d.type, lights: [], approach: [], label: d.name };
      room.cx = Math.floor(room.x + room.w / 2);
      room.cy = Math.floor(room.y + room.h / 2);
      this.rooms.push(room);
    }
    const runs = this._findWallRuns();
    for (const [a, b, kind] of L.links) {
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const run = runs.find(r => r.a === lo && r.b === hi);
      if (!run) { console.warn('Нет общей стены между комнатами', a, b); continue; }
      if (!this._makeOpening(run, kind || 'door')) console.warn('Не удалось сделать проход', a, b);
    }
    this.playerRoom = this.rooms[L.start];
    return this._populate({
      bossRoom: this.rooms[L.bossRoom], boss: L.boss, mix: L.mix, density: L.density, weapons: L.weapons, noPartitions: true,
    });
  }

  _split(n, depth, out) {
    const MIN = 7;
    const canV = n.w >= MIN * 2 - 1, canH = n.h >= MIN * 2 - 1;
    const canVC = n.w >= 17, canHC = n.h >= 17;
    const area = (n.w - 2) * (n.h - 2);

    // большие куски делим всегда (до глубины 8), средние — с шансом: комнаты 7×7…14×12, редко крупнее
    const huge = area > 190 && depth <= 8;
    if (depth > 0 && !huge && (!canV && !canH || area < 70 || depth > 5 ||
        (area < 130 && Math.random() < 0.55) || (area < 190 && Math.random() < 0.3))) {
      out.push({ x: n.x, y: n.y, w: n.w, h: n.h, hall: false });
      return;
    }
    if (!canV && !canH) { out.push({ x: n.x, y: n.y, w: n.w, h: n.h, hall: false }); return; }

    let vertical;
    if (canV && !canH) vertical = true;
    else if (canH && !canV) vertical = false;
    else if (n.w > n.h * 1.3) vertical = true;
    else if (n.h > n.w * 1.3) vertical = false;
    else vertical = Math.random() < 0.5;

    const corridor = depth <= 1 && (vertical ? canVC : canHC) && Math.random() < 0.7;

    if (vertical) {
      if (corridor) {
        const s = Utils.randInt(n.x + 6, n.x + n.w - 11);
        this._split({ x: n.x, y: n.y, w: s - n.x + 1, h: n.h }, depth + 1, out);
        out.push({ x: s, y: n.y, w: 5, h: n.h, hall: true });
        this._split({ x: s + 4, y: n.y, w: n.x + n.w - (s + 4), h: n.h }, depth + 1, out);
      } else {
        const lo = n.x + 6, hi = n.x + n.w - 7;
        const s = Math.round(lo + (hi - lo) * Utils.rand(0.25, 0.75));
        this._split({ x: n.x, y: n.y, w: s - n.x + 1, h: n.h }, depth + 1, out);
        this._split({ x: s, y: n.y, w: n.x + n.w - s, h: n.h }, depth + 1, out);
      }
    } else {
      if (corridor) {
        const s = Utils.randInt(n.y + 6, n.y + n.h - 11);
        this._split({ x: n.x, y: n.y, w: n.w, h: s - n.y + 1 }, depth + 1, out);
        out.push({ x: n.x, y: s, w: n.w, h: 5, hall: true });
        this._split({ x: n.x, y: s + 4, w: n.w, h: n.y + n.h - (s + 4) }, depth + 1, out);
      } else {
        const lo = n.y + 6, hi = n.y + n.h - 7;
        const s = Math.round(lo + (hi - lo) * Utils.rand(0.25, 0.75));
        this._split({ x: n.x, y: n.y, w: n.w, h: s - n.y + 1 }, depth + 1, out);
        this._split({ x: n.x, y: s, w: n.w, h: n.y + n.h - s }, depth + 1, out);
      }
    }
  }

  _leafAdj(A, B) {
    if (A.x + A.w - 1 === B.x || B.x + B.w - 1 === A.x) {
      const y0 = Math.max(A.y, B.y) + 1, y1 = Math.min(A.y + A.h - 1, B.y + B.h - 1) - 1;
      if (y1 - y0 + 1 >= DOOR_W) return true;
    }
    if (A.y + A.h - 1 === B.y || B.y + B.h - 1 === A.y) {
      const x0 = Math.max(A.x, B.x) + 1, x1 = Math.min(A.x + A.w - 1, B.x + B.w - 1) - 1;
      if (x1 - x0 + 1 >= DOOR_W) return true;
    }
    return false;
  }

  _leavesConnected(leaves) {
    const live = leaves.filter(l => !l.void);
    if (!live.length) return false;
    const seen = new Set([live[0]]);
    const q = [live[0]];
    while (q.length) {
      const a = q.pop();
      for (const b of live) if (!seen.has(b) && this._leafAdj(a, b)) { seen.add(b); q.push(b); }
    }
    return seen.size === live.length;
  }

  // Участки стены, по обе стороны которых пол двух разных комнат
  _findWallRuns() {
    const map = new Map();
    const add = (a, b, o, fixed, along) => {
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const key = `${lo}|${hi}|${o}|${fixed}`;
      if (!map.has(key)) map.set(key, { a: lo, b: hi, o, fixed, list: [] });
      map.get(key).list.push(along);
    };
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (this.grid[y][x] !== T_WALL) continue;
        const l = this._rg(x - 1, y), r = this._rg(x + 1, y);
        if (l >= 0 && r >= 0 && l !== r) add(l, r, 'v', x, y);
        const u = this._rg(x, y - 1), d = this._rg(x, y + 1);
        if (u >= 0 && d >= 0 && u !== d) add(u, d, 'h', y, x);
      }
    }
    // для каждой пары комнат берём самый длинный непрерывный участок
    const best = new Map();
    for (const g of map.values()) {
      g.list.sort((p, q) => p - q);
      let s = g.list[0], prev = g.list[0];
      const flush = (st, en) => {
        const run = { a: g.a, b: g.b, o: g.o, fixed: g.fixed, start: st, end: en, len: en - st + 1 };
        if (run.len < DOOR_W) return;
        const k = `${g.a}|${g.b}`;
        if (!best.has(k) || best.get(k).len < run.len) best.set(k, run);
      };
      for (let i = 1; i < g.list.length; i++) {
        if (g.list[i] !== prev + 1) { flush(s, prev); s = g.list[i]; }
        prev = g.list[i];
      }
      flush(s, prev);
    }
    return [...best.values()];
  }

  _makeOpening(run, kind) {
    let width = DOOR_W;
    if (kind === 'arch') width = Math.max(DOOR_W, Math.min(run.len - (run.len >= 5 ? 2 : 0), Utils.randInt(2, 4)));
    if (kind === 'gap') width = Math.max(DOOR_W, Math.min(run.len - 2, 9));
    if (run.len < width) return false;
    const margin = run.len >= width + 2 ? 1 : 0;
    const start = Utils.randInt(run.start + margin, run.end - width + 1 - margin);
    const horizontal = run.o === 'h';

    for (let i = 0; i < width; i++) {
      const tx = horizontal ? start + i : run.fixed;
      const ty = horizontal ? run.fixed : start + i;
      this.grid[ty][tx] = T_FLOOR;
      this.doorway[ty * this.cols + tx] = 1;
    }

    const px = (horizontal ? start : run.fixed) * TILE;
    const py = (horizontal ? run.fixed : start) * TILE;
    let obj;
    if (kind === 'door') {
      obj = new Door(px, py, horizontal, width, Math.random() < 0.5);
      this.doors.push(obj);
    } else {
      obj = { x: px, y: py, w: horizontal ? width * TILE : TILE, h: horizontal ? TILE : width * TILE, horizontal, open: true, isArch: true, lenTiles: width };
      this.arches.push(obj);
    }
    this.connections.push({ a: run.a, b: run.b, door: obj });

    // Запрещаем мебель в зоне распахивания двери и подхода к ней с обеих сторон
    const depthR = kind === 'door' ? 3 : 2;
    const side = kind === 'door' ? 2 : 1;
    for (let i = -side; i < width + side; i++) {
      for (let d = -depthR; d <= depthR; d++) {
        const tx = horizontal ? start + i : run.fixed + d;
        const ty = horizontal ? run.fixed + d : start + i;
        this._reserve(tx, ty);
      }
    }
    for (let i = 0; i < width; i++) {
      for (const d of [-1, 1]) {
        const tx = horizontal ? start + i : run.fixed + d;
        const ty = horizontal ? run.fixed + d : start + i;
        const rid = this._rg(tx, ty);
        if (rid >= 0) this.rooms[rid].approach.push({ x: tx, y: ty });
      }
    }
    return true;
  }

  _assignRoomTypes() {
    const used = {};
    const normal = this.rooms.filter(r => !r.hall).sort((a, b) => b.w * b.h - a.w * a.h);
    for (const r of normal) {
      const area = r.w * r.h;
      const opts = area <= 36 ? ['bathroom', 'storage', 'server', 'bathroom']
        : area <= 90 ? ['office', 'kitchen', 'bedroom', 'storage', 'server', 'bathroom']
        : ['lounge', 'bar', 'office', 'kitchen', 'storage'];
      let best = null, bc = Infinity;
      for (const o of shuffled(opts)) {
        const c = used[o] || 0;
        if (c >= (ROOM_TYPE_CAP[o] || 9)) continue;
        if (c < bc) { bc = c; best = o; }
      }
      if (!best) best = Utils.choice(['office', 'storage', 'bedroom']);
      r.type = best;
      used[best] = (used[best] || 0) + 1;
    }
  }

  _freeTiles(room, avoidReserved) {
    const out = [];
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (this.grid[y][x] !== T_FLOOR || this._rg(x, y) !== room.id) continue;
        if (avoidReserved && this._isReserved(x, y)) continue;
        out.push({ x, y });
      }
    }
    return out;
  }

  _nearestFree(room, cx, cy) {
    let best = null, bd = Infinity;
    for (const t of this._freeTiles(room, false)) {
      const d = Math.abs(t.x - cx) + Math.abs(t.y - cy);
      if (d < bd) { bd = d; best = t; }
    }
    return best || { x: cx, y: cy };
  }

  // Все свободные клетки комнаты связаны между собой и со всеми входами?
  _roomConnected(room) {
    const free = this._freeTiles(room, false);
    if (!free.length) return false;
    for (const a of room.approach) if (this.grid[a.y][a.x] !== T_FLOOR) return false;
    const start = room.approach.length ? room.approach[0] : free[0];
    const seen = new Uint8Array(this.cols * this.rows);
    const q = [start];
    seen[start.y * this.cols + start.x] = 1;
    let count = 0;
    while (q.length) {
      const t = q.pop();
      count++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = t.x + dx, ny = t.y + dy;
        const k = ny * this.cols + nx;
        if (seen[k] || this._rg(nx, ny) !== room.id || this.grid[ny][nx] !== T_FLOOR) continue;
        seen[k] = 1;
        q.push({ x: nx, y: ny });
      }
    }
    return count === free.length;
  }

  _tryPartition(room) {
    const vertical = room.w > room.h ? Math.random() < 0.75 : Math.random() < 0.25;
    const tiles = [];
    if (vertical) {
      const col = room.x + Utils.randInt(3, room.w - 4);
      const len = room.h - Utils.randInt(3, 4);
      const fromTop = Math.random() < 0.5;
      const y0 = fromTop ? room.y : room.y + room.h - len;
      for (let y = y0; y < y0 + len; y++) tiles.push({ x: col, y });
    } else {
      const row = room.y + Utils.randInt(3, room.h - 4);
      const len = room.w - Utils.randInt(3, 4);
      const fromLeft = Math.random() < 0.5;
      const x0 = fromLeft ? room.x : room.x + room.w - len;
      for (let x = x0; x < x0 + len; x++) tiles.push({ x, y: row });
    }
    for (const t of tiles) if (this.grid[t.y][t.x] !== T_FLOOR || this._isReserved(t.x, t.y) || this._rg(t.x, t.y) !== room.id) return;
    for (const t of tiles) this.grid[t.y][t.x] = T_WALL;
    if (!this._roomConnected(room)) {
      for (const t of tiles) this.grid[t.y][t.x] = T_FLOOR;
      return;
    }
    for (const t of tiles) this.roomGrid[t.y * this.cols + t.x] = -1;
  }

  // Ставим предмет мебели у стены ('wall') или посреди комнаты ('center')
  _tryPlace(room, kind, place) {
    const def = DecorArt.items[kind];
    if (!def) return false;
    const cap = ITEM_ROOM_MAX[kind];
    if (cap && this.furniture.filter(f => f.room === room.id && f.kind === kind).length >= cap) return false;
    const alongOpts = def.alongRange || [def.along];
    for (const along of alongOpts) {
      const depth = def.depth;
      const cands = [];
      const dirs = place === 'wall' ? [0, 1, 2, 3] : [0, 1];
      for (let ty = room.y; ty < room.y + room.h; ty++) {
        for (let tx = room.x; tx < room.x + room.w; tx++) {
          for (const dir of dirs) {
            // dir: 0 — спиной к северу, 1 — к востоку, 2 — к югу, 3 — к западу
            const fw = (dir % 2 === 0) ? along : depth;
            const fh = (dir % 2 === 0) ? depth : along;
            if (!this._footprintFree(room, tx, ty, fw, fh)) continue;
            if (place === 'wall') {
              if (!this._backIsWall(tx, ty, fw, fh, dir)) continue;
            } else if (!this._ringFree(room, tx, ty, fw, fh)) continue;
            cands.push({ tx, ty, fw, fh, dir });
          }
        }
      }
      if (!cands.length) continue;
      const tries = shuffled(cands).slice(0, 8);
      for (const c of tries) {
        const code = def.solid === 'tall' ? T_TALL : def.solid === 'none' ? T_FLOOR : T_LOW;
        for (let y = c.ty; y < c.ty + c.fh; y++) for (let x = c.tx; x < c.tx + c.fw; x++) this.grid[y][x] = code;
        if (this._roomConnected(room)) {
          let rot;
          if (place === 'wall') rot = [0, Math.PI / 2, Math.PI, -Math.PI / 2][c.dir];
          else rot = c.dir === 0 ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
          const area = c.fw * c.fh;
          const hp = def.hp !== undefined ? def.hp : (def.solid === 'none' ? 0 : def.solid === 'tall' ? 4 + area * 2 : 2 + area);
          const item = {
            kind, rot, seed: (Math.random() * 1e9) | 0,
            x: (c.tx + c.fw / 2) * TILE, y: (c.ty + c.fh / 2) * TILE,
            W: along * TILE, H: depth * TILE, tall: def.solid === 'tall', room: room.id,
            hp, maxHp: hp, mat: def.mat || ITEM_MAT[kind] || 'wood', tiles: [],
          };
          const idx = this.furniture.length;
          for (let y = c.ty; y < c.ty + c.fh; y++) for (let x = c.tx; x < c.tx + c.fw; x++) {
            item.tiles.push([x, y]);
            this.occupied[y * this.cols + x] = 1;
            if (def.solid !== 'none') this.itemGrid[y * this.cols + x] = idx;
          }
          this.furniture.push(item);
          if (def.anim) { item.anim = { kind: def.anim, x: item.x, y: item.y, rot, W: item.W, H: item.H, seed: item.seed % 1000 }; this.animated.push(item.anim); }
          if (def.light) {
            const ox = -Math.sin(rot) * def.light.dy, oy = Math.cos(rot) * def.light.dy;
            item.light = { x: item.x + ox, y: item.y + oy, r: def.light.radius, color: def.light.color, a: 0.3 };
            room.lights.push(item.light);
          }
          return true;
        }
        for (let y = c.ty; y < c.ty + c.fh; y++) for (let x = c.tx; x < c.tx + c.fw; x++) this.grid[y][x] = T_FLOOR;
      }
    }
    return false;
  }

  // Догружаем комнату мебелью до нужной плотности, не перекрывая проходы
  _fillRoom(room) {
    const filler = ROOM_FILLER[room.type];
    if (!filler) return;
    const area = room.w * room.h;
    const target = area * (room.hall ? 0.08 : 0.2);
    const used = () => {
      let n = 0;
      for (let y = room.y; y < room.y + room.h; y++)
        for (let x = room.x; x < room.x + room.w; x++) {
          const t = this.grid[y][x];
          if ((t === T_LOW || t === T_TALL) && this._rg(x, y) === room.id) n++;
        }
      return n;
    };
    let fails = 0;
    while (used() < target && fails < 6) {
      const [kind, place] = Utils.choice(filler);
      if (!this._tryPlace(room, kind, place)) fails++;
    }
  }

  _footprintFree(room, tx, ty, fw, fh) {
    for (let y = ty; y < ty + fh; y++) {
      for (let x = tx; x < tx + fw; x++) {
        if (this._getGrid(x, y) !== T_FLOOR || this._rg(x, y) !== room.id || this._isReserved(x, y) || this.occupied[y * this.cols + x]) return false;
      }
    }
    return true;
  }

  _backIsWall(tx, ty, fw, fh, dir) {
    const isW = (x, y) => this._getGrid(x, y) === T_WALL && !this._isDoorway(x, y);
    if (dir === 0) { for (let x = tx; x < tx + fw; x++) if (!isW(x, ty - 1)) return false; }
    else if (dir === 2) { for (let x = tx; x < tx + fw; x++) if (!isW(x, ty + fh)) return false; }
    else if (dir === 3) { for (let y = ty; y < ty + fh; y++) if (!isW(tx - 1, y)) return false; }
    else { for (let y = ty; y < ty + fh; y++) if (!isW(tx + fw, y)) return false; }
    return true;
  }

  _ringFree(room, tx, ty, fw, fh) {
    for (let y = ty - 1; y <= ty + fh; y++) {
      for (let x = tx - 1; x <= tx + fw; x++) {
        if (x >= tx && x < tx + fw && y >= ty && y < ty + fh) continue;
        if (this._getGrid(x, y) !== T_FLOOR || this._rg(x, y) !== room.id) return false;
      }
    }
    return true;
  }

  _placeRug(r) {
    if (!['lounge', 'bedroom', 'office', 'bar'].includes(r.type)) return;
    if (r.w < 6 || r.h < 5 || Math.random() < 0.25) return;
    const rw = Math.min(r.w - 4, 8), rh = Math.min(r.h - 4, 6);
    if (rw < 2 || rh < 2) return;
    const rx = r.x + Math.floor((r.w - rw) / 2), ry = r.y + Math.floor((r.h - rh) / 2);
    const [c1, c2] = Utils.choice(RUG_COLORS);
    this.rugs.push({ x: rx * TILE + 4, y: ry * TILE + 4, w: rw * TILE - 8, h: rh * TILE - 8, c1, c2 });
  }

  _placeClutter(r) {
    const kinds = ROOM_CLUTTER[r.type] || ['paper'];
    const n = Math.floor((r.w * r.h) / 9) + Utils.randInt(0, 3);
    for (let i = 0; i < n; i++) {
      const kind = Utils.choice(kinds);
      this.decals.push({
        kind, seed: (Math.random() * 1e9) | 0, rot: Math.random() * Math.PI * 2,
        x: (r.x + Math.random() * r.w) * TILE, y: (r.y + Math.random() * r.h) * TILE,
        color: kind === 'stain' ? Utils.choice(['#000000', '#3a1a0a', '#2a0a10', '#1a2a0a']) : null,
      });
    }
  }

  _placeCeilingLights(r) {
    const color = ROOM_THEMES[r.type].light;
    if (r.hall) {
      const long = Math.max(r.w, r.h);
      const n = Math.max(1, Math.round(long / 7));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = r.w >= r.h ? r.x + r.w * t : r.x + r.w / 2;
        const y = r.w >= r.h ? r.y + r.h / 2 : r.y + r.h * t;
        r.lights.push({ x: x * TILE, y: y * TILE, r: 130, color, a: 0.28 });
      }
      return;
    }
    const area = r.w * r.h;
    const n = area < 40 ? 1 : area < 110 ? 2 : 3;
    const horiz = r.w >= r.h;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = horiz ? r.x + r.w * t : r.x + r.w / 2;
      const y = horiz ? r.y + r.h / 2 : r.y + r.h * t;
      const rad = Math.max(r.w / (horiz ? n : 1), r.h / (horiz ? 1 : n)) * TILE * 0.75 + 50;
      r.lights.push({ x: x * TILE, y: y * TILE, r: rad, color, a: 0.3 });
    }
  }

  // Окна на внешних стенах + лунный свет внутрь
  _placeWindows() {
    if (this.theme) return;
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (this.grid[y][x] !== T_WALL || this._isDoorway(x, y)) continue;
        let dir = null;
        if (this.grid[y - 1][x] === T_OUT && this._rg(x, y + 1) >= 0) dir = [0, 1];
        else if (this.grid[y + 1][x] === T_OUT && this._rg(x, y - 1) >= 0) dir = [0, -1];
        else if (this.grid[y][x - 1] === T_OUT && this._rg(x + 1, y) >= 0) dir = [1, 0];
        else if (this.grid[y][x + 1] === T_OUT && this._rg(x - 1, y) >= 0) dir = [-1, 0];
        if (!dir) continue;
        // окна не на углах: соседи вдоль стены тоже стены
        const ax = dir[1] !== 0 ? 1 : 0, ay = dir[0] !== 0 ? 1 : 0;
        if (this._getGrid(x - ax, y - ay) !== T_WALL || this._getGrid(x + ax, y + ay) !== T_WALL) continue;
        if ((x * 7 + y * 13) % 4 !== 0) continue;
        const rid = this._rg(x + dir[0], y + dir[1]);
        const room = this.rooms[rid];
        this.windows.push({ x, y, dx: dir[0], dy: dir[1], idx: this.windows.length, broken: false });
        room.lights.push({ x: (x + 0.5 + dir[0] * 1.5) * TILE, y: (y + 0.5 + dir[1] * 1.5) * TILE, r: 75, color: '#5a7ac8', a: 0.28 });
      }
    }
  }

  // Неоновые вывески на северных стенах
  _placeSigns() {
    for (const r of this.rooms) {
      const opts = ROOM_NEON[r.type];
      if (!opts || Math.random() < (r.hall ? 0.6 : 0.2)) continue;
      const y = r.y - 1;
      const runs = [];
      let s = -1;
      for (let x = r.x; x <= r.x + r.w; x++) {
        const ok = x < r.x + r.w && this.grid[y][x] === T_WALL && !this._isDoorway(x, y) && this._rg(x, y + 1) === r.id;
        if (ok && s < 0) s = x;
        if (!ok && s >= 0) { if (x - s >= 3) runs.push([s, x - 1]); s = -1; }
      }
      if (!runs.length) continue;
      const [a, b] = Utils.choice(runs);
      const [text, color] = Utils.choice(opts);
      const cx = ((a + b + 1) / 2) * TILE;
      this.signs.push({ x: cx, y: y * TILE + TILE / 2, text, color, maxW: (b - a + 1) * TILE - 8 });
      r.lights.push({ x: cx, y: (y + 1.6) * TILE, r: 110, color, a: 0.3 });
    }
  }

  // ================= Граф комнат =================
  _buildRoomGraph() {
    this._roomGraph = new Map();
    for (const r of this.rooms) this._roomGraph.set(r.id, []);
    for (const c of this.connections) {
      const A = this.rooms[c.a], B = this.rooms[c.b];
      this._roomGraph.get(A.id).push({ room: B, door: c.door });
      this._roomGraph.get(B.id).push({ room: A, door: c.door });
    }
  }

  _doorBetween(roomA, roomB) {
    if (!this._roomGraph) this._buildRoomGraph();
    const edges = this._roomGraph.get(roomA.id) || [];
    const e = edges.find(x => x.room === roomB);
    return e ? e.door : null;
  }

  _findRoomPath(from, to) {
    if (!this._roomGraph) this._buildRoomGraph();
    if (!from || !to) return null;
    if (from === to) return [from];
    const visited = new Set([from.id]);
    const queue = [{ room: from, path: [from] }];
    while (queue.length) {
      const { room, path } = queue.shift();
      for (const e of this._roomGraph.get(room.id) || []) {
        if (visited.has(e.room.id)) continue;
        visited.add(e.room.id);
        const newPath = path.concat(e.room);
        if (e.room === to) return newPath;
        queue.push({ room: e.room, path: newPath });
      }
    }
    return null;
  }

  // Кратчайший путь по клеткам пола в обход мебели и стен (BFS). Возвращает точки-повороты.
  findPath(x0, y0, x1, y1) {
    const C = this.cols, R = this.rows;
    const walk = (x, y) => x >= 0 && y >= 0 && x < C && y < R && this.grid[y][x] === T_FLOOR;
    const sx = Math.floor(x0 / TILE), sy = Math.floor(y0 / TILE);
    let tx = Math.floor(x1 / TILE), ty = Math.floor(y1 / TILE);
    if (!walk(tx, ty)) {
      let found = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        if (walk(tx + dx, ty + dy)) { tx += dx; ty += dy; found = true; break; }
      }
      if (!found) return null;
    }
    const start = sy * C + sx, goal = ty * C + tx;
    if (start === goal) return [{ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }];
    const prev = new Int32Array(C * R).fill(-1);
    prev[start] = start;
    const queue = [start];
    let head = 0, ok = false;
    while (head < queue.length) {
      const cur = queue[head++];
      if (cur === goal) { ok = true; break; }
      const cx = cur % C, cy = (cur / C) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!walk(nx, ny)) continue;
        const ni = ny * C + nx;
        if (prev[ni] !== -1) continue;
        prev[ni] = cur;
        queue.push(ni);
      }
    }
    if (!ok) return null;
    const cells = [];
    for (let c = goal; c !== start; c = prev[c]) cells.push(c);
    cells.reverse();
    // оставляем только точки поворота
    const pts = [];
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const nxt = cells[i + 1], prv = i > 0 ? cells[i - 1] : start;
      if (nxt !== undefined && (nxt - c) === (c - prv)) continue;
      pts.push({ x: (c % C + 0.5) * TILE, y: (((c / C) | 0) + 0.5) * TILE });
    }
    return pts;
  }

  getRoomAt(x, y) {
    const id = this._rg(Math.floor(x / TILE), Math.floor(y / TILE));
    return id >= 0 ? this.rooms[id] : null;
  }

  // Комната игрока (с учётом стояния в проёме) и все видимые из неё комнаты
  getLitRooms(player) {
    const lit = new Set();
    if (!player) return { room: null, lit };
    const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
    let room = this.getRoomAt(pcx, pcy);
    if (!room) {
      for (const [dx, dy] of [[TILE, 0], [-TILE, 0], [0, TILE], [0, -TILE]]) {
        const r = this.getRoomAt(pcx + dx, pcy + dy);
        if (r) { if (!room) room = r; lit.add(r); }
      }
    }
    if (!room) return { room: null, lit };
    lit.add(room);
    if (!this._roomGraph) this._buildRoomGraph();
    for (const e of this._roomGraph.get(room.id) || []) if (e.door.open) lit.add(e.room);
    return { room, lit };
  }

  randomFreePoint(room) {
    const free = this._freeTiles(room, true);
    const pool = free.length ? free : this._freeTiles(room, false);
    if (!pool.length) return null;
    const t = Utils.choice(pool);
    return { x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE };
  }

  spawnPoint() {
    if (!this.playerRoom) return { x: this.cols * TILE / 2, y: this.rows * TILE / 2 };
    const t = this._playerTile || this._nearestFree(this.playerRoom, this.playerRoom.cx, this.playerRoom.cy);
    return { x: t.x * TILE + 7, y: t.y * TILE + 7 };
  }

  // ================= Физика =================
  collides(x, y, w, h) {
    const x1 = Math.floor(x / TILE), y1 = Math.floor(y / TILE);
    const x2 = Math.floor((x + w - 1) / TILE), y2 = Math.floor((y + h - 1) / TILE);
    for (let cy = y1; cy <= y2; cy++) {
      for (let cx = x1; cx <= x2; cx++) {
        const t = this._getGrid(cx, cy);
        if (t === T_WALL || t === T_TALL || t === T_OUT || t === T_LOW) return true;
      }
    }
    for (const d of this.doors) if (d.blocks(x, y, w, h)) return true;
    return false;
  }

  isWallAt(px, py) {
    const t = this._getGrid(Math.floor(px / TILE), Math.floor(py / TILE));
    return t === T_WALL || t === T_TALL || t === T_OUT;
  }

  // b — пуля (если передана, она повреждает то, во что попала)
  bulletHitsWall(px, py, b) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    const t = this._getGrid(tx, ty);
    if (t === T_WALL || t === T_OUT) {
      if (b) {
        const w = this.windows.find(w => w.x === tx && w.y === ty);
        if (w && !w.broken) this.damageWindow(w.idx);
      }
      return true;
    }
    if (t === T_TALL) {
      if (b) this.damageFurniture(this.itemGrid[ty * this.cols + tx], 1, px, py);
      return true;
    }
    if (t === T_LOW && b) {
      // пуля пролетает над низкой мебелью, но задевает её и иногда застревает
      const idx = this.itemGrid[ty * this.cols + tx];
      if (idx >= 0) {
        if (!b._hit) b._hit = new Set();
        if (!b._hit.has(idx)) {
          b._hit.add(idx);
          this.damageFurniture(idx, 1, px, py);
          if (Math.random() < 0.3) return true;
        }
      }
    }
    for (let i = 0; i < this.doors.length; i++) {
      const d = this.doors[i];
      if (d.blocksPoint(px, py)) { if (b) this.damageDoor(i, 1); return true; }
    }
    return false;
  }

  // Удар холодным оружием по мебели/двери перед героем
  meleeHit(x, y, angle, range, amount = 2) {
    for (const k of [0.55, 0.85]) {
      const px = x + Math.cos(angle) * range * k, py = y + Math.sin(angle) * range * k;
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      const idx = this.itemGrid[ty * this.cols + tx];
      if (idx >= 0) { this.damageFurniture(idx, amount, px, py); return true; }
      for (let i = 0; i < this.doors.length; i++) if (this.doors[i].blocksPoint(px, py)) { this.damageDoor(i, amount); return true; }
    }
    return false;
  }

  // ---------- разрушение (в корпоративе у клиента решает хост) ----------
  damageFurniture(idx, amount, hx, hy) {
    const f = this.furniture[idx];
    if (!f || f.destroyed || !(f.hp > 0)) return;
    const cols = { wood: '200,150,90', metal: '220,230,240', glass: '180,230,255', fabric: '200,140,170' };
    Effects.burst(hx !== undefined ? hx : f.x, hy !== undefined ? hy : f.y, cols[f.mat] || cols.wood, 5, 120);
    if (this.netClient) { if (this.onNetDamage) this.onNetDamage('f', idx, amount); return; }
    f.hp -= amount;
    if (f.hp <= 0) this.destroyFurniture(idx);
  }

  destroyFurniture(idx) {
    const f = this.furniture[idx];
    if (!f || f.destroyed) return;
    f.destroyed = true;
    for (const [x, y] of f.tiles) {
      const k = y * this.cols + x;
      if (this.grid[y][x] === T_LOW || this.grid[y][x] === T_TALL) this.grid[y][x] = T_FLOOR;
      this.itemGrid[k] = -1;
      this.occupied[k] = 0;
    }
    if (f.light) { const r = this.rooms[f.room]; r.lights = r.lights.filter(l => l !== f.light); }
    if (f.anim) this.animated = this.animated.filter(a => a !== f.anim);
    for (let i = 0; i < Math.max(1, f.tiles.length); i++) {
      const [tx, ty] = f.tiles[i] || [Math.floor(f.x / TILE), Math.floor(f.y / TILE)];
      this.decals.push({ kind: 'debris', mat: f.mat, seed: (f.seed + i * 77) | 0, rot: (f.seed % 7) + i, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
    }
    const cols = { wood: '220,170,110', metal: '230,240,255', glass: '190,240,255', fabric: '220,150,180' };
    Effects.burst(f.x, f.y, cols[f.mat] || cols.wood, 24, 260);
    Effects.dust(f.x, f.y, 6);
    AudioSys.play('break_' + (f.mat || 'wood'));
    this.destroyed.push(idx);
    this._redrawRegion(f.x - f.W, f.y - f.W, f.x + f.W, f.y + f.W, f.light ? f.light.r : 0);
  }

  damageWindow(idx) {
    const w = this.windows[idx];
    if (!w || w.broken) return;
    if (this.netClient) { if (this.onNetDamage) this.onNetDamage('w', idx, 1); return; }
    this.breakWindow(idx);
  }

  breakWindow(idx) {
    const w = this.windows[idx];
    if (!w || w.broken) return;
    w.broken = true;
    this.brokenWindows.push(idx);
    const ix = (w.x + 0.5 + w.dx * 0.8) * TILE, iy = (w.y + 0.5 + w.dy * 0.8) * TILE;
    for (let i = 0; i < 3; i++) this.decals.push({ kind: 'shards', seed: idx * 31 + i, rot: i, x: ix + (i - 1) * 9, y: iy + (i - 1) * 4 });
    Effects.burst(ix, iy, '190,240,255', 20, 220);
    AudioSys.play('glass_break');
    this._redrawRegion((w.x - 1) * TILE, (w.y - 1) * TILE, (w.x + 2) * TILE, (w.y + 2) * TILE, 0);
  }

  damageDoor(i, amount) {
    const d = this.doors[i];
    if (!d || d.broken) return;
    if (this.netClient) { if (this.onNetDamage) this.onNetDamage('d', i, amount); return; }
    d.damage(amount);
  }

  // Перерисовать кусок статичного слоя (после разрушения) — без пересборки всей карты
  _redrawRegion(x0, y0, x1, y1, lightR = 0) {
    if (!this._staticCanvas) return;
    const m = Math.max(40, lightR);
    this._renderStatic({ x0: Math.max(0, x0 - m), y0: Math.max(0, y0 - m), x1: Math.min(this.w, x1 + m), y1: Math.min(this.h, y1 + m) });
  }

  lineOfSight(x1, y1, x2, y2) {
    const steps = Math.ceil(Utils.dist(x1, y1, x2, y2) / 8);
    const minX = Math.min(x1, x2) - TILE * 2, maxX = Math.max(x1, x2) + TILE * 2;
    const minY = Math.min(y1, y2) - TILE * 2, maxY = Math.max(y1, y2) + TILE * 2;
    const doors = this.doors.filter(d => d.hx > minX && d.hx < maxX && d.hy > minY && d.hy < maxY);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      if (this.isWallAt(px, py)) return false;
      for (const d of doors) if (d.blocksPoint(px, py)) return false;
    }
    return true;
  }

  update(dt, enemies, player) {
    this.time += dt;
    for (const d of this.doors) d.update(dt, enemies, player);
    for (let i = this.noiseEvents.length - 1; i >= 0; i--) {
      this.noiseEvents[i].time -= dt;
      if (this.noiseEvents[i].time <= 0) this.noiseEvents.splice(i, 1);
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.vx *= 0.88; s.vy *= 0.88;
      s.life -= dt;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
  }

  addNoise(x, y, radius) {
    this.noiseEvents.push({ x, y, radius, time: 1.5 });
  }

  // Искры при попадании пули в стену/дверь
  addImpact(x, y, vx, vy) {
    // след от пули на стене
    const sp = Math.hypot(vx, vy) || 1;
    this.holes.push({ x: x - vx / sp * 1.5, y: y - vy / sp * 1.5, r: Utils.rand(1, 1.8) });
    if (this.holes.length > 500) this.holes.shift();
    Effects.dust(x - vx / sp * 4, y - vy / sp * 4, 2);
    const a0 = Math.atan2(-vy, -vx);
    for (let i = 0; i < 6; i++) {
      const a = a0 + Utils.rand(-1.1, 1.1);
      const sp = Utils.rand(80, 260);
      this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Utils.rand(0.12, 0.3), max: 0.3 });
    }
    if (this.sparks.length > 240) this.sparks.splice(0, this.sparks.length - 240);
  }

  // ================= Отрисовка =================
  _drawOutside(ctx, x, y) {
    const H = DecorArt.hash;
    const px = x * TILE, py = y * TILE;
    // тротуар вдоль стен здания
    let nearWall = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      if (this._getGrid(x + dx, y + dy) === T_WALL) { nearWall = true; break; }
    }
    if (nearWall) {
      ctx.fillStyle = '#121019'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#0b0a10'; ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py, 1, TILE);
      ctx.fillStyle = '#17141f';
      for (let i = 0; i < 3; i++) ctx.fillRect(px + H(x, y, i) * 30, py + H(y, x, i) * 30, 2, 2);
      return;
    }
    const grass = H(x >> 2, y >> 2, 9) < 0.35;
    ctx.fillStyle = grass ? '#07100b' : '#06070b';
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = grass ? '#0c1a10' : '#0b0d13';
    for (let i = 0; i < 6; i++) ctx.fillRect(px + H(x, y, i) * 31, py + H(y, x, i + 3) * 31, grass ? 1 : 2, grass ? 3 : 2);
  }

  _drawFloor(ctx, x, y, room) {
    const H = DecorArt.hash;
    const th = ROOM_THEMES[room.type] || ROOM_THEMES.hall;
    const c = th.colors;
    const px = x * TILE, py = y * TILE;
    if (window.OutdoorFloors && OutdoorFloors[th.floor]) { OutdoorFloors[th.floor](ctx, x, y, px, py, c); return; }
    switch (th.floor) {
      case 'wood': {
        const PL = 96;
        for (let j = 0; j < 4; j++) {
          const row = y * 4 + j;
          const off = Math.floor(H(row, 7) * PL);
          const gx = px + off;
          const k0 = Math.floor(gx / PL);
          const split = (k0 + 1) * PL - gx;
          const yy = py + j * 8;
          ctx.fillStyle = c[Math.floor(H(k0, row, 1) * c.length)];
          ctx.fillRect(px, yy, Math.min(split, TILE), 8);
          if (split < TILE) {
            ctx.fillStyle = c[Math.floor(H(k0 + 1, row, 1) * c.length)];
            ctx.fillRect(px + split, yy, TILE - split, 8);
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(px + split, yy, 1, 8);
          }
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, yy + 7, TILE, 1);
          ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(px, yy, TILE, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(px + H(x, row, 3) * 28, yy + 3, 4 + H(x, row, 4) * 6, 1);
        }
        break;
      }
      case 'checker': {
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
          const sx = x * 2 + i, sy = y * 2 + j;
          ctx.fillStyle = (sx + sy) % 2 ? c[0] : c[1];
          ctx.fillRect(px + i * 16, py + j * 16, 16, 16);
          ctx.fillStyle = `rgba(255,255,255,${0.02 + H(sx, sy) * 0.04})`;
          ctx.fillRect(px + i * 16 + 1, py + j * 16 + 1, 14, 2);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py + 16, TILE, 1);
        ctx.fillRect(px, py, 1, TILE); ctx.fillRect(px + 16, py, 1, TILE);
        break;
      }
      case 'mosaic': {
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
          const h = H(x * 4 + i, y * 4 + j);
          ctx.fillStyle = h < 0.6 ? c[0] : h < 0.9 ? c[1] : c[2];
          ctx.fillRect(px + i * 8, py + j * 8, 8, 8);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let k = 0; k < 4; k++) { ctx.fillRect(px, py + k * 8, TILE, 1); ctx.fillRect(px + k * 8, py, 1, TILE); }
        break;
      }
      case 'carpet': {
        ctx.fillStyle = c[0]; ctx.fillRect(px, py, TILE, TILE);
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = i % 2 ? c[1] : c[2];
          ctx.fillRect(px + H(x, y, i) * 31, py + H(y, x, i) * 31, 1 + (i % 3 === 0), 1);
        }
        if ((x + y) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.015)'; ctx.fillRect(px, py, TILE, TILE); }
        break;
      }
      case 'concrete': {
        ctx.fillStyle = c[Math.floor(H(x >> 1, y >> 1, 5) * c.length)];
        ctx.fillRect(px, py, TILE, TILE);
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.05)';
          ctx.fillRect(px + H(x, y, i) * 31, py + H(y, x, i) * 31, 2, 1);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        if (x % 4 === 0) ctx.fillRect(px, py, 1, TILE);
        if (y % 4 === 0) ctx.fillRect(px, py, TILE, 1);
        break;
      }
      case 'raised': {
        ctx.fillStyle = c[0]; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py, 1, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(px, py + TILE - 1, TILE, 1); ctx.fillRect(px + TILE - 1, py, 1, TILE);
        if (H(x, y, 2) < 0.4) {
          ctx.fillStyle = c[1];
          for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) ctx.fillRect(px + 5 + i * 5, py + 5 + j * 5, 2, 2);
        }
        break;
      }
      case 'court': {
        // паркет спортзала (разметка рисуется отдельно)
        ctx.fillStyle = c[(x + Math.floor(y / 2)) % c.length]; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 4; i++) ctx.fillRect(px + i * 8, py, 1, TILE);
        ctx.fillStyle = 'rgba(255,240,200,0.05)'; ctx.fillRect(px, py, TILE, 2);
        break;
      }
      case 'marble': {
        ctx.fillStyle = (x + y) % 2 ? c[0] : c[1]; ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px + H(x, y) * 32, py); ctx.quadraticCurveTo(px + 16, py + 16, px + H(y, x) * 32, py + 32); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py, 1, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px + 2, py + 2, TILE - 4, 2);
        break;
      }
      case 'steel': {
        ctx.fillStyle = c[(x + y) % 2]; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let i = 0; i < 4; i++) ctx.fillRect(px + 3 + i * 7, py + 3 + (i % 2) * 6, 5, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py, 1, TILE);
        ctx.fillStyle = '#4a525c';
        for (const [ox, oy] of [[3, 3], [28, 3], [3, 28], [28, 28]]) ctx.fillRect(px + ox, py + oy, 1.5, 1.5);
        break;
      }
      case 'dance': {
        // стеклянные плитки танцпола — подсветка анимируется поверх
        ctx.fillStyle = '#0c0812'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = hexA(c[Math.floor(H(x, y, 3) * c.length)], 0.28); ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(px + 2, py + 2, TILE - 4, 2);
        break;
      }
      default: { // lino
        ctx.fillStyle = (x + y) % 2 ? c[0] : c[1]; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py, 1, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(px + 2, py + 2, TILE - 4, 3);
      }
    }
  }

  _drawThreshold(ctx, x, y) {
    const px = x * TILE, py = y * TILE;
    ctx.fillStyle = '#20160e'; ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = '#2c1f14';
    for (let i = 0; i < 4; i++) ctx.fillRect(px, py + i * 8 + 1, TILE, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, py, TILE, TILE);
  }

  // Мягкие тени у подножия стен
  _drawAO(ctx, x, y) {
    const px = x * TILE, py = y * TILE;
    const solid = (tx, ty) => { const t = this._getGrid(tx, ty); return t === T_WALL || t === T_OUT; };
    const grad = (x0, y0, x1, y1, a) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      return g;
    };
    if (solid(x, y - 1)) { ctx.fillStyle = grad(px, py, px, py + 14, 0.55); ctx.fillRect(px, py, TILE, 14); }
    if (solid(x - 1, y)) { ctx.fillStyle = grad(px, py, px + 9, py, 0.4); ctx.fillRect(px, py, 9, TILE); }
    if (solid(x + 1, y)) { ctx.fillStyle = grad(px + TILE, py, px + TILE - 7, py, 0.35); ctx.fillRect(px + TILE - 7, py, 7, TILE); }
    if (solid(x, y + 1)) { ctx.fillStyle = grad(px, py + TILE, px, py + TILE - 5, 0.3); ctx.fillRect(px, py + TILE - 5, TILE, 5); }
  }

  _drawWall(ctx, x, y) {
    const H = DecorArt.hash;
    const px = x * TILE, py = y * TILE;
    if (this.theme && window.OutdoorWalls && OutdoorWalls[this.theme]) { OutdoorWalls[this.theme](ctx, x, y, px, py); return; }
    const g = (tx, ty) => this._getGrid(tx, ty);
    const isFloorish = t => t !== T_WALL && t !== T_OUT;

    ctx.fillStyle = '#1b1524'; ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = '#211a2c';
    for (let i = 0; i < 4; i++) ctx.fillRect(px + H(x, y, i) * 29, py + H(y, x, i) * 20, 3, 1);

    const below = g(x, y + 1);
    if (isFloorish(below)) {
      const fg = ctx.createLinearGradient(px, py + TILE - 10, px, py + TILE);
      fg.addColorStop(0, '#140e1c'); fg.addColorStop(1, '#09070d');
      ctx.fillStyle = fg; ctx.fillRect(px, py + TILE - 10, TILE, 10);
      ctx.fillStyle = 'rgba(255,42,109,0.55)'; ctx.fillRect(px, py + TILE - 11, TILE, 1);
      ctx.fillStyle = 'rgba(255,42,109,0.12)'; ctx.fillRect(px, py + TILE - 13, TILE, 2);
      ctx.fillStyle = '#060409'; ctx.fillRect(px, py + TILE - 1, TILE, 1);
    } else if (below === T_OUT) {
      ctx.fillStyle = '#07050b'; ctx.fillRect(px, py + TILE - 8, TILE, 8);
    }
    if (isFloorish(g(x, y - 1))) { ctx.fillStyle = '#3d3050'; ctx.fillRect(px, py, TILE, 1); }
    if (isFloorish(g(x - 1, y))) { ctx.fillStyle = '#33284a'; ctx.fillRect(px, py, 1, TILE - (isFloorish(below) ? 10 : 0)); }
    if (isFloorish(g(x + 1, y))) { ctx.fillStyle = '#120d19'; ctx.fillRect(px + TILE - 1, py, 1, TILE); }
    if (g(x, y - 1) === T_OUT) { ctx.fillStyle = '#2a2238'; ctx.fillRect(px, py, TILE, 1); }
    if (g(x - 1, y) === T_OUT) { ctx.fillStyle = '#2a2238'; ctx.fillRect(px, py, 1, TILE); }
    if (g(x + 1, y) === T_OUT) { ctx.fillStyle = '#2a2238'; ctx.fillRect(px + TILE - 1, py, 1, TILE); }
  }

  _drawWindow(ctx, w) {
    const px = w.x * TILE, py = w.y * TILE;
    if (w.broken) {
      // пустая рама с осколками по краям
      ctx.save();
      ctx.fillStyle = '#0c0a12';
      if (w.dy !== 0) {
        ctx.fillRect(px + 2, py + 10, TILE - 4, 9);
        ctx.fillStyle = '#05060a'; ctx.fillRect(px + 3, py + 11, TILE - 6, 7);
        ctx.fillStyle = 'rgba(160,210,255,0.6)';
        for (const [ox, w2] of [[3, 3], [9, 2], [20, 4], [26, 2]]) { ctx.beginPath(); ctx.moveTo(px + ox, py + 11); ctx.lineTo(px + ox + w2, py + 11); ctx.lineTo(px + ox + 1, py + 15); ctx.fill(); }
      } else {
        ctx.fillRect(px + 11, py + 2, 9, TILE - 4);
        ctx.fillStyle = '#05060a'; ctx.fillRect(px + 12, py + 3, 7, TILE - 6);
        ctx.fillStyle = 'rgba(160,210,255,0.6)';
        for (const [oy, h2] of [[3, 3], [10, 2], [19, 4], [26, 2]]) { ctx.beginPath(); ctx.moveTo(px + 12, py + oy); ctx.lineTo(px + 12, py + oy + h2); ctx.lineTo(px + 16, py + oy + 1); ctx.fill(); }
      }
      ctx.restore();
      return;
    }
    ctx.save();
    if (w.dy !== 0) {
      ctx.fillStyle = '#0c0a12'; ctx.fillRect(px + 2, py + 10, TILE - 4, 9);
      ctx.fillStyle = '#1c3550'; ctx.fillRect(px + 3, py + 11, TILE - 6, 7);
      ctx.fillStyle = '#5a8ac0'; ctx.fillRect(px + 3, py + 11, TILE - 6, 1);
      ctx.fillStyle = 'rgba(160,200,255,0.25)'; ctx.fillRect(px + 6, py + 13, 6, 3);
      ctx.fillStyle = '#0c0a12'; ctx.fillRect(px + TILE / 2 - 1, py + 10, 2, 9);
    } else {
      ctx.fillStyle = '#0c0a12'; ctx.fillRect(px + 11, py + 2, 9, TILE - 4);
      ctx.fillStyle = '#1c3550'; ctx.fillRect(px + 12, py + 3, 7, TILE - 6);
      ctx.fillStyle = '#5a8ac0'; ctx.fillRect(px + 12, py + 3, 1, TILE - 6);
      ctx.fillStyle = 'rgba(160,200,255,0.25)'; ctx.fillRect(px + 14, py + 6, 3, 6);
      ctx.fillStyle = '#0c0a12'; ctx.fillRect(px + 11, py + TILE / 2 - 1, 9, 2);
    }
    ctx.restore();
  }

  _drawSign(ctx, s) {
    ctx.save();
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = Math.min(ctx.measureText(s.text).width + 10, s.maxW);
    ctx.fillStyle = '#07050b';
    ctx.fillRect(s.x - tw / 2, s.y - 8, tw, 14);
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = s.color;
    ctx.fillText(s.text, s.x, s.y, s.maxW - 10);
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.fillText(s.text, s.x, s.y, s.maxW - 10);
    ctx.restore();
  }

  _drawFurniture(ctx, f) {
    const def = DecorArt.items[f.kind];
    // тень
    ctx.save();
    ctx.translate(f.x + (f.tall ? 5 : 3), f.y + (f.tall ? 7 : 4));
    ctx.rotate(f.rot);
    ctx.fillStyle = f.tall ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.32)';
    DecorArt.rr(ctx, -f.W / 2 + 2, -f.H / 2 + 2, f.W - 4, f.H - 4, 4);
    ctx.fill();
    ctx.restore();
    // сам предмет
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    def.draw(ctx, f.W, f.H, DecorArt.rng(f.seed));
    ctx.restore();
  }

  _drawLighting(ctx) {
    for (const r of this.rooms) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
      ctx.clip();
      ctx.fillStyle = 'rgba(4,2,10,0.3)';
      ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of r.lights) {
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        g.addColorStop(0, hexA(l.color, l.a));
        g.addColorStop(0.5, hexA(l.color, l.a * 0.4));
        g.addColorStop(1, hexA(l.color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      }
      ctx.restore();
    }
  }

  _rebuildStatic() {
    if (!this._staticCanvas) {
      this._staticCanvas = document.createElement('canvas');
      this._staticCanvas.width = this.w;
      this._staticCanvas.height = this.h;
      this._staticCtx = this._staticCanvas.getContext('2d');
    }
    this._renderStatic(null);
    this._staticDirty = false;
  }

  // region = {x0,y0,x1,y1} в пикселях или null — весь уровень
  _renderStatic(region) {
    const ctx = this._staticCtx;
    ctx.imageSmoothingEnabled = false;
    const R = region || { x0: 0, y0: 0, x1: this.w, y1: this.h };
    const tx0 = Math.max(0, Math.floor(R.x0 / TILE)), ty0 = Math.max(0, Math.floor(R.y0 / TILE));
    const tx1 = Math.min(this.cols - 1, Math.floor(R.x1 / TILE)), ty1 = Math.min(this.rows - 1, Math.floor(R.y1 / TILE));
    const px0 = tx0 * TILE, py0 = ty0 * TILE, pw = (tx1 - tx0 + 1) * TILE, ph = (ty1 - ty0 + 1) * TILE;
    const near = (x, y, m) => x > px0 - m && x < px0 + pw + m && y > py0 - m && y < py0 + ph + m;
    ctx.save();
    ctx.beginPath(); ctx.rect(px0, py0, pw, ph); ctx.clip();
    ctx.clearRect(px0, py0, pw, ph);

    // 1. Улица и полы
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const t = this.grid[y][x];
        if (t === T_OUT) { this._drawOutside(ctx, x, y); continue; }
        if (t === T_WALL) continue;
        const rid = this._rg(x, y);
        if (rid >= 0) this._drawFloor(ctx, x, y, this.rooms[rid]);
        else this._drawThreshold(ctx, x, y);
      }
    }
    this._drawCourtLines(ctx);
    // 2. Ковры и мусор
    for (const rug of this.rugs) if (near(rug.x + rug.w / 2, rug.y + rug.h / 2, Math.max(rug.w, rug.h))) DecorArt.drawRug(ctx, rug);
    for (const d of this.decals) if (near(d.x, d.y, 40)) DecorArt.drawDecal(ctx, d);
    // 3. Тени у стен
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const t = this.grid[y][x];
        if (t !== T_WALL && t !== T_OUT) this._drawAO(ctx, x, y);
      }
    }
    // 4. Мебель
    for (const f of this.furniture) if (!f.destroyed && near(f.x, f.y, Math.max(f.W, f.H))) this._drawFurniture(ctx, f);
    // 5. Освещение комнат
    this._drawLighting(ctx);
    // 6. Стены, окна, вывески
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        if (this.grid[y][x] === T_WALL && !this._isDoorway(x, y)) this._drawWall(ctx, x, y);
      }
    }
    for (const w of this.windows) if (near(w.x * TILE, w.y * TILE, 40)) this._drawWindow(ctx, w);
    for (const s of this.signs) if (near(s.x, s.y, 120)) this._drawSign(ctx, s);
    ctx.restore();
  }

  // Разметка баскетбольной площадки в спортзале
  _drawCourtLines(ctx) {
    for (const r of this.rooms) {
      if (r.type !== 'gym') continue;
      const x = (r.x + 1) * TILE, y = (r.y + 1) * TILE, w = (r.w - 2) * TILE, h = (r.h - 2) * TILE;
      ctx.save();
      ctx.strokeStyle = 'rgba(240,230,210,0.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.15, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,80,60,0.45)';
      ctx.beginPath(); ctx.arc(x, y + h / 2, Math.min(w, h) * 0.3, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w, y + h / 2, Math.min(w, h) * 0.3, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
      ctx.restore();
    }
  }

  draw(ctx, cam, player) {
    if (this._staticDirty || !this._staticCanvas) this._rebuildStatic();

    const vw = cam.vw / (cam.zoom || 1), vh = cam.vh / (cam.zoom || 1);
    const startX = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const startY = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const endX = Math.min(this.cols, Math.ceil((cam.x + vw) / TILE) + 1);
    const endY = Math.min(this.rows, Math.ceil((cam.y + vh) / TILE) + 1);
    const sx = startX * TILE, sy = startY * TILE;
    const sw = (endX - startX) * TILE, sh = (endY - startY) * TILE;
    if (sw > 0 && sh > 0) ctx.drawImage(this._staticCanvas, sx, sy, sw, sh, sx, sy, sw, sh);

    const inView = (x, y, m) => x > sx - m && x < sx + sw + m && y > sy - m && y < sy + sh + m;
    // пульсирующая подсветка танцпола
    for (const r of this.rooms) {
      if (r.type !== 'club' || !inView((r.x + r.w / 2) * TILE, (r.y + r.h / 2) * TILE, Math.max(r.w, r.h) * TILE)) continue;
      const c = ROOM_THEMES.club.colors;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        if (this.grid[y][x] !== T_FLOOR) continue;
        const k = Math.sin(this.time * 3 + DecorArt.hash(x, y) * 6.28 + (x + y) * 0.4);
        if (k < 0.55) continue;
        ctx.fillStyle = hexA(c[Math.floor(DecorArt.hash(x, y, 3) * c.length)], (k - 0.55) * 0.5);
        ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
      }
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(8,6,10,0.85)';
    for (const h of this.holes) if (inView(h.x, h.y, 10)) { ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill(); }
    for (const a of this.animated) if (inView(a.x, a.y, 80)) DecorArt.drawAnim(ctx, a, this.time);
    for (const d of this.doors) if (inView(d.hx, d.hy, 80)) d.draw(ctx);
  }

  // Искры поверх персонажей
  drawEffects(ctx) {
    if (!this.sparks.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.sparks) {
      const k = Math.max(0, s.life / s.max);
      ctx.strokeStyle = `rgba(255,${180 + 60 * k | 0},90,${k})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.025, s.y - s.vy * 0.025);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFog(ctx, cam, player) {
    if (!player) return;
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    const { room: playerRoom, lit } = this.getLitRooms(player);

    for (const r of lit) this.exploredRooms.add(r);

    for (const r of this.rooms) {
      let a;
      if (lit.has(r)) a = 0.1;
      else if (this.exploredRooms.has(r)) a = 0.6;
      else a = 1;
      ctx.fillStyle = `rgba(3,2,7,${a})`;
      ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
    }

    if (playerRoom) {
      const rad = Math.max(playerRoom.w, playerRoom.h) * TILE * 0.85 + 80;
      const grad = ctx.createRadialGradient(pcx, pcy, rad * 0.35, pcx, pcy, rad);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect((playerRoom.x - 1) * TILE, (playerRoom.y - 1) * TILE, (playerRoom.w + 2) * TILE, (playerRoom.h + 2) * TILE);
    }
  }
}
