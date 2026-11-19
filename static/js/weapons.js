const WEAPONS = {
  m4: { id: 'm4', name: 'M4', type: 'ranged', cooldown: 0.12, ammo: 30, maxAmmo: 30, bulletSpeed: 800, color: '#88ccff', length: 22, sound: 'shoot_m4' },
  ak47: { id: 'ak47', name: 'AK-47', type: 'ranged', cooldown: 0.15, ammo: 25, maxAmmo: 25, bulletSpeed: 750, color: '#ffaa55', length: 22, sound: 'shoot_ak47' },
  glock: { id: 'glock', name: 'Glock', type: 'ranged', cooldown: 0.25, ammo: 12, maxAmmo: 12, bulletSpeed: 700, color: '#dddddd', length: 14, sound: 'shoot_glock' },
  uzi: { id: 'uzi', name: 'Uzi', type: 'ranged', cooldown: 0.08, ammo: 40, maxAmmo: 40, bulletSpeed: 650, color: '#ff77dd', length: 16, sound: 'shoot_uzi' },
  // Дробовик: стреляет веером
  shotgun: { id: 'shotgun', name: 'Дробовик', type: 'ranged', cooldown: 0.9, ammo: 6, maxAmmo: 6, bulletSpeed: 600,
             color: '#ff4444', length: 24, sound: 'shoot_shotgun', spread: 0.4, pellets: 5 },
  bat: { id: 'bat', name: 'Бита', type: 'melee', cooldown: 0.5, range: 52, color: '#a0622b', length: 18, sound: 'melee_swing' },
  pipe: { id: 'pipe', name: 'Труба', type: 'melee', cooldown: 0.45, range: 46, color: '#9a9a9a', length: 16, sound: 'melee_swing' },
  knife: { id: 'knife', name: 'Нож', type: 'melee', cooldown: 0.3, range: 38, color: '#dddddd', length: 9, sound: 'melee_swing' },
  sword: { id: 'sword', name: 'Меч', type: 'melee', cooldown: 0.4, range: 58, color: '#e8e8ff', length: 22, sound: 'melee_swing' },

  // Редкие — лежат на уровне, врагам не достаются
  rpg: { id: 'rpg', name: 'РПГ', type: 'ranged', cooldown: 1.1, ammo: 2, maxAmmo: 2, bulletSpeed: 430, color: '#ffb040',
         length: 30, sound: 'shoot_shotgun', projectile: 'rocket', rare: true },
  flamer: { id: 'flamer', name: 'Огнемёт', type: 'ranged', cooldown: 0.05, ammo: 140, maxAmmo: 140, bulletSpeed: 270, color: '#ff8a30',
            length: 28, sound: 'throw', projectile: 'flame', rare: true },

  // Оружие снайперов и боссов — его может подобрать только Дани
  sniper: { id: 'sniper', name: 'Снайперская винтовка', type: 'ranged', cooldown: 1.0, ammo: 6, maxAmmo: 6, bulletSpeed: 1500, damage: 3,
            color: '#ff6060', length: 36, sound: 'sniper_shot', special: 'dani' },
  minigun: { id: 'minigun', name: 'Миниган', type: 'ranged', cooldown: 0.06, ammo: 160, maxAmmo: 160, bulletSpeed: 720, spread: 0.1,
             color: '#ffb040', length: 34, sound: 'shoot_uzi', special: 'dani' },
  goldenUzi: { id: 'goldenUzi', name: 'Золотой Uzi', type: 'ranged', cooldown: 0.06, ammo: 70, maxAmmo: 70, bulletSpeed: 780,
               color: '#ffd319', length: 16, sound: 'shoot_uzi', special: 'dani' },
  cleaver: { id: 'cleaver', name: 'Тесак Мясника', type: 'melee', cooldown: 0.42, range: 56, color: '#c8ccd4', length: 20, sound: 'melee_swing', special: 'dani' },
  nightstick: { id: 'nightstick', name: 'Дубинка Вахтёра', type: 'melee', cooldown: 0.28, range: 48, color: '#2a2a30', length: 18, sound: 'melee_swing', special: 'dani' },
  spikedBat: { id: 'spikedBat', name: 'Бита с гвоздями', type: 'melee', cooldown: 0.42, range: 60, color: '#7a4a22', length: 22, sound: 'melee_swing', special: 'dani' },
};

function makeWeapon(id, ammo) {
  const w = { ...WEAPONS[id] };
  w.ammo = ammo !== undefined ? ammo : w.maxAmmo;
  return w;
}

// Можно ли этому герою поднять оружие
function canWield(charId, w) {
  return !(w && w.special && w.special !== charId);
}

// Что получит герой от предмета: 'health' | 'grenade' | 'w1' | 'w2' | null
// d = { hp, maxHp, charId, grenades, w1: id, w2: id }
function pickupSlot(d, p) {
  if (p.isHealth) return d.hp < d.maxHp ? 'health' : null;
  if (p.isGrenade) return (d.grenades || 0) < 5 ? 'grenade' : null;
  const w = p.weapon;
  if (!w || !canWield(d.charId, w)) return null;
  if (!d.w1) return 'w1';
  // Даур держит по огнестрелу в каждой руке (но не два ножа/биты)
  if (d.charId === 'daur' && !d.w2 && WEAPONS[d.w1] && WEAPONS[d.w1].type === 'ranged' && w.type === 'ranged') return 'w2';
  return null;
}
