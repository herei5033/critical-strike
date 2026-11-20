class Pickup {
  constructor(x, y, weapon, isHealth = false) {
    this.x = x; this.y = y;
    this.weapon = weapon;
    this.isHealth = isHealth;
    this.phase = Math.random() * Math.PI * 2;
    this.thrown = false;
    this.vx = 0; this.vy = 0;
    this.rotation = 0;
    this.spin = 0;
    this.pickedUp = false;
    this.groundTimer = 0;
    this.traveled = 0;
    this.maxDistance = 600;
    this.bounces = 0;
  }

  throwAt(angle, speed) {
    if (!isFinite(angle)) angle = 0;
    this.thrown = true;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.spin = (Math.random() - 0.5) * 30;
    this.groundTimer = 0.25;
    this.traveled = 0;
    this.bounces = 0;
    AudioSys.play('weapon_throw');
  }

  // pickups — массив пикапов (нужен, чтобы убитый врагом дропал оружие/аптечку в правильный массив)
  update(dt, level, enemies, pickups) {
    if (!isFinite(dt) || dt <= 0) return;
    if (this.pickedUp) return;
    if (this.groundTimer > 0) this.groundTimer -= dt;

    if (!this.thrown) {
      this.phase += dt * 2;
      return;
    }

    const dx = this.vx * dt;
    const dy = this.vy * dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let s = 0; s < steps; s++) {
      const nextX = this.x + stepX;
      const nextY = this.y + stepY;

      for (const e of enemies) {
        if (e.dead || e.stunned) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        if (Utils.dist(nextX, nextY, ex, ey) < 22) {
          if (this.weapon && this.weapon.type === 'melee') {
            // Брошенное холодное оружие убивает (танк теряет 1 HP)
            e.takeDamage(1, pickups, { kind: 'throw', angle: Math.atan2(this.vy, this.vx) });
            if (e.particles) e.particles.push(...Utils.spawnBloodParticles(ex, ey, 20));
          } else {
            e.stun();
          }
          this.thrown = false;
          this.vx = 0; this.vy = 0;
          this.x = ex + Utils.rand(-10, 10);
          this.y = ey + Utils.rand(-10, 10);
          this.groundTimer = 0.2;
          return;
        }
      }

      const wallX = level.isWallAt(nextX, this.y) || this._doorAt(nextX, this.y, level);
      const wallY = level.isWallAt(this.x, nextY) || this._doorAt(this.x, nextY, level);
      const wallXY = level.isWallAt(nextX, nextY) || this._doorAt(nextX, nextY, level);
      if (wallXY || (wallX && wallY)) {
        this.vx = -this.vx * 0.4; this.vy = -this.vy * 0.4; this.bounces++; break;
      } else if (wallX) {
        this.vx = -this.vx * 0.4; this.bounces++; break;
      } else if (wallY) {
        this.vy = -this.vy * 0.4; this.bounces++; break;
      } else {
        this.x = nextX;
        this.y = nextY;
        this.traveled += Math.hypot(stepX, stepY);
      }
    }

    this.rotation += this.spin * dt;
    this.vx *= 0.99;
    this.vy *= 0.99;

    if (this.bounces >= 2 || this.traveled >= this.maxDistance || Math.hypot(this.vx, this.vy) < 60) {
      this.thrown = false;
      this.vx = 0;
      this.vy = 0;
      this.groundTimer = 0.15;
    }
  }

  _doorAt(px, py, level) {
    for (const d of level.doors) {
      if (d.blocksPoint(px, py)) return true;
    }
    return false;
  }

  draw(ctx) {
    if (this.pickedUp) return;

    if (this.thrown) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(1.4, 1.4);
      if (this.isHealth) {
        ctx.scale(0.8, 0.8); Sprites.drawMedkit(ctx);
      } else {
        ctx.translate(-8, 0);
        drawWeapon(ctx, this.weapon, 0, 0, 0.85);
      }
      ctx.restore();
      return;
    }

    // на земле — без круговой подсветки: мягкая тень, покачивание, вращение и искорки
    const bob = Math.sin(this.phase * 1.5) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(this.x + 1, this.y + 6, this.weapon ? 10 : 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    if (this.isArmor) {
      Sprites.drawVest(ctx);
    } else if (this.isGrenade) {
      ctx.scale(1.6, 1.6); Sprites.drawGrenade(ctx, 0, false);
    } else if (this.isHealth) {
      Sprites.drawMedkit(ctx);
    } else {
      ctx.rotate(this.phase * 0.25);
      ctx.translate(-9, 0);
      drawWeapon(ctx, this.weapon, 0, 0, 1);
    }
    ctx.restore();

    // блики-искорки вокруг предмета
    for (let i = 0; i < 2; i++) {
      const a = this.phase * 1.3 + i * Math.PI;
      const k = (Math.sin(this.phase * 3 + i * 2) + 1) / 2;
      if (k < 0.55) continue;
      const sx = this.x + Math.cos(a) * 16, sy = this.y + Math.sin(a) * 10 + bob;
      ctx.globalAlpha = (k - 0.55) * 2.2;
      Sprites.star(ctx, sx, sy, 2.4, this.isHealth ? '#ffb0b8' : '#fff6c0');
      ctx.globalAlpha = 1;
    }
  }
}

// Отрисовка оружия: хват в (ox,oy), ствол вдоль +X. Сами спрайты — в sprites.js
function drawWeapon(ctx, w, ox, oy, scale) {
  if (!w) return;
  ctx.save();
  ctx.translate(ox, oy);
  if (scale && scale !== 1) ctx.scale(scale, scale);
  Sprites.drawWeapon(ctx, w.id, true);
  ctx.restore();
}
