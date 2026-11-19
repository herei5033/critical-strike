// Боссы: появляются, когда общий счёт достигает очередного порога.
// Каждый следующий порог выше предыдущего, боссы чередуются.
const BOSS_TYPES = {
  // --- боссы уровней одиночной кампании ---
  watchman: {
    name: 'ФАЛЬШИВЫЙ ВАХТЁР', title: 'Человек Депозита в холле колледжа', hp: 12, speed: 100, weapon: 'nightstick', drop: 'nightstick', bonus: 1500, behavior: 'charger',
    look: { skin: '#c8a080', skinDk: '#906848', hair: '#3a3a40', hairStyle: 'cap', cap: '#1a2030', beard: '#4a4a50',
            jacket: '#262c3a', jacketDk: '#12161e', shirt: '#3a3a42', pants: '#1a1e28', shoes: '#060606', collar: 'jacket', bulk: 1.45, blood: true },
  },
  director: {
    name: 'КОЛЛЕКТОР', title: 'Мы найдём вас сами', hp: 20, speed: 85, weapon: 'goldenUzi', drop: 'goldenUzi', bonus: 2000, behavior: 'gunner',
    look: { skin: '#d8b090', skinDk: '#a07a5a', hair: '#0c0a0e', hairHi: 'rgba(255,255,255,0.15)', hairStyle: 'slick', glasses: 'shades',
            jacket: '#101012', jacketDk: '#050506', shirt: '#d8d8dc', tie: '#6a0a12', pants: '#0e0e10', shoes: '#050505', collar: 'suit', bulk: 1.4 },
  },
  collector: {
    name: 'ИНКАССАТОР', title: 'Везёт зарплаты не туда', hp: 26, speed: 78, weapon: 'minigun', drop: 'minigun', bonus: 2500, behavior: 'gunner',
    look: { skin: '#c89a78', skinDk: '#94684a', hair: '#121016', hairStyle: 'helmet', helmet: '#1c2018', visor: '#2a0608',
            jacket: '#22261e', jacketDk: '#0e100c', shirt: '#1a1c18', pants: '#1a1c18', shoes: '#060606', collar: 'armor', skull: true, bulk: 1.55 },
  },
  bouncer: {
    name: 'ВЫШИБАЛА', title: 'Учителей в VIP не пускают', hp: 32, speed: 125, weapon: 'spikedBat', drop: 'spikedBat', bonus: 3000, behavior: 'charger',
    look: { skin: '#9a6a48', skinDk: '#6a4428', hair: '#0c0a0e', hairStyle: 'bald', glasses: 'shades', beard: '#0c0a0e',
            jacket: '#121214', jacketDk: '#050506', shirt: '#121214', pants: '#0e0e10', shoes: '#050505', collar: 'hood', bulk: 1.75, scar: true },
  },
  // --- боссы бесконечного режима и корпоратива ---
  butcher: {
    name: 'МЯСНИК', title: 'Хозяин скотобойни', hp: 14, speed: 110, weapon: 'cleaver', drop: 'cleaver', bonus: 1500, behavior: 'charger',
    look: { skin: '#e0a07a', skinDk: '#a8704c', hair: '#121016', hairStyle: 'bald', beard: '#2a1a10',
            jacket: '#5a4a44', jacketDk: '#2e2420', shirt: '#d8d2c4', pants: '#2a2422', shoes: '#0a0a0a',
            collar: 'apron', bulk: 1.55 },
  },
  general: {
    name: 'ГЕНЕРАЛ', title: 'Командир охраны', hp: 18, speed: 82, weapon: 'minigun', drop: 'minigun', bonus: 2000, behavior: 'gunner',
    look: { skin: '#d8a07a', skinDk: '#a87050', hair: '#121016', hairStyle: 'cap', cap: '#2a3a22',
            glasses: 'shades', jacket: '#3a4a2a', jacketDk: '#1e2a16', shirt: '#2a3a22', pants: '#2a3020', shoes: '#0a0a0a',
            collar: 'armor', bulk: 1.45 },
  },
  // --- сильные боссы: приходят после первых двух ---
  minotaur: {
    name: 'МИНОТАВР', title: 'Хозяин лабиринта', hp: 44, speed: 118, weapon: 'cleaver', drop: 'cleaver', bonus: 3500, behavior: 'charger',
    charge: { speed: 580, windup: 0.55, time: 0.75, chain: 2, dmg: 2, daze: 1.3, cooldown: 2 },
    look: { skin: '#5a3a26', skinDk: '#3a2416', hair: '#2a1a10', hairStyle: 'bald', horns: '#e8dcc0', beard: '#2a1a10', eyes: '#ff3020',
            jacket: '#4a2e1c', jacketDk: '#2a1a0e', shirt: '#5a3a26', pants: '#2a1a10', shoes: '#140c06', collar: 'jacket', bulk: 1.95 },
  },
  bride: {
    name: 'НЕВЕСТА', title: 'Месть подаётся холодной', hp: 38, speed: 150, weapon: 'sword', drop: 'sword', bonus: 3500, behavior: 'charger',
    charge: { speed: 760, windup: 0.3, time: 0.26, chain: 3, dmg: 1, kind: 'blade', daze: 0.7, cooldown: 1.1, minDist: 34 },
    look: { skin: '#f0c8a8', skinDk: '#c09878', hair: '#e8d070', hairHi: 'rgba(255,255,255,0.3)', hairStyle: 'long', veil: 'rgba(250,248,255,0.85)',
            jacket: '#f4f2f0', jacketDk: '#c8c4c0', shirt: '#ffffff', pants: '#e8e4e0', shoes: '#d0ccc8', collar: 'suit', bulk: 1.2, blood: true },
  },
  devil: {
    name: 'ДЬЯВОЛ', title: 'Сделка уже подписана', hp: 50, speed: 95, weapon: null, drop: 'flamer', bonus: 4000, behavior: 'caster',
    look: { skin: '#b01818', skinDk: '#700808', hair: '#0a0406', hairStyle: 'slick', hairHi: 'rgba(255,80,80,0.3)', horns: '#1a0a0a', eyes: '#ffd040',
            beard: '#0a0406', beardStyle: 'goatee', jacket: '#120608', jacketDk: '#060203', shirt: '#300808', tie: '#ff2020',
            pants: '#0a0406', shoes: '#050202', collar: 'suit', bulk: 1.5 },
  },
  ancient: {
    name: 'ДРЕВНИЙ', title: 'Каменный страж подземелья', hp: 64, speed: 72, weapon: null, drop: 'rpg', bonus: 5000, behavior: 'brute', revive: true,
    look: { skin: '#6a7262', skinDk: '#454c40', hair: '#3a4a2a', hairStyle: 'bald', horns: '#8a8a7a', hornLen: 5, eyes: '#7aff60',
            jacket: '#5a6052', jacketDk: '#3a3e34', shirt: '#4a5042', pants: '#3e4436', shoes: '#2a2e24', collar: 'armor', bulk: 2.3 },
  },
  // --- уличные боссы ---
  racer: {
    name: 'ВОДИЛА', title: 'Возит зарплаты по ночам', hp: 40, speed: 130, weapon: 'uzi', drop: 'goldenUzi', bonus: 3500, behavior: 'charger',
    charge: { speed: 720, windup: 0.4, time: 0.5, chain: 2, dmg: 2, daze: 1.0, cooldown: 1.6 },
    look: { skin: '#c89a78', skinDk: '#94684a', hair: '#121016', hairStyle: 'cap', cap: '#e86a10', glasses: 'shades',
            jacket: '#1a1a1e', jacketDk: '#0a0a0c', shirt: '#e86a10', pants: '#1a1e28', shoes: '#f0f0f0', collar: 'jacket', bulk: 1.5 },
  },
  gardener: {
    name: 'САДОВНИК', title: 'Хозяин тропического сада', hp: 56, speed: 82, weapon: null, drop: 'cleaver', bonus: 4500, behavior: 'brute',
    look: { skin: '#8a5a3a', skinDk: '#5a3a22', hair: '#2a3a1a', hairStyle: 'beanie', beanie: '#2a5a22', beard: '#3a2a18',
            jacket: '#3a5a22', jacketDk: '#22381a', shirt: '#5a4a2a', pants: '#3a3020', shoes: '#1a1208', collar: 'armor', bulk: 2.0 },
  },
  // --- сюжетные боссы ---
  revisor: {
    name: 'РЕВИЗОР', title: 'Ряженая «проверка» от Депозита', hp: 34, speed: 88, weapon: 'm4', drop: 'm4', bonus: 3000, behavior: 'gunner',
    look: { skin: '#d8b090', skinDk: '#a07a5a', hair: '#3a3a40', hairHi: 'rgba(255,255,255,0.2)', hairStyle: 'slick', glasses: 'rect',
            jacket: '#2a2e3a', jacketDk: '#14161e', shirt: '#e8e8ec', tie: '#1a3a8a', pants: '#1a1e28', shoes: '#050505', collar: 'suit', bulk: 1.4 },
  },
  brigadir: {
    name: 'БРИГАДИР', title: 'Хозяин складов в порту', hp: 52, speed: 80, weapon: null, drop: 'shotgun', bonus: 4000, behavior: 'brute',
    look: { skin: '#a8724a', skinDk: '#7a4c2c', hair: '#121016', hairStyle: 'beanie', beanie: '#c85a10', beard: '#1a1210',
            jacket: '#e86a10', jacketDk: '#a84a08', shirt: '#2a2a30', pants: '#2a3040', shoes: '#0a0a0a', collar: 'armor', bulk: 2.1 },
  },
  deposit: {
    name: 'МИСТЕР ДЕПОЗИТ', title: 'Тот, у кого все зарплаты Актау', hp: 80, speed: 100, weapon: 'goldenUzi', drop: 'minigun', bonus: 10000, behavior: 'caster',
    ring: '#5aff7a', shot: '#ffd319',
    look: { skin: '#d8b090', skinDk: '#a07a5a', hair: '#e8e0c8', hairHi: 'rgba(255,255,255,0.4)', hairStyle: 'slick', glasses: 'shades',
            jacket: '#c8a030', jacketDk: '#8a6a1a', shirt: '#101010', tie: '#3a8a3a', pants: '#1a1608', shoes: '#050505', collar: 'suit', bulk: 1.6 },
  },
};
const BOSS_ORDER = ['butcher', 'general', 'minotaur', 'bride', 'devil', 'ancient'];
const SLAM_RADIUS = 110;   // удар Древнего о землю
const BOSS_PHASES = ['hunt', 'windup', 'charge', 'dazed', 'spinup', 'fire'];

class Boss extends Enemy {
  constructor(x, y, kind, playerCount = 1, hpMul = 1) {
    super(x, y, 'static', null, 'boss_' + kind);
    const def = BOSS_TYPES[kind] || BOSS_TYPES.butcher;
    this.def = def;
    this.behavior = def.behavior;
    this.dropWeapon = def.drop;
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
    this.weapon = makeWeapon(def.behavior === 'gunner' ? 'm4' : 'knife');
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

  // Обычным оглушением боссов не пронять — только вздрагивают
  stun() { this.hitFlash = 0.12; }

  // Настоящее оглушение (каждый 5-й удар Галы): босс стоит со звёздочками
  bossStun(t = 1.0) {
    if (this.dead) return false;
    if (this._stunImmune > 0) return false;
    this._stunImmune = t + 5;        // 5 секунд иммунитета после оглушения
    this.phase = 'dazed'; this.phaseT = Math.max(this.phaseT || 0, t);
    this.swingTimer = 0;
    AudioSys.play('stun');
    Effects.ring(this.cx(), this.cy(), '255,230,120', 44);
    return true;
  }

  takeDamage(amount, pickups, cause) {
    if (this.dead) return;
    this.hp -= amount;
    this.hitFlash = 0.1;
    AudioSys.play('tank_hit');
    Effects.burst(this.cx(), this.cy(), '255,120,120', 8, 160);
    // Древний один раз встаёт снова с половиной здоровья
    if (this.hp <= 0 && this.def.revive && !this._revived) {
      this._revived = true;
      this.hp = Math.round(this.maxHp * 0.5);
      this.phase = 'dazed'; this.phaseT = 2;
      Effects.screenFlash(0.4, '120,255,100');
      Effects.ring(this.cx(), this.cy(), '120,255,100', 80);
      Effects.popup(this.cx(), this.cy() - 40, 'ВТОРОЕ ДЫХАНИЕ!', '#7aff60', 15);
      AudioSys.play('sniper_charge');
      return;
    }
    if (this.hp <= 0) this.die(pickups, cause);
  }

  die(pickups, cause) {
    if (this.dead) return;
    this.dead = true;
    this.killedBy = cause && cause.by;
    this._deathFx(cause);
    Effects.screenFlash(0.45, '255,230,180');
    Effects.hitstop = Math.max(Effects.hitstop, 0.18);
    Effects.ring(this.cx(), this.cy(), '255,200,80', 70);
    Effects.burst(this.cx(), this.cy(), '255,200,80', 40, 320);
    Effects.bloodSplat(this.cx(), this.cy(), null, 60);
    if (Array.isArray(pickups)) {
      for (let i = 0; i < 2; i++) pickups.push(new Pickup(this.cx() + Utils.rand(-16, 16), this.cy() + Utils.rand(-16, 16), null, true));
      pickups.push(new Pickup(this.cx() + Utils.rand(-12, 12), this.cy() + Utils.rand(-12, 12), makeWeapon(this.dropWeapon || Utils.choice(['m4', 'shotgun', 'sword', 'ak47']))));
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
        this.takeDamage(b.dmg || 1, pickups, { kind: b.src === 'shotgun' ? 'shotgun' : 'bullet', angle: Math.atan2(b.vy, b.vx), by: b.owner });
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
    this._stunImmune = Math.max(0, (this._stunImmune || 0) - dt);
    this.swingTimer = Math.max(0, this.swingTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);

    const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
    const dist = Utils.dist(this.cx(), this.cy(), pcx, pcy);
    const los = level.lineOfSight(this.cx(), this.cy(), pcx, pcy);
    const toP = Math.atan2(pcy - this.cy(), pcx - this.cx());

    // оглушение общее для всех боссов
    if (this.phase === 'dazed') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) { this.phase = 'hunt'; this.cooldown = 1.6; }
      return;
    }
    if (this.behavior === 'charger') this._updateButcher(dt, level, player, dist, los, toP);
    else if (this.behavior === 'caster') this._updateDevil(dt, level, player, bullets, enemies, dist, los, toP);
    else if (this.behavior === 'brute') this._updateAncient(dt, level, player, dist, los, toP);
    else this._updateGeneral(dt, level, player, bullets, enemies, dist, los, toP);
  }

  _updateButcher(dt, level, player, dist, los, toP) {
    const C = this.def.charge || {};
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
      if (los && dist < 320 && dist > (C.minDist || 70) && this.cooldown <= 0) {
        this.phase = 'windup'; this.phaseT = C.windup || 0.7;
        this._chainLeft = (C.chain || 1) - 1;
        AudioSys.play('hound_bark');
      }
    } else if (this.phase === 'windup') {
      // разбег: следит за целью, потом фиксирует направление
      this.phaseT -= dt;
      if (this.phaseT > 0.2) this.angle = toP;
      this.chargeAngle = this.angle;
      if (this.phaseT <= 0) { this.phase = 'charge'; this.phaseT = C.time || 0.6; this._chargeHit.clear(); }
    } else if (this.phase === 'charge') {
      this.phaseT -= dt;
      const sp = (C.speed || 470) * dt;
      const nx = this.x + Math.cos(this.chargeAngle) * sp, ny = this.y + Math.sin(this.chargeAngle) * sp;
      if (level.collides(nx, ny, this.w, this.h)) {
        // врезался в стену — оглушён и уязвим
        for (const d of level.doors) if (d.blocks(nx, ny, this.w, this.h)) d.push(null, this.cx(), this.cy(), Math.cos(this.chargeAngle) * 600, Math.sin(this.chargeAngle) * 600, false);
        this.phase = 'dazed'; this.phaseT = C.daze || 1.5;
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
          p.takeDamage(C.dmg || 2, { kind: C.kind || 'crush', angle: this.chargeAngle });
          Effects.ring(p.x + p.w / 2, p.y + p.h / 2, '255,60,60', 30);
        }
      }
      if (this.phaseT <= 0 && this.phase === 'charge') {
        // серия рывков подряд (Минотавр — 2, Невеста — 3)
        if (this._chainLeft > 0) { this._chainLeft--; this.phase = 'windup'; this.phaseT = Math.min(0.3, C.windup || 0.3); }
        else { this.phase = 'hunt'; this.cooldown = C.cooldown || 2.2; }
      }
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

  // Дьявол: держит дистанцию, кольца огня и прицельные залпы, призывает бесов
  _updateDevil(dt, level, player, bullets, enemies, dist, los, toP) {
    const frac = this.hp / this.maxHp;
    const want = frac <= 0.33 ? 2 : frac <= 0.66 ? 1 : 0;
    if (want > this._reinforced) {
      this._reinforced = want;
      this._callReinforcements(level, enemies, 3, ['knife', 'knife', 'bat']);
      // и телепортируется в другую комнату
      const room = Utils.choice(level.rooms.filter(r => !r.hall));
      const pt = room && level.randomFreePoint(room);
      if (pt) {
        Effects.ring(this.cx(), this.cy(), '255,60,20', 50); Effects.smoke(this.cx(), this.cy(), 0, 10);
        this.x = pt.x - this.w / 2; this.y = pt.y - this.h / 2; this._px = this.x; this._py = this.y;
        Effects.ring(this.cx(), this.cy(), '255,60,20', 50);
      }
    }
    const fire = (a, sp, col) => {
      bullets.push(new Bullet(this.cx() + Math.cos(a) * 16, this.cy() + Math.sin(a) * 16, a, sp, false, col));
      this._shots = (this._shots || 0) + 1;
    };
    if (this.phase === 'hunt') {
      this.angle = toP;
      if (!los || dist > 320) this._navigate(player.x + 9, player.y + 9, this.speed * (los ? 1 : 1.6), dt, level);
      else if (dist < 190) this._moveToward(this.cx() - Math.cos(toP) * 40, this.cy() - Math.sin(toP) * 40, this.speed, dt, level);
      if (los && dist < 480 && this.cooldown <= 0) {
        this._alt = !this._alt;
        this.phase = this._alt ? 'spinup' : 'windup'; this.phaseT = this._alt ? 0.8 : 0.45;
        AudioSys.play('sniper_charge');
      }
    } else if (this.phase === 'spinup') {
      // три кольца огня во все стороны
      this.phaseT -= dt;
      if (this.phaseT <= 0) { this.phase = 'fire'; this.phaseT = 0.75; this._fireT = 0; this._ring = 0; }
    } else if (this.phase === 'windup') {
      this.phaseT -= dt; this.angle = toP;
      if (this.phaseT <= 0) { this.phase = 'fire'; this.phaseT = 1.1; this._fireT = 0; this._ring = -1; }
    } else if (this.phase === 'fire') {
      this.phaseT -= dt; this._fireT -= dt;
      if (this._ring >= 0) {
        if (this._fireT <= 0 && this._ring < 3) {
          this._fireT = 0.25;
          const off = this._ring * 0.17;
          for (let i = 0; i < 18; i++) fire(off + i / 18 * Math.PI * 2, 230, this.def.ring || '#ff5020');
          this._ring++;
          this.flashTimer = 0.1;
          AudioSys.play('shoot_shotgun');
          Effects.ring(this.cx(), this.cy(), '255,90,30', 30);
        }
      } else {
        let da = toP - this.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        this.angle += Utils.clamp(da, -dt * 2.4, dt * 2.4);
        if (this._fireT <= 0) {
          this._fireT = 0.16;
          for (const s of [-0.12, 0, 0.12]) fire(this.angle + s, 400, this.def.shot || '#ffb040');
          this.flashTimer = 0.05;
          AudioSys.play('shoot_uzi');
        }
      }
      level.addNoise(this.cx(), this.cy(), 500);
      if (this.phaseT <= 0) { this.phase = 'hunt'; this.cooldown = 1.8; }
    }
  }

  // Древний: медленный гигант, бьёт по земле — волна ранит всех вокруг
  _updateAncient(dt, level, player, dist, los, toP) {
    if (this.phase === 'hunt') {
      this.angle = toP;
      if (dist > 60) this._navigate(player.x + 9, player.y + 9, this.speed * (los ? 1 : 1.8), dt, level);
      if (dist < 100 && los && this.cooldown <= 0) {
        this.phase = 'windup'; this.phaseT = 0.85;
        AudioSys.play('hound_bark');
      }
    } else if (this.phase === 'windup') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) {
        // удар: всем в радиусе — урон, мебель вокруг разлетается
        AudioSys.play('tank_hit'); AudioSys.play('shoot_shotgun');
        Effects.ring(this.cx(), this.cy(), '200,255,160', SLAM_RADIUS);
        Effects.ring(this.cx(), this.cy(), '255,255,255', SLAM_RADIUS * 0.6);
        Effects.dust(this.cx(), this.cy(), 14);
        Effects.hitstop = Math.max(Effects.hitstop, 0.08);
        Effects.screenFlash(0.18, '180,255,140');
        for (const p of (this.targets || [player])) {
          if (!p || p.dead) continue;
          const d = Utils.dist(this.cx(), this.cy(), p.x + p.w / 2, p.y + p.h / 2);
          if (d < SLAM_RADIUS && level.lineOfSight(this.cx(), this.cy(), p.x + 9, p.y + 9)) p.takeDamage(d < SLAM_RADIUS * 0.5 ? 3 : 2, { kind: 'crush', angle: Math.atan2(p.y + 9 - this.cy(), p.x + 9 - this.cx()) });
        }
        if (level.furniture) level.furniture.forEach((f, i) => { if (!f.destroyed && f.hp > 0 && Utils.dist(this.cx(), this.cy(), f.x, f.y) < SLAM_RADIUS) level.damageFurniture(i, 3, f.x, f.y); });
        level.addNoise(this.cx(), this.cy(), 700);
        this.phase = 'dazed'; this.phaseT = 0.9;   // после удара тяжело выпрямляется — окно для атаки
        this.cooldown = 1.4;
      }
    }
  }

  _callReinforcements(level, enemies, n = 2, pool = ['ak47', 'uzi', 'bat', 'pipe']) {
    const room = level.getRoomAt(this.cx(), this.cy());
    AudioSys.play('hound_bark');
    Effects.popup(this.cx(), this.cy() - 30, 'ПОДКРЕПЛЕНИЕ!', '#ff3a3a', 13);
    for (let i = 0; i < n; i++) {
      const p = room ? level.randomFreePoint(room) : null;
      if (!p) continue;
      const e = new Enemy(p.x - 9, p.y - 9, 'static', null, 'normal');
      e.weapon = makeWeapon(Utils.choice(pool));
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
      if (this.phase === 'windup' && this.behavior === 'brute') {
        const p = 1 - Utils.clamp(this.phaseT / 0.85, 0, 1);
        ctx.fillStyle = `rgba(255,40,40,${0.08 + 0.12 * k})`;
        ctx.beginPath(); ctx.arc(cx, cy, SLAM_RADIUS, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,60,60,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, SLAM_RADIUS * p, 0, Math.PI * 2); ctx.stroke();
      } else if (this.phase === 'windup' && this.behavior === 'charger') {
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
    const bs = this.behavior === 'brute' ? 1.75 : 1.5;
    ctx.scale(bs, bs);
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
    this.nextScore = 2500;
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
    const n = game.allPlayers ? game.allPlayers().length : 1;
    this.nextScore = game.score + (3500 + this.count * 700) * (1 + 0.4 * (n - 1));
  }
}
