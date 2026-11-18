class Menu {
  constructor(game) {
    this.game = game;
    this.items = ['НАЧАТЬ ЗАБЕГ', 'КАК ИГРАТЬ', 'ТАБЛИЦА ЛИДЕРОВ'];
    this.sel = 0;
    this.t = 0;
    this.showLeaderboard = false;
    this.leaderboard = [];
    this.loadingBoard = false;

    this.showHelp = false;
    this.helpPage = 0;
    this.helpPages = [
      {
        title: 'УПРАВЛЕНИЕ',
        lines: [
          'W A S D  или  СТРЕЛКИ — Движение',
          'МЫШЬ — Прицеливание',
          'ЛКМ — Стрельба / Ближний бой',
          'Q — Бросить оружие',
          'ESC — Пауза / Выход в меню',
          '',
          'Мобильные устройства:',
          'Стик слева — Движение',
          '✶ — Стрельба',
          'Q — Бросок',
          'II — Пауза'
        ]
      },
      {
        title: 'БОЙ',
        lines: [
          'У вас есть 3 сердца (HP).',
          'Аптечки выпадают с врагов.',
          'Враги реагируют на шум.',
          'Убейте всех, чтобы пройти дальше.',
          'При смерти очки идут в лидерборд.'
        ]
      },
      {
        title: 'ПЕРСОНАЖИ',
        lines: [
          'ДАНИ: Скорость +15%, тише.',
          'ГАЛ: 4 HP, сильный ближний бой.',
          'ДАУР: Дробовик, но 2 HP.'
        ]
      }
    ];
  }

  update(dt) {
    this.t += dt;

    // --- Обработка кликов мышью / тапов ---
    if (Input.consumeClick()) {
      const mx = Input.mouse.x;
      const my = Input.mouse.y;
      
      const w = this.game.W;
      const h = this.game.H;

      if (this.showHelp) {
        // Клик по кнопке "Назад" или где угодно для закрытия
        this.showHelp = false; 
        return;
      }

      if (this.showLeaderboard) {
        this.showLeaderboard = false;
        return;
      }

      // Проверка клика по пунктам главного меню
      const itemSize = Math.min(28, w * 0.045);
      this.items.forEach((it, i) => {
        const y = h/2 + 20 + i * (itemSize * 1.6);
        // Простая проверка: попадание в прямоугольник вокруг текста
        if (mx > w/2 - 150 && mx < w/2 + 150 && my > y - itemSize && my < y + itemSize) {
          this.sel = i;
          this._select();
        }
      });
      return; // Если был клик, клавиатуру не обрабатываем
    }

    // --- Обработка клавиатуры ---
    if (this.showHelp) {
      if (Input.wasPressed('Escape') || Input.wasPressed('Enter')) this.showHelp = false;
      if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) this.helpPage = (this.helpPage + 1) % this.helpPages.length;
      if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA')) this.helpPage = (this.helpPage + this.helpPages.length - 1) % this.helpPages.length;
      return;
    }

    if (this.showLeaderboard) {
      if (Input.wasPressed('Escape') || Input.wasPressed('Enter')) this.showLeaderboard = false;
      return;
    }

    if (Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW')) this._move(-1);
    if (Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS')) this._move(1);
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) this._select();
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

    const item = this.items[this.sel];
    if (item === 'НАЧАТЬ ЗАБЕГ') this.game.state = 'charSelect';
    else if (item === 'КАК ИГРАТЬ') { this.showHelp = true; this.helpPage = 0; }
    else if (item === 'ТАБЛИЦА ЛИДЕРОВ') { this.showLeaderboard = true; this._fetchLeaderboard(); }
  }

  _fetchLeaderboard() {
    this.loadingBoard = true;
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => { this.leaderboard = data; this.loadingBoard = false; })
      .catch(() => { this.loadingBoard = false; });
  }

  draw(ctx, w, h) {
    // ... (отрисовка без изменений, как в предыдущем ответе) ...
    // Я продублирую её ниже для полноты
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
    ctx.fillText('Клик / тап — выбор    ENTER — подтвердить', w/2, h - 30);
  }

  _drawHelp(ctx, w, h) {
    const page = this.helpPages[this.helpPage];
    ctx.textAlign = 'center';
    const titleSize = Math.min(36, w * 0.06);
    ctx.font = `bold ${titleSize}px "Courier New", monospace`;
    ctx.fillStyle = P.accent;
    ctx.fillText(page.title, w/2, 60);

    const hintSize = Math.max(12, Math.min(14, w * 0.02));
    ctx.font = `${hintSize}px "Courier New", monospace`;
    ctx.fillStyle = '#555';
    ctx.fillText(`${this.helpPage + 1} / ${this.helpPages.length}`, w/2, 90);

    const lineSize = Math.min(18, w * 0.03);
    ctx.font = `${lineSize}px "Courier New", monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    const startX = w/2 - (w * 0.35);
    let startY = 140;
    
    page.lines.forEach(line => {
      if (line === '') {
        startY += lineSize * 0.7;
      } else {
        ctx.fillStyle = line.startsWith('ДАНИ') || line.startsWith('ГАЛ') || line.startsWith('ДАУР') ? P.yellow : '#fff';
        ctx.fillText(line, startX, startY);
        startY += lineSize * 1.4;
      }
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.font = `${hintSize}px "Courier New", monospace`;
    ctx.fillText('Тап / ESC — назад    A/D — страницы', w/2, h - 30);
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
    ctx.fillText('Тап / ESC — назад', w/2, h - 30);
  }
}