// Справочная информация об оружии для раздела "ОРУЖИЕ"
const WEAPON_INFO = [
  { id: 'glock', name: 'GLOCK 17', type: 'ПИСТОЛЕТ',
    desc: 'Надёжный пистолет, который часто носят бандиты. Точный и предсказуемый, но магазин небольшой — считайте выстрелы.',
    tip: 'Хорош для первых комнат: стреляйте одиночными в голову.' },
  { id: 'uzi', name: 'UZI', type: 'ПИСТОЛЕТ-ПУЛЕМЁТ',
    desc: 'Компактный и бешено скорострельный. Поливает комнату свинцом, но магазин пустеет за три секунды.',
    tip: 'Даур начинает сразу с двумя — и с запасом патронов побольше.' },
  { id: 'm4', name: 'M4', type: 'ШТУРМОВАЯ ВИНТОВКА',
    desc: 'Самые быстрые пули в игре. Стабильная очередь и большой магазин — лучший выбор для длинных коридоров.',
    tip: 'Снайперы тоже носят M4 — подберите её после них.' },
  { id: 'm4s', name: 'M4 С ГЛУШИТЕЛЕМ', type: 'ЭКСКЛЮЗИВ ДАНИ',
    desc: 'Стартовая винтовка Дани. Выстрелы почти не слышны: враги в соседних комнатах ничего не замечают, а вспышки у ствола нет. Подобрать её может только Дани.',
    tip: 'Зачищайте комнаты по одной, пока остальные не подняли тревогу.' },
  { id: 'ak47', name: 'AK-47', type: 'АВТОМАТ',
    desc: 'Мощный и неприхотливый автомат с деревянным прикладом. Чуть медленнее M4, но не менее смертоносен.',
    tip: 'Бережёт патроны лучше UZI и бьёт дальше.' },
  { id: 'shotgun', name: 'ДРОБОВИК', type: 'ПОМПОВОЕ РУЖЬЁ',
    desc: 'Каждый выстрел — шесть дробин веером: в упор сносит всё, но дробь летит недалеко.',
    tip: 'Перезарядка долгая — не промахивайтесь у двери.' },
  { id: 'bat', name: 'БИТА', type: 'ХОЛОДНОЕ ОРУЖИЕ',
    desc: 'Широкий размашистый удар и неплохая дальность. Удары бесшумны — соседние комнаты ничего не услышат.',
    tip: 'Бейте сразу после того, как распахнули дверь.' },
  { id: 'pipe', name: 'ТРУБА', type: 'ХОЛОДНОЕ ОРУЖИЕ',
    desc: 'Тяжёлая ржавая труба. Бьёт чуть быстрее биты, но короче. Валяется почти в каждом подвале.',
    tip: 'Надёжный запасной вариант, когда кончились патроны.' },
  { id: 'knife', name: 'НОЖ', type: 'ХОЛОДНОЕ ОРУЖИЕ',
    desc: 'Самый быстрый удар в игре: чередует выпады и взмахи. Требует подойти вплотную, зато не даёт врагу опомниться.',
    tip: 'Брошенный нож убивает с одного попадания.' },
  { id: 'sword', name: 'МЕЧ', type: 'ХОЛОДНОЕ ОРУЖИЕ',
    desc: 'Максимальная дальность среди холодного оружия и широкая дуга удара с ярким следом клинка.',
    tip: 'Задевает сразу нескольких врагов перед вами.' },
  { id: 'grenade', name: 'ГРАНАТА', type: 'ВЗРЫВЧАТКА',
    desc: 'Осколочная граната. Бросается клавишей G туда, куда смотрит курсор, отскакивает от стен и взрывается через 1.8 секунды. Взрыв ломает мебель, двери и окна.',
    tip: 'Не стойте рядом — осколки ранят и вас. На старте у каждого одна граната.' },
  { id: 'rpg', name: 'РПГ', type: 'РЕДКОЕ ОРУЖИЕ',
    desc: 'Гранатомёт с тремя ракетами. Ракета разгоняется и взрывается от первой преграды или врага. Встречается редко, врагам не достаётся.',
    tip: 'Идеально против босса и толпы за дверью. Не стреляйте в стену в упор.' },
  { id: 'flamer', name: 'ОГНЕМЁТ', type: 'РЕДКОЕ ОРУЖИЕ',
    desc: 'Короткая струя огня поджигает всех впереди и прожигает мебель. Сгоревшие враги остаются обугленными. Встречается редко.',
    tip: 'Бьёт недалеко, зато сквозь толпу — держите его у дверей.' },
  { id: 'sniper', name: 'СНАЙПЕРКА', type: 'ТОЛЬКО ДЛЯ ДАНИ',
    desc: 'Винтовка убитого снайпера. Самая быстрая пуля в игре и тройной урон — пробивает танка с одного выстрела. Поднять её может только Дани.',
    tip: 'Убейте снайпера первым — и его оружие станет вашим.' },
  { id: 'minigun', name: 'МИНИГАН', type: 'ОРУЖИЕ БОССА',
    desc: 'Трофей Инкассатора и Генерала. 180 патронов и бешеный темп стрельбы. Поднять может только Дани.',
    tip: 'Короткими очередями — патроны кончаются быстрее, чем кажется.' },
  { id: 'goldenUzi', name: 'ЗОЛОТОЙ UZI', type: 'ОРУЖИЕ БОССА',
    desc: 'Позолоченный пистолет-пулемёт Директора: быстрее и вместительнее обычного. Поднять может только Дани.',
    tip: 'Лучшее оружие для зачистки офисов.' },
  { id: 'cleaver', name: 'ТЕСАК', type: 'ОРУЖИЕ БОССА',
    desc: 'Тесак Мясника — длинный и тяжёлый, режет с красным следом. Поднять может только Дани.',
    tip: 'Дальше и быстрее обычного ножа.' },
  { id: 'nightstick', name: 'ДУБИНКА', type: 'ОРУЖИЕ БОССА',
    desc: 'Служебная дубинка Вахтёра. Очень быстрые удары. Поднять может только Дани.',
    tip: 'Два-три удара в секунду — врагу не успеть ответить.' },
  { id: 'spikedBat', name: 'БИТА С ГВОЗДЯМИ', type: 'ОРУЖИЕ БОССА',
    desc: 'Любимая бита Вышибалы: самая длинная дистанция среди холодного оружия. Поднять может только Дани.',
    tip: 'Задевает сразу несколько врагов.' },
  { id: 'medkit', name: 'АПТЕЧКА', type: 'ЛЕЧЕНИЕ',
    desc: 'Восстанавливает одно сердце. Лежит на уровне и выпадает из врагов: обычные — в 20% случаев, танк — в 80%.',
    tip: 'При полном здоровье не подбирается — вернитесь за ней позже.' },
];

// Боссы: где встречаются и как их победить
const BOSS_INFO = [
  { id: 'watchman', where: 'СОЛО: КОЛЛЕДЖ',
    desc: 'Старый сторож с тонфой, который ночами гоняет всех из коридоров. Прицеливается и бросается в рывок через всю комнату.',
    tactic: 'Увидели красную линию — отойдите в сторону. Врезавшись в стену, он оглушён: бейте в этот момент.' },
  { id: 'director', where: 'СОЛО: ОФИС',
    desc: 'Хозяин офиса в чёрном костюме. Раскручивает золотой Uzi и поливает комнату веером пуль, на 66% и 33% здоровья зовёт охрану.',
    tactic: 'Прячьтесь за шкафами и стеллажами — сквозь них пули не летят. Атакуйте в паузах между очередями.' },
  { id: 'collector', where: 'СОЛО: БАНК',
    desc: 'Бронированный инкассатор с миниганом в хранилище. Самый живучий стрелок, вызывает подкрепление.',
    tactic: 'Взрывы — лучший аргумент: граната или РПГ снимают больше всего. Не стойте на открытом месте.' },
  { id: 'bouncer', where: 'СОЛО: НОЧНОЙ КЛУБ',
    desc: 'Гора мышц с битой в гвоздях охраняет VIP-зал. Самый быстрый и живучий из тех, кто бросается в рывок.',
    tactic: 'Заманите его в рывок на колонну или стену. Даур с двумя стволами разносит его за секунды.' },
  { id: 'butcher', where: 'БЕСКОНЕЧНЫЙ И КОРПОРАТИВ',
    desc: 'Мясник с окровавленным тесаком. Приходит, когда общий счёт достигает порога, и таранит всех на пути.',
    tactic: 'Расходитесь в стороны — рывок задевает всех, кто на линии. Добивайте, пока он оглушён у стены.' },
  { id: 'general', where: 'БЕСКОНЕЧНЫЙ И КОРПОРАТИВ',
    desc: 'Командир охраны с миниганом. Появляется за очки, стреляет очередями и зовёт подкрепление.',
    tactic: 'Перед очередью он раскручивает ствол — это ваш сигнал спрятаться. Дани наносит ему +10% урона.' },
];

class Menu {
  constructor(game) {
    this.game = game;
    this.items = ['СОЛО ЗАБЕГ', 'КОРПОРАТИВ', 'СПРАВОЧНИК', 'ТАБЛИЦА ЛИДЕРОВ', 'МУЗЫКА: ВКЛ'];
    this.sel = 0;
    this.t = 0;
    this._lastMouse = { x: -1, y: -1 };
    this._selAnim = 0;

    this.showLeaderboard = false;
    this.leaderboard = [];
    this.loadingBoard = false;

    this.showHelp = false;
    this.helpPage = 0; // 0 - Управление, 1 - Персонажи, 2 - Враги, 3 - Оружие
    this.cardIndex = 0;
    this.tabs = ['УПРАВЛЕНИЕ', 'ПЕРСОНАЖИ', 'ВРАГИ', 'БОССЫ', 'ОРУЖИЕ'];

    this.enemyImages = { bandit: new Image(), tank: new Image(), hound: new Image(), sniper: new Image() };
    this.enemyImages.bandit.src = '/static/img/enemy_bandit.png';
    this.enemyImages.tank.src = '/static/img/enemy_tank.png';
    this.enemyImages.hound.src = '/static/img/enemy_hound.png';
    this.enemyImages.sniper.src = '/static/img/enemy_sniper.png';

    this.controls = [
      ['W A S D', 'Движение'], ['МЫШЬ', 'Прицеливание'], ['ЛКМ', 'Стрельба / удар'],
      ['Q', 'Бросить оружие'], ['G', 'Бросить гранату'], ['ПКМ / CTRL', 'Даур: стволы в стороны'], ['SHIFT', 'Заглянуть вперёд'], ['T', 'Чат (корпоратив)'], ['ESC', 'Выход в меню'],
    ];
    this.mobileControls = [
      ['Левый стик', 'Движение'], ['Правый стик', 'Прицел + авто-огонь'], ['✶', 'Выстрел / удар'], ['Q', 'Бросок'], ['G', 'Граната'], ['II', 'Пауза'],
    ];
    this.tips = [
      'Толкайте двери — резко распахнутая дверь сбивает врага с ног.',
      'Оглушённого врага добивайте кулаком или выстрелом.',
      'Убийства подряд дают комбо и множат очки.',
      'Шкафы и стеллажи — укрытие: пули сквозь них не летят.',
      'Выстрелы слышно издалека, удары холодным оружием — нет.',
      'В корпоративе раненого напарника можно поднять — встаньте рядом.',
      'Чем выше общий счёт, тем чаще приходят боссы.',
      'Пули и удары ломают мебель, двери и окна.',
      'Граната (G) отскакивает от стен — бросайте её за угол.',
      'РПГ и огнемёт редкие: подбирайте их сразу.',
      'Дани забирает снайперку убитого снайпера и трофеи боссов.',
      'Гала сбивает бандитов с ног, просто врезаясь в них.',
      'Гала восстанавливает сердце за каждого пятого лично убитого врага.',
      'Дани стреляет из M4 с глушителем — враги в соседних комнатах не слышат выстрелов.',
      'Даур с двумя стволами: зажмите ПКМ или CTRL, чтобы стрелять в обе стороны.',
      'Граната, взорванная вплотную к боссу, ранит его в полтора раза сильнее.',
      'Пройдите колледж, чтобы открыть офис и бесконечный режим.',
    ];

    this.charsInfo = [
      { id: 'dani', name: 'ДАНИ', perk: 'Трофейщик',
        bio: 'Бывший оперативник спецслужб: тихий и меткий. Работает бесшумно и забирает оружие у тех, кто посильнее, — даже у боссов.',
        stats: '3 HP, начинает с M4 с глушителем (только у него).\nВраги замечают его позже.\nПодбирает снайперку и оружие боссов.\n+10% урона по боссам.' },
      { id: 'gal', name: 'ГАЛА', perk: 'Таран',
        bio: 'Уличный боец, который не признаёт оружия. Просто идёт напролом — и бандиты разлетаются в стороны.',
        stats: '5 HP, +20% к скорости. Не подбирает оружие.\nУбивает с одного удара кулаком.\nНа бегу сбивает обычных бандитов.\nКаждый 5-й лично убитый враг: +1 HP.' },
      { id: 'daur', name: 'ДАУР', perk: 'Стрелок',
        bio: 'Бывший наёмник, знающий оружие лучше, чем самого себя. Носит по стволу в каждой руке и стреляет в две стороны сразу.',
        stats: '3 HP, начинает с двумя Uzi.\nВ любом огнестреле на 30% больше патронов.\nДержит два огнестрела (холодное — одно).\nПКМ/CTRL — руки в стороны, Q — бросок по очереди.' },
    ];

    this.enemiesInfo = [
      { id: 'bandit', type: 'normal', name: 'БАНДИТЫ',
        bio: 'Уличные головорезы в кожанках, спортивках и гавайских рубашках. Вооружены чем попало: от пистолетов до бит. Опасны в группах.',
        stats: 'Здоровье: 1 HP.\nОружие: случайное.\nПатрулируют и идут на шум.' },
      { id: 'tank', type: 'tank', name: 'ТАНК',
        bio: 'Тяжеловес в бронежилете и шлеме. Медлительный, но крайне живучий. С дробовиком смертельно опасен на близкой дистанции.',
        stats: 'Здоровье: 3 HP.\nОружие: дробовик.\nНельзя оглушить.\nЧасто роняет аптечку.' },
      { id: 'hound', type: 'hound', name: 'ПЁС',
        bio: 'Обученная бойцовая собака в шипастом ошейнике. Острый нюх и слух, атакует молниеносно — увернуться от прыжка очень сложно.',
        stats: 'Здоровье: 1 HP.\nСкорость: очень высокая.\nОбзор: почти круговой.' },
      { id: 'sniper', type: 'sniper', name: 'СНАЙПЕР',
        bio: 'Профессионал в камуфляже и шапке. Работает на дистанции с лазерным прицелом. Увидели красный луч — у вас пара секунд, чтобы спрятаться.',
        stats: 'Здоровье: 1 HP.\nНаводится 1.5 сек, выстрел — 2 HP.\nРоняет снайперку (для Дани).' },
    ];

    // Манекены для превью спрайтов
    this._previewEnemies = this.enemiesInfo.map(e => ({ look: Sprites.enemyLook(e.type, 4242 + e.id.length * 77), type: e.type }));
    this._previewEnemies[0].weapon = 'ak47';
    this._previewEnemies[1].weapon = 'shotgun';
    this._previewEnemies[3].weapon = 'sniper';

    // Силуэты города для фона
    this._skyline = [];
    let x = 0, s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    while (x < 1100) {
      const bw = 30 + rnd() * 60, bh = 40 + rnd() * 140;
      const wins = [];
      for (let wy = 8; wy < bh - 6; wy += 9) for (let wx = 5; wx < bw - 5; wx += 8) if (rnd() < 0.35) wins.push([wx, wy, rnd()]);
      this._skyline.push({ x, w: bw, h: bh, wins, antenna: rnd() < 0.25 });
      x += bw + 2;
    }
    this._stars = Array.from({ length: 70 }, () => ({ x: rnd(), y: rnd() * 0.5, s: rnd() * 1.6 + 0.4, p: rnd() * 6 }));
  }

  // ================= ВВОД =================
  update(dt) {
    this.t += dt;
    this._selAnim += (this.sel - this._selAnim) * Math.min(1, dt * 14);

    const mx = Input.mouse.x, my = Input.mouse.y;
    const mouseMoved = mx !== this._lastMouse.x || my !== this._lastMouse.y;
    this._lastMouse = { x: mx, y: my };

    if (this.showHelp) { this._updateHelp(mouseMoved); return; }

    if (this.showLeaderboard) {
      if (Input.wasPressed('Escape') || Input.wasPressed('Enter') || Input.wasPressed('MobileEnter') || Input.consumeClick()) {
        this.showLeaderboard = false;
        AudioSys.play('menu_move');
      }
      return;
    }

    if (Input.wasPressed('MobileUp') || Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW')) this._move(-1);
    if (Input.wasPressed('MobileDown') || Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS')) this._move(1);
    if (Input.wasPressed('MobileEnter') || Input.wasPressed('Enter') || Input.wasPressed('Space')) this._select();

    const rects = this._itemRects(this.game.W, this.game.H);
    if (mouseMoved) {
      rects.forEach((r, i) => {
        if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h && this.sel !== i) {
          this.sel = i;
          AudioSys.play('menu_move');
        }
      });
    }
    if (Input.consumeClick()) {
      rects.forEach((r, i) => {
        if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) { this.sel = i; this._select(); }
      });
    }
  }

  _updateHelp() {
    const pages = this.tabs.length;
    const cardsCount = [0, this.charsInfo.length, this.enemiesInfo.length, BOSS_INFO.length, WEAPON_INFO.length][this.helpPage];
    const setPage = p => { this.helpPage = (p + pages) % pages; this.cardIndex = 0; AudioSys.play('menu_move'); };
    const setCard = d => { if (cardsCount) { this.cardIndex = (this.cardIndex + d + cardsCount) % cardsCount; AudioSys.play('menu_move'); } };

    if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) setPage(this.helpPage + 1);
    if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA')) setPage(this.helpPage - 1);
    if (Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS') || Input.wasPressed('MobileDown')) setCard(1);
    if (Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW') || Input.wasPressed('MobileUp')) setCard(-1);
    if (Input.wasPressed('Escape') || Input.wasPressed('MobileEnter')) { this.showHelp = false; AudioSys.play('menu_move'); return; }

    if (Input.consumeClick()) {
      const mx = Input.mouse.x, my = Input.mouse.y;
      const L = this._helpLayout(this.game.W, this.game.H);
      L.tabs.forEach((r, i) => { if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) setPage(i); });
      if (cardsCount) {
        if (this._hit(L.prev, mx, my)) setCard(-1);
        if (this._hit(L.next, mx, my)) setCard(1);
      }
      if (this._hit(L.back, mx, my)) { this.showHelp = false; AudioSys.play('menu_move'); }
    }
  }

  _hit(r, x, y) { return r && x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h; }

  _move(d) {
    if (this._lock) return;
    this.sel = (this.sel + d + this.items.length) % this.items.length;
    AudioSys.play('menu_move');
    this._lock = true;
    setTimeout(() => this._lock = false, 120);
  }

  _select() {
    if (this._lockEnter) return;
    this._lockEnter = true;
    setTimeout(() => this._lockEnter = false, 200);
    AudioSys.play('menu_select');

    const item = this.items[this.sel];
    if (item === 'СОЛО ЗАБЕГ') {
      this.game.campaignUI.open();
    } else if (item === 'КОРПОРАТИВ') {
      this.game.coopUI.open();
    } else if (item === 'СПРАВОЧНИК') {
      this.showHelp = true;
      this.helpPage = 0;
      this.cardIndex = 0;
    } else if (item === 'ТАБЛИЦА ЛИДЕРОВ') {
      this.showLeaderboard = true;
      this._fetchLeaderboard();
    } else if (item.startsWith('МУЗЫКА:')) {
      const enabled = AudioSys.toggleMusic();
      this.items[this.sel] = enabled ? 'МУЗЫКА: ВКЛ' : 'МУЗЫКА: ВЫКЛ';
      if (enabled) AudioSys.playMusic('/static/audio/menu_music.mp3');
    }
  }

  _fetchLeaderboard() {
    this.loadingBoard = true;
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => { this.leaderboard = data; this.loadingBoard = false; })
      .catch(() => { this.loadingBoard = false; });
  }

  // ================= ОБЩИЕ ЭЛЕМЕНТЫ =================
  // Неоновый фон: закат, город, перспективная сетка
  drawBackground(ctx, w, h, t, dim = 0) {
    const hor = h * 0.58;
    const sky = ctx.createLinearGradient(0, 0, 0, hor);
    sky.addColorStop(0, '#05030c');
    sky.addColorStop(0.55, '#1a0730');
    sky.addColorStop(1, '#4a0e4a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hor);

    for (const s of this._stars) {
      ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + s.p));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // солнце с полосами
    const sr = Math.min(w, h) * 0.24, sx = w / 2, sy = hor - sr * 0.3;
    const glow = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 2.2);
    glow.addColorStop(0, 'rgba(255,60,140,0.35)'); glow.addColorStop(1, 'rgba(255,60,140,0)');
    ctx.fillStyle = glow; ctx.fillRect(sx - sr * 2.2, sy - sr * 2.2, sr * 4.4, sr * 4.4);
    ctx.save();
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.clip();
    const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
    sg.addColorStop(0, '#ffe66a'); sg.addColorStop(0.5, '#ff7a5a'); sg.addColorStop(1, '#ff2a8d');
    ctx.fillStyle = sg; ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    ctx.fillStyle = '#1a0730';
    for (let i = 0; i < 7; i++) {
      const yy = sy + i * sr * 0.14 + ((t * 8) % (sr * 0.14));
      ctx.fillRect(sx - sr, yy, sr * 2, 1.5 + i * 1.1);
    }
    ctx.restore();

    // город
    const scale = w / 1000;
    ctx.save();
    ctx.translate(0, hor);
    for (const b of this._skyline) {
      const bx = b.x * scale - 40, bh = b.h * scale * 0.9;
      ctx.fillStyle = '#0a0414';
      ctx.fillRect(bx, -bh, b.w * scale, bh);
      if (b.antenna) { ctx.fillRect(bx + b.w * scale / 2, -bh - 14 * scale, 1.5, 14 * scale); ctx.fillStyle = Math.sin(t * 3 + b.x) > 0 ? '#ff2a6d' : '#3a0a1a'; ctx.fillRect(bx + b.w * scale / 2 - 1, -bh - 16 * scale, 3, 3); }
      for (const [wx, wy, f] of b.wins) {
        const on = Math.sin(t * 0.7 + f * 40) > -0.6;
        if (!on) continue;
        ctx.fillStyle = f < 0.5 ? 'rgba(255,200,120,0.55)' : 'rgba(5,217,232,0.45)';
        ctx.fillRect(bx + wx * scale, -bh + wy * scale * 0.9, 3 * scale, 3 * scale);
      }
    }
    ctx.restore();

    // пол с сеткой
    const fg = ctx.createLinearGradient(0, hor, 0, h);
    fg.addColorStop(0, '#2a0838'); fg.addColorStop(1, '#05020a');
    ctx.fillStyle = fg; ctx.fillRect(0, hor, w, h - hor);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, hor, w, h - hor); ctx.clip();
    ctx.strokeStyle = 'rgba(255,42,180,0.55)';
    ctx.shadowColor = '#ff2ab4'; ctx.shadowBlur = 6;
    ctx.lineWidth = 1.2;
    const off = (t * 0.6) % 1;
    for (let i = 0; i < 18; i++) {
      const z = (i + off) / 18;
      const yy = hor + (h - hor) * z * z;
      ctx.globalAlpha = Math.min(1, z * 2.5);
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = -14; i <= 14; i++) {
      ctx.beginPath(); ctx.moveTo(w / 2 + i * 12, hor); ctx.lineTo(w / 2 + i * w * 0.16, h); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,42,180,0.8)'; ctx.fillRect(0, hor - 1, w, 2);

    if (dim > 0) { ctx.fillStyle = `rgba(4,2,10,${dim})`; ctx.fillRect(0, 0, w, h); }
  }

  // Панель со скошенными углами и неоновой рамкой
  panel(ctx, x, y, w, h, accent = '#05d9e8', alpha = 0.78) {
    const c = 12;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x, y + h); ctx.lineTo(x, y + c); ctx.closePath();
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, `rgba(20,8,36,${alpha})`); g.addColorStop(1, `rgba(6,3,14,${alpha})`);
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = accent; ctx.shadowBlur = 14;
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    ctx.fillStyle = accent;
    ctx.fillRect(x + c + 4, y - 1, 40, 3);
    ctx.fillRect(x + w - 44 - c, y + h - 2, 40, 3);
  }

  glowText(ctx, text, x, y, color, size, align = 'center', blur = 14) {
    ctx.save();
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.shadowColor = color; ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Логотип с хроматическим глитчем
  drawLogo(ctx, w, y, size) {
    const t = this.t;
    const glitch = Math.sin(t * 13) > 0.97 || Math.sin(t * 7.3) > 0.985;
    const jx = glitch ? (Math.random() - 0.5) * 10 : 0;
    ctx.save();
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    const lines = [['CRITICAL', y], ['STRIKE', y + size * 0.95]];
    for (const [txt, ly] of lines) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(5,217,232,0.75)'; ctx.fillText(txt, w / 2 - 3 + jx, ly);
      ctx.fillStyle = 'rgba(255,42,109,0.75)'; ctx.fillText(txt, w / 2 + 3 - jx, ly + 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowColor = '#ff2a6d'; ctx.shadowBlur = 24;
      const g = ctx.createLinearGradient(0, ly - size, 0, ly);
      g.addColorStop(0, '#fff6d0'); g.addColorStop(0.5, '#ffd319'); g.addColorStop(1, '#ff2a6d');
      ctx.fillStyle = g;
      ctx.fillText(txt, w / 2 + jx * 0.3, ly);
      ctx.shadowBlur = 0;
    }
    if (glitch) {
      // смещённая "полоска" логотипа
      const sy = y - size * 0.6 + Math.random() * size * 1.4;
      const img = ctx.getImageData(0, Math.max(0, sy | 0), w | 0, 8);
      ctx.putImageData(img, (Math.random() - 0.5) * 30, Math.max(0, sy | 0));
    }
    ctx.restore();
  }

  _itemRects(w, h) {
    const bw = Math.min(340, w * 0.5), bh = Math.min(36, h * 0.064);
    const y0 = h * 0.47;
    return this.items.map((_, i) => ({ x: w / 2 - bw / 2, y: y0 + i * (bh + 8), w: bw, h: bh }));
  }

  // ================= ГЛАВНЫЙ ЭКРАН =================
  draw(ctx, w, h) {
    this.drawBackground(ctx, w, h, this.t, this.showHelp || this.showLeaderboard ? 0.55 : 0.1);
    if (this.showHelp) { this._drawHelp(ctx, w, h); return; }
    if (this.showLeaderboard) { this._drawLeaderboard(ctx, w, h); return; }

    const titleSize = Math.min(64, w * 0.09);
    this.drawLogo(ctx, w, h * 0.18 + titleSize * 0.6, titleSize);
    ctx.font = `${Math.max(11, Math.min(15, w * 0.018))}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('— НЕОНОВАЯ НОЧЬ. ОДНА ПОПЫТКА. —', w / 2, h * 0.18 + titleSize * 2.05);

    const rects = this._itemRects(w, h);
    const fs = Math.min(22, w * 0.036);
    rects.forEach((r, i) => {
      const active = i === this.sel;
      ctx.save();
      if (active) {
        const pulse = 0.75 + 0.25 * Math.sin(this.t * 6);
        const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
        g.addColorStop(0, 'rgba(255,42,109,0.85)'); g.addColorStop(1, 'rgba(120,20,200,0.85)');
        ctx.fillStyle = g;
        ctx.shadowColor = '#ff2a6d'; ctx.shadowBlur = 22 * pulse;
        ctx.beginPath();
        ctx.moveTo(r.x + 14, r.y); ctx.lineTo(r.x + r.w, r.y); ctx.lineTo(r.x + r.w - 14, r.y + r.h); ctx.lineTo(r.x, r.y + r.h); ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(r.x + 14, r.y + 2, r.w - 28, 2);
        // стрелки
        const ax = 14 + Math.sin(this.t * 8) * 4;
        ctx.fillStyle = '#ffd319';
        ctx.beginPath(); ctx.moveTo(r.x - ax - 10, r.y + r.h / 2 - 7); ctx.lineTo(r.x - ax, r.y + r.h / 2); ctx.lineTo(r.x - ax - 10, r.y + r.h / 2 + 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(r.x + r.w + ax + 10, r.y + r.h / 2 - 7); ctx.lineTo(r.x + r.w + ax, r.y + r.h / 2); ctx.lineTo(r.x + r.w + ax + 10, r.y + r.h / 2 + 7); ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(5,217,232,0.35)'; ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(8,4,18,0.6)';
        ctx.beginPath();
        ctx.moveTo(r.x + 14, r.y); ctx.lineTo(r.x + r.w, r.y); ctx.lineTo(r.x + r.w - 14, r.y + r.h); ctx.lineTo(r.x, r.y + r.h); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.font = `bold ${fs}px "Courier New", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = active ? '#ffffff' : '#b8b0d0';
      ctx.fillText(this.items[i], r.x + r.w / 2, r.y + r.h / 2 + 1);
      ctx.restore();
    });

    // Анимированные герои по бокам
    if (w > 640) {
      const ids = ['dani', 'gal', 'daur'];
      const id = ids[Math.floor(this.t / 4) % 3];
      const wpn = { dani: 'm4s', gal: null, daur: 'uzi' }[id];
      this._drawHeroPreview(ctx, w * 0.13, h * 0.66, 3.2, id, wpn, Math.PI * 0.08);
      const e = this._previewEnemies[Math.floor(this.t / 4) % 4];
      this._drawEnemyPreview(ctx, w * 0.87, h * 0.66, 3.2, e, Math.PI * 0.92);
    }

    // подсказка внизу
    const tip = this.tips[Math.floor(this.t / 5) % this.tips.length];
    const hs = Math.max(11, Math.min(14, w * 0.017));
    ctx.font = `${hs}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#05d9e8';
    ctx.fillText('СОВЕТ: ' + tip, w / 2, h - 46, w - 24);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('W/S или мышь — выбор    ENTER / клик — подтвердить', w / 2, h - 22);
  }

  _drawHeroPreview(ctx, x, y, s, id, weaponId, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(4, 8, 16 * s / 1.6, 10 * s / 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(angle);
    ctx.scale(s, s);
    const p = (this.t * 1.6) % 2;
    Sprites.drawHuman(ctx, Sprites.HEROES[id], {
      t: this.t, walk: this.t * 9, move: 0.85, weaponId,
      punch: weaponId ? null : (p < 0.5 ? { p: p * 2, side: Math.floor(this.t * 1.6) % 2 ? 1 : -1 } : null),
      flash: weaponId && (this.t * 3) % 1 < 0.08, recoil: weaponId ? Math.max(0, 1 - ((this.t * 3) % 1) * 6) : 0,
    });
    ctx.restore();
  }

  _drawEnemyPreview(ctx, x, y, s, e, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(-4, 8, 16 * s / 1.6, 10 * s / 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(angle);
    ctx.scale(s, s);
    if (e.type === 'hound') Sprites.drawDog(ctx, e.look, { t: this.t, walk: this.t * 12, move: 1, bite: Math.max(0, Math.sin(this.t * 4)) });
    else Sprites.drawHuman(ctx, e.look, { t: this.t, walk: this.t * 9, move: 0.8, weaponId: e.weapon || null });
    ctx.restore();
  }

  // ================= СПРАВОЧНИК =================
  _helpLayout(w, h) {
    const n = this.tabs.length;
    const tabW = Math.min(160, (w - 80) / n), tabH = 34;
    const tx0 = w / 2 - (tabW * n + 6 * (n - 1)) / 2;
    const tabs = this.tabs.map((_, i) => ({ x: tx0 + i * (tabW + 6), y: 58, w: tabW, h: tabH }));
    const cardW = Math.min(700, w - 120), cardH = Math.min(340, h - 190);
    const card = { x: w / 2 - cardW / 2, y: 108, w: cardW, h: cardH };
    const prev = { x: card.x - 46, y: card.y + card.h / 2 - 26, w: 36, h: 52 };
    const next = { x: card.x + card.w + 10, y: card.y + card.h / 2 - 26, w: 36, h: 52 };
    const back = { x: w / 2 - 80, y: h - 52, w: 160, h: 34 };
    return { tabs, card, prev, next, back };
  }

  _drawHelp(ctx, w, h) {
    const L = this._helpLayout(w, h);
    this.glowText(ctx, 'СПРАВОЧНИК', w / 2, 40, '#05d9e8', Math.min(30, w * 0.05));

    L.tabs.forEach((r, i) => {
      const active = i === this.helpPage;
      ctx.save();
      ctx.fillStyle = active ? 'rgba(255,42,109,0.85)' : 'rgba(10,5,22,0.75)';
      if (active) { ctx.shadowColor = '#ff2a6d'; ctx.shadowBlur = 16; }
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = active ? '#ffd319' : 'rgba(5,217,232,0.4)';
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.font = `bold ${Math.min(15, r.w / 9)}px "Courier New", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = active ? '#fff' : '#9a94b8';
      ctx.fillText(this.tabs[i], r.x + r.w / 2, r.y + r.h / 2 + 1);
      ctx.restore();
    });

    const c = L.card;
    const accents = ['#05d9e8', '#ffd319', '#ff2a6d', '#ff5a3a', '#c060ff'];
    this.panel(ctx, c.x, c.y, c.w, c.h, accents[this.helpPage]);

    if (this.helpPage === 0) this._drawControls(ctx, c);
    else if (this.helpPage === 1) this._drawCharCard(ctx, c);
    else if (this.helpPage === 2) this._drawEnemyCard(ctx, c);
    else if (this.helpPage === 3) this._drawBossCard(ctx, c);
    else this._drawWeaponCard(ctx, c);

    const count = [0, this.charsInfo.length, this.enemiesInfo.length, BOSS_INFO.length, WEAPON_INFO.length][this.helpPage];
    if (count) {
      for (const [r, dir] of [[L.prev, -1], [L.next, 1]]) {
        ctx.save();
        ctx.fillStyle = 'rgba(10,5,22,0.8)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#ffd319'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        ctx.fillStyle = '#ffd319';
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        ctx.beginPath(); ctx.moveTo(cx - dir * 6, cy - 10); ctx.lineTo(cx + dir * 6, cy); ctx.lineTo(cx - dir * 6, cy + 10); ctx.fill();
        ctx.restore();
      }
      // точки-индикатор
      const dotY = c.y + c.h + 18;
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = i === this.cardIndex ? '#ffd319' : 'rgba(255,255,255,0.25)';
        ctx.fillRect(w / 2 - count * 9 + i * 18, dotY, 10, 4);
      }
    }

    const b = L.back;
    ctx.fillStyle = 'rgba(10,5,22,0.8)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(5,217,232,0.6)'; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.font = `bold 14px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText('◀ НАЗАД (ESC)', b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    ctx.font = `12px "Courier New", monospace`; ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('A/D — вкладки    W/S — листать карточки', w / 2, h - 8);
  }

  _keyCap(ctx, x, y, text, k = 1) {
    ctx.font = this._font(13, k, true);
    const tw = Math.max(34 * k, ctx.measureText(text).width + 16 * k), th = 24 * k - 1;
    ctx.fillStyle = '#05030a'; ctx.fillRect(x, y + 2, tw, th);
    ctx.fillStyle = '#2a1f44'; ctx.fillRect(x, y, tw, th);
    ctx.fillStyle = '#3e3060'; ctx.fillRect(x, y, tw, 3);
    ctx.strokeStyle = '#05d9e8'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + tw / 2, y + th / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    return tw;
  }

  // Текст карточки подгоняется под рамку: draw(k) рисует с масштабом шрифта k и возвращает нижний край.
  // Сначала «сухие» прогоны без рисования, пока текст не влезет (не мельче 65%).
  _fit(ctx, bottom, draw) {
    let k = 1;
    for (let i = 0; i < 8; i++) {
      ctx.fillText = () => {}; ctx.fillRect = () => {}; ctx.strokeRect = () => {};
      let end;
      try { end = draw(k); } finally { delete ctx.fillText; delete ctx.fillRect; delete ctx.strokeRect; }
      if (end <= bottom || k <= 0.65) break;
      k = Math.max(0.65, k - 0.05);
    }
    return draw(k);
  }

  _font(px, k = 1, bold = false) { return `${bold ? 'bold ' : ''}${Math.max(9, Math.round(px * k))}px "Courier New", monospace`; }

  _drawControls(ctx, c) {
    const colW = c.w / 2;
    // ширина колонки клавиш — по самой широкой клавише, чтобы подписи не наезжали
    ctx.font = `bold 13px "Courier New", monospace`;
    const capW = list => Math.max(...list.map(([k]) => Math.max(34, ctx.measureText(k).width + 16)));
    const kw1 = capW(this.controls), kw2 = capW(this.mobileControls);
    const rows = Math.max(this.controls.length, this.mobileControls.length);
    const goal = 'Цель — зачистить уровень от всех врагов. Подбирайте оружие, толкайте двери, ищите аптечки. После смерти очки уходят в общую таблицу лидеров.';
    this._fit(ctx, c.y + c.h - 10, (k) => {
      const step = 25 * k;
      this.glowText(ctx, 'КЛАВИАТУРА И МЫШЬ', c.x + 24, c.y + 30 * k + 4, '#ffd319', 15 * k, 'left', 8);
      this.glowText(ctx, 'ТЕЛЕФОН', c.x + colW + 10, c.y + 30 * k + 4, '#ffd319', 15 * k, 'left', 8);
      const y0 = c.y + 40 * k + 4;
      const col = (list, x, kw, maxW) => list.forEach(([key, d], i) => {
        const y = y0 + i * step;
        this._keyCap(ctx, x, y, key, k);
        ctx.font = this._font(14, k); ctx.textAlign = 'left'; ctx.fillStyle = '#e8e4f8';
        ctx.fillText(d, x + kw * k + 8, y + 17 * k, maxW - kw * k - 12);
      });
      col(this.controls, c.x + 24, kw1, colW - 30);
      col(this.mobileControls, c.x + colW + 10, kw2, colW - 24);
      ctx.font = this._font(13, k); ctx.fillStyle = '#05d9e8'; ctx.textAlign = 'left';
      const gy = y0 + rows * step + 18 * k;
      return gy + this._wrapText(ctx, goal, c.x + 24, gy, c.w - 48, 17 * k) - 13 * k;
    });
  }

  _portrait(ctx, img, x, y, s, accent) {
    ctx.fillStyle = '#05030a'; ctx.fillRect(x - 3, y - 3, s + 6, s + 6);
    if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, x, y, s, s);
    else { ctx.fillStyle = '#222'; ctx.fillRect(x, y, s, s); }
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(x - 2, y - 2, s + 4, s + 4);
    // блик-скан
    const sy = y + ((this.t * 60) % s);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x, sy, s, 6);
  }

  _drawCharCard(ctx, c) {
    const ch = this.charsInfo[this.cardIndex];
    const ps = Math.min(170, c.h - 110);
    this._portrait(ctx, this.game.images[ch.id], c.x + 24, c.y + 24, ps, '#ffd319');
    this._drawHeroPreview(ctx, c.x + 24 + ps / 2, c.y + 24 + ps + 46, 2.2, ch.id, { dani: 'm4s', gal: null, daur: 'uzi' }[ch.id], 0);
    const tx = c.x + ps + 60, tw = c.x + c.w - tx - 24;
    this._fit(ctx, c.y + c.h - 14, (k) => {
      let y = c.y + 20 + 26 * k;
      this.glowText(ctx, ch.name, tx, y, '#ffd319', 28 * k, 'left', 12);
      y += 26 * k;
      ctx.font = this._font(15, k, true); ctx.fillStyle = '#ff2a6d'; ctx.textAlign = 'left';
      ctx.fillText('СПОСОБНОСТЬ: ' + ch.perk.toUpperCase(), tx, y, tw);
      y += 26 * k;
      ctx.font = this._font(13, k); ctx.fillStyle = '#e8e4f8';
      y += this._wrapText(ctx, ch.bio, tx, y, tw, 17 * k);
      y += 4 * k;
      ctx.font = this._font(14, k, true); ctx.fillStyle = '#05d9e8';
      ctx.fillText('ХАРАКТЕРИСТИКИ', tx, y);
      y += 20 * k;
      ctx.font = this._font(13, k); ctx.fillStyle = '#c8c2e0';
      return y + this._wrapText(ctx, ch.stats, tx, y, tw, 17 * k) - 13 * k;
    });
  }

  _drawEnemyCard(ctx, c) {
    const en = this.enemiesInfo[this.cardIndex];
    const ps = Math.min(170, c.h - 110);
    this._portrait(ctx, this.enemyImages[en.id], c.x + 24, c.y + 24, ps, '#ff2a6d');
    this._drawEnemyPreview(ctx, c.x + 24 + ps / 2, c.y + 24 + ps + 46, 2.2, this._previewEnemies[this.cardIndex], 0);
    const tx = c.x + ps + 60, tw = c.x + c.w - tx - 24;
    this._fit(ctx, c.y + c.h - 14, (k) => {
      let y = c.y + 20 + 26 * k;
      this.glowText(ctx, en.name, tx, y, '#ff2a6d', 26 * k, 'left', 12);
      y += 30 * k;
      ctx.font = this._font(13, k); ctx.fillStyle = '#e8e4f8'; ctx.textAlign = 'left';
      y += this._wrapText(ctx, en.bio, tx, y, tw, 17 * k);
      y += 4 * k;
      ctx.font = this._font(14, k, true); ctx.fillStyle = '#ffd319';
      ctx.fillText('ОСОБЕННОСТИ', tx, y);
      y += 20 * k;
      ctx.font = this._font(13, k); ctx.fillStyle = '#c8c2e0';
      return y + this._wrapText(ctx, en.stats, tx, y, tw, 17 * k) - 13 * k;
    });
  }

  _drawBossCard(ctx, c) {
    const b = BOSS_INFO[this.cardIndex];
    const def = BOSS_TYPES[b.id];
    // витрина с анимированным боссом
    const bx = c.x + 22, by = c.y + 22, bw = Math.min(230, c.w * 0.36), bh = c.h - 44;
    const g = ctx.createRadialGradient(bx + bw / 2, by + bh * 0.45, 10, bx + bw / 2, by + bh * 0.45, bw * 0.8);
    g.addColorStop(0, 'rgba(255,60,40,0.3)'); g.addColorStop(1, 'rgba(10,5,22,0.9)');
    ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(255,90,58,0.6)'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    ctx.translate(bx + bw / 2, by + bh * 0.46);
    const bs = Math.min(3.4, bh / 75);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 10, 13.5 * bs, 8 * bs, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(-Math.PI / 2 + Math.sin(this.t * 0.9) * 0.25);
    ctx.scale(bs, bs);
    Sprites.drawHuman(ctx, def.look, { t: this.t, walk: this.t * 8, move: 0.6, weaponId: def.weapon });
    ctx.restore();
    ctx.font = 'bold 12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff5a3a';
    ctx.fillText(b.where, bx + bw / 2, by + bh - 12, bw - 12);

    const tx = bx + bw + 24, tw = c.x + c.w - tx - 24;
    this._fit(ctx, c.y + c.h - 14, (k) => {
      let y = c.y + 20 + 26 * k;
      this.glowText(ctx, def.name, tx, y, '#ff5a3a', 26 * k, 'left', 12);
      y += 22 * k;
      ctx.font = this._font(13, k, true); ctx.fillStyle = '#ffd319'; ctx.textAlign = 'left';
      ctx.fillText(def.title, tx, y, tw);
      y += 22 * k;
      ctx.font = this._font(13, k); ctx.fillStyle = '#e8e4f8';
      y += this._wrapText(ctx, b.desc, tx, y, tw, 16 * k);
      y += 4 * k;
      ctx.font = this._font(13, k, true); ctx.fillStyle = '#05d9e8';
      ctx.fillText('КАК ПОБЕДИТЬ', tx, y);
      y += 18 * k;
      ctx.font = this._font(13, k); ctx.fillStyle = '#c8c2e0';
      y += this._wrapText(ctx, b.tactic, tx, y, tw, 16 * k);
      y += 6 * k;
      ctx.font = this._font(12, k, true); ctx.fillStyle = '#9a94b8';
      y += this._wrapText(ctx, `ЗДОРОВЬЕ: ${def.hp} (+50% за каждого напарника)`, tx, y, tw, 16 * k);
      ctx.fillText(`НАГРАДА: ${def.bonus} очков`, tx, y);
      y += 18 * k;
      ctx.fillStyle = '#ff7aff';
      ctx.fillText(`ТРОФЕЙ: ${WEAPONS[def.drop] ? WEAPONS[def.drop].name : '—'} (только Дани)`, tx, y, tw);
      return y;
    });
  }

  _weaponStats(info) {
    if (info.id === 'medkit' || info.id === 'grenade') return null;
    const w = WEAPONS[info.id];
    if (w.type === 'ranged') {
      const rate = 1 / w.cooldown;
      const pellets = w.pellets || 1;
      return [
        ['УРОН ЗА ВЫСТРЕЛ', pellets / 5, pellets > 1 ? `${pellets} дробин` : '1 пуля'],
        ['СКОРОСТРЕЛЬНОСТЬ', rate / 12.5, `${rate.toFixed(1)} выстр/с`],
        ['МАГАЗИН', w.maxAmmo / 40, `${w.maxAmmo} патр.`],
        ['СКОРОСТЬ ПУЛИ', w.bulletSpeed / 800, `${w.bulletSpeed} px/с`],
        w.silent ? ['ШУМ', 0.12, 'почти бесшумно'] : ['ШУМ', 1, 'громко'],
      ];
    }
    return [
      ['УРОН', 1, 'убивает с удара'],
      ['СКОРОСТЬ УДАРА', 0.3 / w.cooldown, `${(1 / w.cooldown).toFixed(1)} удар/с`],
      ['ДАЛЬНОСТЬ', w.range / 58, `${w.range} px`],
      ['ПРИ БРОСКЕ', 1, 'убивает'],
      ['ШУМ', 0.08, 'бесшумно'],
    ];
  }

  _drawWeaponCard(ctx, c) {
    const info = WEAPON_INFO[this.cardIndex];
    // витрина с оружием
    const bx = c.x + 22, by = c.y + 22, bw = Math.min(260, c.w * 0.4), bh = c.h - 44;
    const g = ctx.createRadialGradient(bx + bw / 2, by + bh * 0.4, 10, bx + bw / 2, by + bh * 0.4, bw * 0.7);
    g.addColorStop(0, 'rgba(192,96,255,0.35)'); g.addColorStop(1, 'rgba(10,5,22,0.9)');
    ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(192,96,255,0.6)'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    ctx.strokeStyle = 'rgba(192,96,255,0.12)';
    for (let gx = bx; gx < bx + bw; gx += 16) { ctx.beginPath(); ctx.moveTo(gx, by); ctx.lineTo(gx, by + bh); ctx.stroke(); }
    for (let gy = by; gy < by + bh; gy += 16) { ctx.beginPath(); ctx.moveTo(bx, gy); ctx.lineTo(bx + bw, gy); ctx.stroke(); }

    ctx.save();
    ctx.translate(bx + bw / 2, by + bh * 0.42 + Math.sin(this.t * 2) * 4);
    ctx.rotate(Math.sin(this.t * 0.8) * 0.12 - 0.15);
    if (info.id === 'medkit') { ctx.scale(5, 5); Sprites.drawMedkit(ctx); }
    else if (info.id === 'grenade') { ctx.scale(8, 8); Sprites.drawGrenade(ctx, this.t, false); }
    else {
      const len = { m4s: 48, glock: 13, uzi: 22, goldenUzi: 22, m4: 40, ak47: 38, shotgun: 42, sniper: 49, minigun: 40, rpg: 49, flamer: 37, bat: 30, spikedBat: 30, pipe: 28, knife: 19, sword: 39, cleaver: 26, nightstick: 27 }[info.id] || 30;
      const sc = Math.min(7, (bw - 40) / len);
      ctx.scale(sc, sc);
      ctx.translate(-len / 2 + ({ m4s: 11, m4: 11, ak47: 11, shotgun: 11, sniper: 13, rpg: 12, flamer: 10, minigun: 6, uzi: 9, goldenUzi: 9, bat: 5, spikedBat: 5, pipe: 5, knife: 5, sword: 8, cleaver: 5, nightstick: 5 }[info.id] || 2), 0);
      Sprites.drawWeapon(ctx, info.id, true);
    }
    ctx.restore();
    ctx.font = `bold 12px "Courier New", monospace`; ctx.textAlign = 'center';
    ctx.fillStyle = '#c060ff'; ctx.fillText(info.type, bx + bw / 2, by + bh - 14);

    // текст и характеристики
    const tx = bx + bw + 24, tw = c.x + c.w - tx - 24;
    this._fit(ctx, c.y + c.h - 14, (k) => {
      let y = c.y + 20 + 26 * k;
      this.glowText(ctx, info.name, tx, y, '#ffd319', 26 * k, 'left', 12);
      y += 26 * k;
      ctx.font = this._font(13, k); ctx.fillStyle = '#e8e4f8'; ctx.textAlign = 'left';
      y += this._wrapText(ctx, info.desc, tx, y, tw, 16 * k);
      const stats = this._weaponStats(info);
      if (stats) {
        y += 8 * k;
        for (const [label, v, txt] of stats) {
          ctx.font = this._font(11, k, true); ctx.fillStyle = '#9a94b8';
          ctx.fillText(label, tx, y);
          ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.fillText(txt, tx + tw, y); ctx.textAlign = 'left';
          const segs = 12, fill = Math.round(Utils.clamp(v, 0, 1) * segs);
          for (let i = 0; i < segs; i++) {
            ctx.fillStyle = i < fill ? (i < segs * 0.5 ? '#05d9e8' : i < segs * 0.8 ? '#ffd319' : '#ff2a6d') : 'rgba(255,255,255,0.1)';
            ctx.fillRect(tx + i * (tw / segs), y + 4 * k, tw / segs - 2, 5 * k);
          }
          y += 24 * k;
        }
      } else {
        y += 10 * k;
        const med = info.id === 'medkit';
        if (med && !ctx.hasOwnProperty('fillText')) for (let i = 0; i < 3; i++) Sprites.star(ctx, tx + 10 + i * 18, y, 6, '#ff5a64');
        ctx.font = this._font(14, k, true); ctx.fillStyle = med ? '#ff5a64' : '#9adf5a';
        ctx.fillText(med ? '+1 СЕРДЦЕ' : 'G — БРОСИТЬ, ВЗРЫВ ЧЕРЕЗ 1.8 С', med ? tx + 64 : tx, y + 5, tw);
        y += 30 * k;
      }
      ctx.font = this._font(12, k, true); ctx.fillStyle = '#05d9e8';
      return y + this._wrapText(ctx, '» ' + info.tip, tx, y, tw, 15 * k) - 11 * k;
    });
  }

  // ================= ТАБЛИЦА ЛИДЕРОВ =================
  _drawLeaderboard(ctx, w, h) {
    this.glowText(ctx, 'ТАБЛИЦА ЛИДЕРОВ', w / 2, 52, '#05d9e8', Math.min(34, w * 0.055));
    const pw = Math.min(520, w - 60), ph = Math.min(380, h - 140);
    const px = w / 2 - pw / 2, py = 80;
    this.panel(ctx, px, py, pw, ph, '#ffd319');

    if (this.loadingBoard) {
      ctx.font = `18px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText('Загрузка' + '.'.repeat(1 + Math.floor(this.t * 3) % 3), w / 2, py + ph / 2);
    } else if (this.leaderboard.length === 0) {
      ctx.font = `18px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#888';
      ctx.fillText('Пока никого нет...', w / 2, py + ph / 2);
    } else {
      ctx.font = `bold 12px "Courier New", monospace`; ctx.fillStyle = '#9a94b8'; ctx.textAlign = 'left';
      ctx.fillText('#', px + 26, py + 30); ctx.fillText('ИГРОК', px + 70, py + 30);
      ctx.textAlign = 'right'; ctx.fillText('ОЧКИ', px + pw - 26, py + 30);
      const rowH = Math.min(30, (ph - 50) / 10);
      const medal = ['#ffd319', '#d0d6e0', '#e08a4a'];
      this.leaderboard.slice(0, 10).forEach((e, i) => {
        const y = py + 42 + i * rowH;
        const appear = Utils.clamp(this.t * 8 - i * 0.6, 0, 1);
        ctx.globalAlpha = appear;
        if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(px + 14, y, pw - 28, rowH - 2); }
        if (i < 3) { ctx.fillStyle = medal[i]; ctx.fillRect(px + 14, y, 3, rowH - 2); }
        ctx.font = `bold ${Math.min(18, rowH * 0.6)}px "Courier New", monospace`;
        ctx.textAlign = 'left'; ctx.fillStyle = i < 3 ? medal[i] : '#c8c2e0';
        ctx.fillText(String(i + 1).padStart(2, '0'), px + 26, y + rowH * 0.68);
        // портреты персонажей и метка командного забега
        const chars = e.players ? e.players.map(p => p.char) : [e.char];
        let nx = px + 70;
        for (const c of chars) {
          const img = c && this.game.images[c];
          if (img && img.complete && img.naturalWidth) { ctx.drawImage(img, nx, y + 2, rowH - 6, rowH - 6); nx += rowH - 3; }
        }
        if (e.mode === 'coop') {
          ctx.font = `bold ${Math.min(11, rowH * 0.4)}px "Courier New", monospace`;
          ctx.fillStyle = '#05d9e8'; ctx.fillText('КОРП', nx + 2, y + rowH * 0.66);
          nx += 40;
          ctx.font = `bold ${Math.min(15, rowH * 0.5)}px "Courier New", monospace`;
        }
        ctx.fillStyle = '#ffffff'; ctx.fillText(e.name, nx + 4, y + rowH * 0.68, px + pw - 120 - nx);
        ctx.textAlign = 'right'; ctx.fillStyle = i === 0 ? '#ffd319' : '#05d9e8';
        ctx.font = `bold ${Math.min(18, rowH * 0.6)}px "Courier New", monospace`;
        ctx.fillText(String(e.score), px + pw - 26, y + rowH * 0.68);
        ctx.globalAlpha = 1;
      });
    }
    ctx.font = `13px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('ESC / клик — назад', w / 2, h - 24);
  }

  // Возвращает высоту, которую занял текст
  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const paragraphs = text.split('\n');
    let offsetY = 0;
    for (let p = 0; p < paragraphs.length; p++) {
      const words = paragraphs[p].split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
          ctx.fillText(line, x, y + offsetY);
          line = words[n] + ' ';
          offsetY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y + offsetY);
      offsetY += lineHeight;
    }
    return offsetY;
  }
}
