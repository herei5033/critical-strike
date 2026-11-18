class Enemy {
  constructor(x, y, behavior, waypoints, type = 'normal') {
    this.x = x;
    this.y = y;
    this.w = 18; this.h = 18;
    this.type = type;

    this.speed = 120;
    this.maxHp = 1;
    this.hp = 1;

    const pool = ['m4','ak47','glock','uzi','bat','pipe','knife','sword'];

    if (type === 'tank') {
      this.speed = 70;
      this.maxHp = 3;
      this.hp = 3;
      this.weapon = makeWeapon('shotgun');
      this.fovRange = 180;
    } else if (type === 'hound') {
      this.speed = 200;
      this.weapon = makeWeapon('knife');
      this.fovRange = 350;
      this.fovAngle = Math.PI * 1.5;
    } else if (type === 'sniper') {
      this.speed = 90;
      this.weapon = makeWeapon('m4');
      this.fovRange = 600;
      this.fovAngle = Math.PI / 4;
      this.laserAngle = 0;
      this.chargeTimer = 0;
    } else {
      this.weapon = makeWeapon(Utils.choice(pool));
    }

    this.angle = Math.random() * Math.PI * 2;
    this.state = 'idle';
    this.dead = false;
    this.stunned = false;
    this.stunTimer = 0;

    this.attackTimer = 0;
    this.alertTimer = 0;
    this.swingTimer = 0;
    this.flashTimer = 0;
    this.bloodStains = [];
    this.particles = [];
    this.deathAngle = 0;
    this._droppedWeapon = null;

    this.behavior = behavior || 'static';
    this.waypoints = waypoints || [];
    this.wpIndex = 0;
    this.waitTimer = 0;

    if (type === 'normal') {
      this.fovAngle = Math.PI / 2.2;
      this.fovRange = 240;
    }

    this.seed = (Math.random() * 1e9) | 0;
    this.look = Sprites.enemyLook(type, this.seed);
    this.walkPhase = Math.random() * 6;
    this.moveAmt = 0;
    this.animT = Math.random() * 10;
    this._px = x; this._py = y;
    this.swingDur = 0.3;
    this.swingSide = 1;
    this.recoil = 0;
    this.hitFlash = 0;

    this.noiseTarget = null;
    this.investigateTimer = 0;
    this._stuckTimer = 0;
    this._lastX = x;
    this._lastY = y;
  }

  // Анимация ходьбы, отдача, вспышки и частицы крови. Вызывается и у "реплик" врагов в корпоративе.
  _animTick(dt) {
    this.animT += dt;
    const v = Math.hypot(this.x - this._px, this.y - this._py) / dt;
    this._px = this.x; this._py = this.y;
    const target = Utils.clamp(v / Math.max(60, this.speed), 0, 1);
    this.moveAmt += (target - this.moveAmt) * Math.min(1, dt * 10);
    this.walkPhase += dt * (this.type === 'hound' ? 16 : 12) * this.moveAmt;
    this.recoil = Math.max(0, this.recoil - dt * 9);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.swingTimer = Math.max(0, this.swingTimer - (this._replica ? dt : 0));
    this.flashTimer = Math.max(0, this.flashTimer - (this._replica ? dt : 0));
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

  // Звук и вид оглушения (без игровой логики)
  _stunFx() {
    this.deathAngle = this.angle + Math.PI;
    AudioSys.play('stun');
    Effects.burst(this.cx(), this.cy(), '255,230,120', 10, 140);
    Effects.ring(this.cx(), this.cy(), '255,230,120', 20);
  }

  // Звук, лужа крови и поза смерти (без выпадения предметов)
  _deathFx() {
    this.deathAngle = this.angle + Math.PI + Utils.rand(-0.5, 0.5);
    AudioSys.play('enemy_death');
    Effects.bloodSplat(this.cx(), this.cy(), this.angle + Math.PI, 26);
    const cx = this.cx(), cy = this.cy();
    const dir = this.angle + Math.PI;
    this.bloodStains.push({ x: cx, y: cy, rx: Utils.rand(13, 18), ry: Utils.rand(9, 13), rot: dir, a: 0.9 });
    for (let i = 0; i < 12; i++) {
      const a = dir + Utils.rand(-0.8, 0.8);
      const d = Utils.rand(8, 34);
      const r = Utils.rand(1.5, 5) * (1 - d / 50);
      this.bloodStains.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, rx: r * Utils.rand(1.2, 2.4), ry: r, rot: a, a: Utils.rand(0.6, 0.95) });
    }
  }

  bodyColor() {
    if (this.type === 'tank') return '#4a4a4a';
    if (this.type === 'hound') return '#8a4a2a';
    if (this.type === 'sniper') return '#2a4a2a';

    if (!this.weapon) return '#4a2c48';
    if (this.weapon.type === 'ranged') {
      if (this.weapon.id === 'm4' || this.weapon.id === 'ak47') return '#7a1a2a';
      if (this.weapon.id === 'uzi') return '#7a2a6a';
      return '#5a2a4a';
    }
    if (this.weapon.id === 'sword') return '#4a4a2a';
    if (this.weapon.id === 'bat') return '#5a3a1a';
    return '#3a4a2a';
  }

  stun() {
    if (this.dead || this.type === 'tank') return; // Танка нельзя оглушить
    this.stunned = true;
    this.stunTimer = 3.0;
    this.state = 'idle';
    this.chargeTimer = 0;
    this._stunFx();

    if (this.weapon) {
      // Оружие выпадает на пол (создаётся пикап в update, где доступен массив pickups)
      this._droppedWeapon = this.weapon;
      this.weapon = null;
    }
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  distToPlayer(player) {
    return Utils.dist(this.cx(), this.cy(), player.x + player.w / 2, player.y + player.h / 2);
  }

  canSeePlayer(player, level) {
    if (this.stunned || this.dead) return false;

    const cx = this.cx();
    const cy = this.cy();
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    let range = this.fovRange;
    if (player.charId === 'dani') range *= 0.8;

    const dist = Math.hypot(px - cx, py - cy);
    if (dist > range) return false;
    const ang = Math.atan2(py - cy, px - cx);
    let diff = Math.abs(ang - this.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > this.fovAngle / 2) return false;
    return level.lineOfSight(cx, cy, px, py);
  }

  takeDamage(amount, pickups) {
    if (this.dead) return;
    this.hp -= amount;

    if (this.type === 'tank' && this.hp > 0) {
      AudioSys.play('tank_hit');
      this.hitFlash = 0.12;
      Effects.burst(this.cx(), this.cy(), '255,210,120', 12, 200);
    }

    if (this.hp <= 0) {
      this.die(pickups);
    }
  }

  _moveToward(tx, ty, speed, dt, level) {
    const dx = tx - this.cx();
    const dy = ty - this.cy();
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return false;

    const baseAngle = Math.atan2(dy, dx);
    const offsets = [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6, 2.0, -2.0];
    for (const off of offsets) {
      const a = baseAngle + off;
      const stepX = Math.cos(a) * speed * dt;
      const stepY = Math.sin(a) * speed * dt;

      let moved = false;
      const vx = Math.cos(a) * speed, vy = Math.sin(a) * speed;
      const pushDoors = (tx, ty) => {
        for (const d of level.doors) {
          if (d.blocks(tx, ty, this.w, this.h)) d.push(null, this.cx(), this.cy(), vx, vy, false);
        }
      };
      const nx = this.x + stepX;
      if (!level.collides(nx, this.y, this.w, this.h)) {
        this.x = nx;
        moved = true;
      } else pushDoors(nx, this.y);
      const ny = this.y + stepY;
      if (!level.collides(this.x, ny, this.w, this.h)) {
        this.y = ny;
        moved = true;
      } else pushDoors(this.x, ny);

      if (moved) {
        this.angle = a;
        return true;
      }
    }
    return false;
  }

  // Идём к цели по найденному пути в обход мебели; путь пересчитывается раз в ~0.4 с
  _followPath(tx, ty, speed, dt, level) {
    this._pathT = (this._pathT || 0) - dt;
    const moved = this._pathGoal ? Math.hypot(tx - this._pathGoal.x, ty - this._pathGoal.y) : Infinity;
    if (!this._path || this._pathT <= 0 || moved > 48) {
      this._path = level.findPath ? level.findPath(this.cx(), this.cy(), tx, ty) : null;
      this._pathGoal = { x: tx, y: ty };
      this._pathT = 0.4 + Math.random() * 0.2;
    }
    const path = this._path;
    if (!path || !path.length) return this._moveToward(tx, ty, speed, dt, level);
    while (path.length > 1 && Utils.dist(this.cx(), this.cy(), path[0].x, path[0].y) < 8) path.shift();
    const wp = path[0];
    if (path.length === 1 && Utils.dist(this.cx(), this.cy(), wp.x, wp.y) < 8) return this._moveToward(tx, ty, speed, dt, level);
    // Путь состоит из прямых отрезков по центрам клеток: сначала встаём на ось отрезка,
    // потом идём вдоль него — так крупные враги не цепляются за углы проёмов
    const dx = wp.x - this.cx(), dy = wp.y - this.cy();
    let gx = wp.x, gy = wp.y;
    if (Math.abs(dx) >= Math.abs(dy)) { if (Math.abs(dy) > 2) gx = this.cx(); }
    else if (Math.abs(dx) > 2) gy = this.cy();
    return this._moveToward(gx, gy, speed, dt, level);
  }

  _checkStuck(dt, level) {
    // Сравниваем скорость, а не сдвиг за кадр — иначе на мониторах 144+ Гц медленные враги "застревают"
    const moved = Math.hypot(this.x - this._lastX, this.y - this._lastY);
    if (moved / Math.max(dt, 0.001) < 12) this._stuckTimer += dt;
    else this._stuckTimer = 0;
    this._lastX = this.x;
    this._lastY = this.y;
    return this._stuckTimer > 1.5;
  }

  _backToIdle() {
    this.state = this.behavior === 'patrol' ? 'patrol' : 'idle';
    this.noiseTarget = null;
  }

  update(dt, level, player, bullets, enemies, pickups) {
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    this._animTick(dt);
    if (this.dead) return;

    // Выпавшее при оглушении оружие превращаем в пикап на полу
    if (this._droppedWeapon) {
      const dp = new Pickup(this.cx() + Utils.rand(-8, 8), this.cy() + Utils.rand(-8, 8), this._droppedWeapon);
      dp.groundTimer = 0.3;
      pickups.push(dp);
      this._droppedWeapon = null;
    }

    // Попадания пуль игрока (по отрезку пути пули — не пролетают сквозь врага).
    // Работает и для оглушённых: их можно добить выстрелом.
    for (const b of bullets) {
      if (b.dead || !b.isPlayer) continue;
      if (Utils.segDist(b.px, b.py, b.x, b.y, this.cx(), this.cy()) < 12) {
        b.dead = true;
        this.takeDamage(1, pickups);
        if (this.dead) {
          this.particles.push(...Utils.spawnBloodParticles(this.cx(), this.cy(), 12, Math.atan2(b.vy, b.vx)));
          return;
        }
      }
    }

    if (this.stunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) this.stunned = false;
      return;
    }

    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;

    if (this.type === 'sniper') {
      if (this.state === 'attack') {
        this.chargeTimer += dt;
        this.laserAngle = Math.atan2(pcy - this.cy(), pcx - this.cx());
        this.angle = this.laserAngle;

        if (!this.canSeePlayer(player, level)) {
          this.state = 'chase';
          this.chargeTimer = 0;
        } else if (this.chargeTimer > 1.5) {
          AudioSys.play('sniper_shot');
          this._shots = (this._shots || 0) + 1;
          this.flashTimer = 0.08;
          this.attackTimer = 2.0;
          this.chargeTimer = 0;

          const dx = pcx - this.cx();
          const dy = pcy - this.cy();
          const dist = Math.hypot(dx, dy);
          const steps = Math.ceil(dist / 8);
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const px = this.cx() + dx * t;
            const py = this.cy() + dy * t;
            if (Utils.dist(px, py, pcx, pcy) < 12) {
              player.takeDamage(2);
              break;
            }
            if (level.bulletHitsWall(px, py)) break;
          }
        }
        return;
      } else if (this.state === 'chase') {
        if (this.canSeePlayer(player, level)) {
          this.state = 'attack';
          this.chargeTimer = 0;
          AudioSys.play('sniper_charge');
          return;
        }
      }
    }

    if (!this.weapon) {
      let nearest = null;
      let minDist = 400;
      for (const p of pickups) {
        if (p.pickedUp || p.isHealth || p.thrown || !p.weapon) continue;
        const d = Utils.dist(this.cx(), this.cy(), p.x, p.y);
        if (d < minDist) {
          minDist = d;
          nearest = p;
        }
      }

      if (nearest) {
        this._moveToward(nearest.x, nearest.y, this.speed, dt, level);
        if (Utils.dist(this.cx(), this.cy(), nearest.x, nearest.y) < 18) {
          this.weapon = nearest.weapon;
          nearest.pickedUp = true;
        }
        return;
      } else {
        if (this.behavior === 'patrol') {
          this.waitTimer -= dt;
          if (this.waitTimer <= 0) {
            if (this.waypoints.length === 0) return;
            const wp = this.waypoints[this.wpIndex];
            if (Utils.dist(this.cx(), this.cy(), wp.x, wp.y) < 12) {
              this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
              this.waitTimer = Utils.rand(1, 2.5);
            } else {
              this._moveToward(wp.x, wp.y, this.speed, dt, level);
            }
          }
        }
        return;
      }
    }

    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.swingTimer = Math.max(0, this.swingTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);

    if (this.state === 'patrol' || this.state === 'chase') {
      if (Math.random() < 0.03) {
        level.addNoise(this.x, this.y, 80);
      }
    }

    if (this.state === 'idle' || this.state === 'patrol' || this.state === 'investigate') {
      for (const n of level.noiseEvents) {
        if (Utils.dist(this.cx(), this.cy(), n.x, n.y) < n.radius) {
          this.state = 'investigate';
          this.noiseTarget = { x: n.x, y: n.y };
          this.investigateTimer = 6;
          break;
        }
      }
    }

    if (this.state !== 'chase' && this.state !== 'attack') {
      if (this.canSeePlayer(player, level)) {
        this.state = 'chase';
        if (this.type === 'hound') AudioSys.play('hound_bark');
      }
    }

    if (this.state === 'idle') {
    } else if (this.state === 'patrol') {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        if (this.waypoints.length === 0) { this.state = 'idle'; return; }
        const wp = this.waypoints[this.wpIndex];
        const d = Utils.dist(this.cx(), this.cy(), wp.x, wp.y);
        if (d < 12) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.waitTimer = Utils.rand(1, 2.5);
        } else {
          const ok = this._moveToward(wp.x, wp.y, this.speed, dt, level);
          if (!ok && this._checkStuck(dt, level)) {
            this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
            this.waitTimer = Utils.rand(0.5, 1.5);
          }
        }
      }
    } else if (this.state === 'investigate') {
      this.investigateTimer -= dt;
      if (this.investigateTimer <= 0 || !this.noiseTarget) {
        this._backToIdle();
        return;
      }

      const d = Utils.dist(this.cx(), this.cy(), this.noiseTarget.x, this.noiseTarget.y);
      if (d < 20) {
        this._backToIdle();
      } else {
        const ok = this._followPath(this.noiseTarget.x, this.noiseTarget.y, this.speed * 0.9, dt, level);
        if (!ok && this._checkStuck(dt, level)) this._backToIdle();
      }
    } else if (this.state === 'chase') {
      const dist = this.distToPlayer(player);
      const isRanged = this.weapon.type === 'ranged';

      this.angle = Math.atan2(pcy - this.cy(), pcx - this.cx());

      if (isRanged && dist < this.fovRange * 0.8 && this.canSeePlayer(player, level)) {
        this.state = 'attack';
      } else if (!isRanged && dist < 60) {
        this.state = 'attack';
      } else {
        const ok = level.lineOfSight(this.cx(), this.cy(), pcx, pcy)
          ? this._moveToward(pcx, pcy, this.speed, dt, level)
          : this._followPath(pcx, pcy, this.speed, dt, level);
        if (!ok && this._checkStuck(dt, level)) {
          this.state = 'investigate';
          this.noiseTarget = { x: player.x, y: player.y };
          this.investigateTimer = 4;
        }
      }
    } else if (this.state === 'attack') {
      const isRanged = this.weapon.type === 'ranged';
      const dist = this.distToPlayer(player);

      this.angle = Math.atan2(pcy - this.cy(), pcx - this.cx());

      if (isRanged) {
        if (dist > this.fovRange * 1.2 || !this.canSeePlayer(player, level)) {
          this.state = 'chase';
          return;
        }
      } else {
        if (dist > 80) {
          this.state = 'chase';
          return;
        }
        if (dist > (this.weapon.range || 50) - 4) {
          this._moveToward(pcx, pcy, this.speed, dt, level);
        }
      }

      if (this.attackTimer <= 0) {
        this.attackTimer = this.weapon.cooldown + 0.15;
        if (isRanged) {
          if (this.weapon.ammo > 0) {
            this.weapon.ammo--;
            this.flashTimer = 0.06;
            this.recoil = 1;
            this._shots = (this._shots || 0) + 1;
            AudioSys.play(this.weapon.sound);
            level.addNoise(this.x, this.y, 400);
            Effects.casing(this.cx() + Math.cos(this.angle) * 8, this.cy() + Math.sin(this.angle) * 8, this.angle, this.weapon.id === 'shotgun');
            Effects.smoke(this.cx() + Math.cos(this.angle) * 30, this.cy() + Math.sin(this.angle) * 30, this.angle, 2);
            const bx = this.cx() + Math.cos(this.angle) * 12;
            const by = this.cy() + Math.sin(this.angle) * 12;
            if (this.weapon.id === 'shotgun') {
              // Дробовик у врага тоже стреляет веером
              for (let i = 0; i < this.weapon.pellets; i++) {
                const a = this.angle + Utils.rand(-this.weapon.spread, this.weapon.spread);
                bullets.push(new Bullet(bx, by, a, this.weapon.bulletSpeed, false, this.weapon.color));
              }
            } else {
              bullets.push(new Bullet(bx, by, this.angle, this.weapon.bulletSpeed, false, this.weapon.color));
            }
          } else {
            this.weapon = null;
          }
        } else {
          this.swingDur = (typeof MELEE_SWING !== 'undefined' && MELEE_SWING[this.weapon.id]) || 0.3;
          if (this.type === 'hound') this.swingDur = 0.25;
          this.swingTimer = this.swingDur;
          this.swingSide = -this.swingSide;
          AudioSys.play(this.type === 'hound' ? 'hound_bark' : this.weapon.sound);
          // Удар не проходит сквозь стены
          if (dist < (this.weapon.range || 50) + 10 && level.lineOfSight(this.cx(), this.cy(), pcx, pcy)) {
            player.takeDamage(1);
          }
        }
      }
    }
  }

  die(pickups) {
    if (this.dead) return;
    this.dead = true;
    this.stunned = false;
    this._deathFx();
    if (Array.isArray(pickups)) {
      const drop = this.weapon || this._droppedWeapon;
      if (drop) {
        pickups.push(new Pickup(this.x + this.w/2 + Utils.rand(-10, 10), this.y + this.h/2 + Utils.rand(-10, 10), drop));
      }
      this.weapon = null;
      this._droppedWeapon = null;
      const healthChance = this.type === 'tank' ? 0.8 : 0.2;
      if (Math.random() < healthChance) {
        pickups.push(new Pickup(this.x + this.w/2 + Utils.rand(-10, 10), this.y + this.h/2 + Utils.rand(-10, 10), null, true));
      }
    }
  }

  draw(ctx) {
    const cx = this.cx();
    const cy = this.cy();

    // Брызги крови
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    if (this.type === 'sniper' && this.state === 'attack' && !this.dead && !this.stunned) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(this.laserAngle) * 800, cy + Math.sin(this.laserAngle) * 800);
      ctx.stroke();
    }

    if (this.dead || this.stunned) {
      if (this.dead) {
        for (const b of this.bloodStains) {
          ctx.globalAlpha = b.a;
          ctx.fillStyle = '#5a0010';
          ctx.beginPath(); ctx.ellipse(b.x, b.y, b.rx + 1, b.ry + 1, b.rot, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = P.blood;
          ctx.beginPath(); ctx.ellipse(b.x, b.y, b.rx, b.ry, b.rot, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.deathAngle + Math.PI);
      ctx.scale(1.15, 1.15);
      const st = { seed: this.seed, stunned: this.stunned, t: this.animT };
      if (this.type === 'hound') Sprites.drawDogDown(ctx, this.look, st);
      else Sprites.drawHumanDown(ctx, this.look, st);
      ctx.restore();
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(cx + 2, cy + 4, this.type === 'hound' ? 15 : 13, 9, this.angle, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);
    ctx.scale(1.15, 1.15);
    const swingP = this.swingTimer > 0 ? 1 - this.swingTimer / this.swingDur : 0;
    if (this.type === 'hound') {
      const bite = this.swingTimer > 0 ? Math.sin(swingP * Math.PI) : 0;
      Sprites.drawDog(ctx, this.look, { t: this.animT, walk: this.walkPhase, move: this.moveAmt, bite });
    } else {
      const wid = this.weapon ? (this.type === 'sniper' ? 'sniper' : this.weapon.id) : null;
      const st = {
        t: this.animT, walk: this.walkPhase, move: this.moveAmt, weaponId: wid,
        recoil: this.recoil, flash: this.flashTimer > 0, hurt: this.hitFlash > 0,
      };
      if (this.swingTimer > 0 && this.weapon && this.weapon.type === 'melee') st.swing = { p: swingP, side: this.swingSide, stab: this.weapon.id === 'knife' && this.swingSide > 0 };
      Sprites.drawHuman(ctx, this.look, st);
    }
    ctx.restore();
  }
}
