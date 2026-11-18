const TILE = 32;
const DOOR_W = 2; // проход и дверь шириной 2 тайла

class Level {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cols = Math.floor(w / TILE);
    this.rows = Math.floor(h / TILE);
    this.grid = [];
    this.rooms = [];
    this.decor = [];
    this.doors = [];
    this.spawnPoints = [];
    this.noiseEvents = [];
    this.playerRoom = null;
    this.exploredRooms = new Set();

    this._staticCanvas = null;
    this._staticCtx = null;
    this._staticDirty = true;

    this.generate();
  }

  _setGrid(x, y, v) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    if (!this.grid[y]) return;
    this.grid[y][x] = v;
    this._staticDirty = true;
  }

  _getGrid(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return 1;
    if (!this.grid[y]) return 1;
    return this.grid[y][x];
  }

  generate() {
    // Всё поле — стены
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) this.grid[y][x] = 1;
    }
    // Внешняя рампа (декор)
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++)
        if (x < 2 || y < 2 || x >= this.cols - 2 || y >= this.rows - 2)
          this.grid[y][x] = 4;

    // Сетка комнат: 4×3, впритык, стены между ними — 1 тайл
    const zonesX = 4, zonesY = 3;
    const usableX = this.cols - 4; // 2 тайла рамки с каждой стороны
    const usableY = this.rows - 4;
    const zoneW = Math.floor(usableX / zonesX);
    const zoneH = Math.floor(usableY / zonesY);

    // Комнаты занимают ВСЮ зону (без отступов) — стены = 1 тайл между зонами
    for (let zy = 0; zy < zonesY; zy++) {
      for (let zx = 0; zx < zonesX; zx++) {
        const rx = 2 + zx * zoneW;
        const ry = 2 + zy * zoneH;
        const rw = zoneW;
        const rh = zoneH;

        // Оставляем 1 тайл стены между комнатами: сужаем каждую комнату на 1 справа/снизу,
        // кроме последней в ряду/столбце
        const innerW = rw - (zx < zonesX - 1 ? 1 : 0);
        const innerH = rh - (zy < zonesY - 1 ? 1 : 0);
        if (innerW < 4 || innerH < 4) continue;

        const room = {
          x: rx, y: ry, w: innerW, h: innerH,
          cx: Math.floor(rx + innerW / 2),
          cy: Math.floor(ry + innerH / 2),
          id: zy * zonesX + zx,
        };
        this._carveRoom(room);
        this.rooms.push(room);
      }
    }

    // Ближайшая к центру комнаты — стартовая
    let cx = this.cols / 2, cy = this.rows / 2;
    let bestRoom = this.rooms[0], bestD = Infinity;
    for (const r of this.rooms) {
      const d = Math.hypot(r.cx - cx, r.cy - cy);
      if (d < bestD) { bestD = d; bestRoom = r; }
    }
    this.playerRoom = bestRoom;

    // Соединяем комнаты: горизонтальные и вертикальные проходы по 2 тайла
    for (let zy = 0; zy < zonesY; zy++) {
      for (let zx = 0; zx < zonesX - 1; zx++) {
        const a = this.rooms.find(r => r.id === zy * zonesX + zx);
        const b = this.rooms.find(r => r.id === zy * zonesX + zx + 1);
        if (a && b) this._connectRooms(a, b, false);
      }
    }
    for (let zy = 0; zy < zonesY - 1; zy++) {
      for (let zx = 0; zx < zonesX; zx++) {
        const a = this.rooms.find(r => r.id === zy * zonesX + zx);
        const b = this.rooms.find(r => r.id === (zy + 1) * zonesX + zx);
        if (a && b) this._connectRooms(a, b, true);
      }
    }

    for (const r of this.rooms) this._decorate(r);
    this._buildRoomGraph();

  }

  _carveRoom(r) {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++)
        this._setGrid(x, y, 0);
  }

  _connectRooms(a, b, horizontal) {
    // horizontal=true — вертикальный проход (комнаты друг над другом)
    // Проход шириной DOOR_W тайлов
    if (horizontal) {
      // Верхняя комната — a, нижняя — b
      const top = a.y < b.y ? a : b;
      const bot = a.y < b.y ? b : a;
      const wallY = top.y + top.h; // первый тайл стены
      const midX = Math.floor((top.cx + bot.cx) / 2);
      const startX = midX - Math.floor(DOOR_W / 2);
      for (let y = wallY; y <= wallY; y++) {
        for (let dx = 0; dx < DOOR_W; dx++) {
          this._setGrid(startX + dx, y, 0);
        }
      }
      // Дверь длиной DOOR_W, горизонтальная (вдоль X)
      this.doors.push(new Door(startX * TILE, wallY * TILE, true, DOOR_W));
    } else {
      // Левая — a, правая — b
      const left = a.x < b.x ? a : b;
      const right = a.x < b.x ? b : a;
      const wallX = left.x + left.w;
      const midY = Math.floor((left.cy + right.cy) / 2);
      const startY = midY - Math.floor(DOOR_W / 2);
      for (let x = wallX; x <= wallX; x++) {
        for (let dy = 0; dy < DOOR_W; dy++) {
          this._setGrid(x, startY + dy, 0);
        }
      }
      // Дверь длиной DOOR_W, вертикальная (вдоль Y)
      this.doors.push(new Door(wallX * TILE, startY * TILE, false, DOOR_W));
    }
  }

  _decorate(r) {
    // Ковёр
    if (r.w > 5 && r.h > 5) {
      this.decor.push({
        type: 'rug',
        x: (r.x + 2) * TILE,
        y: (r.y + 2) * TILE,
        w: (r.w - 4) * TILE,
        h: (r.h - 4) * TILE,
        color: Utils.choice(['#3d0e23', '#1a2a3d', '#2d1a3d', '#3d2a1a']),
      });
    }

    // Мебель — только внутри комнаты (не на стенах)
    const items = Utils.randInt(2, 4);
    for (let i = 0; i < items; i++) {
      if (r.w < 4 || r.h < 4) break;
      const side = Utils.randInt(0, 3);
      let dx, dy;
      if (side === 0) { dx = 1 + Utils.randInt(0, r.w - 3); dy = 1; }
      else if (side === 1) { dx = r.w - 2; dy = 1 + Utils.randInt(0, r.h - 3); }
      else if (side === 2) { dx = 1 + Utils.randInt(0, r.w - 3); dy = r.h - 2; }
      else { dx = 1; dy = 1 + Utils.randInt(0, r.h - 3); }
      const kinds = ['table', 'couch', 'chair', 'shelf', 'plant', 'tv'];
      this.decor.push({
        type: Utils.choice(kinds),
        x: (r.x + dx) * TILE,
        y: (r.y + dy) * TILE,
        w: TILE, h: TILE,
      });
    }

    // Враги — НЕ в комнате игрока, только во внутренних тайлах
    if (r !== this.playerRoom && r.w >= 4 && r.h >= 4) {
      const enemyCount = Utils.randInt(2, 4);
      for (let i = 0; i < enemyCount; i++) {
        // Внутренние тайлы: от r.x+1 до r.x+r.w-2
        const ex = (r.x + 1 + Utils.randInt(0, r.w - 3)) * TILE;
        const ey = (r.y + 1 + Utils.randInt(0, r.h - 3)) * TILE;

        if (this._getGrid(Math.floor(ex / TILE), Math.floor(ey / TILE)) !== 0) continue;

        const behavior = Utils.choice(['static', 'patrol', 'patrol']);
        let waypoints = null;
        if (behavior === 'patrol') {
          waypoints = [];
          const n = Utils.randInt(2, 3);
          for (let k = 0; k < n; k++) {
            const wx = (r.x + 1 + Utils.randInt(0, r.w - 3)) * TILE;
            const wy = (r.y + 1 + Utils.randInt(0, r.h - 3)) * TILE;
            if (this._getGrid(Math.floor(wx / TILE), Math.floor(wy / TILE)) === 0) {
              waypoints.push({ x: wx, y: wy });
            }
          }
        }
        this.spawnPoints.push({ x: ex, y: ey, behavior, waypoints });
      }
    }
  }

  getRoomAt(x, y) {
    const cx = Math.floor(x / TILE);
    const cy = Math.floor(y / TILE);
    for (const r of this.rooms) {
      if (cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h) return r;
    }
    return null;
  }

  _areAdjacent(a, b) {
    const A = { l: a.x, r: a.x + a.w, t: a.y, b: a.y + a.h };
    const B = { l: b.x, r: b.x + b.w, t: b.y, b: b.y + b.h };
    // 1 тайл стены между ними
    return (A.r === B.l || B.r === A.l || A.b === B.t || B.b === A.t);
  }

    // Строим граф смежности комнат (по дверям)
  _buildRoomGraph() {
    this._roomGraph = new Map();
    for (const r of this.rooms) this._roomGraph.set(r.id, []);

    for (const d of this.doors) {
      const dx = d.x + d.w / 2;
      const dy = d.y + d.h / 2;

      // Определяем, какие две комнаты соединяет дверь
      // Дверь стоит в стене; смотрим на тайлы слева/справа (или сверху/снизу)
      const leftRoom = this.getRoomAt(dx - TILE, dy);
      const rightRoom = this.getRoomAt(dx + TILE, dy);
      const topRoom = this.getRoomAt(dx, dy - TILE);
      const botRoom = this.getRoomAt(dx, dy + TILE);

      let a = null, b = null;
      if (leftRoom && rightRoom && leftRoom !== rightRoom) { a = leftRoom; b = rightRoom; }
      else if (topRoom && botRoom && topRoom !== botRoom) { a = topRoom; b = botRoom; }

      if (a && b) {
        this._roomGraph.get(a.id).push({ room: b, door: d });
        this._roomGraph.get(b.id).push({ room: a, door: d });
      }
    }
  }

  // Возвращает дверь между двумя соседними комнатами или null
  _doorBetween(roomA, roomB) {
    if (!this._roomGraph) this._buildRoomGraph();
    const edges = this._roomGraph.get(roomA.id) || [];
    const e = edges.find(x => x.room === roomB);
    return e ? e.door : null;
  }

  // BFS по комнатам: возвращает массив комнат от from до to (включая обе)
  _findRoomPath(from, to) {
    if (!this._roomGraph) this._buildRoomGraph();
    if (!from || !to) return null;
    if (from === to) return [from];

    const visited = new Set([from.id]);
    const queue = [{ room: from, path: [from] }];

    while (queue.length) {
      const { room, path } = queue.shift();
      const edges = this._roomGraph.get(room.id) || [];
      for (const e of edges) {
        if (visited.has(e.room.id)) continue;
        visited.add(e.room.id);
        const newPath = path.concat(e.room);
        if (e.room === to) return newPath;
        queue.push({ room: e.room, path: newPath });
      }
    }
    return null;
  }

  spawnPoint() {
    if (!this.playerRoom) return { x: this.cols * TILE / 2, y: this.rows * TILE / 2 };
    const px = this.playerRoom.cx * TILE + TILE / 2;
    const py = this.playerRoom.cy * TILE + TILE / 2;
    return { x: px, y: py };
  }

  collides(x, y, w, h) {
    const x1 = Math.floor(x / TILE), y1 = Math.floor(y / TILE);
    const x2 = Math.floor((x + w - 1) / TILE), y2 = Math.floor((y + h - 1) / TILE);
    for (let cy = y1; cy <= y2; cy++)
      for (let cx = x1; cx <= x2; cx++) {
        const t = this._getGrid(cx, cy);
        if (t === 1 || t === 3) return true;
      }
    for (const d of this.doors) {
      if (d.blocks(x, y, w, h)) return true;
    }
    return false;
  }

  isWallAt(px, py) {
    const cx = Math.floor(px / TILE);
    const cy = Math.floor(py / TILE);
    const t = this._getGrid(cx, cy);
    return t === 1 || t === 3;
  }

  bulletHitsWall(px, py) {
    if (this.isWallAt(px, py)) return true;
    for (const d of this.doors) {
      if (d.blocksPoint(px, py)) return true;
    }
    return false;
  }

  lineOfSight(x1, y1, x2, y2) {
    const steps = Math.ceil(Utils.dist(x1, y1, x2, y2) / 8);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      if (this.isWallAt(px, py)) return false;
      for (const d of this.doors) {
        if (d.blocksPoint(px, py)) return false;
      }
    }
    return true;
  }

  update(dt) {
    for (const d of this.doors) d.update(dt);
    for (let i = this.noiseEvents.length - 1; i >= 0; i--) {
      this.noiseEvents[i].time -= dt;
      if (this.noiseEvents[i].time <= 0) this.noiseEvents.splice(i, 1);
    }
  }

  addNoise(x, y, radius) {
    this.noiseEvents.push({ x, y, radius, time: 1.5 });
  }

  _rebuildStatic() {
    if (!this._staticCanvas) {
      this._staticCanvas = document.createElement('canvas');
      this._staticCanvas.width = this.w;
      this._staticCanvas.height = this.h;
      this._staticCtx = this._staticCanvas.getContext('2d');
      this._staticCtx.imageSmoothingEnabled = false;
    }
    const ctx = this._staticCtx;
    ctx.clearRect(0, 0, this.w, this.h);

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const px = x * TILE, py = y * TILE;
        const t = this.grid[y][x];
        if (t === 0) {
          ctx.fillStyle = '#151020';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#1f1830';
          for (let i = 0; i < 4; i++) {
            const sx = px + ((x * 7 + y * 13 + i * 3) % (TILE - 2));
            const sy = py + ((x * 11 + i * 5) % (TILE - 2));
            ctx.fillRect(sx, sy, 2, 2);
          }
        } else if (t === 4) {
          ctx.fillStyle = '#0d0a14';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#161220';
          for (let i = 0; i < 3; i++) {
            const sx = px + ((x * 5 + y * 11 + i * 7) % (TILE - 2));
            const sy = py + ((x * 17 + i * 3) % (TILE - 2));
            ctx.fillRect(sx, sy, 2, 2);
          }
        } else {
          ctx.fillStyle = '#0a0810';
          ctx.fillRect(px, py, TILE, TILE);
        }
      }
    }

    for (const d of this.decor) {
      if (d.type === 'rug') {
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeStyle = 'rgba(255, 42, 109, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
      } else if (d.type === 'table') {
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(d.x + 4, d.y + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = '#4a2f1a';
        ctx.fillRect(d.x + 4, d.y + 4, TILE - 8, 4);
      } else if (d.type === 'couch') {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(d.x, d.y + 6, TILE, TILE - 12);
        ctx.fillStyle = '#333355';
        ctx.fillRect(d.x, d.y + 6, TILE, 4);
      } else if (d.type === 'chair') {
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(d.x + 8, d.y + 8, TILE - 16, TILE - 16);
      } else if (d.type === 'shelf') {
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(d.x + 2, d.y + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#5a3a2a';
        ctx.fillRect(d.x + 4, d.y + 6, TILE - 8, 2);
        ctx.fillRect(d.x + 4, d.y + 14, TILE - 8, 2);
      } else if (d.type === 'plant') {
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(d.x + 12, d.y + 20, 8, 10);
        ctx.fillStyle = '#2a5a2a';
        ctx.beginPath();
        ctx.arc(d.x + 16, d.y + 14, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === 'tv') {
        ctx.fillStyle = '#111';
        ctx.fillRect(d.x + 4, d.y + 6, TILE - 8, TILE - 14);
        ctx.fillStyle = '#1a3a6a';
        ctx.fillRect(d.x + 6, d.y + 8, TILE - 12, TILE - 18);
      }
    }

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x] === 1) {
          const px = x * TILE, py = y * TILE;
          ctx.fillStyle = '#000';
          ctx.fillRect(px, py, TILE, TILE);
          if (y > 0 && this.grid[y - 1] && this.grid[y - 1][x] !== 1) {
            ctx.fillStyle = '#ff2a6d';
            ctx.fillRect(px, py, TILE, 2);
          }
          if (x > 0 && this.grid[y][x - 1] !== 1) {
            ctx.fillStyle = '#4a1a3a';
            ctx.fillRect(px, py, 2, TILE);
          }
          if (y < this.rows - 1 && this.grid[y + 1] && this.grid[y + 1][x] !== 1) {
            ctx.fillStyle = '#2a0a15';
            ctx.fillRect(px, py + TILE - 2, TILE, 2);
          }
        }
      }
    }

    this._staticDirty = false;
  }

  draw(ctx, cam, player) {
    if (this._staticDirty || !this._staticCanvas) this._rebuildStatic();

    const startX = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const startY = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const endX = Math.min(this.cols, Math.ceil((cam.x + cam.vw) / TILE) + 1);
    const endY = Math.min(this.rows, Math.ceil((cam.y + cam.vh) / TILE) + 1);

    const sx = startX * TILE, sy = startY * TILE;
    const sw = (endX - startX) * TILE, sh = (endY - startY) * TILE;

    if (sw > 0 && sh > 0) {
      ctx.drawImage(this._staticCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
    }

    for (const d of this.doors) d.draw(ctx);
  }

  drawFog(ctx, cam, player) {
    if (!player) return;
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;

    const playerRoom = this.getRoomAt(pcx, pcy);
    if (playerRoom) {
      this.exploredRooms.add(playerRoom);
      const litRooms = new Set([playerRoom]);
      for (const d of this.doors) {
        if (!d.open) continue;
        const dx = d.x + d.w / 2;
        const dy = d.y + d.h / 2;
        const dr = this.getRoomAt(dx, dy);
        if (dr && litRooms.has(dr)) {
          for (const r of this.rooms) {
            if (r === dr) continue;
            if (this._areAdjacent(r, dr)) litRooms.add(r);
          }
        }
      }

      for (const r of this.rooms) {
        if (litRooms.has(r)) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
        } else if (this.exploredRooms.has(r)) {
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.9)';
          ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
        }
      }

      const rad = Math.max(playerRoom.w, playerRoom.h) * TILE * 0.8;
      const grad = ctx.createRadialGradient(pcx, pcy, rad * 0.4, pcx, pcy, rad);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = grad;
      ctx.fillRect((playerRoom.x - 1) * TILE, (playerRoom.y - 1) * TILE, (playerRoom.w + 2) * TILE, (playerRoom.h + 2) * TILE);
    }
  }
}