// Длительность анимации удара для каждого вида холодного оружия (сек)
const MELEE_SWING = { bat: 0.34, pipe: 0.3, sword: 0.3, knife: 0.2 };

class Player {
  constructor(x, y, charId = 'dani') {
    this.x = x; this.y = y;
    this.w = 18; this.h = 18;
    this.speed = 220;
    this.maxHp = 3;
    this.hp = 3;
    this.charId = charId;

    if (charId === 'dani') this.speed *= 1.15;
    else if (charId === 'gal') { this.maxHp = 4; this.hp = 4; }
    else if (charId === 'daur') { this.maxHp = 2; this.hp = 2; }

    this.look = Sprites.HEROES[charId] || Sprites.HEROES.dani;
    this.seed = (Math.random() * 1e9) | 0;

    this.angle = 0;
    this.lastAimAngle = 0;
    this.walkPhase = 0;
    this.moveAmt = 0;
    this.animT = 0;
    this.stepTimer = 0;

    this.weapon = makeWeapon('glock');
    this.attackTimer = 0;
    this.swingTimer = 0;
    this.swingDur = 0.22;
    this.swingSide = 1;
    this.swingStab = false;
    this.punchSide = 1;
    this._pendingHit = null;
    this.flashTimer = 0;
    this.recoil = 0;
    this.dead = false;
    this.deathAngle = 0;
    this._qLock = false;
    this._thrownPickup = null;
    this.hurtCooldown = 0;
    this.isLooking = false; // Флаг для камеры
    this.particles = []; // Частицы крови
  }

  takeDamage(amount) {
    if (this.dead || this.hurtCooldown > 0) return;
    this.hurtCooldown = 0.6;
    this.hp -= amount;
    AudioSys.play('player_hurt');
    if (typeof Effects !== 'undefined') Effects.screenFlash(0.28, '255,30,60');
    if (this.hp <= 0) { this.hp = 0; this.die(); }
  }

  // Частицы обновляются отдельно, чтобы продолжать жить и после смерти игрока
  updateParticles(dt) {
    this.animT += dt;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  // Проверка: попадает ли удар по врагу (дистанция, угол и отсутствие стены между ними)
  _inMeleeArc(e, level, range, arc) {
    const d = Utils.dist(this.x, this.y, e.x, e.y);
    if (d >= range) return false;
    const aToEnemy = Math.atan2(e.y - this.y, e.x - this.x);
    let diff = Math.abs(aToEnemy - this.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff >= arc) return false;
    return level.lineOfSight(this.x + this.w / 2, this.y + this.h / 2, e.x + e.w / 2, e.y + e.h / 2);
  }

  // Удар засчитывается в момент, когда оружие проходит перед героем, а не в момент клика
  _resolveMelee(level, enemies, pickups) {
    const hit = this._pendingHit;
    this._pendingHit = null;
    if (!hit) return;
    let landed = false;
    for (const e of enemies) {
      if (e.dead) continue;
      if (hit.fists) {
        if (!this._inMeleeArc(e, level, 36, Math.PI / 2.5)) continue;
        landed = true;
        if (e.stunned) {
          e.die(pickups);
          this.particles.push(...Utils.spawnBloodParticles(e.cx(), e.cy(), 20, this.angle));
        } else {
          e.stun();
          Effects.burst(e.cx(), e.cy(), '255,255,255', 8, 120);
        }
      } else {
        if (!this._inMeleeArc(e, level, hit.range, Math.PI / 2.5)) continue;
        landed = true;
        // ВАЖНО: вторым аргументом передаём массив пикапов (а не врагов),
        // иначе дроп оружия/аптечки попадал в enemies и игра зависала.
        e.takeDamage(1, pickups);
        this.particles.push(...Utils.spawnBloodParticles(e.cx(), e.cy(), 20, this.angle));
      }
    }
    if (landed) {
      Effects.hitstop = Math.max(Effects.hitstop, 0.05);
      const fx = this.x + this.w / 2 + Math.cos(this.angle) * 22;
      const fy = this.y + this.h / 2 + Math.sin(this.angle) * 22;
      Effects.ring(fx, fy, '255,255,255', 22);
    }
  }

  update(dt, level, cam, bullets, enemies, pickups) {
    if (this.dead) return;
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);

    // Заглядывание
    this.isLooking = Input.isDown('ShiftLeft') || Input.isDown('ShiftRight');

    // Движение
    let dx = 0, dy = 0;
    if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) dx -= 1;
    if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) dx += 1;
    if (Input.isDown('KeyW') || Input.isDown('ArrowUp')) dy -= 1;
    if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) dy += 1;

    if (Input.touch.moveActive) {
      dx = Input.touch.moveX;
      dy = Input.touch.moveY;
    }

    const len = Math.hypot(dx, dy);
    if (len > 0 && len > 1) { dx /= len; dy /= len; }

    const ox = this.x, oy = this.y;
    const nx = this.x + dx * this.speed * dt;
    const ny = this.y + dy * this.speed * dt;

    // Упёрлись в створку — толкаем её: дверь открывается настолько, насколько давим
    const pushDoors = (tx, ty) => {
      for (const d of level.doors) {
        if (d.blocks(tx, ty, this.w, this.h)) {
          d.push(enemies, this.x + this.w / 2, this.y + this.h / 2, dx * this.speed, dy * this.speed, true);
        }
      }
    };
    if (!level.collides(nx, this.y, this.w, this.h)) this.x = nx;
    else pushDoors(nx, this.y);
    if (!level.collides(this.x, ny, this.w, this.h)) this.y = ny;
    else pushDoors(this.x, ny);

    // Анимация ходьбы от реально пройденного пути
    const moved = Math.hypot(this.x - ox, this.y - oy) / dt;
    const targetMove = Utils.clamp(moved / this.speed, 0, 1);
    this.moveAmt += (targetMove - this.moveAmt) * Math.min(1, dt * 12);
    this.walkPhase += dt * 13 * this.moveAmt;
    if (this.moveAmt > 0.3) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        AudioSys.play('footstep');
        Effects.dust(this.x + this.w / 2, this.y + this.h / 2 + 4, 1);
        this.stepTimer = 0.32;
      }
    } else {
      this.stepTimer = 0;
    }

    // Прицеливание
    if (Input.touch.aimActive) {
      this.angle = Math.atan2(Input.touch.aimY, Input.touch.aimX);
      this.lastAimAngle = this.angle;
    } else if (Input.touch.aimX !== 0 || Input.touch.aimY !== 0) {
      this.angle = this.lastAimAngle;
    } else {
      const mx = cam.x + Input.mouse.x / cam.zoom;
      const my = cam.y + Input.mouse.y / cam.zoom;
      this.angle = Math.atan2(my - (this.y + this.h / 2), mx - (this.x + this.w / 2));
    }
    if (!isFinite(this.angle)) this.angle = 0;

    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.swingTimer = Math.max(0, this.swingTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.recoil = Math.max(0, this.recoil - dt * 9);

    if (this._pendingHit) {
      this._pendingHit.delay -= dt;
      if (this._pendingHit.delay <= 0) this._resolveMelee(level, enemies, pickups);
    }

    if (Input.isDown('KeyQ') && !this._qLock && this.weapon) {
      this._qLock = true;
      const p = new Pickup(this.x + this.w / 2, this.y + this.h / 2, this.weapon);
      p.throwAt(this.angle, 1200);
      this._thrownPickup = p;
      this.weapon = null;
    }
    if (!Input.isDown('KeyQ')) this._qLock = false;

    let shouldShoot = Input.mouse.down;
    if (Input.touch.aimActive && !shouldShoot) {
      for (const e of enemies) {
        if (e.dead) continue;
        const dist = Utils.dist(this.x, this.y, e.x, e.y);
        if (dist < 350) {
          const aToEnemy = Math.atan2(e.y - this.y, e.x - this.x);
          let diff = Math.abs(aToEnemy - this.angle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < Math.PI / 4) { shouldShoot = true; break; }
        }
      }
    }

    if (shouldShoot && this.attackTimer <= 0) {
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      if (this.weapon) {
        this.attackTimer = this.weapon.cooldown;
        if (this.weapon.type === 'ranged') {
          if (this.weapon.ammo > 0) {
            this.weapon.ammo--;
            this.flashTimer = 0.06;
            this.recoil = 1;
            AudioSys.play(this.weapon.sound);
            level.addNoise(cx, cy, 400);

            const bx = cx + Math.cos(this.angle) * 16;
            const by = cy + Math.sin(this.angle) * 16;
            // Дробовик стреляет веером
            if (this.weapon.id === 'shotgun') {
              for (let i = 0; i < this.weapon.pellets; i++) {
                const finalAngle = this.angle + Utils.rand(-this.weapon.spread, this.weapon.spread);
                bullets.push(new Bullet(bx, by, finalAngle, this.weapon.bulletSpeed, true, this.weapon.color));
              }
            } else {
              bullets.push(new Bullet(bx, by, this.angle, this.weapon.bulletSpeed, true, this.weapon.color));
            }
            Effects.casing(cx + Math.cos(this.angle) * 8, cy + Math.sin(this.angle) * 8, this.angle, this.weapon.id === 'shotgun');
            const muz = (Sprites.WEAPON_META[this.weapon.id] || {}).muzzle || 16;
            Effects.smoke(cx + Math.cos(this.angle) * (muz + 6), cy + Math.sin(this.angle) * (muz + 6), this.angle, this.weapon.id === 'shotgun' ? 5 : 2);
          } else {
            AudioSys.play('empty_click');
          }
        } else {
          // Ближний бой: замах поочерёдно справа и слева, нож чередует выпад и взмах
          this.swingDur = MELEE_SWING[this.weapon.id] || 0.28;
          this.swingTimer = this.swingDur;
          this.swingSide = -this.swingSide;
          this.swingStab = this.weapon.id === 'knife' && this.swingSide > 0;
          AudioSys.play(this.weapon.sound);
          this._pendingHit = { delay: this.swingDur * 0.28, range: this.weapon.range };
        }
      } else {
        // Кулаки: удары левой и правой по очереди
        this.attackTimer = 0.32;
        this.swingDur = 0.22;
        this.swingTimer = this.swingDur;
        this.punchSide = -this.punchSide;
        AudioSys.play('punch');
        this._pendingHit = { delay: 0.06, fists: true };
      }
    }
  }

  // Поднять раненого напарника в корпоративе
  revive() {
    if (!this.dead) return;
    this.dead = false;
    this.hp = 1;
    this.hurtCooldown = 1.5;
    Effects.ring(this.x + this.w / 2, this.y + this.h / 2, '60,255,140', 34);
    Effects.burst(this.x + this.w / 2, this.y + this.h / 2, '120,255,170', 16, 160);
    AudioSys.play('pickup_health');
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.deathAngle = this.angle + Math.PI + Utils.rand(-0.4, 0.4);
    AudioSys.play('player_death');
    if (typeof Effects !== 'undefined') {
      Effects.bloodSplat(this.x + this.w / 2, this.y + this.h / 2, this.deathAngle, 30);
      Effects.screenFlash(0.5, '255,20,50');
    }
  }

  _animState() {
    const st = {
      t: this.animT, walk: this.walkPhase, move: this.moveAmt,
      weaponId: this.weapon ? this.weapon.id : null,
      recoil: this.recoil, flash: this.flashTimer > 0,
      hurt: this.hurtCooldown > 0.45,
    };
    if (this.swingTimer > 0) {
      const p = 1 - this.swingTimer / this.swingDur;
      if (this.weapon && this.weapon.type === 'melee') st.swing = { p, side: this.swingSide, stab: this.swingStab };
      else if (!this.weapon) st.punch = { p, side: this.punchSide };
    }
    return st;
  }

  draw(ctx) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    // Отрисовка частиц крови
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    if (this.dead) {
      ctx.fillStyle = '#5a0010';
      ctx.beginPath(); ctx.ellipse(cx, cy, 20, 14, this.deathAngle, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.blood;
      ctx.beginPath(); ctx.ellipse(cx, cy, 18, 12, this.deathAngle, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.deathAngle + Math.PI); ctx.scale(1.15, 1.15);
      Sprites.drawHumanDown(ctx, this.look, { seed: this.seed });
      ctx.restore();
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(cx + 2, cy + 4, 13, 9, this.angle, 0, Math.PI * 2); ctx.fill();

    if (this.hurtCooldown > 0 && Math.floor(this.hurtCooldown * 20) % 2 === 0) ctx.globalAlpha = 0.55;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);
    ctx.scale(1.15, 1.15);
    Sprites.drawHuman(ctx, this.look, this._animState());
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
