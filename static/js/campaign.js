// =====================================================================
// СОЛО-КАМПАНИЯ: четыре статичных уровня. Планировка задана вручную,
// мебель и враги расставляются с фиксированным seed — уровень всегда одинаковый.
// Комнаты — внутренние прямоугольники; между соседними ровно одна клетка стены.
// =====================================================================
const CAMPAIGN = [
  {
    id: 'college', name: 'КОЛЛЕДЖ', sub: 'Пустые аудитории и тёмные коридоры', color: '#ffd319', seed: 110301,
    boss: 'watchman', density: 0.65, mix: { tank: 0, hound: 0.05, sniper: 0 },
    weapons: ['bat', 'pipe', 'knife', 'bat', 'glock'],
    start: 0, bossRoom: 8,
    rooms: [
      { x: 3, y: 3, w: 12, h: 16, type: 'lobby', name: 'Холл' },
      { x: 16, y: 3, w: 12, h: 16, type: 'classroom', name: 'Аудитория 101' },
      { x: 29, y: 3, w: 12, h: 16, type: 'classroom', name: 'Аудитория 102' },
      { x: 42, y: 3, w: 15, h: 16, type: 'library', name: 'Библиотека' },
      { x: 3, y: 20, w: 54, h: 3, type: 'hall', name: 'Коридор' },
      { x: 3, y: 24, w: 8, h: 8, type: 'bathroom', name: 'Туалет' },
      { x: 3, y: 33, w: 8, h: 9, type: 'office', name: 'Учительская' },
      { x: 12, y: 24, w: 11, h: 18, type: 'classroom', name: 'Аудитория 103' },
      { x: 24, y: 24, w: 19, h: 18, type: 'gym', name: 'Спортзал' },
      { x: 44, y: 24, w: 13, h: 18, type: 'kitchen', name: 'Столовая' },
    ],
    links: [[4, 0, 'door'], [4, 1, 'door'], [4, 2, 'door'], [4, 3, 'door'], [0, 1, 'door'], [2, 3, 'arch'],
            [4, 5, 'door'], [4, 7, 'door'], [4, 8, 'arch'], [4, 9, 'door'], [5, 6, 'door'], [6, 7, 'door'], [8, 9, 'door']],
  },
  {
    id: 'office', name: 'ОФИС', sub: 'Опенспейс, где никто не уходит домой', color: '#05d9e8', seed: 220402,
    boss: 'director', density: 0.85, mix: { tank: 0.03, hound: 0.06, sniper: 0.05 },
    weapons: ['glock', 'uzi', 'bat', 'pipe', 'knife', 'm4'],
    start: 0, bossRoom: 11,
    rooms: [
      { x: 3, y: 3, w: 14, h: 12, type: 'lobby', name: 'Ресепшн' },
      { x: 3, y: 16, w: 14, h: 12, type: 'storage', name: 'Архив' },
      { x: 3, y: 29, w: 14, h: 13, type: 'server', name: 'Охрана' },
      { x: 18, y: 3, w: 3, h: 39, type: 'hall', name: 'Коридор' },
      { x: 22, y: 3, w: 20, h: 17, type: 'office', name: 'Опенспейс А' },
      { x: 43, y: 3, w: 14, h: 10, type: 'lounge', name: 'Переговорная' },
      { x: 43, y: 14, w: 14, h: 6, type: 'kitchen', name: 'Кухня' },
      { x: 22, y: 21, w: 35, h: 3, type: 'hall', name: 'Коридор' },
      { x: 22, y: 25, w: 16, h: 17, type: 'office', name: 'Опенспейс Б' },
      { x: 39, y: 25, w: 8, h: 8, type: 'server', name: 'Серверная' },
      { x: 39, y: 34, w: 8, h: 8, type: 'bathroom', name: 'Туалет' },
      { x: 48, y: 25, w: 9, h: 17, type: 'lounge', name: 'Кабинет директора' },
    ],
    links: [[0, 3, 'door'], [1, 3, 'door'], [2, 3, 'door'], [0, 1, 'door'], [3, 4, 'arch'], [3, 7, 'arch'],
            [4, 5, 'door'], [4, 6, 'arch'], [4, 7, 'door'], [6, 7, 'door'], [7, 8, 'arch'], [7, 9, 'door'],
            [7, 11, 'door'], [9, 10, 'door'], [8, 10, 'door']],
  },
  {
    id: 'bank', name: 'БАНК', sub: 'Сейфы открываются только силой', color: '#3fff8f', seed: 330503,
    boss: 'collector', density: 1.0, mix: { tank: 0.08, hound: 0.05, sniper: 0.08 },
    weapons: ['m4', 'ak47', 'shotgun', 'glock', 'uzi', 'bat'],
    start: 0, bossRoom: 8,
    rooms: [
      { x: 3, y: 33, w: 10, h: 9, type: 'lobby', name: 'Вход' },
      { x: 3, y: 14, w: 24, h: 18, type: 'lobby', name: 'Операционный зал' },
      { x: 28, y: 14, w: 10, h: 18, type: 'teller', name: 'Кассы' },
      { x: 3, y: 3, w: 11, h: 10, type: 'office', name: 'Управляющий' },
      { x: 15, y: 3, w: 12, h: 10, type: 'office', name: 'Кредитный отдел' },
      { x: 28, y: 3, w: 10, h: 10, type: 'server', name: 'Охрана' },
      { x: 39, y: 3, w: 3, h: 39, type: 'hall', name: 'Служебный коридор' },
      { x: 43, y: 3, w: 14, h: 14, type: 'storage', name: 'Тамбур' },
      { x: 43, y: 18, w: 14, h: 14, type: 'vault', name: 'Хранилище' },
      { x: 43, y: 33, w: 14, h: 9, type: 'storage', name: 'Архив' },
      { x: 14, y: 33, w: 13, h: 9, type: 'kitchen', name: 'Комната персонала' },
      { x: 28, y: 33, w: 10, h: 9, type: 'bathroom', name: 'Туалет' },
    ],
    links: [[0, 1, 'door'], [1, 2, 'arch'], [1, 3, 'door'], [1, 4, 'door'], [2, 5, 'door'], [2, 6, 'door'],
            [5, 6, 'door'], [6, 7, 'door'], [7, 8, 'door'], [8, 9, 'door'], [6, 9, 'door'], [1, 10, 'door'],
            [0, 10, 'door'], [2, 11, 'door'], [3, 4, 'door']],
  },
  {
    id: 'club', name: 'НОЧНОЙ КЛУБ', sub: 'Музыка громче выстрелов', color: '#ff2a6d', seed: 440604,
    boss: 'bouncer', density: 1.2, mix: { tank: 0.1, hound: 0.12, sniper: 0.08 },
    weapons: ['uzi', 'ak47', 'shotgun', 'knife', 'sword', 'm4', 'bat'],
    start: 0, bossRoom: 8,
    rooms: [
      { x: 3, y: 17, w: 8, h: 9, type: 'lobby', name: 'Фойе' },
      { x: 3, y: 3, w: 8, h: 13, type: 'bathroom', name: 'Туалет' },
      { x: 12, y: 3, w: 10, h: 13, type: 'office', name: 'Офис клуба' },
      { x: 12, y: 19, w: 10, h: 8, type: 'hall', name: 'Проход' },
      { x: 3, y: 28, w: 19, h: 14, type: 'storage', name: 'Склад' },
      { x: 23, y: 3, w: 22, h: 6, type: 'stage', name: 'Сцена' },
      { x: 23, y: 10, w: 22, h: 24, type: 'club', name: 'Танцпол' },
      { x: 23, y: 35, w: 22, h: 7, type: 'bar', name: 'Бар' },
      { x: 46, y: 3, w: 11, h: 12, type: 'lounge', name: 'VIP-зал' },
      { x: 46, y: 16, w: 11, h: 10, type: 'lounge', name: 'VIP-ложа' },
      { x: 46, y: 27, w: 11, h: 15, type: 'storage', name: 'Закулисье' },
    ],
    links: [[0, 1, 'door'], [0, 3, 'door'], [1, 2, 'door'], [2, 5, 'door'], [3, 6, 'arch'], [3, 4, 'door'],
            [5, 6, 'door'], [6, 7, 'arch'], [6, 8, 'door'], [6, 9, 'door'], [6, 10, 'door'], [7, 10, 'door'],
            [4, 7, 'door'], [8, 9, 'door']],
  },
];

// Прогресс хранится в браузере: сколько уровней открыто
const Progress = {
  unlocked() { try { return Math.max(1, Math.min(CAMPAIGN.length, parseInt(localStorage.getItem('cs_unlocked') || '1', 10) || 1)); } catch (e) { return 1; } },
  unlock(n) { try { if (n > this.unlocked()) localStorage.setItem('cs_unlocked', String(Math.min(CAMPAIGN.length, n))); } catch (e) {} },
  endlessOpen() { return this.unlocked() >= 2; },
};

// Экран выбора уровня
class CampaignUI {
  constructor(game) {
    this.game = game;
    this.sel = 0;
    this.t = 0;
    this.msg = ''; this.msgT = 0;
  }

  // карточки: 4 уровня + бесконечный режим
  cards() {
    const open = Progress.unlocked();
    const list = CAMPAIGN.map((L, i) => ({ id: i, name: L.name, sub: L.sub, color: L.color, locked: i >= open, num: i + 1 }));
    list.push({ id: 'endless', name: 'БЕСКОНЕЧНЫЙ', sub: 'Случайные этажи и боссы по очкам', color: '#c060ff', locked: !Progress.endlessOpen(), num: '∞' });
    return list;
  }

  open() {
    this.sel = Math.min(this.sel, Progress.unlocked() - 1);
    this.game.state = 'levelSelect';
  }

  _rects(w, h) {
    const n = 5, gap = 12;
    const cw = Math.min(170, (w - 60 - gap * (n - 1)) / n), ch = Math.min(300, h * 0.56);
    const x0 = w / 2 - (n * cw + (n - 1) * gap) / 2, y = h * 0.24;
    return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  }

  _choose(i) {
    const c = this.cards()[i];
    if (c.locked) {
      this.msg = c.id === 'endless' ? 'Откроется после прохождения колледжа' : `Сначала пройдите «${CAMPAIGN[c.id - 1].name}»`;
      this.msgT = 2.5;
      AudioSys.play('empty_click');
      return;
    }
    AudioSys.play('menu_select');
    this.game.soloMode = c.id;
    this.game.state = 'charSelect';
  }

  update(dt) {
    this.t += dt;
    this.msgT = Math.max(0, this.msgT - dt);
    const n = this.cards().length;
    if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA') || Input.wasPressed('MobileUp')) { this.sel = (this.sel + n - 1) % n; AudioSys.play('menu_move'); }
    if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD') || Input.wasPressed('MobileDown')) { this.sel = (this.sel + 1) % n; AudioSys.play('menu_move'); }
    if (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter')) this._choose(this.sel);
    if (Input.wasPressed('Escape')) { this.game.toMenu(); return; }
    const mx = Input.mouse.x, my = Input.mouse.y;
    const rects = this._rects(this.game.W, this.game.H);
    const click = Input.consumeClick();
    rects.forEach((r, i) => {
      if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) {
        if (this.sel !== i && (this._lm || 0) !== mx + my) { this.sel = i; }
        if (click) this._choose(i);
      }
    });
    this._lm = mx + my;
  }

  draw(ctx, w, h) {
    const M = this.game.menu;
    M.drawBackground(ctx, w, h, this.t, 0.5);
    M.glowText(ctx, 'СОЛО ЗАБЕГ', w / 2, 56, '#ffd319', Math.min(40, w * 0.06), 'center', 18);
    ctx.font = '13px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('выберите уровень — каждый следующий сложнее, в конце ждёт босс', w / 2, 80);

    const cards = this.cards();
    this._rects(w, h).forEach((r, i) => {
      const c = cards[i], active = i === this.sel;
      ctx.save();
      if (active) { ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(1.05, 1.05); ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2)); }
      M.panel(ctx, r.x, r.y, r.w, r.h, c.locked ? 'rgba(120,110,140,0.5)' : c.color, 0.85);
      // эмблема уровня
      const cx = r.x + r.w / 2, cy = r.y + r.h * 0.34;
      ctx.globalAlpha = c.locked ? 0.25 : 1;
      this._emblem(ctx, c.id, cx, cy, r.w * 0.32, c.locked ? '#4a4460' : c.color);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.min(30, r.w / 5)}px "Courier New", monospace`;
      ctx.fillStyle = c.locked ? '#555' : c.color;
      ctx.fillText(String(c.num), r.x + 22, r.y + 32);
      ctx.font = `bold ${Math.min(17, r.w / 9)}px "Courier New", monospace`;
      ctx.fillStyle = c.locked ? '#777' : '#ffffff';
      ctx.fillText(c.name, cx, r.y + r.h * 0.64, r.w - 12);
      ctx.font = `${Math.min(11, r.w / 15)}px "Courier New", monospace`;
      ctx.fillStyle = c.locked ? '#555' : '#c8c2e0';
      M._wrapText(ctx, c.sub, cx, r.y + r.h * 0.72, r.w - 18, 14);
      if (c.locked) {
        // замок
        const lx = cx, ly = r.y + r.h * 0.88;
        ctx.strokeStyle = '#9a94b8'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(lx, ly - 8, 7, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#9a94b8'; ctx.fillRect(lx - 10, ly - 8, 20, 15);
        ctx.fillStyle = '#2a2040'; ctx.fillRect(lx - 1.5, ly - 3, 3, 6);
      } else if (typeof c.id === 'number') {
        const diff = c.id + 1;
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = k < diff ? c.color : 'rgba(255,255,255,0.15)';
          ctx.fillRect(cx - 34 + k * 18, r.y + r.h * 0.88, 14, 5);
        }
        ctx.font = '10px "Courier New", monospace'; ctx.fillStyle = '#9a94b8';
        ctx.fillText('СЛОЖНОСТЬ', cx, r.y + r.h * 0.88 + 18);
      }
      ctx.restore();
    });

    if (this.msgT > 0) {
      ctx.globalAlpha = Math.min(1, this.msgT);
      ctx.font = 'bold 15px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd319';
      ctx.fillText(this.msg, w / 2, h - 60);
      ctx.globalAlpha = 1;
    }
    ctx.font = '13px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('A/D или мышь — выбор    ENTER — дальше    ESC — назад', w / 2, h - 26);
  }

  // Простые неоновые эмблемы уровней
  _emblem(ctx, id, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5;
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.beginPath();
    if (id === 0) { // шапочка выпускника
      ctx.moveTo(-s, 0); ctx.lineTo(0, -s * 0.5); ctx.lineTo(s, 0); ctx.lineTo(0, s * 0.5); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.25); ctx.lineTo(-s * 0.55, s * 0.75); ctx.quadraticCurveTo(0, s * 1.05, s * 0.55, s * 0.75); ctx.lineTo(s * 0.55, s * 0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.8, 0.1 * s); ctx.lineTo(s * 0.8, s * 0.7); ctx.stroke();
    } else if (id === 1) { // небоскрёб
      ctx.strokeRect(-s * 0.45, -s, s * 0.9, s * 2);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) ctx.fillRect(-s * 0.28 + j * s * 0.36, -s * 0.75 + i * s * 0.45, s * 0.2, s * 0.22);
    } else if (id === 2) { // сейф
      ctx.strokeRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.45); ctx.lineTo(Math.cos(a) * s * 0.65, Math.sin(a) * s * 0.65); ctx.stroke(); }
    } else if (id === 3) { // диско-шар и ноты
      ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.7, 0); ctx.lineTo(s * 0.7, 0); ctx.moveTo(0, -s * 0.7); ctx.lineTo(0, s * 0.7); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.35, s * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -s * 0.7); ctx.lineTo(0, -s); ctx.stroke();
    } else { // бесконечность
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(s * 0.5, -s * 0.6, s, -s * 0.2, s, 0); ctx.bezierCurveTo(s, s * 0.2, s * 0.5, s * 0.6, 0, 0);
      ctx.bezierCurveTo(-s * 0.5, -s * 0.6, -s, -s * 0.2, -s, 0); ctx.bezierCurveTo(-s, s * 0.2, -s * 0.5, s * 0.6, 0, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}
