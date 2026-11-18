class Bullet {
  constructor(x, y, angle, speed, isPlayer, color) {
    this.x = x; this.y = y;
    if (!isFinite(angle)) angle = 0;
    if (!isFinite(speed) || speed <= 0) speed = 600;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.isPlayer = isPlayer;
    this.dead = false;
    this.life = 0.8;
    this.color = color || (isPlayer ? '#ffff88' : '#ff5555');
  }

  update(dt, level) {
    if (this.dead) return;
    if (!isFinite(dt) || dt <= 0) return;

    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (!isFinite(this.vx) || !isFinite(this.vy)) { this.dead = true; return; }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (!isFinite(this.x) || !isFinite(this.y)) { this.dead = true; return; }

    if (level.bulletHitsWall(this.x, this.y)) {
      this.dead = true;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
  }
}