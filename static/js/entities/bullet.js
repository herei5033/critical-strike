class Bullet {
  constructor(x, y, angle, speed, isPlayer, color) {
    this.x = x; this.y = y;
    // Предыдущая позиция — для проверки попаданий по отрезку (Utils.segDist)
    this.px = x; this.py = y;
    this.sx = x; this.sy = y; // точка вылета — чтобы трассер не тянулся из-за ствола
    if (!isFinite(angle)) angle = 0;
    if (!isFinite(speed) || speed <= 0) speed = 600;
    if (!isPlayer && Input.isMobile) speed *= 0.85;
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

    this.px = this.x; this.py = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (!isFinite(this.x) || !isFinite(this.y)) { this.dead = true; return; }

    // Проверяем путь за кадр по шагам, чтобы пуля не проскакивала тонкие стены и двери
    const dist = Math.hypot(this.x - this.px, this.y - this.py);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const hx = this.px + (this.x - this.px) * t;
      const hy = this.py + (this.y - this.py) * t;
      if (level.bulletHitsWall(hx, hy, this.cosmetic ? null : this)) {
        this.x = hx; this.y = hy;
        this.dead = true;
        if (level.addImpact) level.addImpact(hx, hy, this.vx, this.vy);
        return;
      }
    }
  }

  draw(ctx) {
    const sp = Math.hypot(this.vx, this.vy) || 1;
    let len = 22;
    const fromStart = Math.hypot(this.x - this.sx, this.y - this.sy);
    if (fromStart < len) len = fromStart;
    const tx = this.x - (this.vx / sp) * len;
    const ty = this.y - (this.vy / sp) * len;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(tx, ty, this.x, this.y);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, this.color);
    ctx.strokeStyle = g;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(this.x, this.y); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(this.x, this.y); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(this.x, this.y, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
