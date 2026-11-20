// Баланс: spread — разброс (рад), life — время жизни пули (ограничивает дальность), damage — урон за попадание
const WEAPONS = {
  glock: { id: 'glock', name: 'Glock', type: 'ranged', cooldown: 0.22, ammo: 15, maxAmmo: 15, bulletSpeed: 760, spread: 0.02, color: '#dddddd', length: 14, sound: 'shoot_glock' },
  uzi: { id: 'uzi', name: 'Uzi', type: 'ranged', cooldown: 0.075, ammo: 36, maxAmmo: 36, bulletSpeed: 680, spread: 0.09, life: 0.6, color: '#ff77dd', length: 16, sound: 'shoot_uzi' },
  m4: { id: 'm4', name: 'M4', type: 'ranged', cooldown: 0.11, ammo: 30, maxAmmo: 30, bulletSpeed: 860, spread: 0.025, color: '#88ccff', length: 22, sound: 'shoot_m4' },
  ak47: { id: 'ak47', name: 'AK-47', type: 'ranged', cooldown: 0.13, ammo: 30, maxAmmo: 30, bulletSpeed: 800, spread: 0.05, color: '#ffaa55', length: 22, sound: 'shoot_ak47' },
  // Дробовик: веер дробин, бьёт недалеко
  shotgun: { id: 'shotgun', name: 'Дробовик', type: 'ranged', cooldown: 0.27, ammo: 7, maxAmmo: 7, bulletSpeed: 660, life: 0.4,
             color: '#ff4444', length: 24, sound: 'shoot_shotgun', spread: 0.32, pellets: 6 },
  bat: { id: 'bat', name: 'Бита', type: 'melee', cooldown: 0.45, range: 54, color: '#a0622b', length: 18, sound: 'melee_swing' },
  pipe: { id: 'pipe', name: 'Труба', type: 'melee', cooldown: 0.4, range: 48, color: '#9a9a9a', length: 16, sound: 'melee_swing' },
  knife: { id: 'knife', name: 'Нож', type: 'melee', cooldown: 0.26, range: 40, color: '#dddddd', length: 9, sound: 'melee_swing' },
  sword: { id: 'sword', name: 'Меч', type: 'melee', cooldown: 0.38, range: 60, color: '#e8e8ff', length: 22, sound: 'melee_swing' },

  // Редкие — лежат на уровне, врагам не достаются
  rpg: { id: 'rpg', name: 'РПГ', type: 'ranged', cooldown: 1.0, ammo: 3, maxAmmo: 3, bulletSpeed: 430, color: '#ffb040',
         length: 30, sound: 'shoot_shotgun', projectile: 'rocket', rare: true },
  flamer: { id: 'flamer', name: 'Огнемёт', type: 'ranged', cooldown: 0.045, ammo: 200, maxAmmo: 200, bulletSpeed: 380, color: '#ff8a30',
            length: 28, sound: 'throw', projectile: 'flame', rare: true },

  // Эксклюзив Дани: тихая винтовка — выстрелы почти не слышны врагам
  m4s: { id: 'm4s', name: 'M4 с глушителем', type: 'ranged', cooldown: 0.12, ammo: 30, maxAmmo: 30, bulletSpeed: 880, spread: 0.02,
         color: '#9fe0ff', length: 28, sound: 'shoot_m4', silent: true, special: 'dani' },

  // Оружие боссов — трофей для любого героя (снайперка осталась только у врагов-снайперов)
  sniper: { id: 'sniper', name: 'Снайперка', type: 'ranged', cooldown: 0.9, ammo: 7, maxAmmo: 7, bulletSpeed: 1600, damage: 3,
            color: '#ff6060', length: 36, sound: 'sniper_shot', boss: true },
  minigun: { id: 'minigun', name: 'Миниган', type: 'ranged', cooldown: 0.055, ammo: 180, maxAmmo: 180, bulletSpeed: 740, spread: 0.11,
             color: '#ffb040', length: 34, sound: 'shoot_uzi', boss: true },
  goldenUzi: { id: 'goldenUzi', name: 'Золотой Uzi', type: 'ranged', cooldown: 0.06, ammo: 70, maxAmmo: 70, bulletSpeed: 800, spread: 0.05,
               color: '#ffd319', length: 16, sound: 'shoot_uzi', boss: true },
  cleaver: { id: 'cleaver', name: 'Тесак', type: 'melee', cooldown: 0.36, range: 58, color: '#c8ccd4', length: 20, sound: 'melee_swing', boss: true },
  nightstick: { id: 'nightstick', name: 'Дубинка', type: 'melee', cooldown: 0.24, range: 50, color: '#2a2a30', length: 18, sound: 'melee_swing', boss: true },
  spikedBat: { id: 'spikedBat', name: 'Бита с гвоздями', type: 'melee', cooldown: 0.4, range: 62, color: '#7a4a22', length: 22, sound: 'melee_swing', boss: true },
};

// патронов во всём огнестреле на 35% больше
for (const w of Object.values(WEAPONS)) if (w.type === 'ranged') w.ammo = w.maxAmmo = Math.round(w.maxAmmo * 1.35);

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
  if (p.isArmor) return (d.armor || 0) < 2 ? 'armor' : null;
  const w = p.weapon;
  if (!w || !canWield(d.charId, w)) return null;
  if (!d.w1) return 'w1';
  // Даур держит по огнестрелу в каждой руке (но не два ножа/биты)
  if (d.charId === 'daur' && !d.w2 && WEAPONS[d.w1] && WEAPONS[d.w1].type === 'ranged' && w.type === 'ranged') return 'w2';
  return null;
}

// Оружие в руках героя: у Даура во всём огнестреле на 30% больше патронов
function prepWeapon(charId, w) {
  if (w && charId === 'daur' && w.type === 'ranged' && !w._boost) {
    w._boost = true;
    w.maxAmmo = Math.round(WEAPONS[w.id].maxAmmo * 1.3);
    w.ammo = Math.min(w.maxAmmo, Math.round(w.ammo * 1.3));
  }
  return w;
}

// Стартовое оружие героев
const START_WEAPONS = { dani: ['m4s'], gal: ['flamer'], daur: ['uzi', 'uzi'] };
