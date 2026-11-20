// =====================================================================
// «РЕЖИМЫ ИГРЫ»: один раздел вместо трёх пунктов главного меню.
// Сюжет, соло-забег, корпоратив и файтинг Samsa Kombat.
// =====================================================================

const GAME_MODES = [
  { id: 'story', name: 'СЮЖЕТ', sub: 'Девять глав «Преподы. Перезапуск» и обучение за каждого героя', color: '#ff2a6d' },
  { id: 'solo', name: 'СОЛО ЗАБЕГ', sub: 'Шесть уровней кампании и бесконечный режим с боссами', color: '#ffd319' },
  { id: 'coop', name: 'КОРПОРАТИВ', sub: 'До трёх игроков по сети: этажи, спортзал между ними, SAMSA KOMBAT вдвоём', color: '#05d9e8' },
  { id: 'kombat', name: 'SAMSA KOMBAT', sub: 'Файтинг 1 на 1: шесть бойцов, четыре арены и фаталити', color: '#ff5a1a', isNew: true },
];

class ModesUI {
  constructor(game) {
    this.game = game;
    this.sel = 0;
    this.t = 0;
  }

  open() { this.game.state = 'modes'; }

  _rects(w, h) {
    const n = GAME_MODES.length, gap = 12;
    const cw = Math.min(200, (w - 48 - gap * (n - 1)) / n), ch = Math.min(310, h * 0.58);
    const x0 = w / 2 - (n * cw + (n - 1) * gap) / 2, y = h * 0.22;
    return GAME_MODES.map((_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  }

  _choose(i) {
    const m = GAME_MODES[i], g = this.game;
    AudioSys.play('menu_select');
    if (m.id === 'story') g.storyUI.open();
    else if (m.id === 'solo') g.campaignUI.open();
    else if (m.id === 'coop') g.coopUI.open();
    else g.kombat.open();
  }

  update(dt) {
    this.t += dt;
    const n = GAME_MODES.length;
    if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA') || Input.wasPressed('MobileUp')) { this.sel = (this.sel + n - 1) % n; AudioSys.play('menu_move'); }
    if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD') || Input.wasPressed('MobileDown')) { this.sel = (this.sel + 1) % n; AudioSys.play('menu_move'); }
    if (Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter')) { this._choose(this.sel); return; }
    if (Input.wasPressed('Escape')) { this.game.toMenu(); return; }
    const mx = Input.mouse.x, my = Input.mouse.y, click = Input.consumeClick();
    this._rects(this.game.W, this.game.H).forEach((r, i) => {
      if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) {
        if ((this._lm || 0) !== mx + my) this.sel = i;
        if (click) this._choose(i);
      }
    });
    this._lm = mx + my;
  }

  draw(ctx, w, h) {
    const M = this.game.menu;
    M.drawBackground(ctx, w, h, M.t, 0.5);
    M.glowText(ctx, 'РЕЖИМЫ ИГРЫ', w / 2, 56, '#05d9e8', Math.min(40, w * 0.06), 'center', 18);
    ctx.font = '13px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('во что сыграем сегодня?', w / 2, 80);
    this._rects(w, h).forEach((r, i) => {
      const m = GAME_MODES[i], active = i === this.sel;
      ctx.save();
      if (active) { ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(1.05, 1.05); ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2)); }
      M.panel(ctx, r.x, r.y, r.w, r.h, m.color, active ? 0.92 : 0.8);
      const cx = r.x + r.w / 2;
      this._emblem(ctx, m.id, cx, r.y + r.h * 0.33, r.w * 0.26, m.color);
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.min(18, r.w / 9)}px "Courier New", monospace`;
      ctx.fillStyle = active ? '#ffffff' : '#e8e2ff';
      ctx.fillText(m.name, cx, r.y + r.h * 0.64, r.w - 12);
      ctx.font = `${Math.min(11, r.w / 15)}px "Courier New", monospace`; ctx.fillStyle = '#c8c2e0';
      M._wrapText(ctx, m.sub, cx, r.y + r.h * 0.73, r.w - 18, 14);
      if (m.isNew) {
        const k = 0.7 + 0.3 * Math.sin(this.t * 6);
        ctx.fillStyle = `rgba(255,211,25,${k})`;
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillRect(r.x + r.w - 54, r.y + 10, 44, 16);
        ctx.fillStyle = '#1a0a00'; ctx.fillText('NEW', r.x + r.w - 32, r.y + 22);
      }
      ctx.restore();
    });
    ctx.font = '13px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    if (!Input.isMobile) ctx.fillText('A/D или мышь — выбор    ENTER — открыть    ESC — назад', w / 2, h - 26);
  }

  _emblem(ctx, id, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5;
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    if (id === 'story') {          // раскрытая книга
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.55); ctx.quadraticCurveTo(-s * 0.5, -s * 0.8, -s, -s * 0.55); ctx.lineTo(-s, s * 0.6);
      ctx.quadraticCurveTo(-s * 0.5, s * 0.35, 0, s * 0.6); ctx.quadraticCurveTo(s * 0.5, s * 0.35, s, s * 0.6);
      ctx.lineTo(s, -s * 0.55); ctx.quadraticCurveTo(s * 0.5, -s * 0.8, 0, -s * 0.55); ctx.lineTo(0, s * 0.6); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.8, -s * 0.25 + i * s * 0.25); ctx.lineTo(-s * 0.2, -s * 0.2 + i * s * 0.25); ctx.stroke(); }
    } else if (id === 'solo') {    // прицел
      ctx.beginPath(); ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-s * 0.4, 0); ctx.moveTo(s * 0.4, 0); ctx.lineTo(s, 0);
      ctx.moveTo(0, -s); ctx.lineTo(0, -s * 0.4); ctx.moveTo(0, s * 0.4); ctx.lineTo(0, s); ctx.stroke();
    } else if (id === 'coop') {    // три силуэта
      for (const [dx, k] of [[-0.62, 0.8], [0.62, 0.8], [0, 1]]) {
        ctx.beginPath(); ctx.arc(dx * s, -s * 0.35 * k, s * 0.22 * k, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(dx * s, s * 0.55, s * 0.45 * k, Math.PI, 0); ctx.stroke();
      }
    } else {                       // самса с каплями
      ctx.beginPath(); ctx.moveTo(-s, s * 0.55); ctx.lineTo(0, -s * 0.75); ctx.lineTo(s, s * 0.55); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.55); ctx.lineTo(0, -s * 0.1); ctx.lineTo(s * 0.55, s * 0.55); ctx.stroke();
      ctx.fillStyle = '#ff2030'; ctx.shadowColor = '#ff2030';
      for (const [dx, dy] of [[-0.35, 0.9], [0.1, 1.05], [0.5, 0.85]]) { ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.09, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
}
