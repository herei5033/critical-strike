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
};

// Сколько раз максимум предмет встречается в одной комнате
const ITEM_ROOM_MAX = { fridge: 1, tub: 1, bed: 1, bar: 1, pool: 1, tvstand: 1, wardrobe: 1, kitchenRun: 2, couch: 2, toilet: 3, cooler: 1, vending: 1, dtable: 1 };

// Сколько раз максимум встречается тип комнаты на уровне
const ROOM_TYPE_CAP = { bar: 1, lounge: 2, server: 1, bathroom: 2, kitchen: 2, bedroom: 3, office: 4, storage: 3 };

const ROOM_CLUTTER = {
  office:   ['paper', 'paper', 'paper', 'butt', 'can', 'stain'],
  kitchen:  ['stain', 'can', 'bottle', 'shards', 'paper'],
  bathroom: ['puddle', 'paper', 'stain'],
  lounge:   ['can', 'bottle', 'butt', 'paper', 'stain'],
  bar:      ['bottle', 'shards', 'butt', 'can', 'stain', 'casing', 'shards'],
  bedroom:  ['paper', 'can', 'stain', 'bottle'],
  storage:  ['cardboard', 'stain', 'crack', 'casing', 'paper', 'crack'],
  server:   ['cable', 'cable', 'paper', 'crack'],
  hall:     ['paper', 'butt', 'leaf', 'can', 'stain'],
};

const ROOM_NEON = {
  bar:     [['BAR', '#ff2a6d'], ['COCKTAILS', '#c060ff'], ['OPEN 24/7', '#05d9e8']],
  lounge:  [['CHILL', '#ff7fbf'], ['VIBE', '#05d9e8']],
  kitchen: [['EAT', '#ffd319']],
  hall:    [['EXIT', '#3fff7f']],
  server:  [['NO ENTRY', '#ff3a3a']],
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
  constructor(w, h) {
    this.w = w; this.h = h;
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
  _generate() {
    const C = this.cols, Rw = this.rows;
    this.grid = [];
    for (let y = 0; y < Rw; y++) { this.grid[y] = new Array(C).fill(T_OUT); }
    this.roomGrid = new Int16Array(C * Rw).fill(-1);
    this.reserved = new Uint8Array(C * Rw);
    this.doorway = new Uint8Array(C * Rw);

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
    {
      const t = this._nearestFree(this.playerRoom, this.playerRoom.cx, this.playerRoom.cy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this._reserve(t.x + dx, t.y + dy);
      this._playerTile = t;
    }

    // --- 7. Перегородки в больших комнатах ---
    for (const r of this.rooms) {
      if (r.hall || r.type === 'bathroom' || r === this.playerRoom) continue;
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
    for (const r of this.rooms) {
      if (r === this.playerRoom) continue;
      const free = this._freeTiles(r, true);
      if (!free.length) continue;
      let n;
      if (r.hall) n = Math.random() < 0.6 ? 1 : 0;
      else n = Utils.clamp(Math.floor(free.length / 30) + Utils.randInt(0, 1), 1, 5);
      if (nearPlayer.has(r)) n = Math.min(n, 2);
      for (let i = 0; i < n && free.length; i++) {
        const t = free.splice(Math.floor(Math.random() * free.length), 1)[0];
        const roll = Math.random();
        let type = 'normal';
        if (roll < 0.06) type = 'tank';
        else if (roll < 0.13) type = 'hound';
        else if (roll < 0.21) type = 'sniper';

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
        this.spawnPoints.push({ x: t.x * TILE + 7, y: t.y * TILE + 7, behavior, waypoints, type });
      }
    }
    return true;
  }

  _split(n, depth, out) {
    const MIN = 7;
    const canV = n.w >= MIN * 2 - 1, canH = n.h >= MIN * 2 - 1;
    const canVC = n.w >= 17, canHC = n.h >= 17;
    const area = (n.w - 2) * (n.h - 2);

    if (depth > 0 && (!canV && !canH || area < 70 || depth > 5 ||
        (area < 130 && Math.random() < 0.55) || (area < 220 && Math.random() < 0.3))) {
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

    // Запрещаем мебель в зоне распахивания двери и прохода
    const depthR = kind === 'door' ? 2 : 1;
    for (let i = -1; i <= width; i++) {
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
        const code = def.solid === 'tall' ? T_TALL : T_LOW;
        for (let y = c.ty; y < c.ty + c.fh; y++) for (let x = c.tx; x < c.tx + c.fw; x++) this.grid[y][x] = code;
        if (this._roomConnected(room)) {
          let rot;
          if (place === 'wall') rot = [0, Math.PI / 2, Math.PI, -Math.PI / 2][c.dir];
          else rot = c.dir === 0 ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
          const item = {
            kind, rot, seed: (Math.random() * 1e9) | 0,
            x: (c.tx + c.fw / 2) * TILE, y: (c.ty + c.fh / 2) * TILE,
            W: along * TILE, H: depth * TILE, tall: def.solid === 'tall', room: room.id,
          };
          this.furniture.push(item);
          if (def.anim) this.animated.push({ kind: def.anim, x: item.x, y: item.y, rot, W: item.W, H: item.H, seed: item.seed % 1000 });
          if (def.light) {
            const ox = -Math.sin(rot) * def.light.dy, oy = Math.cos(rot) * def.light.dy;
            room.lights.push({ x: item.x + ox, y: item.y + oy, r: def.light.radius, color: def.light.color, a: 0.3 });
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
        if (this._getGrid(x, y) !== T_FLOOR || this._rg(x, y) !== room.id || this._isReserved(x, y)) return false;
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
        this.windows.push({ x, y, dx: dir[0], dy: dir[1] });
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

  bulletHitsWall(px, py) {
    if (this.isWallAt(px, py)) return true;
    for (const d of this.doors) if (d.blocksPoint(px, py)) return true;
    return false;
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
    const ctx = this._staticCtx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.w, this.h);

    // 1. Улица и полы
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const t = this.grid[y][x];
        if (t === T_OUT) { this._drawOutside(ctx, x, y); continue; }
        if (t === T_WALL) continue;
        const rid = this._rg(x, y);
        if (rid >= 0) this._drawFloor(ctx, x, y, this.rooms[rid]);
        else this._drawThreshold(ctx, x, y);
      }
    }
    // 2. Ковры и мусор
    for (const rug of this.rugs) DecorArt.drawRug(ctx, rug);
    for (const d of this.decals) DecorArt.drawDecal(ctx, d);
    // 3. Тени у стен
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const t = this.grid[y][x];
        if (t !== T_WALL && t !== T_OUT) this._drawAO(ctx, x, y);
      }
    }
    // 4. Мебель
    for (const f of this.furniture) this._drawFurniture(ctx, f);
    // 5. Освещение комнат
    this._drawLighting(ctx);
    // 6. Стены, окна, вывески
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x] === T_WALL && !this._isDoorway(x, y)) this._drawWall(ctx, x, y);
      }
    }
    for (const w of this.windows) this._drawWindow(ctx, w);
    for (const s of this.signs) this._drawSign(ctx, s);

    this._staticDirty = false;
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
