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
  }

  update(dt, level, enemies) {
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
          e.stun();
          this.thrown = false;
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
        this.vx = -this.vx * 0.4;
        this.vy = -this.vy * 0.4;
        this.bounces++;
        break;
      } else if (wallX) {
        this.vx = -this.vx * 0.4;
        this.bounces++;
        break;
      } else if (wallY) {
        this.vy = -this.vy * 0.4;
        this.bounces++;
        break;
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
      ctx.fillStyle = 'rgba(255, 230, 100, 0.3)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(1.4, 1.4);
      if (this.isHealth) {
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-6, -6, 12, 12);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillRect(-6, -2, 12, 4);
      } else {
        drawWeapon(ctx, this.weapon, 0, 0, 1);
      }
      ctx.restore();
      return;
    }

    const pulse = (Math.sin(this.phase) + 1) * 0.5;
    ctx.fillStyle = this.isHealth ? `rgba(255, 68, 68, ${0.35 + pulse * 0.4})` : `rgba(255, 230, 100, ${0.35 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.isHealth ? `rgba(255, 200, 200, ${0.15 + pulse * 0.2})` : `rgba(255, 255, 200, ${0.15 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fill();

    const bob = Math.sin(this.phase * 1.5) * 2;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    if (this.isHealth) {
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
    } else {
      ctx.rotate(this.phase * 0.25);
      ctx.scale(1.4, 1.4);
      drawWeapon(ctx, this.weapon, 0, 0, 1);
    }
    ctx.restore();
  }
}

function drawWeapon(ctx, w, ox, oy, scale) {
  if (!w) return;
  ctx.save();
  ctx.translate(ox, oy);
  if (scale && scale !== 1) ctx.scale(scale, scale);

  if (w.id === 'm4') {
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-7, -3, 7, 6);
    ctx.fillStyle = '#333';    ctx.fillRect(-7, -2, 3, 4);
    ctx.fillStyle = '#666';    ctx.fillRect(0, -2, 26, 4);
    ctx.fillStyle = '#888';    ctx.fillRect(4, -2, 14, 4);
    ctx.fillStyle = '#222';    ctx.fillRect(8, -3, 2, 2); ctx.fillRect(18, -3, 2, 2);
    ctx.fillStyle = '#444';    ctx.fillRect(10, 2, 4, 8);
    ctx.fillStyle = '#111';    ctx.fillRect(10, 8, 4, 2);
    ctx.fillStyle = '#555';    ctx.fillRect(-2, 2, 3, 5);
  } else if (w.id === 'ak47') {
    ctx.fillStyle = '#3d2817'; ctx.fillRect(-7, -3, 7, 6);
    ctx.fillStyle = '#d9a05b'; ctx.fillRect(0, -2, 22, 4);
    ctx.fillStyle = '#b07a3a'; ctx.fillRect(4, -2, 8, 4);
    ctx.fillStyle = '#222';    ctx.fillRect(12, 2, 5, 8);
    ctx.fillStyle = '#444';    ctx.fillRect(12, 7, 5, 3);
    ctx.fillStyle = '#222';    ctx.fillRect(18, -3, 2, 2);
    ctx.fillStyle = '#555';    ctx.fillRect(-2, 2, 3, 5);
  } else if (w.id === 'glock') {
    ctx.fillStyle = '#888';    ctx.fillRect(0, -2, 16, 4);
    ctx.fillStyle = '#bbb';    ctx.fillRect(4, -2, 10, 4);
    ctx.fillStyle = '#666';    ctx.fillRect(-2, -3, 5, 6);
    ctx.fillStyle = '#111';    ctx.fillRect(-2, 1, 6, 7);
    ctx.fillStyle = '#333';    ctx.fillRect(2, 2, 4, 2);
    ctx.fillStyle = '#aaa';    ctx.fillRect(0, -3, 2, 2);
  } else if (w.id === 'uzi') {
    ctx.fillStyle = '#333';    ctx.fillRect(-3, -3, 16, 6);
    ctx.fillStyle = '#ff77dd'; ctx.fillRect(0, -2, 13, 4);
    ctx.fillStyle = '#222';    ctx.fillRect(11, -2, 6, 4);
    ctx.fillStyle = '#111';    ctx.fillRect(2, 2, 4, 9);
    ctx.fillRect(-3, 2, 4, 5);
    ctx.fillStyle = '#555';    ctx.fillRect(5, -4, 6, 2);
  } else if (w.id === 'shotgun') {
    ctx.fillStyle = '#3d2817'; ctx.fillRect(-8, -3, 8, 6);
    ctx.fillStyle = '#666';    ctx.fillRect(0, -3, 28, 6);
    ctx.fillStyle = '#888';    ctx.fillRect(4, -2, 20, 4);
    ctx.fillStyle = '#444';    ctx.fillRect(8, 2, 6, 6);
    ctx.fillStyle = '#222';    ctx.fillRect(22, -4, 4, 8);
  } else if (w.id === 'bat') {
    ctx.fillStyle = '#3d2817'; ctx.fillRect(-5, -1, 9, 2);
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(0, -2, 22, 4);
    ctx.fillStyle = '#a0622b'; ctx.fillRect(16, -3, 8, 6);
    ctx.fillStyle = '#8a5430'; ctx.fillRect(18, -2, 4, 4);
  } else if (w.id === 'pipe') {
    ctx.fillStyle = '#666';    ctx.fillRect(0, -2, 20, 4);
    ctx.fillStyle = '#999';    ctx.fillRect(2, -2, 16, 4);
    ctx.fillStyle = '#bbb';    ctx.fillRect(18, -2, 3, 4);
    ctx.fillStyle = '#444';    ctx.fillRect(0, -2, 2, 4);
  } else if (w.id === 'knife') {
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-5, -2, 6, 4);
    ctx.fillStyle = '#777';    ctx.fillRect(0, -3, 2, 6);
    ctx.fillStyle = '#ddd';    ctx.fillRect(2, -1, 9, 2);
    ctx.fillStyle = '#fff';    ctx.fillRect(2, -1, 9, 1);
  } else if (w.id === 'sword') {
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-7, -2, 7, 4);
    ctx.fillStyle = '#c0a040'; ctx.fillRect(0, -5, 2, 10);
    ctx.fillStyle = '#e8e8ff'; ctx.fillRect(2, -2, 22, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(2, -2, 22, 1);
    ctx.fillStyle = '#dddddd';
    ctx.beginPath();
    ctx.moveTo(24, -2);
    ctx.lineTo(28, 0);
    ctx.lineTo(24, 2);
    ctx.fill();
  }

  ctx.restore();
}