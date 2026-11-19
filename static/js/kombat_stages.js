// =====================================================================
// SAMSA KOMBAT — четыре арены. Каждая рисует задник и пол;
// gy — экранная линия пола, k — масштаб (1 при высоте экрана 540).
// =====================================================================

function _kRand(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

const KSTAGES = [
  {
    id: 'gym', name: 'СПОРТЗАЛ', sub: 'Колледж № 7, третий этаж. Зимой холодно', color: '#ffd319',
    draw(ctx, w, h, gy, k, t) {
      // стена
      const g = ctx.createLinearGradient(0, 0, 0, gy);
      g.addColorStop(0, '#1a1426'); g.addColorStop(1, '#3a2a3a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, gy);
      // окна с ночным небом
      for (let i = 0; i < 6; i++) {
        const x = w * (0.06 + i * 0.16), y = gy * 0.08, ww = w * 0.11, hh = gy * 0.26;
        ctx.fillStyle = '#0a0c22'; ctx.fillRect(x, y, ww, hh);
        ctx.fillStyle = 'rgba(120,160,255,0.15)'; ctx.fillRect(x, y, ww, hh * 0.5);
        ctx.strokeStyle = '#5a4a5a'; ctx.lineWidth = 3 * k; ctx.strokeRect(x, y, ww, hh);
        ctx.beginPath(); ctx.moveTo(x + ww / 2, y); ctx.lineTo(x + ww / 2, y + hh); ctx.moveTo(x, y + hh / 2); ctx.lineTo(x + ww, y + hh / 2); ctx.stroke();
        // сетка от мячей
        ctx.strokeStyle = 'rgba(200,200,220,0.15)'; ctx.lineWidth = 1;
        for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.moveTo(x + j * ww / 5, y); ctx.lineTo(x + j * ww / 5 - ww * 0.1, y + hh); ctx.stroke(); }
      }
      // баннер
      ctx.fillStyle = '#7a1424'; ctx.fillRect(w * 0.32, gy * 0.38, w * 0.36, gy * 0.1);
      ctx.fillStyle = '#ffd319'; ctx.font = `bold ${Math.round(22 * k)}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('КОЛЛЕДЖ № 7 — ЧЕМПИОНАТ', w / 2, gy * 0.43);
      // баскетбольные кольца
      for (const side of [-1, 1]) {
        const x = w / 2 + side * w * 0.42, y = gy * 0.42;
        ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x - 34 * k, y - 26 * k, 68 * k, 46 * k);
        ctx.strokeStyle = '#ff5a1a'; ctx.lineWidth = 3 * k; ctx.strokeRect(x - 14 * k, y - 4 * k, 28 * k, 20 * k);
        ctx.beginPath(); ctx.ellipse(x, y + 24 * k, 15 * k, 4 * k, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // трибуны со зрителями
      const by = gy * 0.58;
      for (let r = 0; r < 3; r++) {
        ctx.fillStyle = ['#4a3020', '#5a3a26', '#6a442c'][r];
        ctx.fillRect(0, by + r * gy * 0.13, w, gy * 0.05);
      }
      const rnd = _kRand(42);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 26; i++) {
        const x = (i + rnd() * 0.5) / 26 * w, y = by + r * gy * 0.13 - 4 * k;
        const jump = Math.max(0, Math.sin(t * 7 + i * 1.7 + r)) * 6 * k;
        const cols = ['#2a4a8a', '#8a2a3a', '#3a6a3a', '#6a4a8a', '#8a6a2a'];
        ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
        ctx.fillRect(x - 8 * k, y - 22 * k - jump, 16 * k, 20 * k);
        ctx.fillStyle = '#d8a07a';
        ctx.beginPath(); ctx.arc(x, y - 28 * k - jump, 6 * k, 0, Math.PI * 2); ctx.fill();
        if (rnd() < 0.3) { ctx.fillStyle = '#d8a07a'; ctx.fillRect(x + 6 * k, y - 40 * k - jump, 3 * k, 14 * k); }
      }
      // пол: паркет с разметкой
      const fg = ctx.createLinearGradient(0, gy, 0, h);
      fg.addColorStop(0, '#b4783a'); fg.addColorStop(1, '#6a3e1a');
      ctx.fillStyle = fg; ctx.fillRect(0, gy, w, h - gy);
      ctx.strokeStyle = 'rgba(60,30,10,0.35)'; ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) { const y = gy + (h - gy) * (i / 8) ** 1.4; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      for (let i = -10; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * 50 * k, gy); ctx.lineTo(w / 2 + i * 90 * k, h); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2.5 * k;
      ctx.beginPath(); ctx.moveTo(w / 2, gy); ctx.lineTo(w / 2, h); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(w / 2, gy + (h - gy) * 0.45, 90 * k, 20 * k, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,200,0.12)'; ctx.fillRect(0, gy, w, 3 * k);
    },
  },
  {
    id: 'canteen', name: 'СТОЛОВАЯ', sub: 'Самса, пирожки и чай. Здесь всё и решается', color: '#ff9a3a',
    draw(ctx, w, h, gy, k, t) {
      const g = ctx.createLinearGradient(0, 0, 0, gy);
      g.addColorStop(0, '#2a1a12'); g.addColorStop(1, '#4a2e1e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, gy);
      // кафель
      ctx.fillStyle = '#d8d0c0'; ctx.fillRect(0, gy * 0.46, w, gy * 0.54);
      ctx.strokeStyle = 'rgba(90,70,50,0.3)'; ctx.lineWidth = 1;
      const ts = 22 * k;
      for (let y = gy * 0.46; y < gy; y += ts) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      for (let x = 0; x < w; x += ts) { ctx.beginPath(); ctx.moveTo(x, gy * 0.46); ctx.lineTo(x, gy); ctx.stroke(); }
      // неоновая вывеска
      const fl = Math.sin(t * 19) > -0.9 ? 1 : 0.3;
      ctx.save(); ctx.globalAlpha = fl;
      ctx.shadowColor = '#ff5a1a'; ctx.shadowBlur = 22 * k;
      ctx.fillStyle = '#ffb070'; ctx.font = `bold ${Math.round(38 * k)}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('САМСА', w / 2, gy * 0.14);
      ctx.restore();
      // меню-доска
      ctx.fillStyle = '#16221a'; ctx.fillRect(w * 0.06, gy * 0.07, w * 0.2, gy * 0.3);
      ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 4 * k; ctx.strokeRect(w * 0.06, gy * 0.07, w * 0.2, gy * 0.3);
      ctx.fillStyle = '#e8f0e0'; ctx.font = `${Math.round(13 * k)}px "Courier New", monospace`; ctx.textAlign = 'left';
      ['САМСА ....... 350', 'ПИРОЖОК ..... 200', 'ЧАЙ ......... 100', 'КОМПОТ ...... 150'].forEach((s, i) => ctx.fillText(s, w * 0.07, gy * 0.13 + i * 17 * k));
      // часы
      const cx = w * 0.84, cy = gy * 0.2;
      ctx.fillStyle = '#f0ece0'; ctx.beginPath(); ctx.arc(cx, cy, 26 * k, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 3 * k; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t * 0.5) * 18 * k, cy + Math.sin(t * 0.5) * 18 * k); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 10 * k, cy - 6 * k); ctx.stroke();
      // прилавок с самсой
      const cy0 = gy * 0.62;
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(w * 0.18, cy0, w * 0.64, gy - cy0);
      ctx.fillStyle = '#a8703a'; ctx.fillRect(w * 0.18, cy0, w * 0.64, 8 * k);
      ctx.fillStyle = 'rgba(200,230,255,0.25)'; ctx.fillRect(w * 0.2, cy0 - gy * 0.14, w * 0.6, gy * 0.14);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(w * 0.2, cy0 - gy * 0.14, w * 0.6, gy * 0.14);
      for (let i = 0; i < 14; i++) {
        const x = w * 0.23 + i * w * 0.04, y = cy0 - 6 * k;
        ctx.fillStyle = '#d8902a';
        ctx.beginPath(); ctx.moveTo(x - 11 * k, y); ctx.lineTo(x, y - 16 * k); ctx.lineTo(x + 11 * k, y); ctx.fill();
        ctx.fillStyle = '#f0c060'; ctx.fillRect(x - 2 * k, y - 10 * k, 4 * k, 3 * k);
      }
      // самовар и пар
      const sx = w * 0.9, sy = cy0;
      ctx.fillStyle = '#c8a040'; ctx.beginPath(); ctx.ellipse(sx, sy - 30 * k, 22 * k, 30 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6a20'; ctx.fillRect(sx - 12 * k, sy - 2 * k, 24 * k, 8 * k);
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.6 + i * 0.25) % 1;
        ctx.fillStyle = `rgba(255,255,255,${0.2 * (1 - ph)})`;
        ctx.beginPath(); ctx.arc(sx + Math.sin(ph * 6 + i) * 8 * k, sy - 64 * k - ph * 60 * k, (6 + ph * 10) * k, 0, Math.PI * 2); ctx.fill();
      }
      // пол — плитка шахматкой
      const fg = ctx.createLinearGradient(0, gy, 0, h);
      fg.addColorStop(0, '#6a5a4a'); fg.addColorStop(1, '#2a2018');
      ctx.fillStyle = fg; ctx.fillRect(0, gy, w, h - gy);
      for (let r = 0; r < 5; r++) for (let c = -12; c < 12; c++) {
        if ((r + c) % 2) continue;
        const v0 = r / 5, v1 = (r + 1) / 5, y0 = gy + (h - gy) * v0 * v0, y1 = gy + (h - gy) * v1 * v1;
        const xs = (v, cc) => w / 2 + cc * 60 * k * (1 + v * 1.4);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.moveTo(xs(v0, c), y0); ctx.lineTo(xs(v0, c + 1), y0); ctx.lineTo(xs(v1, c + 1), y1); ctx.lineTo(xs(v1, c), y1); ctx.fill();
      }
    },
  },
  {
    id: 'roof', name: 'КРЫША', sub: 'Над колледжем ночью. Внизу — огни Актау и Каспий', color: '#05d9e8',
    draw(ctx, w, h, gy, k, t) {
      const g = ctx.createLinearGradient(0, 0, 0, gy);
      g.addColorStop(0, '#04040e'); g.addColorStop(0.7, '#141a3a'); g.addColorStop(1, '#2a1a3a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, gy);
      const rnd = _kRand(7);
      for (let i = 0; i < 90; i++) {
        const x = rnd() * w, y = rnd() * gy * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t + i))})`; ctx.fillRect(x, y, 1.5 * k, 1.5 * k);
      }
      // луна
      const mx = w * 0.78, my = gy * 0.18;
      const mg = ctx.createRadialGradient(mx, my, 10 * k, mx, my, 90 * k);
      mg.addColorStop(0, 'rgba(255,240,200,0.4)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - 90 * k, my - 90 * k, 180 * k, 180 * k);
      ctx.fillStyle = '#fff4d8'; ctx.beginPath(); ctx.arc(mx, my, 30 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(200,180,140,0.4)'; ctx.beginPath(); ctx.arc(mx - 8 * k, my - 6 * k, 6 * k, 0, Math.PI * 2); ctx.fill();
      // море с лунной дорожкой
      const sea = gy * 0.52;
      ctx.fillStyle = '#0a1030'; ctx.fillRect(0, sea, w, gy * 0.14);
      for (let i = 0; i < 18; i++) {
        const y = sea + i * gy * 0.008, ww = (20 + i * 4) * k * (1 + 0.3 * Math.sin(t * 2 + i));
        ctx.fillStyle = `rgba(255,240,200,${0.35 - i * 0.015})`; ctx.fillRect(mx - ww / 2, y, ww, 1.5 * k);
      }
      // город
      const cy = gy * 0.66, rr = _kRand(99);
      let x = 0;
      while (x < w) {
        const bw = (24 + rr() * 50) * k, bh = (30 + rr() * 90) * k;
        ctx.fillStyle = '#0c0a1a'; ctx.fillRect(x, cy - bh, bw, bh + gy * 0.12);
        for (let wy = cy - bh + 6 * k; wy < cy; wy += 9 * k) for (let wx = x + 4 * k; wx < x + bw - 4 * k; wx += 8 * k) {
          if (rr() < 0.4) { ctx.fillStyle = rr() < 0.7 ? 'rgba(255,200,120,0.6)' : 'rgba(5,217,232,0.5)'; ctx.fillRect(wx, wy, 3 * k, 3 * k); }
        }
        x += bw + 3 * k;
      }
      // антенна с огоньком, вентиляция, парапет
      ctx.fillStyle = '#2a2838';
      ctx.fillRect(w * 0.12, gy - 150 * k, 5 * k, 150 * k);
      ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ff2a40' : '#3a0a10'; ctx.beginPath(); ctx.arc(w * 0.12 + 2.5 * k, gy - 152 * k, 4 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a3848'; ctx.fillRect(w * 0.8, gy - 60 * k, 90 * k, 60 * k);
      ctx.fillStyle = '#2a2838'; for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.8 + 8 * k, gy - 52 * k + i * 10 * k, 74 * k, 4 * k);
      ctx.fillStyle = '#1e1c2a'; ctx.fillRect(0, gy - 22 * k, w, 22 * k);
      ctx.fillStyle = '#2e2c3c'; ctx.fillRect(0, gy - 22 * k, w, 4 * k);
      // пол — рубероид
      const fg = ctx.createLinearGradient(0, gy, 0, h);
      fg.addColorStop(0, '#2a2834'); fg.addColorStop(1, '#100e16');
      ctx.fillStyle = fg; ctx.fillRect(0, gy, w, h - gy);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      const r2 = _kRand(5);
      for (let i = 0; i < 40; i++) ctx.fillRect(r2() * w, gy + r2() * (h - gy), 30 * k, 2 * k);
      // лужа с отражением луны
      ctx.fillStyle = 'rgba(120,140,200,0.15)'; ctx.beginPath(); ctx.ellipse(w * 0.7, gy + (h - gy) * 0.5, 80 * k, 10 * k, 0, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    id: 'club', name: 'КЛУБ VIBE', sub: 'VIP-зона, куда учителей обычно не пускают', color: '#ff2a6d',
    draw(ctx, w, h, gy, k, t, game) {
      // фон клуба из главного меню, без бегущих героев
      game.menu.drawBackground(ctx, w, h, t, 0.05, { runners: false, hor: gy - 70 * k });
    },
  },
];
