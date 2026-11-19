// Длительность анимации удара для каждого вида холодного оружия (сек)
const MELEE_SWING = { bat: 0.34, pipe: 0.3, sword: 0.3, knife: 0.2 };
const KICK_DUR = 0.42;      // пинок-вертушка Галы: длительность прыжка
const KICK_CD = 1.0;        // перезарядка пинка
const MODE_TIME = 6;        // ярость Даура / лотерея Дани
// Ценность огнестрела: Даур первым выбрасывает самое бесполезное
const WEAPON_VALUE = { glock: 1, uzi: 1.3, m4: 2, ak47: 2, shotgun: 1.8, m4s: 2.6, goldenUzi: 2.3, minigun: 3, sniper: 2.6, rpg: 3, flamer: 2.6 };
function weaponValue(w) {
  if (!w) return -1;
  if (w.type !== 'ranged') return 0.5;
  const fill = w.maxAmmo ? w.ammo / w.maxAmmo : 1;
  return (WEAPON_VALUE[w.id] || 1.5) * (0.15 + 0.85 * fill);
}

class Player {
  constructor(x, y, charId = 'dani') {
    this.x = x; this.y = y;
    this.w = 18; this.h = 18;
    this.speed = 220;
    this.maxHp = 6;
    this.hp = 6;
    this.armor = 0;             // синие сердца бронежилета (сгорают первыми)
    this.charId = charId;

    // Гала: 7 HP и +20% к скорости (оружие не берёт)
    if (charId === 'gal') { this.maxHp = 7; this.hp = 7; this.speed *= 1.2; }
    this.kickT = 0; this.kickCd = 0; this._kickHit = null; this._kickDir = 0;
    this.rageT = 0; this.lottoT = 0;   // режимы Даура и Дани
    this._bossHits = 0;
    this._safeX = x; this._safeY = y;
    this.kills = 0;             // лично убитые враги (Гала лечится за каждого 5-го)

    this.look = Sprites.HEROES[charId] || Sprites.HEROES.dani;
    this.seed = (Math.random() * 1e9) | 0;

    this.angle = 0;
    this.lastAimAngle = 0;
    this.walkPhase = 0;
    this.moveAmt = 0;
    this.animT = 0;
    this.stepTimer = 0;

    const start = START_WEAPONS[charId] || [];
    this.weapon = start[0] ? prepWeapon(charId, makeWeapon(start[0])) : null;
    this.weapon2 = start[1] ? prepWeapon(charId, makeWeapon(start[1])) : null;   // второе оружие (только у Даура)
    this.attackTimer2 = 0;
    this.flash2 = 0;
    this.recoil2 = 0;
    this.dualSpread = false;    // CTRL: руки разведены в стороны
    this.grenades = 1;
    this._fired = [];           // ракеты/огонь/гранаты — их создаёт игра
    this._bumpCd = 0;
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

  takeDamage(amount, cause) {
    if (this.dead || this.hurtCooldown > 0 || this.kickT > 0) return;
    this._lastCause = cause;
    this.hurtCooldown = 0.6;
    if (this.armor > 0) {
      const a = Math.min(this.armor, amount);
      this.armor -= a; amount -= a;
      if (amount <= 0) {
        AudioSys.play('tank_hit');
        if (typeof Effects !== 'undefined') { Effects.screenFlash(0.22, '60,140,255'); Effects.ring(this.x + 9, this.y + 9, '90,170,255', 24); }
        return;
      }
    }
    this.hp -= amount;
    AudioSys.play('player_hurt');
    if (typeof Effects !== 'undefined') Effects.screenFlash(0.28, '255,30,60');
    if (this.hp <= 0) { this.hp = 0; this.die(cause); }
  }

  // Частицы обновляются отдельно, чтобы продолжать жить и после смерти игрока
  updateParticles(dt) {
    this.animT += dt;
    // отлёт тела при смерти
    const d = this.deathAnim;
    if (this.dead && d) {
      d.t += dt;
      if (Math.abs(d.vx) + Math.abs(d.vy) > 3) {
        const lv = this._level;
        const nx = this.x + d.vx * dt, ny = this.y + d.vy * dt;
        if (!lv || !lv.collides(nx, this.y, this.w, this.h)) this.x = nx; else d.vx = 0;
        if (!lv || !lv.collides(this.x, ny, this.w, this.h)) this.y = ny; else d.vy = 0;
        const k = Math.exp(-dt * 7); d.vx *= k; d.vy *= k;
        if (Math.random() < 0.4) Effects.bloodSplat(this.x + 9, this.y + 9, null, 3);
      } else d.pool = Math.min(19, (d.pool || 0) + dt * 9);
    }
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
        if (this.charId === 'gal' && !e.stunned) {
          // Гала вырубает насмерть одним ударом (танку и боссу — урон)
          if (e.isBoss || e.type === 'tank') e.takeDamage(e.isBoss ? 1 : 2, pickups, { kind: 'fist', angle: this.angle, by: this.charId });
          if (e.isBoss && !e.dead) {
            this._bossHits++;
            if (this._bossHits % 5 === 0 && e.bossStun) { e.bossStun(1.6); Effects.popup(e.cx(), e.cy() - 30, 'ОГЛУШЁН!', '#ffd319', 13); }
          }
          else e.die(pickups, { kind: 'fist', angle: this.angle, by: this.charId });
          this.particles.push(...Utils.spawnBloodParticles(e.cx(), e.cy(), 20, this.angle));
          Effects.ring(e.cx(), e.cy(), '255,200,120', 26);
        } else if (e.stunned) {
          e.die(pickups, { kind: 'fist', angle: this.angle, by: this.charId });
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
        e.takeDamage(1, pickups, { kind: hit.blade ? 'blade' : 'blunt', angle: this.angle, by: this.charId });
        this.particles.push(...Utils.spawnBloodParticles(e.cx(), e.cy(), 20, this.angle));
      }
    }
    // удар задевает мебель и двери перед героем
    if (!landed && level.meleeHit) {
      if (level.meleeHit(this.x + this.w / 2, this.y + this.h / 2, this.angle, hit.fists ? 30 : (hit.range || 40) + 6, hit.fists ? 1 : 2)) {
        Effects.hitstop = Math.max(Effects.hitstop, 0.03);
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
    this._level = level;
    this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);
    this.kickCd = Math.max(0, this.kickCd - dt);
    this.rageT = Math.max(0, this.rageT - dt);
    this.lottoT = Math.max(0, this.lottoT - dt);
    // застряли в стене или двери (толчок, прыжок, рывок босса) — возвращаемся на свободное место
    if (level.collides(this.x, this.y, this.w, this.h)) this._unstick(level);
    else { this._safeX = this.x; this._safeY = this.y; }

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

    // Гала: пинок-вертушка (F) — прыжок вперёд, оглушает всех вокруг, в прыжке неуязвим
    if (this.charId === 'gal' && this.kickT <= 0 && this.kickCd <= 0 && (Input.wasPressed('KeyF') || Input.wasPressed('MobileKick'))) {
      this.kickT = KICK_DUR; this.kickCd = KICK_CD;
      this._kickDir = len > 0.2 ? Math.atan2(dy, dx) : this.angle;
      this._kickHit = new Set();
      AudioSys.play('melee_swing');
      Effects.dust(this.x + 9, this.y + 13, 4);
    }
    const kicking = this.kickT > 0;
    if (kicking) {
      // в прыжке летим по направлению пинка, управление не действует
      const p = 1 - this.kickT / KICK_DUR;
      const v = 270 * (1 - p * 0.55);
      dx = Math.cos(this._kickDir) * v / this.speed; dy = Math.sin(this._kickDir) * v / this.speed;
      this.kickT = Math.max(0, this.kickT - dt);
      this._kickHits(enemies, pickups);
      if (this.kickT <= 0) { Effects.dust(this.x + 9, this.y + 13, 6); Effects.ring(this.x + 9, this.y + 9, '255,230,150', 30); }
    }

    const ox = this.x, oy = this.y;
    const spd = this.speed * (this.rageT > 0 ? 1.3 : 1);
    const nx = this.x + dx * spd * dt;
    const ny = this.y + dy * spd * dt;

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
    this._bumpCd = Math.max(0, this._bumpCd - dt);
    if (this.charId === 'gal' && moved > this.speed * 0.5 && this._bumpCd <= 0) {
      for (const e of enemies) {
        if (e.dead || e.stunned || e.type !== 'normal' || e.isBoss) continue;
        if (Utils.dist(this.x + 9, this.y + 9, e.cx(), e.cy()) < 21) {
          e.stun();
          AudioSys.play('punch');
          Effects.ring(e.cx(), e.cy(), '255,230,150', 22);
          Effects.hitstop = Math.max(Effects.hitstop, 0.04);
          this._bumpCd = 0.25;
          break;
        }
      }
    }
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
    this.attackTimer2 = Math.max(0, this.attackTimer2 - dt);
    this.flash2 = Math.max(0, this.flash2 - dt);
    this.recoil2 = Math.max(0, this.recoil2 - dt * 9);
    this.dualSpread = !!this.weapon2 && (Input.mouse.right || Input.isDown('ControlLeft') || Input.isDown('ControlRight'));

    // Граната (G): летит туда, куда смотрит курсор
    if (Input.wasPressed('KeyG') && this.grenades > 0) {
      this.grenades--;
      const cx0 = this.x + 9, cy0 = this.y + 9;
      const mx = cam.x + Input.mouse.x / cam.zoom, my = cam.y + Input.mouse.y / cam.zoom;
      const dist = Utils.clamp(Input.touch.aimActive ? 220 : Math.hypot(mx - cx0, my - cy0), 80, 360);
      const sp = dist * 1.45;
      this._fired.push({ type: 'grenade', x: cx0 + Math.cos(this.angle) * 12, y: cy0 + Math.sin(this.angle) * 12, vx: Math.cos(this.angle) * sp, vy: Math.sin(this.angle) * sp });
      this.swingDur = 0.22; this.swingTimer = 0.22; this.punchSide = 1;
    }

    if (this._pendingHit) {
      this._pendingHit.delay -= dt;
      if (this._pendingHit.delay <= 0) this._resolveMelee(level, enemies, pickups);
    }

    if (Input.isDown('KeyQ') && !this._qLock && (this.weapon || this.weapon2)) {
      this._qLock = true;
      // два ствола — первым летит тот, что ценится меньше (пустой, слабый)
      const second = !!this.weapon2 && (!this.weapon || weaponValue(this.weapon2) <= weaponValue(this.weapon));
      const w = second ? this.weapon2 : this.weapon;
      const p = new Pickup(this.x + this.w / 2, this.y + this.h / 2, w);
      p.throwAt(this.angle, 1200);
      this._thrownPickup = p;
      if (second) this.weapon2 = null; else { this.weapon = this.weapon2; this.weapon2 = null; }
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

    const dual = this.weapon2 && this.weapon && this.weapon.type === 'ranged';
    if (shouldShoot && dual) {
      // два ствола: у каждого свой темп; с CTRL стреляет в обе стороны
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      const guns = [[this.weapon, 1], [this.weapon2, -1]];
      for (const [w, side] of guns) {
        const t = side > 0 ? this.attackTimer : this.attackTimer2;
        if (t > 0) continue;
        const a = this.dualSpread ? this.angle + side * Math.PI / 2 : this.angle;
        const hx = cx + Math.cos(this.angle + Math.PI / 2) * side * (this.dualSpread ? 14 : 4.5);
        const hy = cy + Math.sin(this.angle + Math.PI / 2) * side * (this.dualSpread ? 14 : 4.5);
        const cdr = this.rageT > 0 ? 1 / 1.35 : 1;
        if (side > 0) this.attackTimer = w.cooldown * cdr; else this.attackTimer2 = w.cooldown * cdr;
        if (this._fireGun(w, a, hx, hy, bullets, level)) {
          if (side > 0) { this.flashTimer = 0.06; this.recoil = 1; } else { this.flash2 = 0.06; this.recoil2 = 1; }
        }
      }
    } else if (shouldShoot && this.attackTimer <= 0) {
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      if (this.weapon) {
        this.attackTimer = this.weapon.cooldown * (this.rageT > 0 && this.weapon.type === 'ranged' ? 1 / 1.35 : 1);
        if (this.weapon.type === 'ranged') {
          if (this._fireGun(this.weapon, this.angle, cx, cy, bullets, level)) { this.flashTimer = 0.06; this.recoil = 1; }
        } else {
          // Ближний бой: замах поочерёдно справа и слева, нож чередует выпад и взмах
          this.swingDur = MELEE_SWING[this.weapon.id] || 0.28;
          this.swingTimer = this.swingDur;
          this.swingSide = -this.swingSide;
          this.swingStab = this.weapon.id === 'knife' && this.swingSide > 0;
          AudioSys.play(this.weapon.sound);
          this._pendingHit = { delay: this.swingDur * 0.28, range: this.weapon.range, blade: ['knife', 'sword'].includes(this.weapon.id) };
        }
      } else {
        // Кулаки: удары левой и правой по очереди
        const fast = this.charId === 'gal';
        this.attackTimer = fast ? 0.32 / 1.5 : 0.32;
        this.swingDur = fast ? 0.16 : 0.22;
        this.swingTimer = this.swingDur;
        this.punchSide = -this.punchSide;
        AudioSys.play('punch');
        this._pendingHit = { delay: 0.06, fists: true };
      }
    }
  }

  // Один выстрел из оружия w под углом a из точки (cx,cy). Возвращает true, если выстрел был.
  _fireGun(w, a, cx, cy, bullets, level) {
    const rage = this.rageT > 0;
    if (w.ammo <= 0 && !rage) { AudioSys.play('empty_click'); return false; }
    if (!rage) w.ammo--;
    const bx = cx + Math.cos(a) * 16, by = cy + Math.sin(a) * 16;
    if (w.projectile === 'flame') {
      // огнемёт: шум и звук реже, гильз нет
      this._fired.push({ type: 'flame', x: bx, y: by, a });
      if (Math.random() < 0.25) AudioSys.play('throw');
      level.addNoise(cx, cy, 250);
      return true;
    }
    // глушитель: тихий хлопок, враги слышат только совсем рядом
    AudioSys.play(w.sound, w.silent ? 0.3 : 1);
    level.addNoise(cx, cy, w.silent ? 70 : 400);
    if (w.projectile === 'rocket') {
      this._fired.push({ type: 'rocket', x: bx, y: by, a });
      Effects.smoke(cx - Math.cos(a) * 18, cy - Math.sin(a) * 18, a + Math.PI, 8);
      return true;
    }
    const mk = (ang) => { const b = new Bullet(bx, by, ang, w.bulletSpeed, true, w.color); b.src = w.id; b.dmg = w.damage || 1; b.owner = this.charId; if (w.life) b.life = w.life; bullets.push(b); };
    if (w.pellets) for (let i = 0; i < w.pellets; i++) mk(a + Utils.rand(-w.spread, w.spread));
    else mk(a + (w.spread ? Utils.rand(-w.spread, w.spread) : 0));
    Effects.casing(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, a, w.id === 'shotgun');
    const muz = (Sprites.WEAPON_META[w.id] || {}).muzzle || 16;
    if (!w.silent) Effects.muzzle(cx + Math.cos(a) * (muz + 6), cy + Math.sin(a) * (muz + 6), a, w.id === 'shotgun');
    return true;
  }

  // Пинок задевает всех рядом: обычных врагов оглушает и отбрасывает, боссу — урон
  _kickHits(enemies, pickups) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    for (const e of enemies) {
      if (e.dead || this._kickHit.has(e)) continue;
      if (Utils.dist(cx, cy, e.cx(), e.cy()) > (e.isBoss ? 40 : 36)) continue;
      this._kickHit.add(e);
      const a = Math.atan2(e.cy() - cy, e.cx() - cx);
      if (e.isBoss) e.takeDamage(1, pickups, { kind: 'fist', angle: a, by: this.charId });
      else {
        e.stun();
        const lv = this._level;
        const nx = e.x + Math.cos(a) * 14, ny = e.y + Math.sin(a) * 14;
        if (lv && !lv.collides(nx, ny, e.w, e.h)) { e.x = nx; e.y = ny; }
      }
      AudioSys.play('punch');
      Effects.ring(e.cx(), e.cy(), '255,230,150', 24);
      Effects.burst(e.cx(), e.cy(), '255,255,255', 8, 160);
      Effects.hitstop = Math.max(Effects.hitstop, 0.03);
    }
  }

  // Выход из стены: сначала последнее свободное место, потом поиск по спирали
  _unstick(level) {
    if (!level.collides(this._safeX, this._safeY, this.w, this.h)) { this.x = this._safeX; this.y = this._safeY; return; }
    for (let r = 4; r <= 96; r += 4) {
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        const x = this.x + Math.cos(a) * r, y = this.y + Math.sin(a) * r;
        if (!level.collides(x, y, this.w, this.h)) { this.x = x; this.y = y; this._safeX = x; this._safeY = y; return; }
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

  die(cause = {}) {
    if (this.dead) return;
    this.dead = true;
    const kind = cause.kind || 'bullet';
    const ang = cause.angle !== undefined ? cause.angle : this.angle + Math.PI;
    this.deathAngle = ang + Utils.rand(-0.3, 0.3);
    const slide = { bullet: 70, shotgun: 200, blunt: 60, blade: 30, crush: 150, explosion: 240 }[kind] || 60;
    this.deathAnim = { t: 0, kind, pose: kind === 'blunt' || kind === 'crush' ? 'side' : kind === 'blade' ? 'face' : 'back',
                       vx: Math.cos(ang) * slide, vy: Math.sin(ang) * slide, pool: 0, fromAngle: this.angle };
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
    if (this.weapon2 && this.weapon) {
      st.dual = { a: this.weapon.id, b: this.weapon2.id, spread: this.dualSpread, f1: this.flashTimer > 0, f2: this.flash2 > 0, r1: this.recoil, r2: this.recoil2 };
    }
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
      const d = this.deathAnim || { t: 9, pose: 'back', pool: 18 };
      const pr = d.pool || 0;
      if (pr > 0.5) {
        ctx.fillStyle = '#4a0008';
        ctx.beginPath(); ctx.ellipse(cx, cy, pr * 1.35 + 1, pr + 1, this.deathAngle, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = P.blood;
        ctx.beginPath(); ctx.ellipse(cx, cy, pr * 1.35, pr, this.deathAngle, 0, Math.PI * 2); ctx.fill();
      }
      const fall = Math.min(1, d.t / 0.28);
      let da = this.deathAngle - (d.fromAngle !== undefined ? d.fromAngle : this.deathAngle);
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.deathAngle - da * (1 - fall));
      const sc = 1.15 * (0.82 + 0.18 * fall); ctx.scale(sc, sc);
      Sprites.drawHumanDown(ctx, this.look, { seed: this.seed, pose: d.pose });
      ctx.restore();
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(cx + 2, cy + 4, 13, 9, this.angle, 0, Math.PI * 2); ctx.fill();

    drawModeAura(ctx, cx, cy, this.rageT > 0 ? 1 : this.lottoT > 0 ? 2 : 0, this.animT);
    if (this.hurtCooldown > 0 && Math.floor(this.hurtCooldown * 20) % 2 === 0) ctx.globalAlpha = 0.55;

    ctx.save();
    ctx.translate(cx, cy);
    if (this.kickT > 0) {
      // вертушка: два оборота в прыжке, герой «подлетает» над тенью
      const p = 1 - this.kickT / KICK_DUR;
      const lift = Math.sin(p * Math.PI);
      ctx.translate(0, -lift * 6);
      ctx.rotate(this._kickDir + p * Math.PI * 4);
      ctx.scale(1.15 + lift * 0.2, 1.15 + lift * 0.2);
      Sprites.drawHuman(ctx, this.look, { ...this._animState(), punch: { p: 0.5, side: 1 } });
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,230,150,${0.5 * lift})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy - lift * 6, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.rotate(this.angle);
    ctx.scale(1.15, 1.15);
    Sprites.drawHuman(ctx, this.look, this._animState());
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// Свечение вокруг героя в режиме: 1 — ярость (красное), 2 — лотерея (золотое), 3 — пинок
function drawModeAura(ctx, cx, cy, mode, t) {
  if (!mode || mode === 3) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const col = mode === 1 ? '255,30,40' : '255,210,60';
  const pulse = 0.5 + 0.5 * Math.sin(t * (mode === 1 ? 14 : 6));
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 30 + pulse * 6);
  g.addColorStop(0, `rgba(${col},0.45)`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.fill();
  if (mode === 2) {
    // радиус лотереи
    ctx.strokeStyle = `rgba(255,210,60,${0.18 + 0.12 * pulse})`; ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.arc(cx, cy, LOTTO_RADIUS, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
const LOTTO_RADIUS = 230;
