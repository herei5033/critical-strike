class Enemy {
  constructor(x, y, behavior, waypoints) {
    this.x = x;
    this.y = y;
    this.w = 18; this.h = 18;
    this.speed = 120;
    this.angle = Math.random() * Math.PI * 2;
    this.state = 'idle';
    this.dead = false;
    this.stunned = false;
    this.stunTimer = 0;
    const pool = ['m4','ak47','glock','uzi','bat','pipe','knife','sword'];
    this.weapon = makeWeapon(Utils.choice(pool));
    this.attackTimer = 0;
    this.alertTimer = 0;
    this.swingTimer = 0;
    this.flashTimer = 0;
    this.bloodStains = [];
    this.deathAngle = 0;

    this.behavior = behavior || 'static';
    this.waypoints = waypoints || [];
    this.wpIndex = 0;
    this.waitTimer = 0;

    this.fovAngle = Math.PI / 2.2;
    this.fovRange = 240;

    this.noiseTarget = null;
    this.investigateTimer = 0;
    this._stuckTimer = 0;
    this._lastX = x;
    this._lastY = y;
  }

  bodyColor() {
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
    if (this.dead) return;
    this.stunned = true;
    this.stunTimer = 3.0;
    this.state = 'idle';
    this.deathAngle = this.angle + Math.PI / 2;
    AudioSys.play('hit');
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  distToPlayer(player) {
    return Utils.dist(this.cx(), this.cy(), player.x + player.w / 2, player.y + player.h / 2);
  }

  canSeePlayer(player, level) {
    const cx = this.cx();
    const cy = this.cy();
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    let range = this.fovRange;
    if (player.charId === 'dani') range *= 0.8; // Стелс Дани

    const dist = Math.hypot(px - cx, py - cy);
    if (dist > range) return false;
    const ang = Math.atan2(py - cy, px - cx);
    let diff = Math.abs(ang - this.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > this.fovAngle / 2) return false;
    return level.lineOfSight(cx, cy, px, py);
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
      const nx = this.x + stepX;
      if (!level.collides(nx, this.y, this.w, this.h)) {
        this.x = nx;
        moved = true;
      } else {
        for (const d of level.doors) {
          if (!d.open && d.blocks(nx, this.y, this.w, this.h)) {
            d.push([]);
            break;
          }
        }
      }
      const ny = this.y + stepY;
      if (!level.collides(this.x, ny, this.w, this.h)) {
        this.y = ny;
        moved = true;
      } else {
        for (const d of level.doors) {
          if (!d.open && d.blocks(this.x, ny, this.w, this.h)) {
            d.push([]);
            break;
          }
        }
      }

      if (moved) {
        this.angle = a;
        return true;
      }
    }
    return false;
  }

  _checkStuck(dt, level) {
    const moved = Math.hypot(this.x - this._lastX, this.y - this._lastY);
    if (moved < 0.5) this._stuckTimer += dt;
    else this._stuckTimer = 0;
    this._lastX = this.x;
    this._lastY = this.y;
    return this._stuckTimer > 1.5;
  }

  update(dt, level, player, bullets, enemies, pickups) {
    if (this.dead) return;
    if (!isFinite(dt) || dt <= 0) dt = 0.016;

    for (const b of bullets) {
      if (b.dead) continue;
      if (b.isPlayer && Utils.dist(this.cx(), this.cy(), b.x, b.y) < 12) {
        this.die(pickups);
        b.dead = true;
        return;
      }
    }

    if (this.stunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) this.stunned = false;
      return;
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
        this.state = this.behavior === 'patrol' ? 'patrol' : 'idle';
        this.noiseTarget = null;
        return;
      }

      const targetRoom = level.getRoomAt(this.noiseTarget.x, this.noiseTarget.y);
      const myRoom = level.getRoomAt(this.cx(), this.cy());

      if (targetRoom && myRoom && targetRoom !== myRoom) {
        const path = level._findRoomPath(myRoom, targetRoom);
        if (path && path.length > 1) {
          const nextRoom = path[1];
          const door = level._doorBetween(myRoom, nextRoom);
          if (door) {
            const dx = door.x + door.w / 2;
            const dy = door.y + door.h / 2;
            const d = Utils.dist(this.cx(), this.cy(), dx, dy);
            if (d >= 20) {
              const ok = this._moveToward(dx, dy, this.speed * 0.9, dt, level);
              if (!ok && this._checkStuck(dt, level)) {
                this.state = this.behavior === 'patrol' ? 'patrol' : 'idle';
                this.noiseTarget = null;
              }
            }
          } else {
            this.state = this.behavior === 'patrol' ? 'patrol' : 'idle';
            this.noiseTarget = null;
          }
        } else {
          this.state = this.behavior === 'patrol' ? 'patrol' : 'idle';
          this.noiseTarget = null;
        }
        return;
      }

      const d = Utils.dist(this.cx(), this.cy(), this.noiseTarget.x, this.noiseTarget.y);
      if (d < 16) {
        this.state = this.behavior === 'patrol' ? 'patrol' : 'idle';
        this.noiseTarget = null;
      } else {
        const ok = this._moveToward(this.noiseTarget.x, this.noiseTarget.y, this.speed * 0.9, dt, level);
        if (!ok && this._checkStuck(dt, level)) {
          this.state = this.behavior === 'patrol' ? 'patrol' : 'idle';
          this.noiseTarget = null;
        }
      }
    } else if (this.state === 'chase') {
      const dist = this.distToPlayer(player);
      const isRanged = this.weapon.type === 'ranged';

      this.angle = Math.atan2(
        player.y + player.h/2 - this.cy(),
        player.x + player.w/2 - this.cx()
      );

      if (isRanged && dist < this.fovRange * 0.8 && this.canSeePlayer(player, level)) {
        this.state = 'attack';
      } else if (!isRanged && dist < 60) {
        this.state = 'attack';
      } else {
        const ok = this._moveToward(
          player.x + player.w/2,
          player.y + player.h/2,
          this.speed, dt, level
        );
        if (!ok && this._checkStuck(dt, level)) {
          this.state = 'investigate';
          this.noiseTarget = { x: player.x, y: player.y };
          this.investigateTimer = 4;
        }
      }
    } else if (this.state === 'attack') {
      const isRanged = this.weapon.type === 'ranged';
      const dist = this.distToPlayer(player);

      this.angle = Math.atan2(
        player.y + player.h/2 - this.cy(),
        player.x + player.w/2 - this.cx()
      );

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
          this._moveToward(
            player.x + player.w/2,
            player.y + player.h/2,
            this.speed, dt, level
          );
        }
      }

      if (this.attackTimer <= 0) {
        this.attackTimer = this.weapon.cooldown + 0.15;
        if (isRanged) {
          if (this.weapon.ammo > 0) {
            this.weapon.ammo--;
            this.flashTimer = 0.06;
            AudioSys.play('shoot');
            level.addNoise(this.x, this.y, 400);
            bullets.push(new Bullet(
              this.cx() + Math.cos(this.angle) * 12,
              this.cy() + Math.sin(this.angle) * 12,
              this.angle, this.weapon.bulletSpeed, false, this.weapon.color
            ));
          } else {
            this.weapon = makeWeapon('knife');
          }
        } else {
          this.swingTimer = 0.22;
          AudioSys.play('melee');
          if (dist < (this.weapon.range || 50) + 10) {
            player.takeDamage(1);
          }
        }
      }
    }
  }

  die(pickups) {
    if (this.dead) return;
    this.dead = true;
    this.deathAngle = this.angle + Math.PI / 2;
    AudioSys.play('die');
    for (let i = 0; i < 8; i++) {
      this.bloodStains.push({
        x: this.x + Utils.rand(-14, 14),
        y: this.y + Utils.rand(-14, 14),
        r: Utils.rand(3, 8)
      });
    }
    if (pickups) {
      // Шанс дропа аптечки (20%)
      if (Math.random() < 0.2) {
        pickups.push(new Pickup(this.x + this.w/2 + Utils.rand(-10, 10), this.y + this.h/2 + Utils.rand(-10, 10), null, true));
      }
      // Дроп оружия
      else if (this.weapon) {
        pickups.push(new Pickup(this.x + this.w/2 + Utils.rand(-10, 10), this.y + this.h/2 + Utils.rand(-10, 10), this.weapon));
      }
    }
  }

  draw(ctx) {
    const cx = this.cx();
    const cy = this.cy();

    if (this.dead || this.stunned) {
      if (this.dead) {
        ctx.fillStyle = P.blood;
        for (const b of this.bloodStains) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.deathAngle);
      ctx.scale(1.2, 1.2);
      ctx.fillStyle = this.stunned ? '#3d4450' : this.bodyColor();
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2c89b';
      ctx.beginPath();
      ctx.arc(14, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(16, 0, 5, Math.PI * 1.5, Math.PI * 2.5);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);
    ctx.scale(1.2, 1.2);

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-8, -5, 6, 4);
    ctx.fillRect(-8, 1, 6, 4);

    ctx.fillStyle = '#d9a880';
    ctx.fillRect(4, -9, 10, 4);

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.bodyColor();
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-2, 0, 6, Math.PI * 0.55, Math.PI * 1.45);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.fillRect(4, -2, 2, 2);
    ctx.fillRect(4, 2, 2, 2);

    if (this.weapon) {
      let swingAngle = 0, armExtend = 0, weaponOffset = 0;
      if (this.swingTimer > 0) {
        const t = 1 - this.swingTimer / 0.22;
        swingAngle = Math.sin(t * Math.PI) * 0.9 - 0.45;
        armExtend = Math.sin(t * Math.PI) * 6;
      }
      if (this.flashTimer > 0) weaponOffset = -4;

      ctx.save();
      ctx.translate(3 + armExtend, 5);
      ctx.rotate(swingAngle);
      ctx.fillStyle = '#d9a880';
      ctx.fillRect(0, -2, 10, 4);
      ctx.fillStyle = '#e0b48a';
      ctx.beginPath();
      ctx.arc(10, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(10 + weaponOffset + armExtend, 5);
      ctx.rotate(swingAngle);
      drawWeapon(ctx, this.weapon, 0, 0, 1);

      if (this.flashTimer > 0 && this.weapon.type === 'ranged') {
        ctx.fillStyle = '#fff8a0';
        ctx.beginPath();
        ctx.arc(this.weapon.length + 6, 0, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      const t = this.swingTimer > 0 ? (1 - this.swingTimer / 22) : 0;
      const swing = this.swingTimer > 0 ? Math.sin(t * Math.PI) * 0.9 - 0.45 : 0;
      const ext = this.swingTimer > 0 ? Math.sin(t * Math.PI) * 8 : 0;

      ctx.save();
      ctx.translate(4, -3);
      ctx.rotate(swing * 0.5);
      ctx.fillStyle = '#d9a880';
      ctx.fillRect(0, -2, 8 + ext * 0.5, 3);
      ctx.restore();

      ctx.save();
      ctx.translate(4, 5);
      ctx.rotate(swing);
      ctx.fillStyle = '#d9a880';
      ctx.fillRect(0, -2, 8 + ext, 3);
      ctx.restore();
    }

    ctx.restore();
  }
}