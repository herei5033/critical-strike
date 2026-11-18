// Каталог мебели и элементов интерьера + их отрисовка.
// Каждый предмет рисуется в ЛОКАЛЬНЫХ координатах: (0,0) — центр предмета,
// W — длина вдоль стены, H — глубина. "Спина" предмета (к стене) — сторона -H/2.
const DecorArt = (() => {
  const T = 32;

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hash(x, y, k = 0) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(k | 0, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function box(ctx, x, y, w, h, r, fill, stroke) {
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function circ(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, rot, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); }

  // "Объёмный" блок: тёмное основание + верхняя грань + блик
  function slab(ctx, x, y, w, h, r, top, side, hi) {
    box(ctx, x, y + 2, w, h - 2, r, side);
    box(ctx, x, y, w, h - 3, r, top);
    if (hi) R(ctx, x + r, y + 1, w - r * 2, 1, hi);
  }

  function chair(ctx, x, y, rot, seat, back) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    circ(ctx, 0, 1, 7.5, 'rgba(0,0,0,0.35)');
    box(ctx, -6.5, -6, 13, 12, 3, seat);
    box(ctx, -7, 4, 14, 4, 2, back);
    ctx.restore();
  }

  // ---------- Предметы ----------
  const items = {
    desk: { along: 2, depth: 1, solid: 'low', draw(ctx, W, H, r) {
      chair(ctx, 0, H / 2 + 8, 0, '#2a2a36', '#1a1a22');
      slab(ctx, -W / 2 + 2, -H / 2 + 2, W - 4, H - 4, 2, '#6b4527', '#3e2817', '#8a5c35');
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 4; i++) R(ctx, -W / 2 + 4, -H / 2 + 7 + i * 5, W - 8, 1, '#2e1c0e');
      ctx.globalAlpha = 1;
      R(ctx, -3, -H / 2 + 9, 6, 3, '#101014');
      box(ctx, -13, -H / 2 + 3, 26, 6, 1, '#0c0c12');
      R(ctx, -12, -H / 2 + 8, 24, 1, '#3fb6ff');
      box(ctx, -9, 1, 18, 6, 1, '#17171f');
      for (let k = 0; k < 6; k++) { R(ctx, -8 + k * 3, 2, 2, 1.5, '#3a3a48'); R(ctx, -8 + k * 3, 4.5, 2, 1.5, '#3a3a48'); }
      ell(ctx, 13, 4, 2, 2.8, 0, '#22222c');
      if (r() < 0.6) { circ(ctx, -W / 2 + 10, -3, 3.4, '#d8d8d8'); circ(ctx, -W / 2 + 10, -3, 2.2, '#3b2414'); }
      ctx.save(); ctx.translate(W / 2 - 13, -3); ctx.rotate((r() - 0.5) * 0.7);
      R(ctx, -5, -6, 10, 12, '#d9d4c8');
      for (let i = 0; i < 4; i++) R(ctx, -4, -4 + i * 2.5, 5 + (i % 2) * 2, 1, '#8c8a84');
      ctx.restore();
    }},

    deskPair: { along: 2, depth: 2, solid: 'low', draw(ctx, W, H, r) {
      ctx.save(); ctx.translate(0, 16); items.desk.draw(ctx, W, 32, r); ctx.restore();
      ctx.save(); ctx.translate(0, -16); ctx.rotate(Math.PI); items.desk.draw(ctx, W, 32, r); ctx.restore();
      R(ctx, -W / 2 + 2, -1.5, W - 4, 3, '#2b3a4a');
      R(ctx, -W / 2 + 2, -1.5, W - 4, 1, '#46607a');
    }},

    filing: { along: 1, depth: 1, solid: 'tall', draw(ctx, W, H) {
      slab(ctx, -13, -14, 26, 27, 2, '#4a5363', '#2b313b', '#66718a');
      for (let i = 0; i < 3; i++) R(ctx, -11, -8 + i * 6, 22, 1, '#363d4a');
      R(ctx, -12, 9, 24, 3, '#20252e');
      for (let i = 0; i < 3; i++) R(ctx, -8 + i * 7, 10, 3, 1, '#9aa4b8');
    }},

    cooler: { along: 1, depth: 1, solid: 'tall', draw(ctx) {
      box(ctx, -10, -12, 20, 22, 3, '#c6ccd4');
      R(ctx, -9, 7, 18, 2, '#8a929c');
      circ(ctx, 0, -2, 8.5, '#2d6fbf');
      circ(ctx, 0, -2, 7, '#4fa3ff');
      circ(ctx, -2.5, -4.5, 2.2, 'rgba(255,255,255,0.6)');
      circ(ctx, 0, -2, 2, '#1d4f8f');
    }},

    plant: { along: 1, depth: 1, solid: 'low', draw(ctx, W, H, r) {
      circ(ctx, 1, 2, 10, 'rgba(0,0,0,0.3)');
      circ(ctx, 0, 0, 9, '#6a3b22');
      circ(ctx, 0, 0, 7.5, '#8a5030');
      circ(ctx, 0, 0, 6, '#2a1a10');
      const greens = ['#2f7a3a', '#3f9a48', '#25602e', '#4cb057'];
      const n = 7 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.5;
        const d = 4 + r() * 4;
        ell(ctx, Math.cos(a) * d, Math.sin(a) * d, 7 + r() * 3, 2.6, a, greens[i % greens.length]);
      }
      circ(ctx, 0, 0, 3, '#4cb057');
    }},

    kitchenRun: { alongRange: [5, 4, 3], depth: 1, solid: 'low', draw(ctx, W, H, r) {
      R(ctx, -W / 2, -H / 2, W, 4, '#262a31');
      slab(ctx, -W / 2 + 1, -H / 2 + 3, W - 2, H - 5, 1, '#5d636d', '#30343b', '#7d858f');
      const n = Math.round(W / T);
      const sinkAt = Math.floor(r() * n);
      let stoveAt = Math.floor(r() * n); if (stoveAt === sinkAt) stoveAt = (sinkAt + 2) % n;
      for (let i = 0; i < n; i++) {
        const cx = -W / 2 + i * T + T / 2;
        R(ctx, cx + T / 2 - 1, -H / 2 + 4, 1, H - 8, '#4a5059');
        if (i === sinkAt) {
          box(ctx, cx - 11, -8, 22, 15, 3, '#2b3038');
          box(ctx, cx - 9, -6, 18, 11, 3, '#1b1f25');
          circ(ctx, cx, -1, 1.5, '#0a0c10');
          R(ctx, cx - 1, -13, 2, 6, '#b8c0c8');
          R(ctx, cx - 4, -13, 8, 2, '#b8c0c8');
        } else if (i === stoveAt) {
          box(ctx, cx - 13, -11, 26, 21, 2, '#15151a');
          const hot = Math.floor(r() * 4);
          for (let k = 0; k < 4; k++) {
            const bx = cx + (k % 2 ? 6 : -6), by = (k < 2 ? -5 : 4);
            circ(ctx, bx, by, 4.5, '#2b2b33');
            ctx.strokeStyle = k === hot ? '#ff5a2a' : '#3e3e48'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.stroke();
          }
        } else {
          const t = r();
          if (t < 0.35) { box(ctx, cx - 8, -6, 16, 11, 2, '#8a5a32'); R(ctx, cx - 6, -4, 12, 1, '#a87444'); }
          else if (t < 0.6) { circ(ctx, cx - 4, -2, 4, '#c8c8c8'); circ(ctx, cx + 6, 2, 3, '#e0d0a0'); }
          else if (t < 0.8) { box(ctx, cx - 7, -9, 14, 12, 2, '#2a2a30'); R(ctx, cx - 5, -2, 10, 2, '#ff3a3a'); }
        }
      }
    }},

    fridge: { along: 1, depth: 1, solid: 'tall', draw(ctx) {
      slab(ctx, -14, -15, 28, 29, 2, '#9aa3ad', '#59616b', '#c4ccd6');
      R(ctx, -13, -3, 26, 1, '#6e7781');
      R(ctx, 9, -11, 2, 6, '#3d434b'); R(ctx, 9, 1, 2, 8, '#3d434b');
      box(ctx, -9, -11, 8, 5, 1, '#ff2a6d'); box(ctx, -8, 3, 6, 4, 1, '#ffd319');
    }},

    dtable: { along: 2, depth: 2, solid: 'low', draw(ctx, W, H, r) {
      const seat = '#3a2a1e', back = '#24190f';
      chair(ctx, -12, -25, Math.PI, seat, back); chair(ctx, 12, -25, Math.PI, seat, back);
      chair(ctx, -12, 25, 0, seat, back); chair(ctx, 12, 25, 0, seat, back);
      slab(ctx, -26, -17, 52, 34, 3, '#6b4527', '#3e2817', '#8a5c35');
      for (const [px, py] of [[-12, -9], [12, -9], [-12, 9], [12, 9]]) {
        circ(ctx, px, py, 5, '#e2e2e2'); circ(ctx, px, py, 3.4, '#cfcfcf');
        if (r() < 0.5) circ(ctx, px + 1, py, 1.8, ['#c84a2a', '#5aa040', '#e0b040'][Math.floor(r() * 3)]);
      }
      circ(ctx, 0, 0, 3.5, '#4fa3ff'); circ(ctx, 0, -1, 2.5, '#ff7fbf');
    }},

    toilet: { along: 1, depth: 1, solid: 'low', draw(ctx) {
      box(ctx, -10, -15, 20, 8, 2, '#c9ced4');
      R(ctx, -9, -14, 18, 1, '#eef2f5');
      ell(ctx, 0, 2, 8, 10, 0, '#dfe4e9');
      ell(ctx, 0, 3, 5.5, 7, 0, '#8fc1d2');
      ell(ctx, -1.5, 1, 1.5, 2.5, 0, 'rgba(255,255,255,0.5)');
    }},

    bsink: { along: 1, depth: 1, solid: 'low', draw(ctx) {
      R(ctx, -12, -16, 24, 2, '#9fd8ff');
      slab(ctx, -13, -14, 26, 17, 2, '#c9cfd5', '#8a9299', '#eef2f5');
      ell(ctx, 0, -5, 8, 5, 0, '#8fb8c8');
      circ(ctx, 0, -5, 1.2, '#3a4a52');
      R(ctx, -1, -13, 2, 5, '#a7afb6');
    }},

    tub: { along: 2, depth: 1, solid: 'low', draw(ctx, W) {
      box(ctx, -W / 2 + 2, -14, W - 4, 28, 7, '#c7cdd3');
      box(ctx, -W / 2 + 2, -14, W - 4, 26, 7, '#e2e7ec');
      box(ctx, -W / 2 + 6, -10, W - 12, 19, 8, '#6fa8bf');
      ctx.globalAlpha = 0.35;
      box(ctx, -W / 2 + 9, -8, W / 2 - 6, 5, 3, '#ffffff');
      ctx.globalAlpha = 1;
      R(ctx, W / 2 - 9, -3, 4, 6, '#a7afb6');
      circ(ctx, -W / 2 + 12, 3, 1.5, '#2a3a42');
    }},

    couch: { along: 3, depth: 1, solid: 'low', draw(ctx, W, H, r) {
      const pal = [['#3a1f3f', '#5a2f60', '#7a4a80'], ['#1f2f3f', '#2f4a60', '#4a6a80'], ['#3f2a1f', '#60402f', '#80604a'], ['#1f3a2a', '#2f5a40', '#4a7a5a']];
      const [dk, md, lt] = pal[Math.floor(r() * pal.length)];
      box(ctx, -W / 2 + 1, -H / 2 + 2, W - 2, H - 3, 5, dk);
      box(ctx, -W / 2 + 2, -H / 2 + 2, W - 4, 9, 4, md);
      box(ctx, -W / 2 + 1, -H / 2 + 3, 9, H - 5, 4, md);
      box(ctx, W / 2 - 10, -H / 2 + 3, 9, H - 5, 4, md);
      const cw = (W - 22) / 3;
      for (let i = 0; i < 3; i++) {
        box(ctx, -W / 2 + 11 + i * cw, -H / 2 + 11, cw - 1, H - 15, 3, md);
        R(ctx, -W / 2 + 13 + i * cw, -H / 2 + 12, cw - 5, 1, lt);
      }
      if (r() < 0.7) { ctx.save(); ctx.translate(-W / 2 + 18, -H / 2 + 12); ctx.rotate(-0.3); box(ctx, -5, -4, 10, 8, 3, '#ffd319'); ctx.restore(); }
    }},

    armchair: { along: 1, depth: 1, solid: 'low', draw(ctx, W, H, r) {
      const c = ['#5a2f60', '#2f4a60', '#60402f', '#7a1a2a'][Math.floor(r() * 4)];
      box(ctx, -14, -14, 28, 27, 6, 'rgba(0,0,0,0.45)');
      box(ctx, -13, -14, 26, 9, 4, c);
      box(ctx, -14, -12, 7, 24, 3, c);
      box(ctx, 7, -12, 7, 24, 3, c);
      box(ctx, -7, -5, 14, 16, 3, c);
      R(ctx, -5, -4, 10, 1, 'rgba(255,255,255,0.2)');
    }},

    tvstand: { along: 2, depth: 1, solid: 'low', anim: 'tv', light: { color: '#4fa8ff', radius: 90, dy: 30 }, draw(ctx, W, H) {
      slab(ctx, -W / 2 + 3, -H / 2 + 4, W - 6, H - 10, 2, '#2a1d14', '#160e08', '#3e2a1c');
      box(ctx, -24, -H / 2 + 2, 48, 6, 1, '#08080c');
      R(ctx, -23, -H / 2 + 7, 46, 1, '#4fa8ff');
      box(ctx, -8, 1, 16, 6, 2, '#14141a');
      circ(ctx, 4, 4, 1, '#3fff7f');
      box(ctx, 14, 2, 8, 4, 2, '#1d1d25');
    }},

    bookshelf: { along: 2, depth: 1, solid: 'tall', draw(ctx, W, H, r) {
      slab(ctx, -W / 2 + 1, -H / 2 + 1, W - 2, H - 4, 1, '#3a2414', '#1f130a', '#55361f');
      const cols = ['#a83a3a', '#3a6aa8', '#c8a040', '#3a8a5a', '#7a3aa8', '#d0d0c0', '#c86a2a'];
      let x = -W / 2 + 4;
      while (x < W / 2 - 5) {
        const bw = 2 + Math.floor(r() * 3);
        if (r() < 0.12) { x += 3; continue; }
        R(ctx, x, -H / 2 + 4, bw, H - 11 - Math.floor(r() * 4), cols[Math.floor(r() * cols.length)]);
        R(ctx, x, -H / 2 + 4, 1, H - 12, 'rgba(255,255,255,0.15)');
        x += bw + 0.5;
      }
    }},

    lamp: { along: 1, depth: 1, solid: 'low', light: { color: '#ffc870', radius: 85, dy: 0 }, draw(ctx) {
      circ(ctx, 0, 0, 5, '#15151a');
      circ(ctx, 0, 0, 10, 'rgba(255,220,150,0.15)');
      circ(ctx, 0, 0, 8.5, '#e8c88a');
      circ(ctx, 0, 0, 6, '#fff0c8');
      circ(ctx, 0, 0, 2, '#ffffff');
    }},

    coffee: { along: 2, depth: 1, solid: 'low', draw(ctx, W, H, r) {
      box(ctx, -W / 2 + 6, -H / 2 + 6, W - 12, H - 12, 3, '#1a1a22');
      box(ctx, -W / 2 + 8, -H / 2 + 8, W - 16, H - 16, 2, 'rgba(110,170,210,0.35)');
      R(ctx, -W / 2 + 10, -H / 2 + 9, W / 3, 1, 'rgba(255,255,255,0.35)');
      ctx.save(); ctx.translate(-8, 0); ctx.rotate(0.2); R(ctx, -6, -5, 12, 9, '#ff2a6d'); R(ctx, -5, -4, 10, 2, '#ffd0e0'); ctx.restore();
      circ(ctx, 12, 1, 3, '#e0e0e0'); circ(ctx, 12, 1, 2, '#3b2414');
      if (r() < 0.5) { circ(ctx, 2, 3, 2.5, '#2a7a3a'); }
    }},

    bar: { along: 4, depth: 2, solid: 'low', draw(ctx, W, H, r) {
      // полка с бутылками у стены
      R(ctx, -W / 2, -H / 2, W, 12, '#1a0f14');
      const bottle = ['#3fbf6f', '#bf7f3f', '#7f3fbf', '#3f8fbf', '#d0d0d0', '#bf3f5f'];
      for (let x = -W / 2 + 5; x < W / 2 - 4; x += 5 + Math.floor(r() * 3)) {
        circ(ctx, x, -H / 2 + 6, 2.2, bottle[Math.floor(r() * bottle.length)]);
        circ(ctx, x - 0.6, -H / 2 + 5.4, 0.8, 'rgba(255,255,255,0.6)');
      }
      // стойка
      slab(ctx, -W / 2 + 1, -H / 2 + 18, W - 2, 18, 3, '#4a2412', '#2a1208', '#7a4024');
      R(ctx, -W / 2 + 2, -H / 2 + 33, W - 4, 2, '#c8a040');
      for (let i = 0; i < 5; i++) {
        if (r() < 0.55) { const gx = -W / 2 + 12 + i * (W - 24) / 4; circ(ctx, gx, -H / 2 + 26, 2.6, 'rgba(200,230,255,0.55)'); circ(ctx, gx, -H / 2 + 26, 1.4, ['#ff7f3f', '#ffd319', '#bf3f5f'][i % 3]); }
      }
      // табуреты
      for (let i = 0; i < 4; i++) {
        const sx = -W / 2 + 16 + i * (W - 32) / 3;
        circ(ctx, sx, H / 2 - 12, 7, 'rgba(0,0,0,0.4)');
        circ(ctx, sx, H / 2 - 13, 6, '#2a2a30');
        circ(ctx, sx, H / 2 - 13, 4.5, '#7a1a2a');
      }
    }},

    pool: { along: 3, depth: 2, solid: 'low', draw(ctx, W, H, r) {
      box(ctx, -W / 2 + 2, -H / 2 + 4, W - 4, H - 6, 5, '#2a1406');
      box(ctx, -W / 2 + 2, -H / 2 + 2, W - 4, H - 6, 5, '#5a3216');
      box(ctx, -W / 2 + 8, -H / 2 + 8, W - 16, H - 18, 2, '#0f5a3a');
      ctx.globalAlpha = 0.25; box(ctx, -W / 2 + 12, -H / 2 + 11, W - 24, H - 26, 6, '#2fa070'); ctx.globalAlpha = 1;
      for (const [px, py] of [[-1, -1], [0, -1], [1, -1], [-1, 1], [0, 1], [1, 1]]) {
        circ(ctx, px * (W / 2 - 8), py * (H / 2 - 9) - 1, 3.4, '#050505');
      }
      const balls = ['#ffd319', '#2a5aff', '#ff2a2a', '#7a2aff', '#ff7a2a', '#2aa05a', '#7a1a1a', '#111111'];
      for (let i = 0; i < 8; i++) {
        const bx = (r() - 0.5) * (W - 28), by = (r() - 0.5) * (H - 30) - 1;
        circ(ctx, bx + 0.8, by + 0.8, 2.6, 'rgba(0,0,0,0.4)');
        circ(ctx, bx, by, 2.5, balls[i]);
        circ(ctx, bx - 0.8, by - 0.8, 0.8, 'rgba(255,255,255,0.7)');
      }
      circ(ctx, W / 4, 2, 2.5, '#f5f5f5');
      ctx.save(); ctx.rotate(-0.35); R(ctx, -W / 2 + 6, H / 2 - 12, W * 0.6, 2, '#c8a060'); R(ctx, -W / 2 + 6, H / 2 - 12, 8, 2, '#1a1a1a'); ctx.restore();
    }},

    arcade: { along: 1, depth: 1, solid: 'tall', anim: 'arcade', light: { color: '#ff3aa0', radius: 60, dy: 18 }, draw(ctx, W, H, r) {
      slab(ctx, -14, -15, 28, 28, 2, '#1a1030', '#0a0618', '#3a2a60');
      R(ctx, -14, -15, 2, 28, r() < 0.5 ? '#05d9e8' : '#ff2a6d');
      R(ctx, 12, -15, 2, 28, r() < 0.5 ? '#05d9e8' : '#ff2a6d');
      box(ctx, -10, -12, 20, 13, 1, '#05050a');
      box(ctx, -9, 4, 18, 7, 1, '#2a2040');
      circ(ctx, -4, 7, 2, '#ff2a2a'); circ(ctx, 3, 6, 1.4, '#ffd319'); circ(ctx, 6, 8, 1.4, '#05d9e8');
    }},

    booth: { along: 2, depth: 2, solid: 'low', draw(ctx, W, H, r) {
      const c = ['#5a1a2a', '#1a3a5a', '#3a1a5a'][Math.floor(r() * 3)];
      box(ctx, -W / 2 + 1, -H / 2 + 2, 13, H - 6, 4, c);
      box(ctx, W / 2 - 14, -H / 2 + 2, 13, H - 6, 4, c);
      R(ctx, -W / 2 + 3, -H / 2 + 4, 2, H - 10, 'rgba(255,255,255,0.15)');
      R(ctx, W / 2 - 5, -H / 2 + 4, 2, H - 10, 'rgba(255,255,255,0.15)');
      slab(ctx, -15, -H / 2 + 4, 30, H - 14, 3, '#3a2414', '#1f130a', '#5a3a22');
      circ(ctx, -6, -8, 3, '#d8d8d8'); circ(ctx, 6, 6, 3, '#d8d8d8');
      circ(ctx, 0, -H / 2 + 9, 2.5, '#ffd319');
    }},

    bed: { along: 2, depth: 3, solid: 'low', draw(ctx, W, H, r) {
      const blanket = ['#7a1a2a', '#1a3a6a', '#3a5a2a', '#5a2a6a', '#6a5a3a'][Math.floor(r() * 5)];
      box(ctx, -W / 2 + 1, -H / 2 + 1, W - 2, 9, 2, '#3a2414');
      R(ctx, -W / 2 + 3, -H / 2 + 2, W - 6, 1, '#5a3a22');
      box(ctx, -W / 2 + 2, -H / 2 + 7, W - 4, H - 9, 4, '#4a2e1a');
      box(ctx, -W / 2 + 4, -H / 2 + 9, W - 8, H - 13, 4, '#e8e4dc');
      box(ctx, -W / 2 + 6, -H / 2 + 11, W / 2 - 9, 13, 4, '#f6f3ee');
      box(ctx, 3, -H / 2 + 11, W / 2 - 9, 13, 4, '#f6f3ee');
      box(ctx, -W / 2 + 4, -H / 2 + 30, W - 8, H - 34, 4, blanket);
      R(ctx, -W / 2 + 4, -H / 2 + 30, W - 8, 4, 'rgba(255,255,255,0.22)');
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 4; i++) R(ctx, -W / 2 + 4, -H / 2 + 40 + i * 12, W - 8, 2, '#000');
      ctx.globalAlpha = 1;
    }},

    nightstand: { along: 1, depth: 1, solid: 'low', light: { color: '#ffb060', radius: 60, dy: 0 }, draw(ctx) {
      slab(ctx, -11, -13, 22, 22, 2, '#5a3a22', '#2e1c0e', '#7a5232');
      circ(ctx, 0, -3, 6, '#f0d090'); circ(ctx, 0, -3, 4, '#fff0c8');
      R(ctx, -8, 7, 16, 1, '#2e1c0e');
    }},

    wardrobe: { along: 2, depth: 1, solid: 'tall', draw(ctx, W, H) {
      slab(ctx, -W / 2 + 1, -H / 2 + 1, W - 2, H - 3, 1, '#3a2414', '#1f130a', '#5a3a22');
      R(ctx, -0.5, -H / 2 + 3, 1, H - 8, '#1f130a');
      R(ctx, -W / 2 + 2, H / 2 - 6, W - 4, 3, '#24170c');
      R(ctx, -4, H / 2 - 6, 2, 3, '#c8a040'); R(ctx, 2, H / 2 - 6, 2, 3, '#c8a040');
    }},

    crate: { along: 1, depth: 1, solid: 'low', draw(ctx, W, H, r) {
      const tall = r() < 0.35;
      const s = tall ? 26 : 24;
      ctx.save(); ctx.rotate((r() - 0.5) * 0.25);
      slab(ctx, -s / 2, -s / 2, s, s, 1, '#8a6a3a', '#4a3418', '#a88a52');
      ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 2;
      ctx.strokeRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 7);
      ctx.beginPath(); ctx.moveTo(-s / 2 + 3, -s / 2 + 3); ctx.lineTo(s / 2 - 3, s / 2 - 6); ctx.stroke();
      if (tall) { slab(ctx, -s / 2 + 4, -s / 2 + 2, s - 8, s - 10, 1, '#9a7a48', '#5a4020', '#b89a62'); R(ctx, -2, -s / 2 + 3, 4, s - 12, '#c8b070'); }
      ctx.restore();
    }},

    barrel: { along: 1, depth: 1, solid: 'low', draw(ctx, W, H, r) {
      const c = [['#2f4a6a', '#476a92'], ['#6a2f2f', '#924747'], ['#3a5a2a', '#527a3e'], ['#6a5a1a', '#927a2a']][Math.floor(r() * 4)];
      circ(ctx, 1.5, 2, 13, 'rgba(0,0,0,0.4)');
      circ(ctx, 0, 0, 12.5, c[0]);
      circ(ctx, 0, 0, 10, c[1]);
      ctx.strokeStyle = c[0]; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.stroke();
      circ(ctx, 4, -3, 1.6, '#1a1a1a');
      circ(ctx, -4, -4, 2.5, 'rgba(255,255,255,0.18)');
      if (r() < 0.3) { ctx.fillStyle = '#ffd319'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(4, 3); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill(); }
    }},

    shelfRack: { along: 3, depth: 1, solid: 'tall', draw(ctx, W, H, r) {
      box(ctx, -W / 2 + 1, -H / 2 + 2, W - 2, H - 5, 1, '#262a31');
      R(ctx, -W / 2 + 1, -H / 2 + 2, W - 2, 2, '#4a525e');
      R(ctx, -W / 2 + 1, H / 2 - 5, W - 2, 2, '#4a525e');
      for (let i = 0; i <= 3; i++) R(ctx, -W / 2 + 1 + i * (W - 4) / 3, -H / 2 + 2, 2, H - 5, '#5a6270');
      let x = -W / 2 + 5;
      while (x < W / 2 - 10) {
        const bw = 7 + Math.floor(r() * 9);
        if (r() < 0.2) { x += bw; continue; }
        const bh = 12 + Math.floor(r() * 9);
        const cc = ['#8a6a3a', '#9a7a48', '#6a5a4a', '#3a5a7a', '#7a3a3a'][Math.floor(r() * 5)];
        slab(ctx, x, -bh / 2 - 1, bw, bh, 1, cc, 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.18)');
        R(ctx, x + bw / 2 - 1, -bh / 2, 2, bh - 3, 'rgba(230,210,160,0.45)');
        x += bw + 2;
      }
    }},

    pallet: { along: 2, depth: 2, solid: 'low', draw(ctx, W, H, r) {
      box(ctx, -W / 2 + 3, -H / 2 + 3, W - 6, H - 6, 1, '#5a4428');
      for (let i = 0; i < 5; i++) R(ctx, -W / 2 + 4, -H / 2 + 5 + i * 11.5, W - 8, 7, '#8a6a42');
      for (let i = 0; i < 4; i++) {
        if (r() < 0.2) continue;
        const bx = (i % 2 ? 1 : -1) * 13, by = (i < 2 ? -1 : 1) * 13;
        slab(ctx, bx - 11, by - 11, 22, 22, 1, '#a07a46', '#5a4020', '#c09a62');
        R(ctx, bx - 1, by - 10, 2, 18, 'rgba(230,210,160,0.5)');
        R(ctx, bx - 10, by - 1, 20, 2, 'rgba(230,210,160,0.35)');
      }
    }},

    serverRow: { alongRange: [5, 4, 3], depth: 1, solid: 'tall', anim: 'server', light: { color: '#3a8cff', radius: 70, dy: 22 }, draw(ctx, W, H) {
      box(ctx, -W / 2 + 1, -H / 2 + 2, W - 2, H - 4, 1, '#0b0e15');
      const n = Math.round(W / T);
      for (let i = 0; i < n; i++) {
        const x = -W / 2 + i * T + 2;
        box(ctx, x, -H / 2 + 3, T - 4, H - 7, 1, '#12161f', '#2a3344');
        for (let k = 0; k < 5; k++) R(ctx, x + 3, -H / 2 + 6 + k * 4, T - 10, 1.5, '#1e2534');
      }
      R(ctx, -W / 2 + 1, H / 2 - 4, W - 2, 1, '#3a8cff');
    }},

    bench: { along: 2, depth: 1, solid: 'low', draw(ctx, W, H) {
      R(ctx, -W / 2 + 4, -8, 4, 16, '#30343b'); R(ctx, W / 2 - 8, -8, 4, 16, '#30343b');
      for (let i = 0; i < 3; i++) { R(ctx, -W / 2 + 3, -8 + i * 6, W - 6, 4, '#7a5232'); R(ctx, -W / 2 + 3, -8 + i * 6, W - 6, 1, '#9a6a42'); }
    }},

    vending: { along: 1, depth: 1, solid: 'tall', anim: 'vending', light: { color: '#05d9e8', radius: 70, dy: 20 }, draw(ctx, W, H, r) {
      slab(ctx, -14, -15, 28, 28, 2, '#202838', '#0e121a', '#3a4660');
      box(ctx, -11, -12, 18, 21, 1, '#0a1a22');
      const cc = ['#ff2a6d', '#ffd319', '#05d9e8', '#3fff7f', '#ff7f3f'];
      for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) circ(ctx, -7 + x * 5, -9 + y * 5, 1.6, cc[Math.floor(r() * cc.length)]);
      R(ctx, 9, -10, 3, 8, '#3a4660');
      R(ctx, -11, 10, 18, 2, '#05d9e8');
    }},

    pillar: { along: 1, depth: 1, solid: 'tall', draw(ctx) {
      box(ctx, -15, -13, 30, 30, 2, 'rgba(0,0,0,0.5)');
      box(ctx, -15, -15, 30, 30, 2, '#2c2a33');
      box(ctx, -12, -12, 24, 24, 1, '#3a3744');
      R(ctx, -12, -12, 24, 1, '#55506a');
      R(ctx, -12, -12, 1, 24, '#4a4660');
    }},
  };

  // ---------- Мелкий мусор на полу ----------
  function drawDecal(ctx, d) {
    const r = rng(d.seed);
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
    switch (d.kind) {
      case 'paper':
        R(ctx, -5, -6, 10, 12, 'rgba(220,214,200,0.75)');
        for (let i = 0; i < 4; i++) R(ctx, -4, -4 + i * 2.5, 6 + (i % 2) * 2, 0.8, 'rgba(90,90,90,0.6)');
        break;
      case 'can':
        ell(ctx, 0, 0, 2.5, 5, 0, ['#c83a3a', '#3a8ac8', '#c8c83a', '#3ac87a'][Math.floor(r() * 4)]);
        ell(ctx, 0, -4, 2.3, 1, 0, '#d0d0d0');
        break;
      case 'bottle':
        ell(ctx, 0, 0, 2.6, 7, 0, 'rgba(60,160,90,0.8)');
        R(ctx, -1, -10, 2, 4, 'rgba(60,160,90,0.8)');
        ell(ctx, -0.8, -1, 0.8, 4, 0, 'rgba(255,255,255,0.4)');
        break;
      case 'shards':
        ctx.fillStyle = 'rgba(160,220,200,0.55)';
        for (let i = 0; i < 6; i++) { ctx.beginPath(); const x = (r() - 0.5) * 14, y = (r() - 0.5) * 14; ctx.moveTo(x, y); ctx.lineTo(x + 2 + r() * 2, y + 1); ctx.lineTo(x + 1, y + 3); ctx.fill(); }
        break;
      case 'stain':
        ctx.globalAlpha = 0.35;
        for (let i = 0; i < 4; i++) ell(ctx, (r() - 0.5) * 8, (r() - 0.5) * 6, 4 + r() * 6, 3 + r() * 4, r() * 3, d.color || '#000');
        ctx.globalAlpha = 1;
        break;
      case 'butt':
        R(ctx, -2, -0.6, 3, 1.4, '#e8e0d0'); R(ctx, 1, -0.6, 1.4, 1.4, '#c8783a');
        break;
      case 'casing':
        R(ctx, -1.5, -0.7, 3, 1.4, '#d0a040');
        break;
      case 'crack': {
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); let x = 0, y = 0; ctx.moveTo(x, y);
        for (let i = 0; i < 5; i++) { x += 4 + r() * 5; y += (r() - 0.5) * 6; ctx.lineTo(x, y); }
        ctx.stroke();
        break;
      }
      case 'leaf':
        ell(ctx, 0, 0, 4, 1.6, 0, '#2f6a3a');
        break;
      case 'cardboard':
        R(ctx, -6, -4, 12, 8, 'rgba(140,105,60,0.7)'); R(ctx, -6, -0.5, 12, 1, 'rgba(90,60,30,0.6)');
        break;
      case 'cable':
        ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.bezierCurveTo(-5, -8, 5, 8, 14, 0); ctx.stroke();
        break;
      case 'puddle':
        ctx.globalAlpha = 0.3; ell(ctx, 0, 0, 10 + r() * 6, 5 + r() * 4, 0, '#8fd8ff');
        ctx.globalAlpha = 0.25; ell(ctx, -3, -1, 4, 1.5, 0, '#ffffff'); ctx.globalAlpha = 1;
        break;
    }
    ctx.restore();
  }

  // Ковры
  function drawRug(ctx, rug) {
    const { x, y, w, h, c1, c2 } = rug;
    box(ctx, x, y, w, h, 3, c1);
    ctx.strokeStyle = c2; ctx.lineWidth = 2;
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 2); ctx.stroke();
    ctx.lineWidth = 1;
    rr(ctx, x + 8, y + 8, w - 16, h - 16, 2); ctx.stroke();
    ctx.globalAlpha = 0.25;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.moveTo(cx, y + 12); ctx.lineTo(x + w - 12, cy); ctx.lineTo(cx, y + h - 12); ctx.lineTo(x + 12, cy); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // бахрома
    ctx.fillStyle = c2;
    for (let fx = x + 2; fx < x + w - 2; fx += 4) { ctx.fillRect(fx, y - 2, 1, 2); ctx.fillRect(fx, y + h, 1, 2); }
  }

  // Анимированные части (экраны, светодиоды) — рисуются каждый кадр
  function drawAnim(ctx, a, t) {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
    const W = a.W, H = a.H;
    if (a.kind === 'tv') {
      const f = 0.55 + 0.45 * Math.abs(Math.sin(t * 7 + a.seed) * Math.sin(t * 2.3));
      ctx.globalAlpha = 0.18 * f;
      ctx.fillStyle = '#7fc8ff';
      ctx.beginPath(); ctx.moveTo(-22, -H / 2 + 8); ctx.lineTo(22, -H / 2 + 8); ctx.lineTo(40, H / 2 + 26); ctx.lineTo(-40, H / 2 + 26); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.6 + 0.4 * f;
      R(ctx, -23, -H / 2 + 6, 46, 2, '#9fd8ff');
    } else if (a.kind === 'arcade') {
      const c = ['#ff2a6d', '#05d9e8', '#ffd319'][Math.floor(t * 2 + a.seed) % 3];
      ctx.globalAlpha = 0.85;
      R(ctx, -9, -11, 18, 11, '#08081a');
      R(ctx, -8 + ((t * 20 + a.seed * 7) % 14), -8, 3, 3, c);
      R(ctx, -8, -3, 16, 1, c);
      ctx.globalAlpha = 0.15 + 0.08 * Math.sin(t * 9);
      circ(ctx, 0, H / 2 + 6, 16, c);
    } else if (a.kind === 'vending') {
      ctx.globalAlpha = 0.5 + 0.25 * Math.sin(t * 3 + a.seed);
      R(ctx, -11, 10, 18, 2, '#9ff8ff');
      ctx.globalAlpha = 0.12;
      circ(ctx, 0, H / 2 + 6, 15, '#05d9e8');
    } else if (a.kind === 'server') {
      const n = Math.round(W / T);
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < 4; k++) {
          const on = Math.sin(t * (3 + k) + i * 1.7 + a.seed + k) > 0.2;
          if (!on) continue;
          ctx.globalAlpha = 0.95;
          R(ctx, -W / 2 + i * T + T - 8, -H / 2 + 6 + k * 4, 2, 1.5, k % 3 === 0 ? '#ff4a4a' : '#3fff7f');
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  return { items, drawDecal, drawRug, drawAnim, rng, hash, rr, box, R, circ, ell };
})();
