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

    this.angle = 0;
    this.lastAimAngle = 0;
    this.walkPhase = 0;
    this.stepTimer = 0;

    this.weapon = makeWeapon('glock');
    this.attackTimer = 0;
    this.swingTimer = 0;
    this.flashTimer = 0;
    this.dead = false;
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
    if (this.hp <= 0) { this.hp = 0; this.die(); }
  }

  // Частицы обновляются отдельно, чтобы продолжать жить и после смерти игрока
  updateParticles(dt) {
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
    if (len > 0) {
      if (len > 1) { dx /= len; dy /= len; }
      this.walkPhase += dt * 12;

      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        AudioSys.play('footstep');
        this.stepTimer = 0.35;
      }
    } else {
      this.walkPhase = 0;
      this.stepTimer = 0;
    }

    const nx = this.x + dx * this.speed * dt;
    const ny = this.y + dy * this.speed * dt;

    if (!level.collides(nx, this.y, this.w, this.h)) this.x = nx;
    else {
      for (const d of level.doors) {
        if (!d.open && d.blocks(nx, this.y, this.w, this.h)) { d.push(enemies); break; }
      }
    }
    if (!level.collides(this.x, ny, this.w, this.h)) this.y = ny;
    else {
      for (const d of level.doors) {
        if (!d.open && d.blocks(this.x, ny, this.w, this.h)) { d.push(enemies); break; }
      }
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
      if (this.weapon) {
        this.attackTimer = this.weapon.cooldown;
        if (this.weapon.type === 'ranged') {
          if (this.weapon.ammo > 0) {
            this.weapon.ammo--;
            this.flashTimer = 0.06;
            AudioSys.play(this.weapon.sound);
            level.addNoise(this.x + this.w/2, this.y + this.h/2, 400);

            // Дробовик стреляет веером
            if (this.weapon.id === 'shotgun') {
              for (let i = 0; i < this.weapon.pellets; i++) {
                const angleOffset = Utils.rand(-this.weapon.spread, this.weapon.spread);
                const finalAngle = this.angle + angleOffset;
                const bx = this.x + this.w / 2 + Math.cos(this.angle) * 16;
                const by = this.y + this.h / 2 + Math.sin(this.angle) * 16;
                bullets.push(new Bullet(bx, by, finalAngle, this.weapon.bulletSpeed, true, this.weapon.color));
              }
            } else {
              const bx = this.x + this.w / 2 + Math.cos(this.angle) * 16;
              const by = this.y + this.h / 2 + Math.sin(this.angle) * 16;
              bullets.push(new Bullet(bx, by, this.angle, this.weapon.bulletSpeed, true, this.weapon.color));
            }
          } else {
            AudioSys.play('empty_click');
          }
        } else {
          // Ближний бой
          this.swingTimer = 0.22;
          AudioSys.play(this.weapon.sound);
          for (const e of enemies) {
            if (e.dead) continue;
            if (this._inMeleeArc(e, level, this.weapon.range, Math.PI / 2.5)) {
              // ВАЖНО: вторым аргументом передаём массив пикапов (а не врагов),
              // иначе дроп оружия/аптечки попадал в enemies и игра зависала.
              e.takeDamage(1, pickups);
              this.particles.push(...Utils.spawnBloodParticles(e.x, e.y, 20, this.angle));
            }
          }
        }
      } else {
        // Кулаки
        this.attackTimer = 0.35;
        this.swingTimer = 0.22;
        AudioSys.play('punch');
        for (const e of enemies) {
          if (e.dead) continue;
          if (this._inMeleeArc(e, level, 36, Math.PI / 2.5)) {
            if (e.stunned) {
              e.die(pickups);
              this.particles.push(...Utils.spawnBloodParticles(e.x, e.y, 20, this.angle));
            } else {
              e.stun();
            }
          }
        }
      }
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    AudioSys.play('player_death');
  }

  draw(ctx) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    // Отрисовка частиц крови
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    let bodyColor = P.player, bodyDk = P.playerDk, hairColor = '#1a1a1a', skinColor = '#f2c89b';
    if (this.charId === 'dani') { bodyColor = '#2a4a7a'; bodyDk = '#1a2a4a'; hairColor = '#111'; }
    else if (this.charId === 'gal') { bodyColor = '#7a2a2a'; bodyDk = '#4a1a1a'; skinColor = '#e8b48a'; }
    else if (this.charId === 'daur') { bodyColor = '#2a2a2a'; bodyDk = '#111'; hairColor = '#0a0a0a'; }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 4, 14, 6, 0, 0, Math.PI * 2); ctx.fill();

    if (this.dead) {
      ctx.fillStyle = P.blood;
      ctx.beginPath(); ctx.ellipse(cx, cy, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 2); ctx.scale(1.1, 1.1);
      ctx.fillStyle = bodyDk; ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = skinColor; ctx.beginPath(); ctx.arc(14, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); return;
    }

    if (this.hurtCooldown > 0 && Math.floor(this.hurtCooldown * 20) % 2 === 0) ctx.globalAlpha = 0.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);
    ctx.scale(1.2, 1.2);

    const legSwing = Math.sin(this.walkPhase) * 3;
    ctx.fillStyle = '#2a1a2a';
    ctx.fillRect(-8, -5 + legSwing, 6, 4);
    ctx.fillRect(-8, 1 - legSwing, 6, 4);

    ctx.fillStyle = skinColor; ctx.fillRect(4, -9, 10, 4);
    ctx.fillStyle = bodyDk; ctx.beginPath(); ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bodyColor; ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2); ctx.fill();

    if (this.charId === 'dani') {
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(2, -4, 4, 2); ctx.fillRect(2, 2, 4, 2);
    } else if (this.charId === 'gal') {
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(2, 0, 3, Math.PI * 1.2, Math.PI * 1.8); ctx.fill();
    }

    ctx.fillStyle = skinColor; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hairColor; ctx.beginPath(); ctx.arc(-2, 0, 6, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();

    if (this.weapon) {
      let swingAngle = 0, armExtend = 0, weaponOffset = 0;
      if (this.swingTimer > 0) {
        const t = 1 - this.swingTimer / 0.22;
        swingAngle = Math.sin(t * Math.PI) * 0.9 - 0.45;
        armExtend = Math.sin(t * Math.PI) * 6;
      }
      if (this.flashTimer > 0) weaponOffset = -4;

      ctx.save(); ctx.translate(3 + armExtend, 5); ctx.rotate(swingAngle);
      ctx.fillStyle = skinColor; ctx.fillRect(0, -2, 10, 4);
      ctx.restore();

      ctx.save(); ctx.translate(10 + weaponOffset + armExtend, 5); ctx.rotate(swingAngle);
      drawWeapon(ctx, this.weapon, 0, 0, 1);
      if (this.flashTimer > 0 && this.weapon.type === 'ranged') {
        ctx.fillStyle = '#fff8a0'; ctx.beginPath(); ctx.arc(this.weapon.length + 6, 0, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else {
      const t = this.swingTimer > 0 ? (1 - this.swingTimer / 0.22) : 0;
      const swing = this.swingTimer > 0 ? Math.sin(t * Math.PI) * 0.9 - 0.45 : 0;
      const ext = this.swingTimer > 0 ? Math.sin(t * Math.PI) * 8 : 0;
      ctx.save(); ctx.translate(4, -3); ctx.rotate(swing * 0.5); ctx.fillStyle = skinColor; ctx.fillRect(0, -2, 8 + ext * 0.5, 3); ctx.restore();
      ctx.save(); ctx.translate(4, 5); ctx.rotate(swing); ctx.fillStyle = skinColor; ctx.fillRect(0, -2, 8 + ext, 3); ctx.restore();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
