// Игровые эффекты: гильзы, кровь на полу, дым, пыль, всплывающие очки, вспышки экрана, хитстоп.
const Effects = {
  casings: [], floorBlood: [], smokeParts: [], dustParts: [], popups: [], bursts: [], rings: [],
  flash: 0, flashColor: '255,255,255', hitstop: 0,

  reset() {
    this.casings = []; this.floorBlood = []; this.smokeParts = []; this.dustParts = [];
    this.popups = []; this.bursts = []; this.rings = [];
    this.flash = 0; this.hitstop = 0;
  },

  // Гильза вылетает вправо от стрелка
  casing(x, y, angle, shell = false) {
    const a = angle + Math.PI / 2 + Utils.rand(-0.5, 0.5);
    const sp = Utils.rand(60, 130);
    this.casings.push({
      x, y, vx: Math.cos(a) * sp - Math.cos(angle) * 20, vy: Math.sin(a) * sp - Math.sin(angle) * 20,
      z: 7, vz: Utils.rand(50, 90), rot: Math.random() * Math.PI * 2, spin: Utils.rand(-25, 25), shell, rest: false,
    });
    if (this.casings.length > 320) {
      const i = this.casings.findIndex(c => c.rest);
      this.casings.splice(i >= 0 ? i : 0, 1);
    }
  },

  smoke(x, y, angle, n = 3) {
    for (let i = 0; i < n; i++) {
      const a = angle + Utils.rand(-0.5, 0.5);
      const sp = Utils.rand(15, 45);
      this.smokeParts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Utils.rand(2, 4), life: Utils.rand(0.5, 0.9), max: 0.9 });
    }
  },

  dust(x, y, n = 2) {
    for (let i = 0; i < n; i++) {
      this.dustParts.push({ x: x + Utils.rand(-4, 4), y: y + Utils.rand(-4, 4), vx: Utils.rand(-12, 12), vy: Utils.rand(-12, 12), r: Utils.rand(1.5, 3), life: 0.45, max: 0.45 });
    }
    if (this.dustParts.length > 120) this.dustParts.splice(0, this.dustParts.length - 120);
  },

  // Брызги крови, остающиеся на полу
  bloodSplat(x, y, angle, count) {
    const n = Math.min(10, Math.ceil(count / 2.5));
    for (let i = 0; i < n; i++) {
      const a = (angle !== null && angle !== undefined) ? angle + Utils.rand(-0.7, 0.7) : Utils.rand(0, Math.PI * 2);
      const d = Utils.rand(3, 30);
      const r = Utils.rand(1.2, 4.2) * (1 - d / 45);
      this.floorBlood.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, rx: r * Utils.rand(1.2, 2.6), ry: r, rot: a, a: Utils.rand(0.55, 0.9) });
    }
    if (this.floorBlood.length > 900) this.floorBlood.splice(0, this.floorBlood.length - 900);
  },

  popup(x, y, text, color = '#ffd319', size = 14) {
    this.popups.push({ x, y, text, color, size, life: 1.1, max: 1.1 });
  },

  burst(x, y, color = '255,220,120', n = 10, speed = 160) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Utils.rand(speed * 0.3, speed);
      this.bursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Utils.rand(0.2, 0.45), max: 0.45, color });
    }
  },

  ring(x, y, color = '255,255,255', r = 26) {
    this.rings.push({ x, y, r0: 4, r1: r, life: 0.3, max: 0.3, color });
  },

  screenFlash(amount = 0.25, color = '255,255,255') {
    this.flash = Math.max(this.flash, amount);
    this.flashColor = color;
  },

  update(dt, level) {
    this.flash = Math.max(0, this.flash - dt * 2.2);

    for (const c of this.casings) {
      if (c.rest) continue;
      c.vz -= 420 * dt;
      c.z += c.vz * dt;
      const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
      if (level && level.isWallAt && level.isWallAt(nx, ny)) { c.vx *= -0.4; c.vy *= -0.4; }
      else { c.x = nx; c.y = ny; }
      c.rot += c.spin * dt;
      if (c.z <= 0) {
        c.z = 0;
        c.vz = -c.vz * 0.35;
        c.vx *= 0.55; c.vy *= 0.55; c.spin *= 0.5;
        if (Math.abs(c.vz) < 18) { c.rest = true; c.vz = 0; }
      }
    }
    const step = (arr, damp) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= damp; p.vy *= damp;
        if (p.r !== undefined) p.r += dt * 9;
        p.life -= dt;
        if (p.life <= 0) arr.splice(i, 1);
      }
    };
    step(this.smokeParts, 0.93);
    step(this.dustParts, 0.9);
    step(this.bursts, 0.88);
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y -= dt * 34; p.life -= dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].life -= dt;
      if (this.rings[i].life <= 0) this.rings.splice(i, 1);
    }
  },

  _drawCasing(ctx, c) {
    ctx.save();
    ctx.translate(c.x, c.y - c.z);
    ctx.rotate(c.rot);
    if (c.shell) {
      ctx.fillStyle = '#c82a2a'; ctx.fillRect(-2.4, -1, 3.4, 2);
      ctx.fillStyle = '#d0a040'; ctx.fillRect(1, -1, 1.4, 2);
    } else {
      ctx.fillStyle = '#d8a83a'; ctx.fillRect(-1.6, -0.6, 3.2, 1.2);
      ctx.fillStyle = '#fff0a0'; ctx.fillRect(-1.6, -0.6, 3.2, 0.4);
    }
    ctx.restore();
  },

  // Слой на полу (под персонажами)
  drawFloor(ctx) {
    for (const b of this.floorBlood) {
      ctx.globalAlpha = b.a;
      ctx.fillStyle = '#5a0010';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.rx + 0.8, b.ry + 0.8, b.rot, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a80018';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.rx, b.ry, b.rot, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const c of this.casings) if (c.rest) this._drawCasing(ctx, c);
  },

  // Слой поверх персонажей
  drawTop(ctx) {
    for (const c of this.casings) {
      if (c.rest) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(c.x - 1.5, c.y - 0.6, 3, 1.2);
      this._drawCasing(ctx, c);
    }
    for (const d of this.dustParts) {
      ctx.fillStyle = `rgba(180,170,190,${0.25 * d.life / d.max})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    for (const s of this.smokeParts) {
      ctx.fillStyle = `rgba(200,200,210,${0.22 * s.life / s.max})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bursts) {
      const k = b.life / b.max;
      ctx.strokeStyle = `rgba(${b.color},${k})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.stroke();
    }
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.strokeStyle = `rgba(${r.color},${0.8 * (1 - k)})`; ctx.lineWidth = 2.5 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * k, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    for (const p of this.popups) {
      const k = p.life / p.max;
      const s = p.size * (k > 0.85 ? 1 + (k - 0.85) * 3 : 1);
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `bold ${s}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = '#05030a';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  },

  // Полноэкранная вспышка
  drawScreen(ctx, W, H) {
    if (this.flash <= 0) return;
    ctx.fillStyle = `rgba(${this.flashColor},${this.flash})`;
    ctx.fillRect(0, 0, W, H);
  },
};
