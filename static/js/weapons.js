const WEAPONS = {
  m4: { id: 'm4', name: 'M4', type: 'ranged', cooldown: 0.12, ammo: 30, maxAmmo: 30, bulletSpeed: 800, color: '#88ccff', length: 22, sound: 'rifle' },
  ak47: { id: 'ak47', name: 'AK-47', type: 'ranged', cooldown: 0.15, ammo: 25, maxAmmo: 25, bulletSpeed: 750, color: '#ffaa55', length: 22, sound: 'rifle' },
  glock: { id: 'glock', name: 'Glock', type: 'ranged', cooldown: 0.25, ammo: 12, maxAmmo: 12, bulletSpeed: 700, color: '#dddddd', length: 14, sound: 'pistol' },
  uzi: { id: 'uzi', name: 'Uzi', type: 'ranged', cooldown: 0.08, ammo: 40, maxAmmo: 40, bulletSpeed: 650, color: '#ff77dd', length: 16, sound: 'smg' },
  shotgun: { id: 'shotgun', name: 'Дробовик', type: 'ranged', cooldown: 0.8, ammo: 6, maxAmmo: 6, bulletSpeed: 600, color: '#ff4444', length: 24, sound: 'rifle' }, // Новое
  bat: { id: 'bat', name: 'Бита', type: 'melee', cooldown: 0.5, range: 52, color: '#a0622b', length: 18, sound: 'swing' },
  pipe: { id: 'pipe', name: 'Труба', type: 'melee', cooldown: 0.45, range: 46, color: '#9a9a9a', length: 16, sound: 'swing' },
  knife: { id: 'knife', name: 'Нож', type: 'melee', cooldown: 0.3, range: 38, color: '#dddddd', length: 9, sound: 'swing' },
  sword: { id: 'sword', name: 'Меч', type: 'melee', cooldown: 0.4, range: 58, color: '#e8e8ff', length: 22, sound: 'swing' }
};

function makeWeapon(id, ammo) {
  const w = { ...WEAPONS[id] };
  w.ammo = ammo !== undefined ? ammo : w.maxAmmo;
  return w;
}