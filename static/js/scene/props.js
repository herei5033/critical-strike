// =====================================================================
// Движок сцен — мебель, предметы, город.
// w,h — основание в клетках; up — сколько пикселей рисуется выше основания;
// solid — твёрдая часть [dx,dy,w,h] (null — проходимо); z — сдвиг глубины.
// =====================================================================

(function () {
  const P = Art.props;
  const blink = (t, k = 1) => Math.sin(t * 6 * k) > 0;

  // ---------- жилое ----------
  P.sofa = { w: 3, h: 1, up: 8, draw(c, x, y, o) {
    const col = o.col || '#4a3b2e', dk = shade(col, -0.3);
    R(c, x + 1, y - 8, 46, 9, dk); R(c, x + 1, y - 8, 46, 2, shade(col, 0.1));
    R(c, x, y - 2, 48, 13, col); R(c, x, y - 4, 4, 15, dk); R(c, x + 44, y - 4, 4, 15, dk);
    R(c, x + 4, y + 1, 19, 8, shade(col, 0.06)); R(c, x + 25, y + 1, 19, 8, shade(col, 0.06));
    R(c, x + 23, y + 1, 2, 8, dk); R(c, x + 2, y + 11, 3, 2, '#1a120c'); R(c, x + 43, y + 11, 3, 2, '#1a120c');
    if (o.blanket) { R(c, x + 26, y - 1, 16, 10, '#3d4a5a'); R(c, x + 28, y + 1, 12, 1, '#4f5d70'); R(c, x + 6, y - 1, 9, 5, '#d6d0c0'); }
  } };
  P.bed = { w: 2, h: 3, up: 4, draw(c, x, y, o) {
    R(c, x, y - 4, 32, 6, '#3a2a1e'); R(c, x + 1, y - 3, 30, 2, '#4a3626');
    R(c, x + 1, y + 2, 30, 44, '#d0cabb'); R(c, x + 3, y + 3, 11, 7, '#ece6d6'); R(c, x + 18, y + 3, 11, 7, '#ece6d6');
    R(c, x + 1, y + 13, 30, 33, o.col || '#5a3a4a'); R(c, x + 1, y + 13, 30, 2, shade(o.col || '#5a3a4a', 0.15));
    for (let i = 0; i < 4; i++) R(c, x + 4 + i * 7, y + 22, 3, 3, shade(o.col || '#5a3a4a', -0.2));
    R(c, x, y + 46, 32, 2, '#2a1d14');
  } };
  P.wallcarpet = { w: 3, h: 1, solid: null, z: -200, draw(c, x, y) {
    // казахский ковёр на стене
    R(c, x + 2, y + 1, 44, 12, '#6a1e22'); R(c, x + 3, y + 2, 42, 10, '#8a2a2a');
    R(c, x + 3, y + 2, 42, 1, '#c9a24a'); R(c, x + 3, y + 11, 42, 1, '#c9a24a');
    for (let i = 0; i < 3; i++) {
      const cx = x + 10 + i * 14;
      R(c, cx - 3, y + 6, 7, 2, '#c9a24a'); R(c, cx - 1, y + 4, 3, 6, '#c9a24a'); R(c, cx, y + 6, 1, 2, '#1e2a4a');
      R(c, cx - 4, y + 4, 1, 1, '#1e2a4a'); R(c, cx + 4, y + 4, 1, 1, '#1e2a4a'); R(c, cx - 4, y + 9, 1, 1, '#1e2a4a'); R(c, cx + 4, y + 9, 1, 1, '#1e2a4a');
    }
    for (let i = 0; i < 22; i++) R(c, x + 3 + i * 2, y + 13, 1, 2, '#b08a4a');
  } };
  P.tv = { w: 1, h: 1, up: 10, draw(c, x, y, o, t) {
    R(c, x + 1, y + 2, 14, 12, '#3a2a1e'); R(c, x + 2, y + 13, 2, 3, '#2a1d14'); R(c, x + 12, y + 13, 2, 3, '#2a1d14');
    R(c, x + 1, y - 9, 14, 12, '#222326'); R(c, x + 2, y - 8, 10, 9, o.on ? (Math.random() > 0.5 ? '#3a4a6a' : '#5a6a8a') : '#14161a');
    if (!o.on) R(c, x + 3, y - 7, 3, 2, 'rgba(255,255,255,0.12)');
    R(c, x + 13, y - 7, 1, 1, '#aa3333'); R(c, x + 13, y - 4, 1, 1, '#555');
    R(c, x + 6, y - 12, 1, 3, '#888'); R(c, x + 9, y - 13, 1, 4, '#888');
  } };
  P.desk = { w: 2, h: 1, up: 6, draw(c, x, y, o, t, E) {
    const col = o.col || '#5a3e2a';
    R(c, x, y - 2, 32, 9, col); R(c, x, y - 2, 32, 1, shade(col, 0.2)); R(c, x, y + 7, 32, 2, shade(col, -0.35));
    R(c, x + 1, y + 9, 2, 6, shade(col, -0.4)); R(c, x + 29, y + 9, 2, 6, shade(col, -0.4)); R(c, x + 20, y + 7, 10, 7, shade(col, -0.2)); R(c, x + 24, y + 9, 3, 1, '#c9a95a');
    for (const it of (o.items || [])) {
      if (it === 'lamp') { R(c, x + 3, y - 1, 5, 2, '#2a2a2a'); R(c, x + 5, y - 7, 1, 6, '#3a3a3a'); R(c, x + 3, y - 10, 6, 4, '#2d4a3a'); R(c, x + 4, y - 6, 4, 1, '#ffe7a8'); }
      if (it === 'laptop') { R(c, x + 12, y - 8, 10, 7, '#2a2c30'); R(c, x + 13, y - 7, 8, 5, '#6a8fbf'); R(c, x + 11, y - 1, 12, 2, '#3a3c40'); }
      if (it === 'papers') { R(c, x + 10, y - 1, 8, 5, '#d8d2c0'); R(c, x + 12, y - 2, 8, 5, '#e8e2d0'); R(c, x + 13, y, 5, 1, '#8a8678'); R(c, x + 13, y + 2, 4, 1, '#8a8678'); }
      if (it === 'stack') { for (let i = 0; i < 4; i++) R(c, x + 23, y - 1 - i * 2, 7, 2, i % 2 ? '#3a6ab0' : '#b03a3a'); }
      if (it === 'box') { R(c, x + 18, y - 9, 12, 9, '#8a6a42'); R(c, x + 18, y - 9, 12, 2, '#9c7a4e'); R(c, x + 20, y - 6, 8, 1, '#2a2a2a'); }
      if (it === 'cup') { R(c, x + 25, y - 3, 3, 3, '#d8d2c0'); R(c, x + 28, y - 2, 1, 1, '#d8d2c0'); }
      if (it === 'phone') { R(c, x + 24, y - 1, 3, 5, '#111'); R(c, x + 24, y - 1, 3, 1, '#333'); }
      if (it === 'emptylamp') { R(c, x + 3, y - 1, 5, 2, '#2a2a2a'); R(c, x + 5, y - 7, 1, 6, '#3a3a3a'); R(c, x + 3, y - 10, 6, 4, '#4a3a2a'); }
      if (it === 'dust') { R(c, x + 12, y - 1, 10, 6, shade(col, 0.12)); }
    }
  } };
  P.chair = { w: 1, h: 1, up: 6, draw(c, x, y, o) {
    const col = o.col || '#5a3e2a';
    if (o.dir === 'up') { R(c, x + 3, y + 2, 10, 8, col); R(c, x + 3, y + 9, 10, 2, shade(col, -0.3)); R(c, x + 4, y + 11, 1, 4, shade(col, -0.4)); R(c, x + 11, y + 11, 1, 4, shade(col, -0.4)); return; }
    R(c, x + 3, y - 6, 10, 9, shade(col, -0.15)); R(c, x + 3, y - 6, 10, 1, shade(col, 0.15));
    R(c, x + 3, y + 3, 10, 6, col); R(c, x + 4, y + 9, 1, 5, shade(col, -0.4)); R(c, x + 11, y + 9, 1, 5, shade(col, -0.4));
  } };
  P.stool = { w: 1, h: 1, up: 0, draw(c, x, y) { R(c, x + 4, y + 4, 8, 6, '#6a4a30'); R(c, x + 4, y + 4, 8, 1, '#7d5a3c'); R(c, x + 5, y + 10, 1, 5, '#3a2a1e'); R(c, x + 10, y + 10, 1, 5, '#3a2a1e'); } };
  P.box = { w: 1, h: 1, up: 4, draw(c, x, y, o) {
    R(c, x + 1, y - 2, 14, 14, '#7d5e3a'); R(c, x + 1, y - 2, 14, 3, '#8f6e46'); R(c, x + 7, y - 2, 2, 3, '#c8b890');
    R(c, x + 3, y + 4, 10, 4, '#d8d2c0'); R(c, x + 4, y + 5, 8, 1, '#2a2a2a'); R(c, x + 4, y + 7, 5, 1, '#2a2a2a');
    if (o.open) { R(c, x + 2, y - 3, 12, 2, '#e8e2d0'); R(c, x + 4, y - 4, 8, 1, '#d0caba'); }
  } };
  P.wardrobe = { w: 2, h: 1, up: 20, draw(c, x, y, o) {
    const col = o.col || '#4e3826';
    R(c, x + 1, y - 20, 30, 34, col); R(c, x + 1, y - 20, 30, 2, shade(col, 0.15));
    R(c, x + 15, y - 18, 1, 31, shade(col, -0.4)); R(c, x + 12, y - 4, 1, 4, '#c9a95a'); R(c, x + 18, y - 4, 1, 4, '#c9a95a');
    R(c, x + 3, y - 16, 10, 26, shade(col, 0.05)); R(c, x + 18, y - 16, 10, 26, shade(col, 0.05));
    R(c, x + 1, y + 13, 30, 2, shade(col, -0.45));
  } };
  P.bookshelf = { w: 2, h: 1, up: 20, draw(c, x, y, o) {
    const col = o.col || '#4a3424';
    R(c, x + 1, y - 20, 30, 34, col);
    for (let s = 0; s < 4; s++) {
      const sy = y - 18 + s * 8;
      R(c, x + 3, sy, 26, 7, '#1a120c');
      let bx = x + 3;
      while (bx < x + 28) {
        const bw = 2 + (ah(bx, sy) * 3 | 0), bh = 5 + (ah(sy, bx) * 2 | 0);
        if (o.empty && ah(bx, sy, 3) > 0.4) { bx += bw + 1; continue; }
        const cols = ['#6a2a2a', '#2a4a6a', '#5a5a2a', '#3a3a3a', '#7a6a4a', '#2a5a4a'];
        R(c, bx, sy + 7 - bh, bw, bh, cols[(ah(bx, sy, 1) * cols.length) | 0]);
        bx += bw;
      }
      R(c, x + 1, sy + 7, 30, 1, shade(col, 0.15));
    }
  } };
  P.coathook = { w: 1, h: 1, solid: null, z: -150, draw(c, x, y, o) {
    R(c, x + 2, y + 2, 12, 2, '#3a2a1e'); R(c, x + 4, y + 4, 1, 2, '#888'); R(c, x + 11, y + 4, 1, 2, '#888');
    if (!o.empty) { R(c, x + 2, y + 5, 6, 10, '#3b3f47'); R(c, x + 2, y + 5, 6, 1, '#4b4f57'); }
    R(c, x + 9, y + 5, 5, 7, '#4a3a2a');
  } };
  P.sink_mirror = { w: 1, h: 1, up: 12, draw(c, x, y) {
    R(c, x + 3, y - 12, 10, 9, '#9aa6aa'); R(c, x + 4, y - 11, 8, 7, '#2a3a44'); R(c, x + 5, y - 10, 2, 3, 'rgba(255,255,255,0.3)');
    R(c, x + 2, y - 1, 12, 6, '#e0e4e4'); R(c, x + 4, y, 8, 3, '#b8c0c2'); R(c, x + 7, y - 3, 1, 2, '#aaa');
    R(c, x + 6, y + 5, 4, 8, '#c8cccc');
  } };
  P.toilet = { w: 1, h: 1, up: 6, draw(c, x, y) { R(c, x + 4, y - 6, 8, 6, '#dde2e2'); R(c, x + 3, y, 10, 10, '#e8ecec'); R(c, x + 5, y + 2, 6, 5, '#b8c2c4'); R(c, x + 4, y + 10, 8, 4, '#c8cccc'); } };
  P.bath = { w: 2, h: 1, up: 4, draw(c, x, y) {
    R(c, x, y - 3, 32, 16, '#e0e4e4'); R(c, x + 3, y - 1, 26, 11, '#b0bcc0'); R(c, x + 4, y, 24, 2, '#c8d4d8');
    R(c, x + 26, y - 6, 2, 4, '#aaa'); R(c, x + 2, y + 13, 3, 2, '#888'); R(c, x + 27, y + 13, 3, 2, '#888');
  } };
  P.fridge = { w: 1, h: 1, up: 14, draw(c, x, y, o) {
    R(c, x + 1, y - 14, 14, 28, '#d8d8d0'); R(c, x + 1, y - 14, 14, 1, '#ecece4'); R(c, x + 13, y - 14, 2, 28, '#b8b8b0');
    R(c, x + 1, y - 4, 14, 1, '#a8a8a0'); R(c, x + 3, y - 10, 1, 4, '#888'); R(c, x + 3, y - 1, 1, 4, '#888');
    if (o.photo) { R(c, x + 6, y - 12, 6, 5, '#f0ead8'); R(c, x + 7, y - 11, 4, 3, '#6a8aaa'); R(c, x + 8, y - 10, 2, 2, '#c99572'); }
    R(c, x + 9, y + 2, 2, 2, '#c03030'); R(c, x + 5, y + 5, 2, 2, '#30a050');
  } };
  P.stove = { w: 1, h: 1, up: 2, draw(c, x, y, o) {
    R(c, x + 1, y - 2, 14, 16, '#cfcfc6'); R(c, x + 1, y - 2, 14, 7, '#4a4a48');
    R(c, x + 3, y - 1, 4, 2, '#222'); R(c, x + 9, y - 1, 4, 2, '#222'); R(c, x + 3, y + 2, 4, 2, '#222'); R(c, x + 9, y + 2, 4, 2, '#222');
    R(c, x + 3, y + 7, 10, 6, '#3a3a3a'); R(c, x + 4, y + 8, 8, 4, '#2a2a2a');
    if (o.kettle) { R(c, x + 8, y - 6, 6, 5, '#7a8a9a'); R(c, x + 9, y - 7, 4, 1, '#5a6a7a'); R(c, x + 14, y - 5, 1, 2, '#7a8a9a'); }
  } };
  P.counter = { w: 1, h: 1, up: 2, draw(c, x, y, o) {
    R(c, x, y - 2, 16, 16, '#8a7a62'); R(c, x, y - 2, 16, 4, '#b0a68e'); R(c, x + 2, y + 4, 12, 9, '#7a6a52'); R(c, x + 7, y + 7, 2, 1, '#c9a95a');
    if (o.sink) { R(c, x + 3, y - 1, 10, 3, '#9aa4a8'); R(c, x + 7, y - 4, 1, 3, '#aaa'); }
    if (o.dishes) { R(c, x + 2, y - 4, 4, 2, '#e0e0d8'); R(c, x + 9, y - 5, 4, 3, '#c8c0b0'); }
  } };
  P.ktable = { w: 2, h: 1, up: 4, draw(c, x, y, o) {
    R(c, x + 1, y - 2, 30, 10, '#d6d0c0'); R(c, x + 1, y - 2, 30, 1, '#e8e2d2');
    for (let i = 0; i < 30; i += 6) R(c, x + 1 + i, y + 2, 3, 3, 'rgba(160,40,40,0.25)');   // клеёнка
    R(c, x + 1, y + 8, 30, 2, '#a8a290'); R(c, x + 2, y + 10, 2, 5, '#5a4a3a'); R(c, x + 28, y + 10, 2, 5, '#5a4a3a');
    for (const it of (o.items || [])) {
      if (it === 'ashtray') { R(c, x + 4, y + 1, 6, 3, '#7a8a8a'); R(c, x + 5, y + 1, 1, 1, '#ddd'); R(c, x + 7, y + 2, 2, 1, '#ddd'); }
      if (it === 'bottle') { R(c, x + 20, y - 8, 3, 9, '#2a5a3a'); R(c, x + 21, y - 10, 1, 2, '#2a5a3a'); R(c, x + 20, y - 5, 3, 3, '#d8d2c0'); }
      if (it === 'glass') { R(c, x + 24, y - 2, 3, 3, 'rgba(200,220,230,0.6)'); }
      if (it === 'cups2') { R(c, x + 8, y - 2, 4, 4, '#e8e2d2'); R(c, x + 9, y - 2, 2, 1, '#6a3a2a'); R(c, x + 20, y - 2, 4, 4, '#e8e2d2'); R(c, x + 21, y - 1, 2, 1, '#b04a5a'); }
      if (it === 'bread') { R(c, x + 12, y, 7, 3, '#c89a5a'); }
      if (it === 'phone') { R(c, x + 14, y - 1, 3, 5, '#111'); }
      if (it === 'tea') { R(c, x + 13, y - 1, 4, 4, '#d8d2c0'); R(c, x + 14, y - 1, 2, 1, '#8a5a2a'); }
    }
  } };
  P.radiator = { w: 1, h: 1, solid: null, z: -150, draw(c, x, y) {
    R(c, x + 1, y + 7, 14, 7, '#c8c4b4'); for (let i = 0; i < 7; i++) R(c, x + 2 + i * 2, y + 7, 1, 7, '#a8a494');
  } };
  P.plant = { w: 1, h: 1, up: 8, draw(c, x, y, o) {
    R(c, x + 4, y + 4, 8, 8, '#8a4a2a'); R(c, x + 4, y + 4, 8, 1, '#9a5a3a');
    const lc = o.dry ? '#6a6a3a' : '#2a5a3a';
    R(c, x + 7, y - 6, 2, 10, '#3a4a2a'); R(c, x + 3, y - 6, 5, 3, lc); R(c, x + 9, y - 8, 5, 3, lc); R(c, x + 4, y - 1, 4, 3, lc); R(c, x + 9, y - 2, 4, 3, shade(lc, -0.2));
  } };
  P.phone_table = { w: 1, h: 1, up: 4, draw(c, x, y, o, t, E) {
    R(c, x + 2, y - 1, 12, 8, '#5a3e2a'); R(c, x + 2, y - 1, 12, 1, '#6e4e36'); R(c, x + 3, y + 7, 2, 7, '#3a2a1e'); R(c, x + 11, y + 7, 2, 7, '#3a2a1e');
    const ring = E && E.S && E.S.flags.ringing;
    const j = ring && blink(t, 3) ? 1 : 0;
    R(c, x + 4, y - 4 - j, 8, 4, '#7a1a1a'); R(c, x + 4, y - 5 - j, 8, 1, '#9a2a2a'); R(c, x + 6, y - 3 - j, 4, 2, '#d8d2c0');
    if (ring && blink(t, 1.5)) { R(c, x + 1, y - 9, 1, 3, '#ffe7a8'); R(c, x + 14, y - 9, 1, 3, '#ffe7a8'); R(c, x - 1, y - 7, 1, 2, '#ffe7a8'); R(c, x + 16, y - 7, 1, 2, '#ffe7a8'); }
  } };
  P.rug = { w: 1, h: 1, solid: null, walk: true, z: -1000, draw(c, x, y, o) {
    const w = (o.w || 3) * 16, h = (o.h || 2) * 16, col = o.col || '#5a1e22';
    R(c, x + 2, y + 2, w - 4, h - 4, col); R(c, x + 4, y + 4, w - 8, h - 8, shade(col, 0.15));
    R(c, x + 4, y + 4, w - 8, 1, '#b08a4a'); R(c, x + 4, y + h - 5, w - 8, 1, '#b08a4a');
    for (let i = 8; i < w - 8; i += 10) { R(c, x + i, y + h / 2 - 2, 4, 4, '#b08a4a'); R(c, x + i + 1, y + h / 2 - 1, 2, 2, '#1e2a4a'); }
  } };
  P.decor = { w: 1, h: 1, solid: null, walk: true, z: -900, draw(c, x, y, o, t) {
    const k = o.v;
    if (k === 'butts') { R(c, x + 4, y + 9, 3, 1, '#d8d0c0'); R(c, x + 4, y + 9, 1, 1, '#c8803a'); R(c, x + 9, y + 11, 3, 1, '#d8d0c0'); R(c, x + 7, y + 6, 3, 1, '#d8d0c0'); R(c, x + 7, y + 6, 1, 1, '#b04a5a'); }
    if (k === 'bottles') { R(c, x + 3, y + 4, 3, 8, '#2a5a3a'); R(c, x + 7, y + 6, 3, 7, '#5a3a1a'); R(c, x + 11, y + 9, 4, 3, '#2a5a3a'); }
    if (k === 'puddle') { R(c, x + 1, y + 5, 14, 6, '#1a2632'); R(c, x + 3, y + 6, 6, 1, '#3a5268'); }
    if (k === 'papers') { R(c, x + 2, y + 4, 7, 5, '#d8d2c0'); R(c, x + 8, y + 8, 6, 5, '#c8c2b0'); R(c, x + 3, y + 5, 4, 1, '#666'); }
    if (k === 'bowl') { R(c, x + 4, y + 8, 8, 4, '#3a6ab0'); R(c, x + 5, y + 8, 6, 1, '#6a4a2a'); }
    if (k === 'shoes') { R(c, x + 2, y + 8, 5, 3, '#1a1414'); R(c, x + 9, y + 9, 5, 3, '#2a1a14'); }
    if (k === 'shoe') { R(c, x + 6, y + 8, 5, 3, '#1a1a1a'); R(c, x + 10, y + 6, 1, 3, '#1a1a1a'); }
    if (k === 'cable') { c.strokeStyle = '#1a1a1a'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + 8); c.quadraticCurveTo(x + 8, y + 2, x + 16, y + 10); c.stroke(); }
    if (k === 'stain') { R(c, x + 3, y + 5, 9, 6, 'rgba(20,10,10,0.45)'); }
    if (k === 'leaflets') { R(c, x + 2, y + 3, 6, 4, '#c8c2b0'); R(c, x + 9, y + 6, 5, 4, '#d8b84a'); }
  } };

  // ---------- кот Сократ ----------
  P.cat = { w: 1, h: 1, up: 0, solid: null, walk: true, draw(c, x, y, o, t) {
    const col = o.col || '#2a2624', dk = shade(col, -0.3);
    R(c, x + 4, y + 7, 8, 6, col); R(c, x + 9, y + 3, 5, 5, col); R(c, x + 9, y + 2, 1, 2, col); R(c, x + 13, y + 2, 1, 2, col);
    R(c, x + 10, y + 5, 1, 1, '#c8d84a'); R(c, x + 12, y + 5, 1, 1, '#c8d84a');
    const tw = Math.sin(t * 2) > 0 ? 1 : 0;
    R(c, x + 2, y + 9 - tw, 2, 1, col); R(c, x + 1, y + 7 - tw, 1, 3, col);
    R(c, x + 5, y + 12, 2, 1, dk); R(c, x + 9, y + 12, 2, 1, dk);
    if (o.collar) R(c, x + 9, y + 7, 5, 1, '#c03030'), R(c, x + 11, y + 8, 1, 1, '#d8b84a');
  } };

  // ---------- подъезд ----------
  P.mailboxes = { w: 2, h: 1, solid: null, z: -150, draw(c, x, y) {
    R(c, x + 1, y + 1, 30, 11, '#4a5a4e'); for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) { R(c, x + 2 + j * 5, y + 2 + i * 3, 4, 2, '#3a4a3e'); R(c, x + 3 + j * 5, y + 3 + i * 3, 2, 1, '#222'); }
  } };
  P.elpanel = { w: 1, h: 1, solid: null, z: -150, draw(c, x, y) { R(c, x + 3, y + 1, 10, 11, '#6a6e6a'); R(c, x + 4, y + 2, 8, 9, '#5a5e5a'); R(c, x + 7, y + 5, 2, 2, '#d8b84a'); R(c, x + 5, y + 9, 6, 1, '#2a2a2a'); } };
  P.ladder = { w: 1, h: 1, up: 16, solid: null, walk: true, draw(c, x, y) {
    R(c, x + 3, y - 16, 1, 30, '#7a7e82'); R(c, x + 12, y - 16, 1, 30, '#7a7e82');
    for (let i = 0; i < 7; i++) R(c, x + 3, y - 14 + i * 4, 10, 1, '#8a8e92');
    R(c, x + 1, y - 18, 14, 3, '#2a2a2e');
  } };
  P.wallrects = { w: 4, h: 1, solid: null, z: -150, draw(c, x, y) {
    // светлые прямоугольники на обоях — со стены сняли фотографии
    const spots = [[2, 1, 6, 5], [10, 2, 5, 4], [17, 1, 6, 5], [26, 3, 5, 4], [33, 1, 6, 5], [42, 2, 5, 5], [50, 1, 6, 4], [57, 2, 5, 5], [4, 7, 5, 4], [13, 8, 6, 4], [22, 7, 5, 4], [31, 8, 6, 4], [40, 8, 5, 4], [49, 7, 6, 4]];
    for (const [a, b, w, h] of spots) { R(c, x + a, y + b, w, h, '#6b7884'); R(c, x + a + w / 2 | 0, y + b, 1, 1, '#b03030'); }
    c.strokeStyle = 'rgba(176,48,48,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 5, y + 1); c.lineTo(x + 12, y + 2); c.moveTo(x + 36, y + 1); c.lineTo(x + 44, y + 9); c.stroke();
  } };
  P.photo = { w: 1, h: 1, solid: null, z: -150, draw(c, x, y, o) {
    R(c, x + 4, y + 2, 8, 8, '#8a6a42'); R(c, x + 5, y + 3, 6, 6, o.col || '#5a7a9a'); R(c, x + 7, y + 5, 2, 2, '#c99572');
  } };

  // ---------- крыша и маяк ----------
  P.lighthouse = { w: 3, h: 2, up: 74, draw(c, x, y, o, t) {
    const bx = x + 8, by = y + 30;
    R(c, x, y + 18, 48, 14, '#4a4b4e'); R(c, x, y + 18, 48, 2, '#5c5d60');           // постамент
    R(c, x + 18, y + 22, 12, 10, '#2a2a2e'); R(c, x + 19, y + 23, 10, 9, '#3a3438'); R(c, x + 27, y + 27, 1, 2, '#9a9080');   // дверь
    // башня
    for (let i = 0; i < 9; i++) {
      const yy = by - 30 - i * 7, w = 30 - i;
      R(c, x + 24 - w / 2, yy - 7, w, 8, i % 3 === 1 ? '#a83a32' : '#cfc8b4');
      R(c, x + 24 + w / 2 - 4, yy - 7, 4, 8, i % 3 === 1 ? '#7a2a24' : '#a8a290');
    }
    // галерея и лампа
    const ly = by - 30 - 9 * 7;
    R(c, x + 12, ly - 2, 24, 3, '#2a2a2e'); for (let i = 0; i < 6; i++) R(c, x + 13 + i * 4, ly - 6, 1, 4, '#3a3a3e');
    R(c, x + 16, ly - 14, 16, 12, '#22252a'); R(c, x + 18, ly - 12, 12, 8, '#fff2c0');
    R(c, x + 23, ly - 12, 2, 8, '#ffe08a');
    R(c, x + 15, ly - 17, 18, 3, '#3a3a3e'); R(c, x + 21, ly - 20, 6, 3, '#2a2a2e');
  } };
  P.corpse = { w: 1, h: 1, up: 6, draw(c, x, y, o) { Art.body(c, o.look || { skin: '#d8ae90', hair: '#1a1416', coat: '#9a8462', pants: '#2a2a30' }, x + 8, y + 14); } };
  P.vent = { w: 1, h: 1, up: 8, draw(c, x, y) { R(c, x + 4, y - 4, 8, 16, '#5c5e60'); R(c, x + 3, y - 8, 10, 4, '#6e7072'); R(c, x + 4, y - 4, 8, 1, '#2a2a2c'); R(c, x + 10, y - 4, 2, 16, '#4a4c4e'); } };
  P.antenna = { w: 1, h: 1, up: 24, draw(c, x, y) { R(c, x + 7, y - 24, 1, 36, '#7a7e82'); R(c, x + 2, y - 20, 12, 1, '#7a7e82'); R(c, x + 4, y - 14, 8, 1, '#7a7e82'); R(c, x + 5, y + 10, 5, 3, '#4a4c4e'); } };
  P.tank = { w: 2, h: 2, up: 12, draw(c, x, y) {
    R(c, x + 1, y - 10, 30, 40, '#4a5056'); R(c, x + 1, y - 10, 30, 3, '#5a6066'); R(c, x + 25, y - 10, 6, 40, '#3a4046');
    for (let i = 0; i < 4; i++) R(c, x + 1, y - 2 + i * 9, 30, 1, '#3a4046');
    R(c, x + 4, y + 22, 8, 5, 'rgba(120,70,40,0.5)');
  } };
  P.hatch = { w: 1, h: 1, solid: null, walk: true, z: -900, draw(c, x, y) { R(c, x + 1, y + 1, 14, 14, '#111'); R(c, x + 1, y + 1, 14, 2, '#3a3a3e'); R(c, x + 3, y + 5, 10, 1, '#5a5a5e'); R(c, x + 3, y + 9, 10, 1, '#5a5a5e'); R(c, x + 1, y - 9, 14, 10, '#4a4a4e'); R(c, x + 2, y - 8, 12, 1, '#5e5e62'); } };
  P.tape = { w: 1, h: 1, solid: null, walk: true, z: 2, draw(c, x, y, o, t) {
    const w = (o.w || 3) * 16;
    R(c, x, y + 4, 2, 10, '#555'); R(c, x + w - 2, y + 4, 2, 10, '#555');
    for (let i = 0; i < w; i += 4) R(c, i + x, y + 5 + Math.sin(t * 3 + i * 0.2) * 0.8, 4, 2, (i / 4) % 2 ? '#d8c83a' : '#1a1a1a');
  } };

  // ---------- улица ----------
  P.streetlamp = { w: 1, h: 1, up: 40, solid: [0, 0, 1, 1], draw(c, x, y, o, t) {
    R(c, x + 7, y - 38, 2, 52, '#3a3c40'); R(c, x + 6, y + 12, 4, 2, '#2a2c30');
    R(c, x + 8, y - 38, 8, 2, '#3a3c40'); R(c, x + 12, y - 37, 6, 3, '#2a2c30');
    const on = !o.flick || Math.sin(t * 13) * Math.sin(t * 7) > -0.6;
    R(c, x + 13, y - 34, 4, 1, on ? '#ffcf7a' : '#5a4a2a');
  } };
  P.bench = { w: 2, h: 1, up: 4, draw(c, x, y) {
    R(c, x + 1, y - 4, 30, 3, '#5a4030'); R(c, x + 1, y + 1, 30, 4, '#6a4a38'); R(c, x + 1, y + 5, 30, 1, '#4a3020');
    R(c, x + 3, y + 6, 2, 8, '#2a2c30'); R(c, x + 27, y + 6, 2, 8, '#2a2c30');
  } };
  P.car = { w: 3, h: 2, up: 4, draw(c, x, y, o, t) {
    const col = o.col || '#5a5e64', dk = shade(col, -0.35), lt = shade(col, 0.18);
    const f = o.face === 'left';
    R(c, x + 2, y + 4, 44, 22, col); R(c, x + 2, y + 4, 44, 2, lt); R(c, x + 2, y + 24, 44, 2, dk);
    R(c, x + (f ? 14 : 12), y + 6, 22, 16, dk); R(c, x + (f ? 16 : 14), y + 8, 18, 12, lt);
    R(c, x + (f ? 13 : 33), y + 7, 3, 14, '#1a2632'); R(c, x + (f ? 34 : 12), y + 8, 2, 12, '#1a2632');
    R(c, x + 6, y + 2, 7, 3, '#141414'); R(c, x + 35, y + 2, 7, 3, '#141414'); R(c, x + 6, y + 25, 7, 3, '#141414'); R(c, x + 35, y + 25, 7, 3, '#141414');
    R(c, x + (f ? 2 : 44), y + 6, 2, 4, '#ffe7a8'); R(c, x + (f ? 2 : 44), y + 20, 2, 4, '#ffe7a8');
    R(c, x + (f ? 44 : 2), y + 6, 2, 4, '#8a1a1a'); R(c, x + (f ? 44 : 2), y + 20, 2, 4, '#8a1a1a');
    if (o.police) {
      R(c, x + 4, y + 13, 40, 3, '#d8d8d0'); R(c, x + 20, y + 12, 3, 5, blink(t, 1.3) ? '#3a6aff' : '#1a2a5a'); R(c, x + 25, y + 12, 3, 5, blink(t, 1.3) ? '#5a1a1a' : '#ff3a3a');
    }
    if (o.wet) { R(c, x + 18, y + 10, 4, 1, 'rgba(255,255,255,0.25)'); }
  } };
  P.kiosk = { w: 3, h: 2, up: 18, draw(c, x, y, o, t) {
    R(c, x, y - 16, 48, 48, '#3a4a5a'); R(c, x, y - 18, 48, 4, '#2a3a4a'); R(c, x - 1, y - 20, 50, 3, '#5a2a2a');
    R(c, x + 4, y - 13, 40, 6, '#1a1a1a');
    c.fillStyle = blink(t, 0.2) || true ? '#ff5a4a' : '#5a2a2a'; c.font = 'bold 6px monospace'; c.textAlign = 'center'; c.fillText('24 ЧАСА', x + 24, y - 8);
    R(c, x + 6, y - 4, 36, 18, '#e8c88a'); R(c, x + 7, y - 3, 34, 16, '#d8b06a');
    for (let i = 0; i < 6; i++) R(c, x + 8 + i * 5, y - 2 + (i % 2) * 3, 3, 4, ['#c03030', '#3070c0', '#30a050', '#d8b84a', '#e0e0d8', '#8a3ac0'][i]);
    // киоскёрша в окне
    R(c, x + 20, y + 3, 8, 8, '#5a4a6a'); R(c, x + 21, y - 3, 6, 6, '#c79a76'); R(c, x + 20, y - 4, 8, 3, '#7a2a3a'); R(c, x + 22, y - 1, 1, 1, '#222'); R(c, x + 25, y - 1, 1, 1, '#222');
    R(c, x + 4, y + 14, 40, 3, '#2a3a4a'); R(c, x + 4, y + 17, 40, 12, '#33434f');
    R(c, x + 4, y + 13, 40, 1, '#9a8a6a');
  } };
  P.garage = { w: 2, h: 2, up: 6, draw(c, x, y, o) {
    const col = o.col || '#4a5248';
    R(c, x, y - 6, 32, 38, shade(col, -0.2)); R(c, x, y - 6, 32, 3, shade(col, 0.1));
    R(c, x + 3, y + 6, 26, 26, col); R(c, x + 15, y + 6, 2, 26, shade(col, -0.35));
    for (let i = 0; i < 5; i++) R(c, x + 3 + (ah(x, i) * 24 | 0), y + 8 + (ah(i, x) * 20 | 0), 3, 2, '#6a3a22');
    R(c, x + 13, y + 18, 1, 3, '#888'); R(c, x + 18, y + 18, 1, 3, '#888');
    if (o.num) { R(c, x + 5, y + 9, 7, 5, '#d8d2c0'); }
  } };
  P.bins = { w: 2, h: 1, up: 6, draw(c, x, y) {
    for (let i = 0; i < 2; i++) { R(c, x + 1 + i * 16, y - 4, 14, 16, '#2a4a3a'); R(c, x + 1 + i * 16, y - 6, 14, 3, '#1e3a2c'); R(c, x + 3 + i * 16, y + 12, 2, 2, '#111'); R(c, x + 11 + i * 16, y + 12, 2, 2, '#111'); }
    R(c, x + 4, y - 8, 6, 3, '#c8c2b0'); R(c, x + 20, y - 7, 5, 2, '#3a3a3a');
  } };
  P.tree = { w: 1, h: 1, up: 30, draw(c, x, y, o, t) {
    const sw = Math.sin(t * 1.3 + x) * 1;
    R(c, x + 7, y - 8, 3, 22, '#3a3024'); R(c, x + 6, y + 12, 5, 2, '#2a2218');
    c.strokeStyle = '#3a3024'; c.lineWidth = 1; c.beginPath();
    c.moveTo(x + 8, y - 6); c.lineTo(x + 2 + sw, y - 18); c.moveTo(x + 8, y - 8); c.lineTo(x + 14 + sw, y - 22);
    c.moveTo(x + 8, y - 4); c.lineTo(x + 15 + sw, y - 10); c.moveTo(x + 5 + sw, y - 14); c.lineTo(x + 1 + sw, y - 26);
    c.moveTo(x + 12 + sw, y - 18); c.lineTo(x + 9 + sw, y - 28); c.stroke();
    if (!o.bare) for (let i = 0; i < 8; i++) R(c, x + 1 + (ah(x, i) * 15 | 0) + sw, y - 28 + (ah(i, y) * 16 | 0), 2, 1, '#4a4a2a');
  } };
  P.swing = { w: 2, h: 1, up: 16, draw(c, x, y, o, t) {
    R(c, x + 2, y - 16, 2, 30, '#6a3a3a'); R(c, x + 28, y - 16, 2, 30, '#6a3a3a'); R(c, x + 2, y - 17, 28, 2, '#7a4a4a');
    const a = Math.sin(t * 0.8) * 1.5;
    R(c, x + 10 + a, y - 15, 1, 18, '#888'); R(c, x + 21 + a, y - 15, 1, 18, '#888'); R(c, x + 9 + a, y + 3, 14, 2, '#5a4030');
  } };
  P.barrel = { w: 1, h: 1, up: 6, draw(c, x, y, o, t) {
    R(c, x + 3, y - 2, 10, 14, '#3a2e26'); R(c, x + 3, y + 2, 10, 1, '#2a201a'); R(c, x + 3, y + 7, 10, 1, '#2a201a'); R(c, x + 3, y - 2, 10, 2, '#4a3a30');
    for (let i = 0; i < 5; i++) { const h = 3 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 6; R(c, x + 4 + i * 2, y - 2 - h, 2, h, i % 2 ? '#ff9a3a' : '#ffd36a'); }
    R(c, x + 6, y - 8 - (t * 10 % 6), 1, 1, '#ffb84a');
  } };
  P.sign = { w: 1, h: 1, solid: null, z: -150, draw(c, x, y, o) {
    R(c, x + 1, y + 3, 14, 7, '#2a4a8a'); R(c, x + 2, y + 4, 12, 5, '#3a5a9a');
    c.fillStyle = '#e8e8e0'; c.font = 'bold 5px monospace'; c.textAlign = 'center'; c.fillText(o.text || '19', x + 8, y + 9);
  } };
  P.clothesline = { w: 3, h: 1, solid: null, walk: true, z: 20, draw(c, x, y, o, t) {
    R(c, x, y - 10, 48, 1, '#888');
    const s = Math.sin(t * 2) * 1;
    R(c, x + 5 + s, y - 9, 6, 8, '#d8d2c0'); R(c, x + 16 + s, y - 9, 8, 6, '#5a6a8a'); R(c, x + 30 + s, y - 9, 5, 9, '#8a3a3a');
  } };
  P.chair_out = { w: 1, h: 1, up: 6, draw(c, x, y) { R(c, x + 3, y - 4, 10, 7, '#3a5a4a'); R(c, x + 3, y + 3, 10, 5, '#4a6a5a'); R(c, x + 4, y + 8, 1, 6, '#2a2a2a'); R(c, x + 11, y + 8, 1, 6, '#2a2a2a'); } };
  P.pot_ash = { w: 1, h: 1, up: 0, solid: null, walk: true, draw(c, x, y) { R(c, x + 4, y + 7, 8, 6, '#6a3a2a'); R(c, x + 5, y + 7, 6, 2, '#3a3a3a'); R(c, x + 6, y + 6, 4, 1, '#d8d0c0'); R(c, x + 9, y + 5, 3, 1, '#d8d0c0'); } };
  // ---------- разное: подъезд, крыша, допросная ----------
  P.liftdoor = { w: 1, h: 1, solid: null, z: -150, draw(c, x, y) {
  R(c, x + 1, y, 14, 16, '#2a2a2e'); R(c, x + 2, y + 1, 5, 15, '#5a5c60'); R(c, x + 9, y + 1, 5, 15, '#5a5c60'); R(c, x + 7, y + 1, 2, 15, '#1a1a1e');
  R(c, x + 3, y + 5, 3, 1, '#d8d8d0'); R(c, x + 10, y + 7, 3, 1, '#d8d8d0');
} };
  P.flood = { w: 1, h: 1, up: 14, solid: null, draw(c, x, y, o, t) {
  R(c, x + 7, y - 6, 2, 18, '#3a3c40'); R(c, x + 3, y + 10, 10, 2, '#2a2c30'); R(c, x + 3, y + 12, 1, 3, '#2a2c30'); R(c, x + 12, y + 12, 1, 3, '#2a2c30');
  R(c, x + 2, y - 14, 10, 8, '#2a2c30'); R(c, x + 3, y - 13, 8, 6, '#f0f4ff');
} };
  P.itable = { w: 2, h: 1, up: 10, draw(c, x, y, o, t) {
  R(c, x, y - 2, 32, 10, '#6a6e72'); R(c, x, y - 2, 32, 1, '#8a8e92'); R(c, x, y + 8, 32, 2, '#3a3e42');
  R(c, x + 2, y + 10, 2, 5, '#2a2e32'); R(c, x + 28, y + 10, 2, 5, '#2a2e32');
  R(c, x + 3, y - 1, 9, 6, '#e8e2d0'); R(c, x + 4, y + 1, 6, 1, '#555'); R(c, x + 4, y + 3, 4, 1, '#555');   // протокол
  R(c, x + 14, y, 6, 3, '#7a8a8a'); R(c, x + 15, y, 4, 1, '#ddd');                                        // пепельница
  R(c, x + 23, y - 9, 2, 8, '#2a2a2a'); R(c, x + 20, y - 12, 8, 4, '#3a3a3a'); R(c, x + 21, y - 8, 6, 1, '#ffe7a8');   // лампа
  R(c, x + 26, y - 4, 3, 5, 'rgba(160,190,210,0.7)');                                                    // стакан воды
} };
  P.mirrorwall = { w: 3, h: 1, solid: null, z: -150, draw(c, x, y, o, t) {
  R(c, x + 1, y + 1, 46, 12, '#3a3a36'); R(c, x + 2, y + 2, 44, 10, '#0e1012');
  R(c, x + 6, y + 3, 10, 1, 'rgba(255,255,255,0.12)'); R(c, x + 30, y + 8, 6, 1, 'rgba(255,255,255,0.08)');
} };
  P.wallclock = { w: 1, h: 1, solid: null, z: -150, draw(c, x, y) {
  R(c, x + 4, y + 2, 8, 8, '#d8d2c0'); R(c, x + 5, y + 3, 6, 6, '#efe9d8'); R(c, x + 8, y + 4, 1, 3, '#1a1a1a'); R(c, x + 8, y + 6, 2, 1, '#1a1a1a');
} };
  P.answerer = { w: 1, h: 1, solid: null, z: 3, draw(c, x, y, o, t, E) {
  R(c, x + 3, y - 3, 10, 5, '#1e1e22'); R(c, x + 4, y - 2, 4, 3, '#2e2e34');
  const heard = E && E.S && E.S.flags.heard_vm;
  R(c, x + 10, y - 2, 2, 2, !heard && Math.sin(t * 5) > 0 ? '#ff3a2a' : '#4a1a1a');
} };
  P.gascyl = { w: 1, h: 1, up: 6, draw(c, x, y) {
  R(c, x + 4, y - 4, 8, 16, '#b03a2a'); R(c, x + 5, y - 6, 6, 2, '#7a2a1a'); R(c, x + 7, y - 8, 2, 2, '#888'); R(c, x + 4, y + 2, 8, 1, '#8a2a1a');
  R(c, x + 12, y + 6, 4, 4, '#7a8a9a'); R(c, x + 13, y + 5, 2, 1, '#5a6a7a');   // чайник
} };
  P.poster = { w: 1, h: 1, solid: null, z: -150, draw(c, x, y) {
  R(c, x + 1, y + 2, 14, 10, '#d8d2c0'); R(c, x + 2, y + 3, 12, 3, '#2a4a8a'); R(c, x + 3, y + 7, 9, 1, '#555'); R(c, x + 3, y + 9, 7, 1, '#555');
} };
  P.graffiti = { w: 2, h: 1, solid: null, z: 30, draw(c, x, y, o) {
  c.fillStyle = '#c03a3a'; c.font = 'bold 5px monospace'; c.textAlign = 'center';
  String(o.text || '').split(String.fromCharCode(10)).forEach((l, i) => c.fillText(l, x + 16, y + 20 + i * 6));
} };
  P.cat.z = 1;

  P.hotspot = { w: 1, h: 1, solid: null, walk: true, draw() {} };
  P.block = { w: 1, h: 1, draw() {} };
})();
