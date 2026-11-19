// =====================================================================
// Загрузка ресурсов.
// При запуске игры: музыка и фото главных героев (+ крошечные звуки меню).
// Всё остальное (звуки боя, фото персонажей сюжета, музыка главы) —
// перед началом конкретного уровня, на экране загрузки. Загруженное не качается повторно.
// =====================================================================

const UI_SOUNDS = ['menu_move', 'menu_select', 'char_select', 'empty_click', 'game_start'];
const GAME_SOUNDS = [
  'shoot_m4', 'shoot_ak47', 'shoot_glock', 'shoot_uzi', 'shoot_shotgun',
  'door_open', 'stun', 'throw', 'pickup_weapon', 'pickup_health',
  'enemy_death', 'punch', 'melee_swing', 'player_hurt', 'player_death', 'footstep',
  'tank_hit', 'hound_bark', 'sniper_charge', 'sniper_shot',
];
const MUSIC = ['/static/audio/menu_music.mp3', '/static/audio/game_music.mp3'];

const LOAD_LABELS = { sound: 'звуки', music: 'музыка', image: 'изображения', portrait: 'портреты' };

const Assets = {
  done: new Set(),     // ключи загруженного (или отсутствующего — повторно не ищем)

  key(it) { return it.type + ':' + (it.name || it.url); },
  has(it) { return this.done.has(this.key(it)); },
  missing(items) { return items.filter(it => !this.has(it)); },

  // Загрузить список; onProgress(готово, всего, последний элемент)
  async run(items, onProgress) {
    const list = this.missing(items);
    let n = 0;
    const one = async (it) => {
      try {
        if (it.type === 'sound') await AudioSys.loadSound(it.name);
        else if (it.type === 'music') await AudioSys.cacheMusic(it.url);
        else if (it.type === 'image') await this._image(it.url, it.target);
        else if (it.type === 'portrait') await this._portrait(it.name);
      } catch (e) { /* отсутствующий файл не мешает игре */ }
      this.done.add(this.key(it));
      n++;
      if (onProgress) onProgress(n, list.length, it);
    };
    // по 6 файлов одновременно — не забиваем мобильный интернет
    const queue = list.slice();
    const workers = Array.from({ length: Math.min(6, queue.length) }, async () => { while (queue.length) await one(queue.shift()); });
    await Promise.all(workers);
    return list.length;
  },

  _image(url, img) {
    return new Promise(res => {
      img = img || new Image();
      if (img.complete && img.naturalWidth && img.src.endsWith(url)) { res(img); return; }
      img.onload = () => res(img); img.onerror = () => res(null);
      img.src = url;
    });
  },

  // Фото персонажа сюжета: кладётся в StoryAssets, чтобы диалог взял его без задержки
  _portrait(id) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => { StoryAssets.imgs[id] = img; res(img); };
      img.onerror = () => { StoryAssets.imgs[id] = null; res(null); };
      img.src = `/static/img/story/${id}.png`;
    });
  },

  // ---------- что нужно уровню ----------
  bootList(game) {
    return [
      ...['dani', 'gal', 'daur'].map(id => ({ type: 'image', url: `/static/img/${id}.png`, target: game.images[id] })),
      ...MUSIC.map(url => ({ type: 'music', url })),
      ...UI_SOUNDS.map(name => ({ type: 'sound', name })),
    ];
  },

  gameplayList() { return GAME_SOUNDS.map(name => ({ type: 'sound', name })); },

  storyList(idx) {
    const ch = STORY[idx];
    const ids = [...new Set([...ch.intro, ...ch.outro].map(l => l[0]).filter(s => s && CAST[s] && !CAST[s].hero))];
    return [
      ...this.gameplayList(),
      ...ids.map(name => ({ type: 'portrait', name })),
      { type: 'music', url: `/static/audio/story/chapter${idx + 1}.mp3` },
    ];
  },

  tutorialList() { return [...this.gameplayList(), { type: 'portrait', name: 'ereke' }]; },
};
