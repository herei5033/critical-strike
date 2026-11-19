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
      this.weapon = makeWeapon('sniper');   // после смерти её может подобрать Дани
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
  _animTick(dt, level) {
    this.animT += dt;
    if (this.dead && this.deathAnim) this._deathTick(dt, level);
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

  // Анимация смерти зависит от того, чем убили.
  // cause = { kind: 'bullet'|'shotgun'|'blunt'|'blade'|'fist'|'throw'|'crush', angle: направление удара }
  // forced — поза и ползание, пришедшие от хоста в корпоративе
  _deathFx(cause = {}, forced = null) {
    const kind = cause.kind || 'bullet';
    const ang = cause.angle !== undefined ? cause.angle : this.angle + Math.PI;
    const human = this.type !== 'hound' && !this.isBoss;
    let pose = 'back';
    if (kind === 'blunt' || kind === 'fist' || kind === 'throw' || kind === 'burn') pose = 'side';
    else if (kind === 'blade') pose = Math.random() < 0.5 ? 'face' : 'side';
    else if (kind === 'bullet') pose = Math.random() < 0.35 ? 'face' : 'back';
    let crawl = human && !['shotgun', 'crush', 'explosion', 'burn'].includes(kind) && Math.random() < 0.14;
    this.charred = kind === 'burn' || (kind === 'explosion' && Math.random() < 0.5);
    if (forced) { pose = forced.pose || pose; crawl = !!forced.crawl; }
    const slide = { bullet: 70, shotgun: 220, blunt: 70, blade: 30, fist: 55, throw: 45, crush: 140, explosion: 260, burn: 25 }[kind] || 60;
    this.deathAngle = forced && forced.angle !== undefined ? forced.angle : ang + Utils.rand(-0.3, 0.3);
    this.deathAnim = {
      kind, pose: crawl ? 'crawl' : pose, endPose: pose === 'back' ? 'face' : pose, t: 0, crawl,
      crawlT: crawl ? Utils.rand(2.4, 4) : 0, crawlPhase: 0,
      vx: Math.cos(ang) * slide, vy: Math.sin(ang) * slide,
      spurt: kind === 'blade' ? 1.6 : kind === 'shotgun' ? 0.5 : 0.25, spurtT: 0, trailT: 0,
      fromAngle: this.angle,
    };
    this.pool = { r: 0, max: (kind === 'blade' ? 20 : kind === 'shotgun' ? 19 : 15) * (this.isBoss ? 1.5 : 1), x: this.cx(), y: this.cy() };
    AudioSys.playAt('enemy_death', this.cx(), this.cy(), 800);
    const gore = { shotgun: 30, blade: 22, bullet: 14, blunt: 9, fist: 6, throw: 8, crush: 20, explosion: 34, burn: 2 }[kind] || 12;
    if (kind === 'burn') { Effects.burst(this.cx(), this.cy(), '255,140,40', 16, 160); Effects.smoke(this.cx(), this.cy(), 0, 8); }
    Effects.bloodSplat(this.cx(), this.cy(), ang, gore);
    if (kind === 'shotgun') Effects.burst(this.cx(), this.cy(), '200,0,20', 18, 260);
    this.bloodStains = [];
  }

  _deathTick(dt, level) {
    const d = this.deathAnim;
    d.t += dt;
    const local = !this._replica;
    const moveBy = (dx, dy) => {
      let moved = false;
      if (!level || !level.collides(this.x + dx, this.y, this.w, this.h)) { this.x += dx; moved = true; } else d.vx *= -0.2;
      if (!level || !level.collides(this.x, this.y + dy, this.w, this.h)) { this.y += dy; moved = true; } else d.vy *= -0.2;
      return moved;
    };
    let moving = false;
    // отлёт от удара
    if (Math.abs(d.vx) + Math.abs(d.vy) > 3) {
      if (local) moveBy(d.vx * dt, d.vy * dt);
      const k = Math.exp(-dt * 7);
      d.vx *= k; d.vy *= k;
      moving = true;
    }
    // редкое предсмертное ползание
    if (d.crawl && d.t > 0.5 && d.crawlT > 0) {
      d.crawlT -= dt;
      d.crawlPhase += dt * 5;
      const step = (Math.sin(d.crawlPhase) > 0 ? 34 : 8) * dt;
      if (local && !moveBy(Math.cos(this.deathAngle) * step, Math.sin(this.deathAngle) * step)) this.deathAngle += 0.6;
      moving = true;
      if (d.crawlT <= 0) { d.pose = 'face'; d.crawl = false; AudioSys.play('player_hurt'); }
    }
    // кровавый след
    if (moving) {
      d.trailT -= dt;
      if (d.trailT <= 0) { d.trailT = 0.2; Effects.bloodSplat(this.cx(), this.cy(), null, 2); }
      this.pool.x = this.cx(); this.pool.y = this.cy();
    } else {
      this.pool.r = Math.min(this.pool.max, this.pool.r + dt * 9);
    }
    // фонтанчики крови от холодного оружия
    if (d.spurt > 0) {
      d.spurt -= dt; d.spurtT -= dt;
      if (d.spurtT <= 0) { d.spurtT = 0.35; Effects.bloodSplat(this.cx(), this.cy(), this.deathAngle + Utils.rand(-2, 2), 4); }
    }
  }

  // Лужа крови и тело в позе смерти
  _drawCorpse(ctx, scale) {
    const cx = this.cx(), cy = this.cy();
    const d = this.deathAnim || { t: 9, pose: 'back' };
    if (this.pool && this.pool.r > 0.5) {
      ctx.fillStyle = '#4a0008';
      ctx.beginPath(); ctx.ellipse(this.pool.x, this.pool.y, this.pool.r * 1.35 + 1, this.pool.r + 1, this.deathAngle, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.blood;
      ctx.beginPath(); ctx.ellipse(this.pool.x, this.pool.y, this.pool.r * 1.35, this.pool.r, this.deathAngle, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,140,0.18)';
      ctx.beginPath(); ctx.ellipse(this.pool.x - 3, this.pool.y - 3, this.pool.r * 0.5, this.pool.r * 0.3, this.deathAngle, 0, Math.PI * 2); ctx.fill();
    }
    // падение: тело доворачивается и "ложится" за первые доли секунды
    const fall = Math.min(1, d.t / 0.28);
    let da = this.deathAngle - (d.fromAngle !== undefined ? d.fromAngle : this.deathAngle);
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const rot = this.deathAngle - da * (1 - fall);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(scale * (0.82 + 0.18 * fall), scale * (0.82 + 0.18 * fall));
    const st = { seed: this.seed, pose: d.pose, crawl: d.crawlPhase || 0 };
    let look = this.look;
    if (this.charred) {
      if (!this._charLook) {
        this._charLook = this.type === 'hound'
          ? { ...this.look, coat: '#120c08', tan: '#2a1a10' }
          : { ...this.look, skin: '#2e1e16', skinDk: '#1a100a', jacket: '#1c1612', jacketDk: '#0c0a08', shirt: '#1c1612', pants: '#141008', hair: '#060505', mask: '#0a0806', blood: false };
      }
      look = this._charLook;
      if (d.t < 4 && Math.random() < 0.08) Effects.smoke(cx, cy, -Math.PI / 2, 1);
    }
    if (this.type === 'hound') Sprites.drawDogDown(ctx, look, st);
    else Sprites.drawHumanDown(ctx, look, st);
    ctx.restore();
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

    const dist = Math.hypot(px - cx, py - cy);
    if (dist > range) return false;
    const ang = Math.atan2(py - cy, px - cx);
    let diff = Math.abs(ang - this.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > this.fovAngle / 2) return false;
    return level.lineOfSight(cx, cy, px, py);
  }

  takeDamage(amount, pickups, cause) {
    if (this.dead) return;
    this.hp -= amount;

    if (this.type === 'tank' && this.hp > 0) {
      AudioSys.play('tank_hit');
      this.hitFlash = 0.12;
      Effects.burst(this.cx(), this.cy(), '255,210,120', 12, 200);
    }

    if (this.hp <= 0) {
      this.die(pickups, cause);
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
    this._animTick(dt, level);
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
        this.takeDamage(b.dmg || 1, pickups, { kind: b.src === 'shotgun' ? 'shotgun' : 'bullet', angle: Math.atan2(b.vy, b.vx), by: b.owner });
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
              player.takeDamage(2, { kind: 'bullet', angle: Math.atan2(dy, dx) });
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
        if (p.pickedUp || p.isHealth || p.isGrenade || p.thrown || !p.weapon || p.weapon.rare || p.weapon.special) continue;
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
        if (this.type === 'hound') AudioSys.playAt('hound_bark', this.cx(), this.cy(), 900);
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
            AudioSys.playAt(this.weapon.sound, this.cx(), this.cy(), 900);
            level.addNoise(this.x, this.y, 400);
            Effects.casing(this.cx() + Math.cos(this.angle) * 8, this.cy() + Math.sin(this.angle) * 8, this.angle, this.weapon.id === 'shotgun');
            Effects.muzzle(this.cx() + Math.cos(this.angle) * 30, this.cy() + Math.sin(this.angle) * 30, this.angle, this.weapon.id === 'shotgun');
            const bx = this.cx() + Math.cos(this.angle) * 12;
            const by = this.cy() + Math.sin(this.angle) * 12;
            if (this.weapon.id === 'shotgun') {
              // Дробовик у врага тоже стреляет веером
              for (let i = 0; i < this.weapon.pellets; i++) {
                const a = this.angle + Utils.rand(-this.weapon.spread, this.weapon.spread);
                { const nb = new Bullet(bx, by, a, this.weapon.bulletSpeed, false, this.weapon.color); nb.src = this.weapon.id; if (this.weapon.life) nb.life = this.weapon.life; bullets.push(nb); }
              }
            } else {
              { const nb = new Bullet(bx, by, this.angle + Utils.rand(-0.06, 0.06) + (this.weapon.spread ? Utils.rand(-this.weapon.spread, this.weapon.spread) : 0), this.weapon.bulletSpeed, false, this.weapon.color); nb.src = this.weapon.id; if (this.weapon.life) nb.life = this.weapon.life; bullets.push(nb); }
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
            player.takeDamage(1, { kind: ['knife', 'sword'].includes(this.weapon.id) || this.type === 'hound' ? 'blade' : 'blunt', angle: this.angle });
          }
        }
      }
    }
  }

  die(pickups, cause) {
    if (this.dead) return;
    this.dead = true;
    this.killedBy = cause && cause.by;
    this.stunned = false;
    this._deathFx(cause);
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

    if (this.dead) { this._drawCorpse(ctx, 1.15); return; }
    if (this.stunned) {
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
