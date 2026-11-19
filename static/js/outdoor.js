// =====================================================================
// Уличные локации: ночной город и джунгли.
// Новые предметы окружения, полы и вид стен (фасады домов / стена зарослей).
// =====================================================================

(() => {
  const { items, R, circ, ell, box } = DecorArt;

  // Большое дерево (2×2 клетки), крона перекрывает обзор
  items.tree = { along: 2, depth: 2, solid: 'tall', draw(ctx, W, H, r) {
    circ(ctx, 4, 6, 26, 'rgba(0,0,0,0.35)');
    const greens = ['#1f5a2a', '#27702f', '#185024', '#2f8038'];
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + r() * 0.4, d = 10 + r() * 8;
      circ(ctx, Math.cos(a) * d, Math.sin(a) * d, 12 + r() * 5, greens[i % greens.length]);
    }
    circ(ctx, 0, 0, 15, '#2f8a3a');
    for (let i = 0; i < 6; i++) circ(ctx, (r() - 0.5) * 22, (r() - 0.5) * 22, 3 + r() * 3, 'rgba(120,220,120,0.25)');
  }};

  // Пальма (1×1)
  items.palm = { along: 1, depth: 1, solid: 'tall', draw(ctx, W, H, r) {
    circ(ctx, 2, 3, 12, 'rgba(0,0,0,0.3)');
    circ(ctx, 0, 0, 4, '#6a4a2a');
    const n = 6 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + r() * 0.3;
      ell(ctx, Math.cos(a) * 9, Math.sin(a) * 9, 11, 3.4, a, i % 2 ? '#2f8a3a' : '#3fa848');
    }
    circ(ctx, 0, 0, 3, '#8a6a3a');
  }};

  // Куст (1×1, можно спрятаться, пули пролетают поверх)
  items.bush = { along: 1, depth: 1, solid: 'low', draw(ctx, W, H, r) {
    circ(ctx, 1.5, 2, 13, 'rgba(0,0,0,0.3)');
    const g = ['#245e2c', '#2f7a36', '#1c4c22'];
    for (let i = 0; i < 6; i++) circ(ctx, (r() - 0.5) * 12, (r() - 0.5) * 12, 6 + r() * 3, g[i % 3]);
    if (r() < 0.3) for (let i = 0; i < 4; i++) circ(ctx, (r() - 0.5) * 14, (r() - 0.5) * 14, 1.3, '#ff5a8a');
  }};

  // Камень
  items.rock = { along: 1, depth: 1, solid: 'low', draw(ctx, W, H, r) {
    ell(ctx, 2, 3, 12, 9, 0, 'rgba(0,0,0,0.35)');
    ell(ctx, 0, 0, 11, 8, r() * 3, '#5a5a62');
    ell(ctx, -2, -2, 7, 5, 0.3, '#74747e');
    circ(ctx, -4, -3, 2, 'rgba(255,255,255,0.18)');
  }};

  // Машина (3×2): стоит вдоль улицы
  items.car = { along: 3, depth: 2, solid: 'tall', draw(ctx, W, H, r) {
    const col = [['#8a1a22', '#b02a32'], ['#1a3a6a', '#2a5a9a'], ['#d8d8dc', '#f4f4f6'], ['#1a1a1e', '#34343a'], ['#c8a020', '#e8c040']][Math.floor(r() * 5)];
    const w = W - 8, h = H - 14;
    R(ctx, -w / 2 + 2, -h / 2 + 3, w, h, 'rgba(0,0,0,0.4)');
    box(ctx, -w / 2, -h / 2, w, h, 6, col[0]);
    box(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 5, col[1]);
    R(ctx, -w * 0.18, -h / 2 + 4, w * 0.34, h - 8, '#10161e');           // крыша/стёкла
    R(ctx, -w * 0.18 + 2, -h / 2 + 5, w * 0.12, h - 10, 'rgba(150,200,255,0.25)');
    R(ctx, w / 2 - 4, -h / 2 + 3, 3, 5, '#fff6c0'); R(ctx, w / 2 - 4, h / 2 - 8, 3, 5, '#fff6c0');     // фары
    R(ctx, -w / 2 + 1, -h / 2 + 3, 3, 5, '#ff3030'); R(ctx, -w / 2 + 1, h / 2 - 8, 3, 5, '#ff3030');   // стопы
  }};

  // Фонарный столб
  items.lampPost = { along: 1, depth: 1, solid: 'low', draw(ctx, W, H, r) {
    circ(ctx, 1, 2, 6, 'rgba(0,0,0,0.35)');
    circ(ctx, 0, 0, 4.5, '#3a3a42');
    circ(ctx, 0, 0, 2.5, '#fff2c0');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
    g.addColorStop(0, 'rgba(255,230,160,0.35)'); g.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }};

  // Урна
  items.trash = { along: 1, depth: 1, solid: 'low', draw(ctx, W, H, r) {
    circ(ctx, 1, 2, 8, 'rgba(0,0,0,0.35)');
    circ(ctx, 0, 0, 7.5, '#2a3a2a');
    circ(ctx, 0, 0, 5.5, '#101410');
    if (r() < 0.6) { R(ctx, -3, -2, 4, 3, '#c8c8c8'); R(ctx, 0, 1, 3, 2, '#8a2a2a'); }
  }};

  // ---------- полы ----------
  const H = DecorArt.hash;
  window.OutdoorFloors = {
    asphalt(ctx, x, y, px, py, c) {
      ctx.fillStyle = c[Math.floor(H(x >> 1, y >> 1, 9) * c.length)]; ctx.fillRect(px, py, TILE, TILE);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(px + H(x, y, i) * 31, py + H(y, x, i) * 31, 1.5, 1.5); }
      // разметка: пунктир каждые 6 клеток
      if (y % 6 === 3 && x % 2 === 0) { ctx.fillStyle = 'rgba(240,230,180,0.55)'; ctx.fillRect(px + 4, py + 15, 22, 3); }
    },
    paving(ctx, x, y, px, py, c) {
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        ctx.fillStyle = c[Math.floor(H(x * 2 + i, y * 2 + j, 4) * c.length)];
        ctx.fillRect(px + i * 16 + 1, py + j * 16 + 1, 15, 15);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py + 16, TILE, 1); ctx.fillRect(px, py, 1, TILE); ctx.fillRect(px + 16, py, 1, TILE);
    },
    grass(ctx, x, y, px, py, c) {
      ctx.fillStyle = c[Math.floor(H(x, y, 2) * c.length)]; ctx.fillRect(px, py, TILE, TILE);
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = i % 3 ? 'rgba(90,170,80,0.35)' : 'rgba(10,40,10,0.35)';
        ctx.fillRect(px + H(x, y, i) * 30, py + H(y, x, i + 3) * 30, 1, 3);
      }
      if (H(x, y, 11) < 0.06) { ctx.fillStyle = '#ffd319'; ctx.fillRect(px + 12, py + 12, 2, 2); }
    },
    jungle(ctx, x, y, px, py, c) {
      ctx.fillStyle = c[Math.floor(H(x, y, 5) * c.length)]; ctx.fillRect(px, py, TILE, TILE);
      for (let i = 0; i < 5; i++) {
        const a = H(x, y, i + 20) * 6.28;
        ctx.save(); ctx.translate(px + H(x, y, i) * 30, py + H(y, x, i) * 30); ctx.rotate(a);
        ctx.fillStyle = i % 2 ? 'rgba(40,110,45,0.55)' : 'rgba(20,70,30,0.6)';
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
    stone(ctx, x, y, px, py, c) {
      ctx.fillStyle = c[Math.floor(H(x, y, 6) * c.length)]; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(px, py + ((x % 2) ? 10 : 20), TILE, 1); ctx.fillRect(px + ((y % 2) ? 12 : 22), py, 1, TILE);
      if (H(x, y, 7) < 0.25) { ctx.fillStyle = 'rgba(60,120,50,0.45)'; ctx.fillRect(px + H(x, y, 8) * 24, py + H(y, x, 8) * 24, 6, 3); }
    },
  };

  // ---------- стены по теме уровня ----------
  window.OutdoorWalls = {
    // фасад дома: крыша с окошками
    city(ctx, x, y, px, py) {
      ctx.fillStyle = (x + y) % 7 === 0 ? '#22202a' : '#1c1a24'; ctx.fillRect(px, py, TILE, TILE);
      if (H(x, y, 3) < 0.35) { ctx.fillStyle = H(x, y, 4) < 0.5 ? 'rgba(255,220,140,0.55)' : 'rgba(120,180,255,0.35)'; ctx.fillRect(px + 9, py + 9, 6, 6); }
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(px, py, TILE, 2);
    },
    // стена зарослей
    jungle(ctx, x, y, px, py) {
      ctx.fillStyle = '#0e2a12'; ctx.fillRect(px, py, TILE, TILE);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = ['#164a1c', '#1c5a22', '#0f3514'][i % 3];
        ctx.beginPath(); ctx.arc(px + H(x, y, i) * TILE, py + H(y, x, i) * TILE, 7 + H(x, y, i + 9) * 6, 0, Math.PI * 2); ctx.fill();
      }
    },
  };
})();
