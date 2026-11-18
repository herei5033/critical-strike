class Menu {
  constructor(game) {
    this.game = game;
    this.items = ['НАЧАТЬ ЗАБЕГ', 'КАК ИГРАТЬ', 'ТАБЛИЦА ЛИДЕРОВ', 'МУЗЫКА: ВКЛ'];
    this.sel = 0;
    this.t = 0;
    
    this.showLeaderboard = false;
    this.leaderboard = [];
    this.loadingBoard = false;

    this.showHelp = false;
    this.helpPage = 0; // 0 - Управление, 1 - Персонажи, 2 - Враги
    this.cardIndex = 0; 
    
    this.enemyImages = {
      bandit: new Image(),
      tank: new Image(),
      hound: new Image(),
      sniper: new Image()
    };
    this.enemyImages.bandit.src = '/static/img/enemy_bandit.png';
    this.enemyImages.tank.src = '/static/img/enemy_tank.png';
    this.enemyImages.hound.src = '/static/img/enemy_hound.png';
    this.enemyImages.sniper.src = '/static/img/enemy_sniper.png';

    this.helpPages = [
      {
        title: 'УПРАВЛЕНИЕ И ИГРА',
        lines: [
          'W A S D  или  СТРЕЛКИ — Движение',
          'МЫШЬ — Прицеливание',
          'ЛКМ — Стрельба / Ближний бой',
          'Q — Бросить оружие (оглушает)',
          'ESC — Пауза / Выход в меню',
          '',
          'Мобильные устройства:',
          'Левый стик — Движение',
          'Правый стик — Прицел (авто-стрельба)',
          '✶ — Выстрел / Удар',
          'Q — Бросок',
          'II — Пауза',
          '',
          'Ваша цель — зачистить уровень от всех',
          'врагов. Убивайте их, подбирайте оружие,',
          'ищите аптечки. При смерти очки уходят',
          'в глобальную таблицу лидеров.'
        ]
      },
      { title: 'ПЕРСОНАЖИ' },
      { title: 'ВРАГИ' }
    ];

    this.charsInfo = [
      { 
        id: 'dani', 
        name: 'ДАНИ', 
        perk: 'Хладнокровие', 
        bio: 'Бывший оперативник спецслужб. Предпочитает действовать тихо и быстро. Его навыки скрытности и высокая скорость позволяют ему уходить от перестрелок.',
        stats: '+15% к скорости передвижения.\nВраги замечают его на 20% позже (уменьшен радиус обзора).'
      },
      { 
        id: 'gal', 
        name: 'ГАЛ', 
        perk: 'Танк', 
        bio: 'Уличный боец, привыкший решать вопросы кулаками. Не признает огнестрельное оружие, предпочитая чувствовать хруст костей врага.',
        stats: '+1 дополнительное сердце (4 HP).\nМощный ближний бой (оглушает дольше).\nКулаки наносят двойной стан.'
      },
      { 
        id: 'daur', 
        name: 'ДАУР', 
        perk: 'Оружейник', 
        bio: 'Бывший наемник, знающий оружие лучше, чем самого себя. Стреляет быстро и точно, но пренебрегает защитой, полагаясь на огневую мощь.',
        stats: 'Начинает игру с Дробовиком.\nСкорость стрельбы выше на 15%.\nНо у него только 2 HP.'
      }
    ];

    this.enemiesInfo = [
      {
        id: 'bandit',
        name: 'ОБЫЧНЫЕ БАНДИТЫ',
        bio: 'Уличные головорезы, нанятые для охраны. Вооружены кто чем попало: от пистолетов до бит. Опасны в группах, но поодиночке не представляют большой угрозы.',
        stats: 'Здоровье: 1 HP.\nОружие: случайное (огнестрел/ближний бой).\nПоведение: патрулируют, реагируют на шум.'
      },
      {
        id: 'tank',
        name: 'ТАНК',
        bio: 'Тяжеловес в бронежилете и шлеме. Медлительный, но крайне живучий. Обычно вооружен дробовиком, который превращает его в смертельную угрозу на близкой дистанции.',
        stats: 'Здоровье: 3 HP (требует 3 выстрела).\nОружие: Дробовик.\nОсобенность: невозможно оглушить.\nПри убийстве дропает аптечку.'
      },
      {
        id: 'hound',
        name: 'ПЁС',
        bio: 'Обученная бойцовая собака. Обладает острым нюхом и слухом, атакует молниеносно. Убивается с одного удара, но увернуться от его прыжка очень сложно.',
        stats: 'Здоровье: 1 HP.\nОружие: Когти и клыки.\nСкорость: Очень высокая.\nОбзор: Почти круговой.'
      },
      {
        id: 'sniper',
        name: 'СНАЙПЕР',
        bio: 'Профессионал в маскировочной сетке. Предпочитает работать на дистанции. Использует лазерный прицел. Если вы попали в его поле зрения, у вас есть пара секунд, чтобы спрятаться.',
        stats: 'Здоровье: 1 HP.\nОружие: Снайперская винтовка.\nОсобенность: Лазерный прицел наводится 1.5 сек.\nВыстрел наносит 2 HP урона и пробивает стены.'
      }
    ];
  }

  update(dt) {
    this.t += dt;

    if (Input.wasPressed('MobileUp') || Input.wasPressed('MobileDown') ||
        Input.wasPressed('ArrowUp') || Input.wasPressed('ArrowDown') ||
        Input.wasPressed('KeyW') || Input.wasPressed('KeyS') ||
        Input.wasPressed('ArrowLeft') || Input.wasPressed('ArrowRight') ||
        Input.wasPressed('KeyA') || Input.wasPressed('KeyD')) {
      if (!this.showHelp && !this.showLeaderboard) AudioSys.play('menu_move');
    }

    if (this.showHelp) {
      if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD') || Input.wasPressed('MobileDown')) {
        this.helpPage = (this.helpPage + 1) % 3;
        this.cardIndex = 0;
      }
      if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA') || Input.wasPressed('MobileUp')) {
        this.helpPage = (this.helpPage + 2) % 3;
        this.cardIndex = 0;
      }

      if (this.helpPage === 1) {
        if (Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS')) this.cardIndex = (this.cardIndex + 1) % 3;
        if (Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW')) this.cardIndex = (this.cardIndex + 2) % 3;
      } else if (this.helpPage === 2) {
        if (Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS')) this.cardIndex = (this.cardIndex + 1) % 4;
        if (Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW')) this.cardIndex = (this.cardIndex + 3) % 4;
      }

      if (Input.wasPressed('Escape') || Input.wasPressed('MobileEnter')) {
        this.showHelp = false;
      }

      if (Input.consumeClick()) {
        const mx = Input.mouse.x;
        const my = Input.mouse.y;
        const w = this.game.W;
        const h = this.game.H;
        const cardW = 600;
        const cx = w / 2 - cardW / 2;
        const cy = h / 2 - 350 / 2 + 20;
        
        if (my > cy && my < cy + 350) {
          if (mx < cx - 30) { 
            if (this.helpPage === 1) this.cardIndex = (this.cardIndex + 2) % 3;
            else if (this.helpPage === 2) this.cardIndex = (this.cardIndex + 3) % 4;
          } else if (mx > cx + cardW + 30) { 
            if (this.helpPage === 1) this.cardIndex = (this.cardIndex + 1) % 3;
            else if (this.helpPage === 2) this.cardIndex = (this.cardIndex + 1) % 4;
          } else {
            this.showHelp = false;
          }
        } else {
          this.showHelp = false;
        }
      }
      return;
    }

    if (this.showLeaderboard) {
      if (Input.wasPressed('Escape') || Input.wasPressed('Enter') || Input.wasPressed('MobileEnter') || Input.consumeClick()) {
        this.showLeaderboard = false;
      }
      return;
    }

    if (Input.wasPressed('MobileUp') || Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW')) this._move(-1);
    if (Input.wasPressed('MobileDown') || Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS')) this._move(1);
    if (Input.wasPressed('MobileEnter') || Input.wasPressed('Enter') || Input.wasPressed('Space')) this._select();

    if (Input.consumeClick()) {
      const mx = Input.mouse.x;
      const my = Input.mouse.y;
      const w = this.game.W;
      const h = this.game.H;

      const itemSize = Math.min(28, w * 0.045);
      this.items.forEach((it, i) => {
        const y = h/2 + 20 + i * (itemSize * 1.6);
        if (mx > w/2 - 150 && mx < w/2 + 150 && my > y - itemSize && my < y + itemSize) {
          this.sel = i;
          this._select();
        }
      });
    }
  }

  _move(d) {
    if (this._lock) return;
    this.sel = (this.sel + d + this.items.length) % this.items.length;
    this._lock = true;
    setTimeout(() => this._lock = false, 120);
  }

  _select() {
    if (this._lockEnter) return;
    this._lockEnter = true;
    setTimeout(() => this._lockEnter = false, 200);
    
    AudioSys.play('menu_select');

    const item = this.items[this.sel];
    if (item === 'НАЧАТЬ ЗАБЕГ') {
      this.game.state = 'charSelect';
    } else if (item === 'КАК ИГРАТЬ') {
      this.showHelp = true;
      this.helpPage = 0;
      this.cardIndex = 0;
    } else if (item === 'ТАБЛИЦА ЛИДЕРОВ') {
      this.showLeaderboard = true;
      this._fetchLeaderboard();
    } else if (item.startsWith('МУЗЫКА:')) {
      const enabled = AudioSys.toggleMusic();
      this.items[3] = enabled ? 'МУЗЫКА: ВКЛ' : 'МУЗЫКА: ВЫКЛ';
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

  draw(ctx, w, h) {
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 6; i++) {
      const y = (this.t * 40 + i * 90) % h;
      ctx.fillStyle = i % 2 ? 'rgba(255,42,109,0.06)' : 'rgba(5,217,232,0.05)';
      ctx.fillRect(0, y, w, 18);
    }

    if (this.showHelp) { this._drawHelp(ctx, w, h); return; }
    if (this.showLeaderboard) { this._drawLeaderboard(ctx, w, h); return; }

    ctx.textAlign = 'center';
    const titleSize = Math.min(64, w * 0.1);
    ctx.font = `bold ${titleSize}px "Courier New", monospace`;
    ctx.fillStyle = P.player;
    ctx.fillText('CRITICAL', w/2, h/2 - titleSize * 1.4);
    ctx.fillStyle = P.accent;
    ctx.fillText('STRIKE',   w/2, h/2 - titleSize * 0.5);

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = P.yellow;
    ctx.fillText('CRITICAL', w/2 + 3, h/2 - titleSize * 1.4 + 3);
    ctx.fillText('STRIKE',   w/2 + 3, h/2 - titleSize * 0.5 + 3);
    ctx.globalAlpha = 1;

    const itemSize = Math.min(28, w * 0.045);
    ctx.font = `${itemSize}px "Courier New", monospace`;
    this.items.forEach((it, i) => {
      const y = h/2 + 20 + i * (itemSize * 1.6);
      const active = i === this.sel;
      ctx.fillStyle = active ? P.yellow : '#888';
      ctx.fillText((active ? '> ' : '') + it + (active ? ' <' : ''), w/2, y);
    });

    const hintSize = Math.max(12, Math.min(14, w * 0.02));
    ctx.font = `${hintSize}px "Courier New", monospace`;
    ctx.fillStyle = '#555';
    ctx.fillText('W/S — выбор    ENTER — подтвердить', w/2, h - 30);
  }

  _drawHelp(ctx, w, h) {
    const titleSize = Math.min(36, w * 0.06);
    const hintSize = Math.max(12, Math.min(14, w * 0.02));
    const lineSize = Math.min(18, w * 0.03);
    
    ctx.textAlign = 'center';
    ctx.font = `bold ${titleSize}px "Courier New", monospace`;
    ctx.fillStyle = P.accent;
    ctx.fillText(this.helpPages[this.helpPage].title, w/2, 50);
    
    ctx.font = `${hintSize}px "Courier New", monospace`;
    ctx.fillStyle = '#555';
    ctx.fillText('A/D (▲/▼) — переключение вкладок', w/2, 75);

    if (this.helpPage === 0) {
      ctx.font = `${lineSize}px "Courier New", monospace`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      const startX = w/2 - (w * 0.35);
      let startY = 120;
      
      this.helpPages[0].lines.forEach(line => {
        if (line === '') {
          startY += lineSize * 0.5;
        } else {
          ctx.fillStyle = line.startsWith('W A S D') || line.startsWith('МЫШЬ') || line.startsWith('Мобильные') ? P.yellow : '#fff';
          ctx.fillText(line, startX, startY);
          startY += lineSize * 1.3;
        }
      });
    } 
    else if (this.helpPage === 1) {
      // === Вкладка ПЕРСОНАЖИ ===
      const char = this.charsInfo[this.cardIndex];
      const cardW = 600;
      const cardH = 350;
      const cx = w / 2 - cardW / 2;
      const cy = h / 2 - cardH / 2 + 20;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = P.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cardW, cardH);

      const img = this.game.images[char.id];
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, cx + 20, cy + 20, 200, 200);
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(cx + 20, cy + 20, 200, 200);
      }

      // Текст
      ctx.textAlign = 'left';
      ctx.fillStyle = P.yellow;
      ctx.font = `bold 28px "Courier New", monospace`;
      ctx.fillText(char.name, cx + 240, cy + 40);

      ctx.fillStyle = P.player;
      ctx.font = `bold 18px "Courier New", monospace`;
      ctx.fillText(`Способность: ${char.perk}`, cx + 240, cy + 70);

      ctx.fillStyle = '#fff';
      ctx.font = `14px "Courier New", monospace`;
      this._wrapText(ctx, char.bio, cx + 240, cy + 100, 340, 18);

      // Динамическое смещение для заголовка характеристик
      let statsY = cy + 200; // Примерная высота, если текст короткий

      ctx.fillStyle = P.accent;
      ctx.font = `bold 16px "Courier New", monospace`;
      ctx.fillText('Характеристики:', cx + 240, statsY);
      
      ctx.fillStyle = '#ccc';
      ctx.font = `13px "Courier New", monospace`;
      this._wrapText(ctx, char.stats, cx + 240, statsY + 20, 340, 16);

      // Навигация
      ctx.textAlign = 'center';
      ctx.fillStyle = '#555';
      ctx.font = `${hintSize}px "Courier New", monospace`;
      ctx.fillText('W/S (клик) — листать персонажей', w/2, h - 40);
      ctx.fillText(`< ${this.cardIndex + 1} / 3 >`, w/2, h - 15);
      
      ctx.fillStyle = P.yellow;
      ctx.font = 'bold 30px monospace';
      ctx.fillText('<', cx - 20, cy + cardH/2);
      ctx.fillText('>', cx + cardW + 20, cy + cardH/2);
    }
    else if (this.helpPage === 2) {
      // === Вкладка ВРАГИ ===
      const enemy = this.enemiesInfo[this.cardIndex];
      const cardW = 600;
      const cardH = 350;
      const cx = w / 2 - cardW / 2;
      const cy = h / 2 - cardH / 2 + 20;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = P.player;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cardW, cardH);

      const img = this.enemyImages[enemy.id];
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, cx + 20, cy + 20, 200, 200);
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(cx + 20, cy + 20, 200, 200);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '14px monospace';
        ctx.fillText('NO IMG', cx + 120, cy + 120);
      }

      // Текст
      ctx.textAlign = 'left';
      ctx.fillStyle = P.player;
      ctx.font = `bold 24px "Courier New", monospace`;
      ctx.fillText(enemy.name, cx + 240, cy + 40);

      ctx.fillStyle = '#fff';
      ctx.font = `14px "Courier New", monospace`;
      // Получаем высоту, которую занял текст биографии
      const bioHeight = this._wrapText(ctx, enemy.bio, cx + 240, cy + 70, 340, 18);

      // Смещаем заголовок "Особенности" вниз на высоту биографии + отступ
      const statsY = cy + 70 + bioHeight + 20;

      ctx.fillStyle = P.yellow;
      ctx.font = `bold 16px "Courier New", monospace`;
      ctx.fillText('Особенности:', cx + 240, statsY);
      
      ctx.fillStyle = '#ccc';
      ctx.font = `13px "Courier New", monospace`;
      this._wrapText(ctx, enemy.stats, cx + 240, statsY + 20, 340, 16);

      // Навигация
      ctx.textAlign = 'center';
      ctx.fillStyle = '#555';
      ctx.font = `${hintSize}px "Courier New", monospace`;
      ctx.fillText('W/S (клик) — листать врагов', w/2, h - 40);
      ctx.fillText(`< ${this.cardIndex + 1} / 4 >`, w/2, h - 15);
      
      ctx.fillStyle = P.yellow;
      ctx.font = 'bold 30px monospace';
      ctx.fillText('<', cx - 20, cy + cardH/2);
      ctx.fillText('>', cx + cardW + 20, cy + cardH/2);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.font = `${hintSize}px "Courier New", monospace`;
    ctx.fillText('ESC / Тап — назад', w/2, h - 30);
  }

  _drawLeaderboard(ctx, w, h) {
    ctx.textAlign = 'center';
    const titleSize = Math.min(36, w * 0.06);
    ctx.font = `bold ${titleSize}px "Courier New", monospace`;
    ctx.fillStyle = P.accent;
    ctx.fillText('ТАБЛИЦА ЛИДЕРОВ', w/2, 60);

    const hintSize = Math.max(12, Math.min(14, w * 0.02));

    if (this.loadingBoard) {
      ctx.fillStyle = '#fff';
      ctx.font = `${hintSize * 1.5}px "Courier New", monospace`;
      ctx.fillText('Загрузка...', w/2, h/2);
      return;
    }

    if (this.leaderboard.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = `${hintSize * 1.5}px "Courier New", monospace`;
      ctx.fillText('Пока никого нет...', w/2, h/2);
    } else {
      ctx.font = `${hintSize * 1.5}px "Courier New", monospace`;
      const startY = 120;
      this.leaderboard.slice(0, 10).forEach((entry, i) => {
        const y = startY + i * 30;
        ctx.fillStyle = i === 0 ? P.yellow : '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(`${i + 1}. ${entry.name}`, w/2 - 100, y);
        ctx.textAlign = 'right';
        ctx.fillText(`${entry.score}`, w/2 + 100, y);
      });
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.font = `${hintSize}px "Courier New", monospace`;
    ctx.fillText('ESC / Тап — назад', w/2, h - 30);
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
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
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
    
    // Возвращаем общую высоту текста
    return offsetY;
  }
}