// =====================================================================
// Клоны Дани.
//  • теневые (навык F, перезарядка 10 с): трое, держатся вокруг, 2 HP, пистолет, живут 5 секунд;
//  • идеальный (каждые 10 убийств): 6 HP, M4 с глушителем, ходит рядом, пока не погибнет,
//    при неполном здоровье сам бежит к ближайшей самсе.
// Пули клонов — «пули Дани»: убийства засчитываются ему.
// =====================================================================

const SHADOW_LIFE = 5;
const PERFECT_HP = 6;

class Ally {
  constructor(owner, x, y, kind, slot = 0) {
    this.owner = owner;
    this.kind = kind;                 // 'shadow' | 'perfect'
    this.slot = slot;
    this.x = x; this.y = y; this.w = 16; this.h = 16;
    this.maxHp = this.hp = kind === 'perfect' ? PERFECT_HP : 2;
    this.life = kind === 'shadow' ? SHADOW_LIFE : Infinity;
    this.weapon = prepWeapon('dani', makeWeapon(kind === 'perfect' ? 'm4s' : 'glock'));
    this.angle = owner.angle; this.walk = 0; this.move = 0; this.t = Math.random() * 10;
    this.cd = 0.3; this.hurtT = 0; this.flash = 0;
    this.dead = false; this.target = null; this._retarget = 0;
    this.speed = kind === 'perfect' ? 230 : 260;
    Effects.ring(x + 8, y + 8, kind === 'perfect' ? '255,215,80' : '150,90,255', 26);
    Effects.burst(x + 8, y + 8, kind === 'perfect' ? '255,215,80' : '120,60,220', 14, 160);
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  hit(amount) {
    if (this.dead || this.hurtT > 0) return;
    this.hp -= amount; this.hurtT = 0.4;
    Effects.burst(this.cx(), this.cy(), this.kind === 'perfect' ? '255,215,80' : '150,90,255', 8, 140);
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    Effects.ring(this.cx(), this.cy(), '150,90,255', 30);
    Effects.smoke(this.cx(), this.cy(), 0, 8);
    if (this.kind === 'perfect') Effects.popup(this.cx(), this.cy() - 16, 'КЛОН ПАЛ', '#ffd319', 11);
  }

  // Где клон хочет стоять: теневые — по кругу вокруг Дани, идеальный — чуть позади
  _home() {
    const o = this.owner, ox = o.x + o.w / 2, oy = o.y + o.h / 2;
    if (this.kind === 'perfect') return { x: ox - Math.cos(o.angle) * 34 + Math.cos(o.angle + Math.PI / 2) * 20, y: oy - Math.sin(o.angle) * 34 + Math.sin(o.angle + Math.PI / 2) * 20 };
    const a = this.t * 0.8 + this.slot * Math.PI * 2 / 3;
    return { x: ox + Math.cos(a) * 46, y: oy + Math.sin(a) * 46 };
  }

  _step(tx, ty, sp, dt, level) {
    const dx = tx - this.cx(), dy = ty - this.cy(), d = Math.hypot(dx, dy);
    if (d < 4) { this.move *= 0.8; return; }
    const k = Math.min(1, sp * dt / d);
    const nx = this.x + dx * k, ny = this.y + dy * k;
    const ox = this.x, oy = this.y;
    if (!level.collides(nx, this.y, this.w, this.h)) this.x = nx;
    if (!level.collides(this.x, ny, this.w, this.h)) this.y = ny;
    const moved = Math.hypot(this.x - ox, this.y - oy);
    this.move = Math.min(1, moved / (sp * dt + 0.001));
    this.walk += dt * 13 * this.move;
    // далеко отстал или застрял — догоняет телепортом (тени умеют)
    if (d > 520 || (moved < 0.1 && d > 160)) {
      const o = this.owner;
      if (!level.collides(o.x, o.y, this.w, this.h)) { this.x = o.x; this.y = o.y; }
    }
  }

  update(dt, game) {
    if (this.dead) return;
    const level = game.level, o = this.owner;
    this.t += dt; this.cd -= dt; this.hurtT = Math.max(0, this.hurtT - dt); this.flash = Math.max(0, this.flash - dt);
    if (this.life !== Infinity) { this.life -= dt; if (this.life <= 0) { this.die(); return; } }
    if (o.dead && this.kind === 'shadow') { this.die(); return; }

    // цель: ближайший видимый враг
    this._retarget -= dt;
    if (this._retarget <= 0 || !this.target || this.target.dead) {
      this._retarget = 0.25;
      let best = null, bd = 380;
      for (const e of game.enemies) {
        if (e.dead) continue;
        const d = Utils.dist(this.cx(), this.cy(), e.cx(), e.cy());
        if (d < bd && level.lineOfSight(this.cx(), this.cy(), e.cx(), e.cy())) { bd = d; best = e; }
      }
      this.target = best;
    }

    // идеальный клон лечится сам: идёт к ближайшей самсе
    let goal = this._home();
    if (this.kind === 'perfect' && this.hp < this.maxHp) {
      let bp = null, bd = 420;
      for (const p of game.pickups) {
        if (!p.isHealth || p.pickedUp || p.thrown) continue;
        const d = Utils.dist(this.cx(), this.cy(), p.x, p.y);
        if (d < bd) { bd = d; bp = p; }
      }
      if (bp) {
        goal = { x: bp.x, y: bp.y };
        if (bd < 18) {
          bp.pickedUp = true; this.hp = Math.min(this.maxHp, this.hp + 1);
          AudioSys.play('pickup_health', 0.6);
          Effects.popup(this.cx(), this.cy() - 14, '+1 HP КЛОНУ', '#3dff8a', 10);
        }
      }
    }
    this._step(goal.x, goal.y, this.speed, dt, level);

    // прицел и стрельба
    if (this.target) {
      const want = Math.atan2(this.target.cy() - this.cy(), this.target.cx() - this.cx());
      let da = want - this.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      this.angle += Utils.clamp(da, -dt * 9, dt * 9);
      if (this.cd <= 0 && Math.abs(da) < 0.25) {
        const w = this.weapon;
        this.cd = w.cooldown * (this.kind === 'shadow' ? 2.8 : 2.0);
        const a = this.angle + Utils.rand(-0.1, 0.1);
        const b = new Bullet(this.cx() + Math.cos(a) * 14, this.cy() + Math.sin(a) * 14, a, w.bulletSpeed, true, this.kind === 'shadow' ? '#b48aff' : w.color);
        b.src = w.id; b.dmg = 1; b.owner = 'dani';
        game.bullets.push(b);
        this.flash = 0.06;
        AudioSys.playAt(w.sound, this.cx(), this.cy(), 700);
        if (!w.silent) game.level.addNoise(this.cx(), this.cy(), 300);
      }
    } else {
      const ha = o.angle;
      let da = ha - this.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      this.angle += da * Math.min(1, dt * 5);
    }
  }

  draw(ctx) {
    if (this.dead) return;
    const cx = this.cx(), cy = this.cy();
    ctx.save();
    if (this.kind === 'shadow') {
      // тень: полупрозрачный фиолетовый силуэт, мерцает перед исчезновением
      const fade = this.life < 1 ? (Math.sin(this.t * 30) > 0 ? 0.25 : 0.55) : 0.6;
      ctx.globalAlpha = fade;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(140,80,255,0.35)';
      ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.strokeStyle = 'rgba(255,215,80,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, 14, 10, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.hurtT > 0 && Math.floor(this.hurtT * 20) % 2 === 0) ctx.globalAlpha *= 0.5;
    ctx.translate(cx, cy); ctx.rotate(this.angle); ctx.scale(1.05, 1.05);
    const look = this.kind === 'shadow' ? Ally.shadowLook() : Sprites.HEROES.dani;
    Sprites.drawHuman(ctx, look, { t: this.t, walk: this.walk, move: this.move, weaponId: this.weapon.id, flash: this.flash > 0 });
    ctx.restore();
    // здоровье идеального клона
    if (this.kind === 'perfect') {
      for (let i = 0; i < this.maxHp; i++) {
        ctx.fillStyle = i < this.hp ? '#ffd319' : 'rgba(255,255,255,0.2)';
        ctx.fillRect(cx - this.maxHp * 3 + i * 6 + 1, cy - 20, 4, 3);
      }
    } else {
      ctx.fillStyle = 'rgba(180,140,255,0.8)';
      ctx.fillRect(cx - 8, cy - 18, 16 * Math.max(0, this.life / SHADOW_LIFE), 2);
    }
  }

  // Тёмная «теневая» версия Дани
  static shadowLook() {
    if (!Ally._shadow) {
      const d = Sprites.HEROES.dani;
      Ally._shadow = { ...d, skin: '#3a2a5a', skinDk: '#241a3a', hair: '#0a0612', jacket: '#1a1030', jacketDk: '#0c0818', shirt: '#2a1a4a', tee: '#3a2a5a', pants: '#140c22', shoes: '#05030a', knit: '#0a0612', cuff: '#0a0612' };
    }
    return Ally._shadow;
  }
}
