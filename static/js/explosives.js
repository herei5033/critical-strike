// Гранаты, ракеты РПГ, огнемёт и взрывы.
// Урон считает одиночная игра или хост; у клиентов корпоратива всё это — только картинка.

let _exId = 1;

const Explosives = {
  // Взрыв: урон по врагам и игрокам, разрушение мебели, дверей и окон
  explode(game, x, y, r, opts = {}) {
    const level = game.level;
    Effects.screenFlash(0.3, '255,200,120');
    Effects.ring(x, y, '255,220,140', r);
    Effects.ring(x, y, '255,120,40', r * 0.6);
    Effects.burst(x, y, '255,180,60', 40, 380);
    Effects.burst(x, y, '255,90,30', 20, 240);
    Effects.smoke(x, y, 0, 14);
    Effects.dust(x, y, 10);
    Effects.hitstop = Math.max(Effects.hitstop, 0.06);
    game.shake = Math.max(game.shake || 0, 1);
    game.chromaticOffset = 8;
    AudioSys.play('shoot_shotgun');
    AudioSys.play('tank_hit');
    if (level && level.decals) {
      level.decals.push({ kind: 'scorch', x, y, r: r * 0.55, seed: (x * 31 + y * 7) | 0, rot: 0 });
      if (level._redrawRegion) level._redrawRegion(x - r, y - r, x + r, y + r, 0);
    }
    if (opts.cosmetic) return;

    game.explosions = game.explosions || [];
    game.explosions.push({ id: _exId++, x: Math.round(x), y: Math.round(y), r, t: performance.now() });
    if (game.explosions.length > 20) game.explosions.shift();
    if (level.addNoise) level.addNoise(x, y, 700);

    const sees = (tx, ty) => !level.lineOfSight || level.lineOfSight(x, y, tx, ty);
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = Utils.dist(x, y, e.cx(), e.cy());
      const cause = { kind: 'explosion', angle: Math.atan2(e.cy() - y, e.cx() - x), by: opts.by };
      if (d < r && sees(e.cx(), e.cy())) {
        e.takeDamage(e.isBoss ? (d < r * 0.5 ? 6 : 4) : 3, game.pickups, cause);
      } else if (d < r * 1.5 && !e.isBoss) e.stun();
    }
    for (const p of game.allPlayers ? game.allPlayers() : [game.player]) {
      if (!p || p.dead) continue;
      const d = Utils.dist(x, y, p.x + p.w / 2, p.y + p.h / 2);
      if (d < r * 0.85 && sees(p.x + 9, p.y + 9)) p.takeDamage(d < r * 0.4 ? 2 : 1, { kind: 'explosion', angle: Math.atan2(p.y + 9 - y, p.x + 9 - x) });
    }
    if (level.furniture) {
      level.furniture.forEach((f, i) => { if (!f.destroyed && f.hp > 0 && Utils.dist(x, y, f.x, f.y) < r + 10) level.damageFurniture(i, 8, f.x, f.y); });
      level.windows.forEach((w, i) => { if (!w.broken && Utils.dist(x, y, (w.x + 0.5) * TILE, (w.y + 0.5) * TILE) < r) level.damageWindow(i); });
      level.doors.forEach((dr, i) => { if (!dr.broken && Utils.dist(x, y, dr.hx, dr.hy) < r + 20) level.damageDoor(i, 10); });
    }
  },
};

// Осколочная граната: летит по дуге, отскакивает от стен, взрывается через 1.8 сек
class Grenade {
  constructor(x, y, vx, vy, by) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.z = 8; this.vz = 120;
    this.fuse = 1.8; this.t = 0; this.rot = 0;
    this.by = by; this.dead = false; this.kind = 'grenade';
    AudioSys.play('throw');
  }

  update(dt, game) {
    const level = game.level;
    this.t += dt;
    this.fuse -= dt;
    this.vz -= 380 * dt;
    this.z += this.vz * dt;
    if (this.z <= 0) { this.z = 0; this.vz = Math.abs(this.vz) > 40 ? -this.vz * 0.4 : 0; this.vx *= 0.7; this.vy *= 0.7; }
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (level.isWallAt(nx, this.y) || this._door(level, nx, this.y)) { this.vx *= -0.55; } else this.x = nx;
    if (level.isWallAt(this.x, ny) || this._door(level, this.x, ny)) { this.vy *= -0.55; } else this.y = ny;
    const k = Math.exp(-dt * (this.z > 0 ? 0.6 : 3));
    this.vx *= k; this.vy *= k;
    this.rot += (Math.abs(this.vx) + Math.abs(this.vy)) * dt * 0.08;
    if (this.fuse <= 0) {
      this.dead = true;
      if (!game._cosmeticProjectiles) Explosives.explode(game, this.x, this.y, 96, { by: this.by });
    }
  }

  _door(level, x, y) { for (const d of level.doors) if (d.blocksPoint(x, y)) return true; return false; }

  draw(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(this.x + 2, this.y + 3, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(this.x, this.y - this.z);
    ctx.rotate(this.rot);
    ctx.scale(1.2, 1.2);
    Sprites.drawGrenade(ctx, this.t, true);
    ctx.restore();
    if (this.fuse < 0.6 && Math.sin(this.t * 40) > 0) {
      ctx.fillStyle = 'rgba(255,40,40,0.25)';
      ctx.beginPath(); ctx.arc(this.x, this.y, 96, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// Ракета РПГ: летит прямо, взрывается от первой преграды или врага
class Rocket {
  constructor(x, y, a, by) {
    this.x = x; this.y = y; this.a = a;
    this.vx = Math.cos(a) * 430; this.vy = Math.sin(a) * 430;
    this.by = by; this.dead = false; this.t = 0; this.kind = 'rocket';
  }

  update(dt, game) {
    const level = game.level;
    this.t += dt;
    // разгон
    const sp = Math.min(760, 430 + this.t * 900);
    this.vx = Math.cos(this.a) * sp; this.vy = Math.sin(this.a) * sp;
    const steps = Math.max(1, Math.ceil(sp * dt / 6));
    for (let i = 0; i < steps; i++) {
      const nx = this.x + this.vx * dt / steps, ny = this.y + this.vy * dt / steps;
      let hit = level.isWallAt(nx, ny) || this.t > 3;
      if (!hit) for (const d of level.doors) if (d.blocksPoint(nx, ny)) { hit = true; break; }
      if (!hit && !game._cosmeticProjectiles) for (const e of game.enemies) if (!e.dead && Utils.dist(nx, ny, e.cx(), e.cy()) < (e.isBoss ? 18 : 13)) { hit = true; break; }
      if (hit) {
        this.dead = true;
        if (!game._cosmeticProjectiles) Explosives.explode(game, this.x, this.y, 112, { by: this.by });
        return;
      }
      this.x = nx; this.y = ny;
    }
    if (Math.random() < 0.8) Effects.smoke(this.x - Math.cos(this.a) * 10, this.y - Math.sin(this.a) * 10, this.a + Math.PI, 1);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.a);
    // факел двигателя
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(-12, 0, 0, -12, 0, 12);
    g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(1, 'rgba(255,100,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-12, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.scale(1.3, 1.3);
    Sprites.drawRocket(ctx);
    ctx.restore();
  }
}

// Струя огнемёта: частицы огня; damaging=false — только картинка
const Flames = {
  list: [],
  reset() { this.list = []; },

  spawn(x, y, a, damaging, by) {
    for (let i = 0; i < 2; i++) {
      const aa = a + Utils.rand(-0.16, 0.16);
      const sp = Utils.rand(240, 320);
      this.list.push({ x, y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: Utils.rand(0.38, 0.5), max: 0.5, r: 3, dmg: damaging, by });
    }
    if (this.list.length > 500) this.list.splice(0, this.list.length - 500);
  },

  update(dt, game) {
    const level = game.level;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (level.isWallAt(nx, ny)) { p.vx *= -0.2; p.vy *= -0.2; p.life = Math.min(p.life, 0.12); }
      else { p.x = nx; p.y = ny; }
      p.vx *= Math.exp(-dt * 2.4); p.vy *= Math.exp(-dt * 2.4);
      p.r += dt * 26;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      if (!p.dmg) continue;
      for (const e of game.enemies) {
        if (e.dead || (e._burnCd || 0) > 0) continue;
        if (Utils.dist(p.x, p.y, e.cx(), e.cy()) < p.r + 7) {
          e._burnCd = 0.22;
          e.takeDamage(1, game.pickups, { kind: 'burn', angle: Math.atan2(p.vy, p.vx), by: p.by });
          Effects.burst(e.cx(), e.cy(), '255,140,40', 4, 120);
        }
      }
      if (Math.random() < 0.04 && level.itemGrid) {
        const idx = level.itemGrid[Math.floor(p.y / TILE) * level.cols + Math.floor(p.x / TILE)];
        if (idx >= 0) level.damageFurniture(idx, 1, p.x, p.y);
      }
    }
    for (const e of game.enemies) if (e._burnCd > 0) e._burnCd -= dt;
  },

  draw(ctx) {
    if (!this.list.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      const k = p.life / p.max;
      const col = k > 0.7 ? `255,240,170` : k > 0.4 ? `255,150,40` : `200,50,20`;
      ctx.fillStyle = `rgba(${col},${0.55 * k + 0.1})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },
};
