class Door {
  constructor(x, y, horizontal, lenTiles = 1) {
    this.lenTiles = lenTiles;
    // Дверь занимает ОДНУ клетку стены по толщине и lenTiles клеток по длине.
    // Раньше h/w были TILE*lenTiles в обе стороны, из-за чего дверь и её хитбокс
    // сдвигались на клетку в комнату, а граф комнат (_buildRoomGraph) не находил соседей.
    this.w = horizontal ? TILE * lenTiles : TILE;
    this.h = horizontal ? TILE : TILE * lenTiles;
    this.x = x; this.y = y;
    this.horizontal = horizontal;
    this.open = false;
    this.stunRadius = 40 + (lenTiles - 1) * 16;
    this.swing = 0;
  }

  _hitRect() {
    const thick = 12;
    if (this.horizontal) {
      return { x: this.x, y: this.y + this.h / 2 - thick / 2, w: this.w, h: thick };
    }
    return { x: this.x + this.w / 2 - thick / 2, y: this.y, w: thick, h: this.h };
  }

  blocks(px, py, pw, ph) {
    if (this.open) return false;
    const r = this._hitRect();
    return (px < r.x + r.w && px + pw > r.x &&
            py < r.y + r.h && py + ph > r.y);
  }

  blocksPoint(px, py) {
    if (this.open) return false;
    const r = this._hitRect();
    return (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h);
  }

  push(enemies) {
    if (this.open) return;
    this.open = true;
    if (Array.isArray(enemies)) {
      for (const e of enemies) {
        if (e.dead || e.stunned) continue;
        if (Utils.dist(e.x + e.w/2, e.y + e.h/2, this.x + this.w/2, this.y + this.h/2) < this.stunRadius) {
          e.stun();
        }
      }
    }
    AudioSys.play('door_open');
  }

  update(dt) {
    const target = this.open ? 1 : 0;
    this.swing += (target - this.swing) * Math.min(1, dt * 15);
  }

  draw(ctx) {
    const thick = 12;
    ctx.fillStyle = '#05030a';
    if (this.horizontal) {
      ctx.fillRect(this.x, this.y + this.h / 2 - thick / 2, this.w, thick);
    } else {
      ctx.fillRect(this.x + this.w / 2 - thick / 2, this.y, thick, this.h);
    }

    ctx.save();
    if (this.horizontal) {
      ctx.translate(this.x, this.y + this.h / 2);
      ctx.rotate(this.swing * (Math.PI / 2));
      ctx.fillStyle = '#6a3010';
      ctx.fillRect(0, -4, this.w, 8);
      if (this.swing > 0.1) {
        ctx.fillStyle = '#8a4015';
        ctx.fillRect(0, -4, 4, 8);
      }
      ctx.fillStyle = '#d0b050';
      ctx.fillRect(this.w - 6, -1, 4, 2);
    } else {
      ctx.translate(this.x + this.w / 2, this.y);
      ctx.rotate(this.swing * (Math.PI / 2));
      ctx.fillStyle = '#6a3010';
      ctx.fillRect(-4, 0, 8, this.h);
      if (this.swing > 0.1) {
        ctx.fillStyle = '#8a4015';
        ctx.fillRect(-4, 0, 8, 4);
      }
      ctx.fillStyle = '#d0b050';
      ctx.fillRect(-1, this.h - 6, 2, 4);
    }
    ctx.restore();
  }
}
