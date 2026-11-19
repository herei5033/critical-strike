// Боссы: появляются, когда общий счёт достигает очередного порога.
// Каждый следующий порог выше предыдущего, боссы чередуются.
const BOSS_TYPES = {
  // --- боссы уровней одиночной кампании ---
  watchman: {
    name: 'ВАХТЁР', title: 'Ночной сторож колледжа', hp: 12, speed: 100, weapon: 'pipe', bonus: 1500, behavior: 'charger',
    look: { skin: '#c8a080', skinDk: '#906848', hair: '#3a3a40', hairStyle: 'cap', cap: '#1a2030', beard: '#4a4a50',
            jacket: '#262c3a', jacketDk: '#12161e', shirt: '#3a3a42', pants: '#1a1e28', shoes: '#060606', collar: 'jacket', bulk: 1.45, blood: true },
  },
  director: {
    name: 'ДИРЕКТОР', title: 'Здесь решает он', hp: 20, speed: 85, weapon: 'uzi', bonus: 2000, behavior: 'gunner',
    look: { skin: '#d8b090', skinDk: '#a07a5a', hair: '#0c0a0e', hairHi: 'rgba(255,255,255,0.15)', hairStyle: 'slick', glasses: 'shades',
            jacket: '#101012', jacketDk: '#050506', shirt: '#d8d8dc', tie: '#6a0a12', pants: '#0e0e10', shoes: '#050505', collar: 'suit', bulk: 1.4 },
  },
  collector: {
    name: 'ИНКАССАТОР', title: 'Охраняет хранилище', hp: 26, speed: 78, weapon: 'minigun', bonus: 2500, behavior: 'gunner',
    look: { skin: '#c89a78', skinDk: '#94684a', hair: '#121016', hairStyle: 'helmet', helmet: '#1c2018', visor: '#2a0608',
            jacket: '#22261e', jacketDk: '#0e100c', shirt: '#1a1c18', pants: '#1a1c18', shoes: '#060606', collar: 'armor', skull: true, bulk: 1.55 },
  },
  bouncer: {
    name: 'ВЫШИБАЛА', title: 'Никто не войдёт в VIP', hp: 32, speed: 125, weapon: 'bat', bonus: 3000, behavior: 'charger',
    look: { skin: '#9a6a48', skinDk: '#6a4428', hair: '#0c0a0e', hairStyle: 'bald', glasses: 'shades', beard: '#0c0a0e',
            jacket: '#121214', jacketDk: '#050506', shirt: '#121214', pants: '#0e0e10', shoes: '#050505', collar: 'hood', bulk: 1.75, scar: true },
  },
  // --- боссы бесконечного режима и корпоратива ---
  butcher: {
    name: 'МЯСНИК', title: 'Хозяин скотобойни', hp: 14, speed: 110, weapon: 'cleaver', bonus: 1500, behavior: 'charger',
    look: { skin: '#e0a07a', skinDk: '#a8704c', hair: '#121016', hairStyle: 'bald', beard: '#2a1a10',
            jacket: '#5a4a44', jacketDk: '#2e2420', shirt: '#d8d2c4', pants: '#2a2422', shoes: '#0a0a0a',
            collar: 'apron', bulk: 1.55 },
  },
  general: {
    name: 'ГЕНЕРАЛ', title: 'Командир охраны', hp: 18, speed: 82, weapon: 'minigun', bonus: 2000, behavior: 'gunner',
    look: { skin: '#d8a07a', skinDk: '#a87050', hair: '#121016', hairStyle: 'cap', cap: '#2a3a22',
            glasses: 'shades', jacket: '#3a4a2a', jacketDk: '#1e2a16', shirt: '#2a3a22', pants: '#2a3020', shoes: '#0a0a0a',
            collar: 'armor', bulk: 1.45 },
  },
};
const BOSS_ORDER = ['butcher', 'general'];
const BOSS_PHASES = ['hunt', 'windup', 'charge', 'dazed', 'spinup', 'fire'];

class Boss extends Enemy {
  constructor(x, y, kind, playerCount = 1, hpMul = 1) {
    super(x, y, 'static', null, 'boss_' + kind);
    const def = BOSS_TYPES[kind] || BOSS_TYPES.butcher;
    this.behavior = def.behavior;
    this.kind = kind;
    this.isBoss = true;
    this.bossName = def.name;
    this.bossTitle = def.title;
    this.bossBonus = def.bonus;
    this.w = 22; this.h = 22;
    // Здоровье растёт с числом игроков
    this.maxHp = Math.round((def.hp + def.hp * 0.5 * (playerCount - 1)) * hpMul);
    this.hp = this.maxHp;
    this.speed = def.speed;
    this.weapon = makeWeapon(def.behavior === 'charger' ? 'knife' : 'm4');
    this.visualWeapon = def.weapon;
    this.look = def.look;
    this.fovRange = 2000;
    this.fovAngle = Math.PI * 2;
    this.phase = 'hunt';
    this.phaseT = 0;
    this.cooldown = 1.5;
    this.meleeCd = 0;
    this.chargeAngle = 0;
    this._chargeHit = new Set();
    this._fireT = 0;
    this._reinforced = 0;
    this.state = 'chase';
  }

  // Боссов не оглушить — только вздрагивают
  stun() { this.hitFlash = 0.12; }

  takeDamage(amount, pickups, cause) {
    if (this.dead) return;
    this.hp -= amount;
    this.hitFlash = 0.1;
    AudioSys.play('tank_hit');
    Effects.burst(this.cx(), this.cy(), '255,120,120', 8, 160);
    if (this.hp <= 0) this.die(pickups, cause);
  }

  die(pickups, cause) {
    if (this.dead) return;
    this.dead = true;
    this._deathFx(cause);
    Effects.screenFlash(0.45, '255,230,180');
    Effects.hitstop = Math.max(Effects.hitstop, 0.18);
    Effects.ring(this.cx(), this.cy(), '255,200,80', 70);
    Effects.burst(this.cx(), this.cy(), '255,200,80', 40, 320);
    Effects.bloodSplat(this.cx(), this.cy(), null, 60);
    if (Array.isArray(pickups)) {
      for (let i = 0; i < 2; i++) pickups.push(new Pickup(this.cx() + Utils.rand(-16, 16), this.cy() + Utils.rand(-16, 16), null, true));
      pickups.push(new Pickup(this.cx() + Utils.rand(-12, 12), this.cy() + Utils.rand(-12, 12), makeWeapon(Utils.choice(['m4', 'shotgun', 'sword', 'ak47']))));
    }
    this.weapon = null;
  }

  // Движение к цели с учётом комнат и дверей
  _navigate(tx, ty, speed, dt, level) {
    if (level.lineOfSight(this.cx(), this.cy(), tx, ty) && Utils.dist(this.cx(), this.cy(), tx, ty) < 160) {
      return this._moveToward(tx, ty, speed, dt, level);
    }
    return this._followPath(tx, ty, speed, dt, level);
  }

  _hitPlayerBullets(bullets, pickups) {
    for (const b of bullets) {
      if (b.dead || !b.isPlayer) continue;
      if (Utils.segDist(b.px, b.py, b.x, b.y, this.cx(), this.cy()) < 15) {
        b.dead = true;
        this.takeDamage(1, pickups, { kind: b.src === 'shotgun' ? 'shotgun' : 'bullet', angle: Math.atan2(b.vy, b.vx) });
        this.particles.push(...Utils.spawnBloodParticles(this.cx(), this.cy(), 8, Math.atan2(b.vy, b.vx)));
        if (this.dead) return;
      }
    }
  }

  update(dt, level, player, bullets, enemies, pickups) {
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    this._animTick(dt, level);
    if (this.dead) return;
    this._hitPlayerBullets(bullets, pickups);
    if (this.dead || !player) return;

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.meleeCd = Math.max(0, this.meleeCd - dt);
    this.swingTimer = Math.max(0, this.swingTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);

    const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
    const dist = Utils.dist(this.cx(), this.cy(), pcx, pcy);
    const los = level.lineOfSight(this.cx(), this.cy(), pcx, pcy);
    const toP = Math.atan2(pcy - this.cy(), pcx - this.cx());

    if (this.behavior === 'charger') this._updateButcher(dt, level, player, dist, los, toP);
    else this._updateGeneral(dt, level, player, bullets, enemies, dist, los, toP);
  }

  _updateButcher(dt, level, player, dist, los, toP) {
    if (this.phase === 'hunt') {
      this.angle = toP;
      // вне поля зрения игроков спешит к ним быстрее
      if (dist > 40) this._navigate(player.x + 9, player.y + 9, this.speed * (los ? 1 : 1.6), dt, level);
      if (dist < 50 && this.meleeCd <= 0 && los) {
        this.meleeCd = 0.9;
        this.swingDur = 0.36; this.swingTimer = this.swingDur; this.swingSide = -this.swingSide;
        AudioSys.play('melee_swing');
        player.takeDamage(1, { kind: 'blade', angle: this.angle });
      }
      if (los && dist < 300 && dist > 70 && this.cooldown <= 0) {
        this.phase = 'windup'; this.phaseT = 0.7;
        AudioSys.play('hound_bark');
      }
    } else if (this.phase === 'windup') {
      // разбег: следит за целью, потом фиксирует направление
      this.phaseT -= dt;
      if (this.phaseT > 0.2) this.angle = toP;
      this.chargeAngle = this.angle;
      if (this.phaseT <= 0) { this.phase = 'charge'; this.phaseT = 0.6; this._chargeHit.clear(); }
    } else if (this.phase === 'charge') {
      this.phaseT -= dt;
      const sp = 470 * dt;
      const nx = this.x + Math.cos(this.chargeAngle) * sp, ny = this.y + Math.sin(this.chargeAngle) * sp;
      if (level.collides(nx, ny, this.w, this.h)) {
        // врезался в стену — оглушён и уязвим
        for (const d of level.doors) if (d.blocks(nx, ny, this.w, this.h)) d.push(null, this.cx(), this.cy(), Math.cos(this.chargeAngle) * 600, Math.sin(this.chargeAngle) * 600, false);
        this.phase = 'dazed'; this.phaseT = 1.5;
        AudioSys.play('tank_hit');
        Effects.ring(this.cx(), this.cy(), '255,255,255', 40);
        Effects.burst(this.cx(), this.cy(), '220,220,220', 18, 220);
        Effects.hitstop = Math.max(Effects.hitstop, 0.06);
      } else {
        this.x = nx; this.y = ny;
        if (Math.random() < 0.6) Effects.dust(this.cx(), this.cy() + 6, 1);
      }
      // таранит всех игроков на пути
      for (const p of (this.targets || [player])) {
        if (!p || p.dead || this._chargeHit.has(p)) continue;
        if (Utils.dist(this.cx(), this.cy(), p.x + p.w / 2, p.y + p.h / 2) < 24) {
          this._chargeHit.add(p);
          p.takeDamage(2, { kind: 'crush', angle: this.chargeAngle });
          Effects.ring(p.x + p.w / 2, p.y + p.h / 2, '255,60,60', 30);
        }
      }
      if (this.phaseT <= 0 && this.phase === 'charge') { this.phase = 'hunt'; this.cooldown = 2.2; }
    } else if (this.phase === 'dazed') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) { this.phase = 'hunt'; this.cooldown = 1.8; }
    }
  }

  _updateGeneral(dt, level, player, bullets, enemies, dist, los, toP) {
    // подкрепление на 66% и 33% здоровья
    const frac = this.hp / this.maxHp;
    const want = frac <= 0.33 ? 2 : frac <= 0.66 ? 1 : 0;
    if (want > this._reinforced) {
      this._reinforced = want;
      this._callReinforcements(level, enemies);
    }

    if (this.phase === 'hunt') {
      this.angle = toP;
      if (!los || dist > 280) this._navigate(player.x + 9, player.y + 9, this.speed * (los ? 1 : 1.6), dt, level);
      else if (dist < 150) this._moveToward(this.cx() - Math.cos(toP) * 40, this.cy() - Math.sin(toP) * 40, this.speed * 0.8, dt, level);
      if (los && dist < 460 && this.cooldown <= 0) {
        this.phase = 'spinup'; this.phaseT = 0.6;
        AudioSys.play('sniper_charge');
      }
    } else if (this.phase === 'spinup') {
      this.phaseT -= dt;
      this.angle = toP;
      if (this.phaseT <= 0) { this.phase = 'fire'; this.phaseT = 1.3; this._fireT = 0; this._sweep = Math.random() * 6; }
    } else if (this.phase === 'fire') {
      this.phaseT -= dt;
      this._sweep += dt;
      // медленно доворачивает за целью, пули идут веером
      let da = toP - this.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      this.angle += Utils.clamp(da, -dt * 1.6, dt * 1.6);
      this._fireT -= dt;
      while (this._fireT <= 0) {
        this._fireT += 0.1;
        const a = this.angle + Math.sin(this._sweep * 5) * 0.28 + Utils.rand(-0.06, 0.06);
        const bx = this.cx() + Math.cos(this.angle) * 30, by = this.cy() + Math.sin(this.angle) * 30;
        bullets.push(new Bullet(bx, by, a, 470, false, '#ffb040'));
        this.flashTimer = 0.05; this.recoil = 1;
        this._shots = (this._shots || 0) + 1;
        if (this._shots % 2 === 0) AudioSys.play('shoot_uzi');
        Effects.casing(this.cx() + Math.cos(this.angle) * 10, this.cy() + Math.sin(this.angle) * 10, this.angle, false);
      }
      level.addNoise(this.cx(), this.cy(), 500);
      if (this.phaseT <= 0) { this.phase = 'hunt'; this.cooldown = 2.2; }
    }
  }

  _callReinforcements(level, enemies) {
    const room = level.getRoomAt(this.cx(), this.cy());
    AudioSys.play('hound_bark');
    Effects.popup(this.cx(), this.cy() - 30, 'ПОДКРЕПЛЕНИЕ!', '#ff3a3a', 13);
    for (let i = 0; i < 2; i++) {
      const p = room ? level.randomFreePoint(room) : null;
      if (!p) continue;
      const e = new Enemy(p.x - 9, p.y - 9, 'static', null, 'normal');
      e.weapon = makeWeapon(Utils.choice(['ak47', 'uzi', 'bat', 'pipe']));
      e.state = 'chase';
      enemies.push(e);
      Effects.ring(p.x, p.y, '255,60,60', 26);
    }
  }

  draw(ctx) {
    const cx = this.cx(), cy = this.cy();
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    if (this.dead) { this._drawCorpse(ctx, 1.5); return; }

    const t = this.animT;
    // предупреждение перед рывком / очередью
    if (this.phase === 'windup' || this.phase === 'spinup') {
      const k = 0.5 + 0.5 * Math.sin(t * 30);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,40,40,${0.35 + 0.4 * k})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 26 + k * 4, 0, Math.PI * 2); ctx.stroke();
      if (this.phase === 'windup') {
        ctx.strokeStyle = 'rgba(255,40,40,0.35)'; ctx.lineWidth = 18;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(this.angle) * 260, cy + Math.sin(this.angle) * 260); ctx.stroke();
      }
      ctx.restore();
    }
    if (this.phase === 'charge') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = 0.16 / i;
        ctx.fillStyle = '#ff4040';
        ctx.beginPath(); ctx.ellipse(cx - Math.cos(this.chargeAngle) * i * 12, cy - Math.sin(this.chargeAngle) * i * 12, 18, 14, this.chargeAngle, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(cx + 3, cy + 5, 20, 14, this.angle, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);
    const shake = this.phase === 'spinup' || this.phase === 'windup' ? (Math.random() - 0.5) * 1.5 : 0;
    ctx.translate(shake, shake);
    ctx.scale(1.5, 1.5);
    const st = { t, walk: this.walkPhase, move: this.phase === 'charge' ? 1 : this.moveAmt, weaponId: this.visualWeapon,
                 recoil: this.recoil, flash: this.flashTimer > 0, hurt: this.hitFlash > 0 };
    if (this.swingTimer > 0) st.swing = { p: 1 - this.swingTimer / this.swingDur, side: this.swingSide };
    Sprites.drawHuman(ctx, this.look, st);
    ctx.restore();

    if (this.phase === 'dazed') {
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * (Math.PI * 2 / 3);
        Sprites.star(ctx, cx + Math.cos(a) * 14, cy - 18 + Math.sin(a) * 5, 3.2, i % 2 ? '#ffd319' : '#ffffff');
      }
    }
  }
}

// Следит за счётом и выпускает боссов на порогах очков
class BossDirector {
  constructor() {
    this.nextScore = 2000;
    this.count = 0;
    this.active = null;
    this.delay = 0;
    this.banner = null;
  }

  // Новый уровень: босс не появляется сразу у входа
  onLevelStart() { this.active = null; this.delay = 6; }

  update(dt, game) {
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    this.delay = Math.max(0, this.delay - dt);
    if (this.active && this.active.dead) this._onBossDown(game);
    if (this.active || this.delay > 0 || game.score < this.nextScore) return;
    this._spawn(game);
  }

  _spawn(game) {
    const level = game.level;
    const players = game.allPlayers().filter(p => !p.dead);
    if (!players.length || !level.rooms) return;
    // самая дальняя от игроков комната, которую они сейчас не видят
    const lit = new Set();
    for (const p of players) for (const r of level.getLitRooms(p).lit) lit.add(r);
    const scored = level.rooms.filter(r => !lit.has(r)).map(r => {
      const rx = (r.x + r.w / 2) * TILE, ry = (r.y + r.h / 2) * TILE;
      return { r, d: Math.min(...players.map(p => Utils.dist(rx, ry, p.x, p.y))) };
    }).sort((a, b) => b.d - a.d);
    if (!scored.length) return;
    const room = Utils.choice(scored.slice(0, 3)).r;
    const pt = level.randomFreePoint(room);
    if (!pt) return;

    const kind = BOSS_ORDER[this.count % BOSS_ORDER.length];
    const boss = new Boss(pt.x - 11, pt.y - 11, kind, game.allPlayers().length);
    game.enemies.push(boss);
    game.totalEnemies = game.enemies.length;
    this.active = boss;
    this.count++;
    this.showBanner(boss);
  }

  showBanner(boss) {
    this.banner = { name: boss.bossName, title: boss.bossTitle, t: 3.2 };
    AudioSys.play('sniper_charge');
    Effects.screenFlash(0.35, '255,20,40');
  }

  _onBossDown(game) {
    const b = this.active;
    this.active = null;
    game.score += b.bossBonus;
    Effects.popup(b.cx(), b.cy() - 44, `БОСС ПОВЕРЖЕН +${b.bossBonus}`, '#ffd319', 16);
    // каждый следующий порог дальше: 2000 → +3500 → +4500 ...
    this.nextScore = game.score + 3000 + this.count * 500;
  }
}
