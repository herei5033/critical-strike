// Распашная дверь на петле.
// Створка — отрезок от петли длиной ~ширина проёма. Она открывается ровно настолько,
// насколько её толкнули (угловая скорость + затухание), упирается в ограничители ±90°
// и имеет физическую коллизию с игроком, врагами, пулями и линией обзора.
class Door {
  constructor(x, y, horizontal, lenTiles = 2, hingeAtStart = true) {
    this.lenTiles = lenTiles;
    // Проём: одна клетка стены по толщине и lenTiles клеток по длине
    this.w = horizontal ? TILE * lenTiles : TILE;
    this.h = horizontal ? TILE : TILE * lenTiles;
    this.x = x; this.y = y;
    this.horizontal = horizontal;

    this.thick = 7;
    // Петля утоплена в косяк: открытая створка прижимается к стене и не сужает проход
    this.len = TILE * lenTiles;
    if (horizontal) {
      this.hx = hingeAtStart ? x - 2 : x + this.w + 2;
      this.hy = y + TILE / 2;
      this.base = hingeAtStart ? 0 : Math.PI;
    } else {
      this.hx = x + TILE / 2;
      this.hy = hingeAtStart ? y - 2 : y + this.h + 2;
      this.base = hingeAtStart ? Math.PI / 2 : -Math.PI / 2;
    }

    this.hp = 8;             // столько попаданий/ударов выдерживает створка
    this.jamHits = 0;        // неудачные толчки врагов подряд
    this.jamT = 0;
    this.lockT = 0;          // после захлопывания дверь ненадолго заперта для врагов
    this.broken = false;
    this.angle = 0;          // отклонение створки от закрытого положения, рад
    this.omega = 0;          // угловая скорость, рад/с
    this.maxAngle = Math.PI / 2;
    this.playerPushTimer = 0;
    this._soundCooldown = 0;
    this._bbR = this.len + this.thick;
  }

  // Считаем дверь "открытой" (для тумана войны и навигации), когда створка отошла заметно
  get open() { return this.broken || Math.abs(this.angle) > 0.4; }

  // Проблемная дверь захлопывается сама: застрявших в проёме выталкивает и оглушает
  _slam(enemies, player) {
    this.jamHits = 0;
    this.lockT = 4;
    this.angle = 0; this.omega = 0;
    const r = { x: this.x - 4, y: this.y - 4, w: this.w + 8, h: this.h + 8 };
    for (const e of enemies) {
      if (e.dead) continue;
      const inDoor = e.x < r.x + r.w && e.x + e.w > r.x && e.y < r.y + r.h && e.y + e.h > r.y;
      if (!inDoor && !this._segRect(this._seg(), e.x, e.y, e.w, e.h)) continue;
      // выталкиваем на ту сторону стены, где у него центр
      if (this.horizontal) {
        const side = e.cy() > this.y + TILE / 2 ? 1 : -1;
        e.y = side > 0 ? this.y + TILE + 3 : this.y - e.h - 3;
      } else {
        const side = e.cx() > this.x + TILE / 2 ? 1 : -1;
        e.x = side > 0 ? this.x + TILE + 3 : this.x - e.w - 3;
      }
      e._px = e.x; e._py = e.y;
      e.stun();
      if (e._path) e._path = null;
    }
    Effects.dust(this.x + this.w / 2, this.y + this.h / 2, 6);
    AudioSys.playAt('door_kick', this.hx, this.hy);
    AudioSys.playAt('door_slam', this.hx, this.hy);
  }

  // Пули и удары разбивают дверь
  damage(amount) {
    if (this.broken) return;
    this.hp -= amount;
    const s = this._seg();
    const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
    Effects.burst(mx, my, '220,160,90', 6, 140);
    this.omega += (Math.random() < 0.5 ? -1 : 1) * 2.5;
    if (this.hp <= 0) {
      this.broken = true;
      this.omega = 0;
      Effects.burst(mx, my, '230,170,100', 26, 280);
      Effects.dust(mx, my, 6);
      Effects.hitstop = Math.max(Effects.hitstop, 0.04);
      AudioSys.play('door_break');
      this._chips = [];
      for (let i = 0; i < 6; i++) this._chips.push({ x: mx + Utils.rand(-22, 22), y: my + Utils.rand(-22, 22), a: Math.random() * 3, l: Utils.rand(6, 16) });
    }
  }

  _seg(theta = this.angle) {
    const a = this.base + theta;
    return { x1: this.hx, y1: this.hy, x2: this.hx + Math.cos(a) * this.len, y2: this.hy + Math.sin(a) * this.len };
  }

  _nearBB(x, y, w, h) {
    return !(x > this.hx + this._bbR || x + w < this.hx - this._bbR ||
             y > this.hy + this._bbR || y + h < this.hy - this._bbR);
  }

  // Пересекает ли толстый отрезок прямоугольник (Лианг–Барски по расширенному AABB)
  _segRect(s, x, y, w, h) {
    const r = this.thick / 2;
    const minX = x - r, maxX = x + w + r, minY = y - r, maxY = y + h + r;
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const p = [-dx, dx, -dy, dy];
    const q = [s.x1 - minX, maxX - s.x1, s.y1 - minY, maxY - s.y1];
    let t0 = 0, t1 = 1;
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; continue; }
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  }

  blocks(px, py, pw, ph) {
    if (this.broken || !this._nearBB(px, py, pw, ph)) return false;
    return this._segRect(this._seg(), px, py, pw, ph);
  }

  blocksPoint(px, py) {
    if (this.broken || !this._nearBB(px, py, 0, 0)) return false;
    const s = this._seg();
    return Utils.segDist(s.x1, s.y1, s.x2, s.y2, px, py) < this.thick / 2 + 1;
  }

  // Толчок от сущности: (ex,ey) — её центр, (vx,vy) — скорость, с которой она давит.
  // Створка уходит от толкающего со скоростью, зависящей от силы и плеча толчка.
  push(enemies, ex, ey, vx = 0, vy = 0, byPlayer = false) {
    if (this.broken) return;
    if (!byPlayer && this.lockT > 0) return;
    if (ex === undefined) { this.omega += (Math.random() < 0.5 ? -1 : 1) * 6; return; }

    const a = this.base + this.angle;
    const dirx = Math.cos(a), diry = Math.sin(a);
    const nx = -diry, ny = dirx;
    const rx = ex - this.hx, ry = ey - this.hy;
    const side = rx * nx + ry * ny;
    const sgn = side > 0 ? -1 : 1;          // створка уходит на противоположную сторону
    const along = Utils.clamp(rx * dirx + ry * diry, 12, this.len);

    let vn = (vx * nx + vy * ny) * sgn;     // насколько сильно давим именно в створку
    if (vn < 30) vn = 30;
    const target = sgn * (vn + 10) / along * 0.7;

    if (Math.sign(this.omega) !== sgn || Math.abs(this.omega) < Math.abs(target)) {
      if (Math.abs(this.omega) < 1.2 && this._soundCooldown <= 0) {
        AudioSys.playAt('door_open', this.hx, this.hy);
        this._soundCooldown = 0.45;
        // враг снова и снова дёргает дверь — значит, где-то застрял
        if (!byPlayer && ex !== undefined) { this.jamHits++; this.jamT = 3; }
      }
      this.omega = target;
    }
    if (byPlayer) this.playerPushTimer = 0.5;
  }

  update(dt, enemies, player) {
    if (this.broken) return;
    this.lockT = Math.max(0, this.lockT - dt);
    this.jamT -= dt;
    if (this.jamT <= 0) this.jamHits = 0;
    if (this.jamHits >= 5) this._slam(enemies || [], player);
    this.playerPushTimer -= dt;
    this._soundCooldown -= dt;

    const entities = player ? [player, ...(enemies || [])] : (enemies || []);
    const cur = this._seg();

    // Если кто-то оказался внутри створки (очнулся после оглушения) — мягко отводим её
    const inside = new Set();
    for (const e of entities) {
      if (!e || e.dead || e.stunned) continue;
      if (this._segRect(cur, e.x, e.y, e.w, e.h)) {
        inside.add(e);
        this.push(null, e.x + e.w / 2, e.y + e.h / 2, 0, 0, false);
      }
    }

    if (Math.abs(this.omega) < 0.02) { this.omega = 0; return; }

    let next = this.angle + this.omega * dt;
    if (next > this.maxAngle) { next = this.maxAngle; this.omega = -this.omega * 0.25; }
    else if (next < -this.maxAngle) { next = -this.maxAngle; this.omega = -this.omega * 0.25; }

    const seg = this._seg(next);
    let blocked = false;
    for (const e of entities) {
      if (!e || e.dead || e.stunned || inside.has(e)) continue;
      if (!this._segRect(seg, e.x, e.y, e.w, e.h)) continue;
      const tipSpeed = Math.abs(this.omega) * this.len;
      // Резко распахнутая игроком дверь сбивает врага с ног (танк лишь останавливает створку)
      if (e !== player && this.playerPushTimer > 0 && tipSpeed > 170 && e.type !== 'tank') {
        e.stun();
        AudioSys.play('door_knockdown');
        Effects.burst(e.x + e.w / 2, e.y + e.h / 2, '255,200,120', 14, 220);
        Effects.hitstop = Math.max(Effects.hitstop, 0.05);
        Effects.popup(e.x + e.w / 2, e.y - 6, 'БАМ!', '#ffd319', 13);
        continue;
      }
      blocked = true;
      break;
    }

    if (blocked) this.omega = -this.omega * 0.15;
    else this.angle = next;

    this.omega *= Math.exp(-dt * 16);
  }

  draw(ctx) {
    if (this.broken) {
      // щепки выбитой двери на полу и обломок у петли
      ctx.fillStyle = '#5a3010';
      for (const c of this._chips || []) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.fillRect(-c.l / 2, -1.5, c.l, 3); ctx.restore(); }
      ctx.save(); ctx.translate(this.hx, this.hy); ctx.rotate(this.base + 0.4);
      ctx.fillStyle = '#3a1c0a'; ctx.fillRect(0, -3, 12, 6); ctx.fillStyle = '#7a4018'; ctx.fillRect(1, -2, 10, 4);
      ctx.restore();
      return;
    }
    const s = this._seg();
    const a = this.base + this.angle;
    const t = this.thick;

    // Порог в проёме
    ctx.fillStyle = '#1a120c';
    if (this.horizontal) ctx.fillRect(this.x, this.y + TILE / 2 - 3, this.w, 6);
    else ctx.fillRect(this.x + TILE / 2 - 3, this.y, 6, this.h);

    // Тень створки
    ctx.save();
    ctx.translate(this.hx + 2, this.hy + 3);
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, -t / 2, this.len, t);
    ctx.restore();

    // Створка
    ctx.save();
    ctx.translate(this.hx, this.hy);
    ctx.rotate(a);
    ctx.fillStyle = '#3a1c0a';
    ctx.fillRect(0, -t / 2, this.len, t);
    ctx.fillStyle = '#7a4018';
    ctx.fillRect(1, -t / 2 + 1, this.len - 2, t - 2);
    ctx.fillStyle = '#9a5a28';
    ctx.fillRect(2, -t / 2 + 1, this.len - 4, 1);
    ctx.fillStyle = '#4a2410';
    ctx.fillRect(this.len * 0.33, -t / 2 + 1, 1, t - 2);
    ctx.fillRect(this.len * 0.66, -t / 2 + 1, 1, t - 2);
    // Ручка с обеих сторон
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(this.len - 8, -t / 2 - 1.5, 3, 2);
    ctx.fillRect(this.len - 8, t / 2 - 0.5, 3, 2);
    ctx.restore();

    // Петля
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(this.hx, this.hy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a8a8a';
    ctx.beginPath(); ctx.arc(this.hx, this.hy, 1.5, 0, Math.PI * 2); ctx.fill();

    // Ограничитель на дальнем косяке
    ctx.fillStyle = '#0a0710';
    const ex = this.horizontal ? (this.base === 0 ? this.x + this.w - 3 : this.x) : this.x + TILE / 2 - 2;
    const ey = this.horizontal ? this.y + TILE / 2 - 2 : (this.base > 0 ? this.y + this.h - 3 : this.y);
    ctx.fillRect(ex, ey, this.horizontal ? 3 : 4, this.horizontal ? 4 : 3);
  }
}
