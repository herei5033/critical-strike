// =====================================================================
// РАССЛЕДОВАНИЕ АУЛЕТА — пиксельная графика.
// Всё рисуется кодом: тайлы, мебель, город, люди, портреты.
// Мир 480×270, тайл 16×16. Вид сверху с наклоном (3/4).
// =====================================================================

const ah = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
}

const WALLISH = new Set(['#', 'W', ' ', 'P', 'E']);

const Art = {
  solidTile(ch) { return '#W PErR~pfbKT'.includes(ch); },

  // ---------------------------------------------------------------
  // запекание статичного слоя карты
  // ---------------------------------------------------------------
  bakeMap(m) {
    const cv = aMk(m.w * TS, m.h * TS), c = cv.getContext('2d');
    const st = m.def.style || {};
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const ch = m.grid[y][x];
      const px = x * TS, py = y * TS;
      const below = y + 1 < m.h ? m.grid[y + 1][x] : ' ';
      const above = y > 0 ? m.grid[y - 1][x] : ' ';
      const wallStyle = this.regionStyle(st.walls, x, y) || st.wall || 'home';
      if (ch === ' ') { R(c, px, py, TS, TS, m.def.void || '#050507'); continue; }
      if (ch === '#' || ch === 'W') {
        if (!WALLISH.has(below) && below !== 'D') this.wallFront(c, px, py, wallStyle, x, y, ch === 'W', m);
        else this.wallTop(c, px, py, x, y, m, wallStyle);
        continue;
      }
      if (ch === 'D') {
        const fl = this.regionStyle(st.floors, x, y) || st.floor || 'parquet';
        this.floor(c, px, py, fl, x, y);
        const left = x > 0 ? m.grid[y][x - 1] : ' ', right = x + 1 < m.w ? m.grid[y][x + 1] : ' ';
        if (!WALLISH.has(below) && (WALLISH.has(above) || (WALLISH.has(left) && WALLISH.has(right)))) this.door(c, px, py, (m.def.doors && m.def.doors[x + ',' + y]) || st.door || 'padded', x, y);
        else { R(c, px, py, TS, TS, 'rgba(0,0,0,0.35)'); R(c, px + 1, py, 1, TS, '#2a1d14'); R(c, px + 14, py, 1, TS, '#2a1d14'); }
        continue;
      }
      if (ch === 'P' || ch === 'E') { this.facade(c, px, py, x, y, m, ch === 'E'); continue; }
      const map = { '.': st.floor || 'parquet', ',': st.floor2 || 'tile', '_': st.floor3 || 'lino', ';': st.floor4 || 'carpet' };
      if (map[ch]) { this.floor(c, px, py, this.regionStyle(st.floors, x, y) && ch === '.' ? this.regionStyle(st.floors, x, y) : map[ch], x, y); continue; }
      this.outdoor(c, ch, px, py, x, y, m);
    }
    return cv;
  },
  regionStyle(list, x, y) {
    if (!list) return null;
    for (const [x0, y0, x1, y1, s] of list) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return s;
    return null;
  },

  floor(c, px, py, kind, x, y) {
    const n = ah(x, y);
    if (kind === 'parquet') {
      R(c, px, py, 16, 16, '#4e3524');
      for (let i = 0; i < 4; i++) {
        const k = ((x + y + i) % 2) ? 0.06 : -0.06;
        const col = shade('#5a3d29', k + (ah(x, y, i) - 0.5) * 0.12);
        if ((x + y) % 2) R(c, px + i * 4, py, 4, 16, col); else R(c, px, py + i * 4, 16, 4, col);
      }
      c.fillStyle = 'rgba(0,0,0,0.25)';
      if ((x + y) % 2) for (let i = 0; i < 4; i++) c.fillRect(px + i * 4, py, 1, 16);
      else for (let i = 0; i < 4; i++) c.fillRect(px, py + i * 4, 16, 1);
      if (n > 0.8) R(c, px + (n * 13 | 0), py + 6, 2, 1, 'rgba(255,220,170,0.08)');
    } else if (kind === 'lino') {
      R(c, px, py, 16, 16, '#5d4a3a');
      c.fillStyle = 'rgba(0,0,0,0.12)';
      for (let i = 0; i < 16; i += 4) { c.fillRect(px + i, py + ((i / 4) % 2) * 2, 1, 1); c.fillRect(px + ((i + 2) % 16), py + 8 + ((i / 4) % 2) * 2, 1, 1); }
      R(c, px + 7, py + 7, 2, 2, 'rgba(120,90,60,0.35)');
      if (n > 0.85) R(c, px + 2, py + 11, 5, 1, 'rgba(0,0,0,0.2)');
    } else if (kind === 'tile') {
      const a = (x + y) % 2 ? '#7d878b' : '#949ca0';
      R(c, px, py, 16, 16, a);
      R(c, px, py + 15, 16, 1, '#5d6568'); R(c, px + 15, py, 1, 16, '#5d6568');
      if (n > 0.7) R(c, px + 3, py + 3, 1, 1, 'rgba(255,255,255,0.18)');
      if (n < 0.12) R(c, px + 5, py + 9, 4, 1, 'rgba(0,0,0,0.25)');
    } else if (kind === 'btile') {
      const a = (x + y) % 2 ? '#3d5560' : '#4a6470';
      R(c, px, py, 16, 16, a); R(c, px, py + 15, 16, 1, '#2a3a42'); R(c, px + 15, py, 1, 16, '#2a3a42');
    } else if (kind === 'concrete') {
      R(c, px, py, 16, 16, '#4c4e50');
      for (let i = 0; i < 6; i++) R(c, px + (ah(x, y, i) * 16 | 0), py + (ah(x, y, i + 9) * 16 | 0), 1, 1, i % 2 ? '#56585b' : '#414345');
      if (n > 0.88) { R(c, px + 3, py + 5, 6, 1, '#38393b'); R(c, px + 8, py + 6, 4, 1, '#38393b'); }
    } else if (kind === 'carpet') {
      R(c, px, py, 16, 16, '#5a1e22');
      R(c, px + 2, py + 2, 12, 12, '#6e2a2a'); R(c, px + 6, py + 4, 4, 8, '#b08a4a'); R(c, px + 4, py + 6, 8, 4, '#b08a4a'); R(c, px + 7, py + 7, 2, 2, '#2a1a3a');
    } else if (kind === 'roof') {
      R(c, px, py, 16, 16, '#2a2a2d');
      for (let i = 0; i < 7; i++) R(c, px + (ah(x, y, i) * 16 | 0), py + (ah(x, y, i + 4) * 16 | 0), 1, 1, i % 3 ? '#38383c' : '#1f1f22');
      if (y % 3 === 0) R(c, px, py, 16, 1, '#232326');
    } else this.floor(c, px, py, 'parquet', x, y);
  },

  wallFront(c, px, py, style, x, y, win, m) {
    const S = {
      home: ['#5f5c45', '#57543f', '#6b6850'], kam: ['#4f5a66', '#48525d', '#5b6773'], dani: ['#6b5747', '#614f41', '#776354'],
      bath: ['#b9c2c4', '#a6b0b2', '#c9d1d3'], kitchen: ['#7a7360', '#6e6856', '#857e69'],
      stair: ['#8b8d86', '#2f5244', '#3a6252'], roof: ['#5c5d5f', '#4c4d4f', '#6a6b6d'], brick: ['#5a3a30', '#4a2e26', '#6a463a'],
    }[style] || ['#5f5c45', '#57543f', '#6b6850'];
    R(c, px, py, 16, 16, S[0]);
    if (style === 'stair') {
      R(c, px, py + 7, 16, 9, S[1]); R(c, px, py + 7, 16, 1, '#1c3a2f');
      if (ah(x, y, 3) > 0.7) { R(c, px + 3, py + 10, 5, 1, '#1d2a24'); R(c, px + 5, py + 11, 3, 1, '#1d2a24'); }
      if (ah(x, y, 5) > 0.85) R(c, px + 9, py + 3, 4, 2, 'rgba(30,30,30,0.5)');
    } else if (style === 'bath' || style === 'kitchen') {
      const top = style === 'kitchen' ? 7 : 0;
      for (let yy = top; yy < 16; yy += 4) for (let xx = 0; xx < 16; xx += 4) { R(c, px + xx, py + yy, 4, 4, ((xx + yy) / 4) % 2 ? S[1] : S[2]); }
      c.fillStyle = 'rgba(0,0,0,0.18)';
      for (let yy = top; yy < 16; yy += 4) c.fillRect(px, py + yy, 16, 1);
      for (let xx = 0; xx < 16; xx += 4) c.fillRect(px + xx, py + top, 1, 16 - top);
    } else if (style === 'roof') {
      R(c, px, py + 10, 16, 6, S[1]); R(c, px, py, 16, 2, S[2]);
    } else if (style === 'brick') {
      for (let yy = 0; yy < 16; yy += 4) for (let xx = -4; xx < 16; xx += 8) R(c, px + xx + ((yy / 4) % 2) * 4, py + yy, 7, 3, ah(x * 3 + xx, y * 5 + yy) > 0.5 ? S[1] : S[2]);
    } else {
      // обои: полосы и мелкий узор
      for (let xx = 0; xx < 16; xx += 4) R(c, px + xx, py, 1, 14, S[1]);
      for (let yy = 2; yy < 13; yy += 5) for (let xx = 2; xx < 16; xx += 4) R(c, px + xx, py + yy + ((xx / 4) % 2) * 2, 1, 1, S[2]);
      if (ah(x, y, 7) > 0.85) R(c, px + 3, py + 4, 6, 5, 'rgba(0,0,0,0.08)');   // выгоревшее пятно
      R(c, px, py + 13, 16, 3, '#33251a'); R(c, px, py + 13, 16, 1, '#4a3626');   // плинтус
    }
    R(c, px, py, 16, 1, 'rgba(0,0,0,0.35)');
    if (win) this.window(c, px, py, x, y, m);
  },
  wallTop(c, px, py, x, y, m, style) {
    const col = style === 'roof' ? '#3a3b3d' : m.def.outdoor ? '#1c1d20' : '#16130f';
    R(c, px, py, 16, 16, col);
    if (style === 'roof') { R(c, px, py, 16, 2, '#6a6b6d'); R(c, px, py + 14, 16, 2, '#2a2b2d'); return; }
    const g = m.grid;
    const isW = (xx, yy) => yy >= 0 && yy < m.h && xx >= 0 && xx < m.w && WALLISH.has(g[yy][xx]) && g[yy][xx] !== ' ';
    c.fillStyle = 'rgba(255,240,210,0.07)';
    if (!isW(x, y - 1)) c.fillRect(px, py, 16, 1);
    if (!isW(x - 1, y)) c.fillRect(px, py, 1, 16);
    if (!isW(x + 1, y)) c.fillRect(px + 15, py, 1, 16);
  },
  window(c, px, py, x, y, m) {
    const sea = m.def.windowView === 'sea';
    R(c, px + 2, py + 1, 12, 11, '#c6c2b4');
    R(c, px + 3, py + 2, 10, 9, sea ? '#0d1a2c' : '#0f1626');
    if (sea) { R(c, px + 3, py + 8, 10, 3, '#0a2232'); R(c, px + 4, py + 9, 3, 1, '#2a4a5e'); R(c, px + 9, py + 10, 2, 1, '#2a4a5e'); }
    if (ah(x, y, 2) > 0.5) R(c, px + 5, py + 3, 1, 1, '#cdd6ff');
    if (ah(x, y, 9) > 0.4) R(c, px + 10, py + 5, 1, 1, '#ffd98a');
    R(c, px + 7, py + 2, 1, 9, '#c6c2b4'); R(c, px + 3, py + 6, 10, 1, '#c6c2b4');
    R(c, px + 4, py + 3, 2, 1, 'rgba(255,255,255,0.25)');
    R(c, px + 1, py + 12, 14, 2, '#d5d1c3');                       // подоконник
    R(c, px, py + 1, 2, 12, '#6a2f2f'); R(c, px + 14, py + 1, 2, 12, '#6a2f2f');   // шторы
    R(c, px + 1, py + 1, 1, 12, '#7d3a38'); R(c, px + 14, py + 1, 1, 12, '#5a2626');
  },
  door(c, px, py, kind, x, y) {
    // дверь в лицевой стене: полотно во всю клетку
    R(c, px, py, 16, 16, '#2a1d14');
    R(c, px, py, 16, 1, 'rgba(0,0,0,0.4)');
    if (kind === 'metal') {
      R(c, px + 2, py + 1, 12, 15, '#4a4a4e'); R(c, px + 2, py + 1, 12, 1, '#5e5e63'); R(c, px + 11, py + 8, 2, 1, '#9a9a9a'); R(c, px + 5, py + 4, 5, 1, '#3a3a3e');
    } else if (kind === 'wood') {
      R(c, px + 2, py + 1, 12, 15, '#6b4a30'); R(c, px + 4, py + 3, 8, 4, '#5e4029'); R(c, px + 4, py + 9, 8, 5, '#5e4029'); R(c, px + 11, py + 8, 2, 1, '#c9a95a');
    } else {
      // советская «стёганая» дверь: рама, дерматин, ромбы прошивки, глазок, ручка
      R(c, px + 1, py, 14, 16, '#6e5236');
      R(c, px + 2, py + 1, 12, 15, '#3e1c1a');
      c.fillStyle = '#5a2a26';
      for (let i = 0; i < 4; i++) { c.fillRect(px + 2 + i * 3, py + 1 + i * 3, 1, 1); c.fillRect(px + 13 - i * 3, py + 1 + i * 3, 1, 1); c.fillRect(px + 2 + i * 3, py + 8 + i * 2, 1, 1); c.fillRect(px + 13 - i * 3, py + 8 + i * 2, 1, 1); }
      R(c, px + 7, py + 4, 2, 1, '#c9c2a0');            // глазок
      R(c, px + 11, py + 8, 2, 2, '#c9a95a');           // ручка
      R(c, px + 2, py + 1, 1, 15, '#4e2622');
    }
    R(c, px + 1, py + 15, 14, 1, 'rgba(255,220,150,0.12)');
  },
  facade(c, px, py, x, y, m, entrance) {
    const g = m.grid;
    const isB = (yy) => yy < m.h && (g[yy][x] === 'P' || g[yy][x] === 'E');
    let d = 0; while (isB(y + d + 1)) d++;              // сколько рядов здания ниже
    const tone = m.def.facade || '#4a4c50';
    if (d >= 3) {
      // крыша здания
      R(c, px, py, 16, 16, '#232427');
      for (let i = 0; i < 4; i++) R(c, px + (ah(x, y, i) * 16 | 0), py + (ah(x, y, i + 5) * 16 | 0), 1, 1, '#2e2f33');
      if (d === 3) { R(c, px, py + 13, 16, 3, '#3a3c40'); R(c, px, py + 15, 16, 1, '#151618'); }
      if (!(y > 0 && (g[y - 1][x] === 'P' || g[y - 1][x] === 'E'))) R(c, px, py, 16, 2, '#3a3c40');
      return;
    }
    R(c, px, py, 16, 16, tone);
    R(c, px, py, 16, 1, shade(tone, -0.35)); R(c, px, py, 1, 16, shade(tone, -0.25));
    if (entrance && d === 0) {
      R(c, px + 3, py + 3, 10, 13, '#1a1410'); R(c, px + 4, py + 4, 8, 12, '#3d3a36'); R(c, px + 4, py + 4, 8, 1, '#5a5650');
      R(c, px + 10, py + 9, 1, 2, '#9a9080');
      R(c, px + 1, py + 1, 14, 2, '#5b5e63');                       // козырёк
      R(c, px + 7, py + 3, 2, 1, '#ffd98a');                         // лампочка
      return;
    }
    const lit = ah(x, y, 11);
    const wc = lit > 0.72 ? (lit > 0.93 ? '#7aa0c8' : lit > 0.85 ? '#e0b45a' : '#c99a4a') : '#14171c';
    R(c, px + 4, py + 4, 8, 8, '#2b2d31');
    R(c, px + 5, py + 5, 6, 6, wc);
    if (lit > 0.72) { R(c, px + 5, py + 5, 2, 6, shade(wc, -0.3)); R(c, px + 8, py + 5, 1, 6, shade(wc, -0.15)); }
    else R(c, px + 6, py + 6, 1, 1, '#2a3a50');
    R(c, px + 4, py + 12, 8, 1, '#5b5e63');
    if (d === 0) R(c, px, py + 14, 16, 2, shade(tone, -0.3));
  },

  outdoor(c, ch, px, py, x, y, m) {
    const n = ah(x, y, 1);
    switch (ch) {
      case 'a': case '+': {
        R(c, px, py, 16, 16, '#2b2d30');
        for (let i = 0; i < 7; i++) R(c, px + (ah(x, y, i) * 16 | 0), py + (ah(x, y, i + 3) * 16 | 0), 1, 1, i % 2 ? '#34373b' : '#25272a');
        if (n > 0.82) { R(c, px + 2, py + 9, 7, 3, '#1f2a33'); R(c, px + 3, py + 9, 3, 1, '#3b4b58'); }   // лужа
        if (n < 0.07) { R(c, px + 4, py + 4, 5, 1, '#1c1d1f'); R(c, px + 8, py + 5, 3, 1, '#1c1d1f'); }
        if (ch === '+') R(c, px + 2, py + 7, 9, 2, '#9a9886');
        break;
      }
      case 's': {
        R(c, px, py, 16, 16, '#47494c');
        R(c, px, py + 7, 16, 1, '#38393c'); R(c, px + 7, py, 1, 7, '#38393c'); R(c, px + 3, py + 8, 1, 8, '#38393c');
        if (n > 0.85) R(c, px + 9, py + 10, 3, 2, '#3c3e41');
        break;
      }
      case 'd': {
        R(c, px, py, 16, 16, '#7a6b50');
        for (let i = 0; i < 10; i++) R(c, px + (ah(x, y, i) * 16 | 0), py + (ah(x, y, i + 7) * 16 | 0), 1, 1, i % 3 ? '#86775a' : '#6a5c44');
        if (n > 0.8) R(c, px + 4, py + 6, 3, 2, '#8f8166');
        break;
      }
      case 'g': {
        R(c, px, py, 16, 16, '#3f3d2b');
        for (let i = 0; i < 9; i++) { const gx = ah(x, y, i) * 15 | 0, gy = ah(x, y, i + 2) * 13 | 0; R(c, px + gx, py + gy, 1, 3, i % 2 ? '#5d5a3b' : '#4c4a31'); }
        break;
      }
      case 'r': case 'R': {
        R(c, px, py, 16, 16, '#6e6450');
        // известняк-ракушечник: глыбы с порами
        R(c, px + 1, py + 1, 8, 7, '#8a7f66'); R(c, px + 9, py + 3, 6, 8, '#7d7259'); R(c, px + 2, py + 9, 7, 6, '#837860');
        for (let i = 0; i < 6; i++) R(c, px + (ah(x, y, i) * 15 | 0), py + (ah(x, y, i + 1) * 15 | 0), 1, 1, '#5a5040');
        R(c, px + 1, py + 1, 8, 1, '#9c917a');
        if (ch === 'R') { R(c, px, py + 11, 16, 5, '#4e4636'); R(c, px, py + 11, 16, 1, '#3a3428'); }
        break;
      }
      case '~': R(c, px, py, 16, 16, '#0d1f2d'); break;
      case 'o': this.floor(c, px, py, 'roof', x, y); break;
      case 'p': {
        R(c, px, py, 16, 16, '#5c5d5f'); R(c, px, py, 16, 3, '#77797b'); R(c, px, py + 13, 16, 3, '#3f4042');
        if (n > 0.7) R(c, px + 5, py + 6, 1, 4, '#4a4b4d');
        break;
      }
      case 'f': {
        this.outdoor(c, m.def.fenceOn || 'a', px, py, x, y, m);
        R(c, px, py + 4, 16, 1, '#5b5f63'); R(c, px, py + 9, 16, 1, '#5b5f63');
        for (let xx = 1; xx < 16; xx += 5) R(c, px + xx, py + 1, 1, 13, '#6c7075');
        break;
      }
      case 'x': {
        R(c, px, py, 16, 16, '#4c4e50');
        for (let yy = 0; yy < 16; yy += 4) { R(c, px, py + yy, 16, 1, '#6a6c6e'); R(c, px, py + yy + 3, 16, 1, '#36383a'); }
        R(c, px, py, 1, 16, '#2f5244'); R(c, px + 15, py, 1, 16, '#2f5244');
        break;
      }
      case 'b': this.outdoor(c, 'g', px, py, x, y, m); R(c, px + 1, py + 2, 14, 12, '#2d3524'); R(c, px + 3, py + 3, 10, 9, '#36402b'); R(c, px + 2, py + 2, 4, 3, '#3e4a30'); break;   // куст
      case 'K': R(c, px, py, 16, 16, '#1d1e21'); break;
      case 'T': this.outdoor(c, 'a', px, py, x, y, m); break;
      default: R(c, px, py, 16, 16, '#101012');
    }
  },

  // волны поверх запечённого моря
  sea(c, x, y, t, m) {
    const px = x * TS, py = y * TS;
    R(c, px, py, 16, 16, '#0c1d2b');
    for (let i = 0; i < 3; i++) {
      const ph = t * (0.8 + i * 0.3) + ah(x, y, i) * 6;
      const wx = ((ah(x, y, i + 4) * 16 + Math.sin(ph) * 3) | 0), wy = (i * 5 + 2 + (Math.sin(ph * 0.7) * 1.5 | 0));
      R(c, px + (wx % 14), py + wy, 4 + (i % 2) * 2, 1, i === 1 ? '#1d3a50' : '#163044');
    }
    const g = m.grid, up = y > 0 ? g[y - 1][x] : '~';
    if (up !== '~') {                          // прибой у берега
      const k = (Math.sin(t * 1.4 + x * 0.7) + 1) / 2;
      R(c, px, py, 16, 2 + (k * 2 | 0), '#3c5a6a');
      R(c, px + (k * 8 | 0), py + 2, 5, 1, '#9fb9c4');
    }
  },

  // ---------------------------------------------------------------
  // мебель и предметы: w,h — клетки основания; up — сколько пикселей вверх
  // draw(c, px, py, opts, t)
  // ---------------------------------------------------------------
  props: {},

  // ---------------------------------------------------------------
  // персонажи 16×26
  // ---------------------------------------------------------------
  char(c, L, dir, step, x, y, pose, t) {
    if (!L) return;
    x = Math.round(x); y = Math.round(y);
    c.fillStyle = 'rgba(0,0,0,0.38)';
    c.beginPath(); c.ellipse(x, y, 6, 2, 0, 0, 7); c.fill();
    if (pose === 'body') { this.body(c, L, x, y); return; }
    if (pose === 'sit') { this.sitChar(c, L, dir, x, y, t); return; }
    const sw = step % 4, la = sw === 1 ? 1 : sw === 3 ? -1 : 0;
    const breathe = !step && t !== undefined ? (Math.sin(t * 2) > 0.6 ? 1 : 0) : 0;
    const sk = L.skin, skd = L.skinDk || shade(L.skin, -0.25), coat = L.coat, coatD = L.coatDk || shade(coat, -0.3);
    const pants = L.pants || '#222', shoes = L.shoes || '#111';
    const side = dir === 1 || dir === 2, fl = dir === 1 ? -1 : 1;
    // ноги
    if (!side) {
      R(c, x - 3, y - 7 - (la > 0 ? 1 : 0), 2, 6 + (la > 0 ? 1 : 0), pants); R(c, x + 1, y - 7 - (la < 0 ? 1 : 0), 2, 6 + (la < 0 ? 1 : 0), pants);
      R(c, x - 3, y - 1 - (la > 0 ? 1 : 0), 3, 1, shoes); R(c, x + 1, y - 1 - (la < 0 ? 1 : 0), 3, 1, shoes);
      if (L.skirt) R(c, x - 4, y - 9, 8, 4, L.skirt);
    } else {
      R(c, x - 1 + la * 2, y - 7, 2, 6, shade(pants, -0.15)); R(c, x - 1 - la * 2, y - 7, 2, 6, pants);
      R(c, x - 1 + la * 2 + (fl > 0 ? 0 : -1), y - 1, 3, 1, shoes); R(c, x - 1 - la * 2 + (fl > 0 ? 0 : -1), y - 1, 3, 1, shoes);
    }
    const ty = y - 17 + breathe * 0;
    // тело / пальто
    const tw = side ? 6 : 8, tx = x - tw / 2;
    const tLen = L.long ? 13 : 10;
    R(c, tx, ty, tw, tLen, coat);
    if (!side) {
      R(c, tx + tw - 2, ty, 2, tLen, coatD);
      if (dir === 0) {
        if (L.shirt) { R(c, x - 1, ty, 2, 4, L.shirt); }
        if (L.tie) R(c, x, ty + 1, 1, 4, L.tie);
        if (L.vest) { R(c, tx, ty + 1, tw, 6, L.vest); R(c, tx, ty + 3, tw, 1, '#d8e04a'); }
        if (L.long) R(c, x, ty + 5, 1, tLen - 5, coatD);
        if (L.belt) R(c, tx, ty + 7, tw, 1, L.belt);
      } else { R(c, x, ty + 1, 1, tLen - 1, coatD); }
    } else {
      R(c, fl > 0 ? tx : tx + tw - 2, ty, 2, tLen, coatD);
      if (L.vest) { R(c, tx, ty + 1, tw, 6, L.vest); R(c, tx, ty + 3, tw, 1, '#d8e04a'); }
    }
    if (L.collar) R(c, tx + (side ? 1 : 1), ty, tw - 2, 1, L.collar);
    // руки
    const armSw = side ? la * 2 : 0;
    if (!side) {
      R(c, tx - 2, ty + 1 + (la < 0 ? 1 : 0), 2, 8, coatD); R(c, tx + tw, ty + 1 + (la > 0 ? 1 : 0), 2, 8, coatD);
      R(c, tx - 2, ty + 9 + (la < 0 ? 1 : 0), 2, 2, sk); R(c, tx + tw, ty + 9 + (la > 0 ? 1 : 0), 2, 2, sk);
      if (L.carry) R(c, tx + tw, ty + 10, 3, 3, L.carry);
    } else {
      R(c, x - 1 + armSw, ty + 1, 2, 8, coatD); R(c, x - 1 + armSw, ty + 9, 2, 2, sk);
    }
    // голова
    const hy = ty - 7, hx = x - 3;
    R(c, x - 1, ty - 1, 2, 1, skd);
    if (dir === 3) {
      R(c, hx, hy, 6, 7, sk);
      this.hair(c, L, hx, hy, 'back');
    } else if (side) {
      R(c, hx, hy, 6, 7, sk);
      R(c, fl > 0 ? hx : hx + 5, hy + 1, 1, 5, skd);
      const ex = fl > 0 ? hx + 4 : hx + 1;
      R(c, ex, hy + 3, 1, 1, L.eye || '#1a1414');
      R(c, fl > 0 ? hx + 6 : hx - 1, hy + 4, 1, 1, sk);   // нос
      if (L.beard) this.beard(c, L, hx, hy, dir);
      if (L.glasses) { R(c, ex - 1, hy + 3, 3, 1, L.glasses === true ? '#c8c8d0' : L.glasses); }
      this.hair(c, L, hx, hy, fl > 0 ? 'right' : 'left');
    } else {
      R(c, hx, hy, 6, 7, sk); R(c, hx + 5, hy + 1, 1, 6, skd);
      R(c, hx + 1, hy + 3, 1, 1, L.eye || '#1a1414'); R(c, hx + 4, hy + 3, 1, 1, L.eye || '#1a1414');
      if (L.tired) { R(c, hx + 1, hy + 4, 1, 1, skd); R(c, hx + 4, hy + 4, 1, 1, skd); }
      if (L.beard) this.beard(c, L, hx, hy, dir);
      if (L.glasses) { const gc = L.glasses === true ? '#c8c8d0' : L.glasses; R(c, hx, hy + 3, 6, 1, gc); R(c, hx + 1, hy + 3, 1, 1, L.eye || '#1a1414'); R(c, hx + 4, hy + 3, 1, 1, L.eye || '#1a1414'); }
      this.hair(c, L, hx, hy, 'front');
    }
  },
  hair(c, L, hx, hy, view) {
    const h = L.hair || '#111', hs = L.hairStyle || 'short', hi = L.hairHi || shade(h, 0.25);
    if (hs === 'bald') { R(c, hx + 1, hy, 4, 1, shade(L.skin, 0.12)); if (view !== 'front') R(c, hx, hy + 2, 6, 2, h); return; }
    if (hs === 'scarf') {
      R(c, hx - 1, hy - 1, 8, 4, h); R(c, hx - 1, hy + 3, 1, 4, h); R(c, hx + 6, hy + 3, 1, 4, h);
      R(c, hx, hy, 6, 1, hi);
      if (view === 'back') R(c, hx - 1, hy - 1, 8, 9, h);
      R(c, hx + 1, hy + 7, 4, 1, h);
      return;
    }
    if (hs === 'knit' || hs === 'cap') {
      R(c, hx - 1, hy - 1, 8, 3, h); R(c, hx - 1, hy + 1, 8, 1, hi);
      if (hs === 'cap') { R(c, hx - 1, hy - 2, 8, 2, h); if (view === 'front') R(c, hx - 1, hy + 2, 8, 1, '#111'); R(c, hx + 2, hy - 1, 2, 1, '#d8b84a'); }
      if (view === 'back') R(c, hx, hy + 2, 6, 2, L.under || shade(h, -0.2));
      return;
    }
    R(c, hx, hy - 1, 6, 2, h);
    if (hs === 'buzz') { R(c, hx, hy, 6, 1, h); if (view === 'back') R(c, hx, hy, 6, 4, h); return; }
    if (view === 'front') {
      R(c, hx - 1, hy, 1, 3, h); R(c, hx + 6, hy, 1, 3, h);
      if (hs === 'side') { R(c, hx, hy + 1, 4, 1, h); R(c, hx + 1, hy - 1, 3, 1, hi); }
      else if (hs === 'long') { R(c, hx - 1, hy, 1, 9, h); R(c, hx + 6, hy, 1, 9, h); R(c, hx, hy + 1, 6, 1, h); }
      else if (hs === 'bun') { R(c, hx + 2, hy - 3, 2, 2, h); R(c, hx, hy + 1, 6, 1, h); }
      else R(c, hx, hy + 1, 2, 1, h);
      R(c, hx + 1, hy - 1, 2, 1, hi);
      if (L.grey) R(c, hx - 1, hy + 1, 1, 2, L.grey), R(c, hx + 6, hy + 1, 1, 2, L.grey);
    } else if (view === 'back') {
      R(c, hx, hy, 6, hs === 'long' ? 10 : 5, h);
      if (hs === 'bun') R(c, hx + 2, hy - 3, 2, 3, h);
      if (L.grey) R(c, hx + 1, hy + 3, 4, 1, L.grey);
    } else {
      const back = view === 'right' ? hx : hx + 3;
      R(c, back, hy, 3, hs === 'long' ? 9 : 4, h);
      R(c, hx, hy, 6, 1, h);
      if (hs === 'bun') R(c, view === 'right' ? hx - 1 : hx + 5, hy - 1, 2, 2, h);
      if (L.grey) R(c, back + 1, hy + 2, 1, 2, L.grey);
    }
  },
  beard(c, L, hx, hy, dir) {
    const b = L.beardCol || shade(L.hair || '#222', 0.1);
    if (L.beard === 'stubble') { c.fillStyle = b; c.globalAlpha = 0.55; c.fillRect(hx + (dir === 2 ? 2 : 0), hy + 5, dir === 1 || dir === 2 ? 4 : 6, 2); c.globalAlpha = 1; }
    else if (L.beard === 'full') { R(c, hx, hy + 4, 6, 4, b); R(c, hx + 1, hy + 8, 4, 1, b); R(c, hx + 2, hy + 5, 2, 1, '#3a2020'); }
    else if (L.beard === 'mustache') R(c, hx + 1, hy + 5, 4, 1, b);
  },
  sitChar(c, L, dir, x, y, t) {
    // сидит на стуле/ящике лицом к dir (0 вниз или 1/2 боком)
    const sk = L.skin, coat = L.coat, coatD = L.coatDk || shade(coat, -0.3);
    const ty = y - 13;
    R(c, x - 4, y - 5, 8, 3, L.pants || '#222'); R(c, x - 4, y - 2, 3, 2, L.pants || '#222'); R(c, x + 1, y - 2, 3, 2, L.pants || '#222');
    R(c, x - 4, y, 3, 1, L.shoes || '#111'); R(c, x + 1, y, 3, 1, L.shoes || '#111');
    R(c, x - 4, ty, 8, 9, coat); R(c, x + 2, ty, 2, 9, coatD);
    R(c, x - 6, ty + 2, 2, 6, coatD); R(c, x + 4, ty + 2, 2, 6, coatD);
    R(c, x - 3, ty + 7, 6, 2, sk);
    const hx = x - 3, hy = ty - 7 + (Math.sin((t || 0) * 1.5) > 0.7 ? 1 : 0);
    R(c, x - 1, ty - 1, 2, 1, L.skinDk || shade(sk, -0.25));
    R(c, hx, hy, 6, 7, sk); R(c, hx + 5, hy + 1, 1, 6, L.skinDk || shade(sk, -0.25));
    R(c, hx + 1, hy + 3, 1, 1, '#1a1414'); R(c, hx + 4, hy + 3, 1, 1, '#1a1414');
    if (L.beard) this.beard(c, L, hx, hy, 0);
    if (L.glasses) R(c, hx, hy + 3, 6, 1, L.glasses === true ? '#c8c8d0' : L.glasses);
    this.hair(c, L, hx, hy, 'front');
  },
  body(c, L, x, y) {
    // тело сидит у стены маяка: спина к стене, ноги вытянуты вперёд, голова склонена набок
    const coat = L.coat, cd = shade(coat, -0.3), pants = L.pants || '#222';
    R(c, x - 6, y - 12, 9, 10, coat); R(c, x - 6, y - 12, 2, 10, cd);           // корпус у стены
    R(c, x - 4, y - 3, 6, 3, cd);                                                  // полы плаща на земле
    R(c, x + 1, y - 3, 11, 3, pants); R(c, x + 1, y, 11, 2, shade(pants, -0.2));  // вытянутые ноги
    R(c, x + 12, y - 4, 3, 3, '#1a1a1a');                                          // одна туфля
    R(c, x + 12, y, 2, 2, shade(L.skin, -0.1));                                    // вторая нога — без туфли
    R(c, x + 2, y - 8, 2, 5, cd); R(c, x + 3, y - 3, 2, 2, L.skin);               // рука на коленях
    R(c, x - 8, y - 18, 6, 6, L.skin); R(c, x - 9, y - 19, 3, 9, L.hair); R(c, x - 8, y - 19, 6, 2, L.hair);   // голова набок
    R(c, x - 6, y - 15, 1, 1, '#3a2a2a'); R(c, x - 5, y - 13, 2, 1, '#8a3a4a');   // закрытый глаз, губы
    R(c, x - 4, y - 12, 3, 1, '#6a4a6a');                                          // след на шее
  },
  // ---------------------------------------------------------------
  // портрет 36×36 (рисуется увеличенным)
  // ---------------------------------------------------------------
  _pcache: {},
  portrait(ctx, L, x, y, s, accent) {
    if (!L) return;
    const key = JSON.stringify(L) + accent;
    let cv = this._pcache[key];
    if (!cv) {
      cv = aMk(36, 36); const c = cv.getContext('2d');
      const g = c.createLinearGradient(0, 0, 0, 36);
      g.addColorStop(0, shade(accent || '#444444', -0.7)); g.addColorStop(1, '#08080a');
      c.fillStyle = g; c.fillRect(0, 0, 36, 36);
      const sk = L.skin, skd = L.skinDk || shade(sk, -0.25), skh = shade(sk, 0.12);
      const coat = L.coat, coatD = L.coatDk || shade(coat, -0.3);
      // плечи
      R(c, 4, 29, 28, 7, coat); R(c, 2, 31, 32, 5, coat); R(c, 24, 29, 8, 7, coatD);
      if (L.vest) { R(c, 6, 30, 24, 6, L.vest); R(c, 6, 32, 24, 1, '#d8e04a'); }
      if (L.shirt) { R(c, 15, 28, 6, 8, L.shirt); }
      if (L.tie) R(c, 17, 29, 2, 7, L.tie);
      if (L.collar) { R(c, 11, 28, 5, 3, L.collar); R(c, 20, 28, 5, 3, L.collar); }
      // шея
      R(c, 15, 24, 6, 5, skd);
      // голова
      R(c, 11, 8, 14, 16, sk); R(c, 12, 24, 12, 2, sk); R(c, 13, 26, 10, 1, sk);
      R(c, 10, 11, 1, 10, sk); R(c, 25, 11, 1, 10, skd);
      R(c, 21, 9, 4, 16, skd);                                    // тень справа
      R(c, 12, 9, 3, 6, skh);
      // уши
      R(c, 9, 15, 2, 4, skd); R(c, 25, 15, 2, 4, skd);
      // глаза
      const ey = 16;
      R(c, 13, ey, 4, 2, '#e8e2d8'); R(c, 19, ey, 4, 2, '#d0c8bc');
      R(c, 14, ey, 2, 2, L.eye || '#1a1414'); R(c, 20, ey, 2, 2, L.eye || '#1a1414');
      R(c, 13, ey - 2, 4, 1, shade(L.hair || '#222', 0.1)); R(c, 19, ey - 2, 4, 1, shade(L.hair || '#222', 0.1));
      if (L.tired) { R(c, 13, ey + 2, 4, 1, skd); R(c, 19, ey + 2, 4, 1, shade(skd, -0.1)); }
      if (L.old) { R(c, 12, 12, 3, 1, skd); R(c, 20, 12, 3, 1, skd); R(c, 11, 18, 1, 3, skd); R(c, 24, 18, 1, 3, shade(skd, -0.1)); R(c, 14, 21, 1, 2, skd); R(c, 21, 21, 1, 2, skd); }
      // нос и рот
      R(c, 17, 17, 2, 4, skd); R(c, 16, 20, 4, 1, skd);
      R(c, 15, 23, 6, 1, L.lips || shade(sk, -0.4));
      if (L.female) { R(c, 15, 23, 6, 1, L.lips || '#8a4a4a'); R(c, 13, ey - 1, 1, 1, '#1a1414'); R(c, 22, ey - 1, 1, 1, '#1a1414'); }
      // борода
      const bc = L.beardCol || shade(L.hair || '#222', 0.1);
      if (L.beard === 'stubble') { c.globalAlpha = 0.45; R(c, 11, 21, 14, 5, bc); R(c, 13, 26, 10, 1, bc); c.globalAlpha = 1; R(c, 15, 23, 6, 1, L.lips || shade(sk, -0.4)); }
      if (L.beard === 'full') { R(c, 11, 20, 14, 7, bc); R(c, 13, 27, 10, 2, bc); R(c, 15, 29, 6, 1, bc); R(c, 15, 22, 6, 1, '#3a2020'); }
      if (L.beard === 'mustache') R(c, 14, 21, 8, 2, bc);
      // очки
      if (L.glasses) { const gc = L.glasses === true ? '#c8c8d0' : L.glasses; c.strokeStyle = gc; c.lineWidth = 1; c.strokeRect(12.5, 14.5, 5, 4); c.strokeRect(18.5, 14.5, 5, 4); R(c, 17, 15, 2, 1, gc); }
      // волосы
      const h = L.hair || '#111', hi = L.hairHi || shade(h, 0.2), hs = L.hairStyle || 'short';
      if (hs === 'scarf') {
        R(c, 8, 5, 20, 8, h); R(c, 7, 9, 4, 20, h); R(c, 25, 9, 4, 20, h); R(c, 10, 26, 16, 4, h);
        R(c, 9, 6, 18, 1, hi); for (let i = 0; i < 6; i++) R(c, 9 + i * 3, 8, 1, 1, L.scarfDot || hi);
      } else if (hs === 'knit' || hs === 'cap') {
        R(c, 9, 4, 18, 9, h); R(c, 9, 10, 18, 2, hi);
        if (hs === 'cap') { R(c, 8, 11, 20, 2, '#111'); R(c, 16, 6, 4, 3, '#d8b84a'); }
        else for (let i = 0; i < 18; i += 2) R(c, 9 + i, 4, 1, 6, shade(h, -0.15));
        if (L.under) R(c, 10, 12, 2, 4, L.under), R(c, 24, 12, 2, 4, L.under);
      } else if (hs === 'bald') {
        R(c, 12, 7, 12, 2, skh); R(c, 10, 11, 2, 5, h); R(c, 24, 11, 2, 5, h);
      } else {
        R(c, 10, 5, 16, 6, h); R(c, 9, 7, 2, 9, h); R(c, 25, 7, 2, 9, h);
        if (hs === 'buzz') { R(c, 10, 5, 16, 4, h); c.globalAlpha = 0.5; R(c, 11, 9, 14, 2, h); c.globalAlpha = 1; }
        else if (hs === 'side') { R(c, 11, 9, 9, 3, h); R(c, 12, 5, 6, 1, hi); R(c, 20, 9, 5, 1, h); }
        else if (hs === 'long') { R(c, 8, 7, 3, 22, h); R(c, 25, 7, 3, 22, h); R(c, 11, 9, 14, 3, h); R(c, 13, 6, 6, 1, hi); }
        else if (hs === 'bun') { R(c, 14, 1, 8, 5, h); R(c, 11, 9, 14, 2, h); R(c, 15, 2, 3, 1, hi); }
        else { R(c, 11, 9, 14, 2, h); R(c, 12, 6, 5, 1, hi); }
        if (L.grey) { R(c, 9, 10, 2, 4, L.grey); R(c, 25, 10, 2, 4, L.grey); R(c, 14, 6, 3, 1, L.grey); R(c, 20, 7, 2, 1, L.grey); }
      }
      // свет сбоку (неон / фонарь)
      c.globalAlpha = 0.12; R(c, 0, 0, 36, 36, accent || '#e8c76a'); c.globalAlpha = 1;
      this._pcache[key] = cv;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, x, y, 36 * s, 36 * s);
  },

  // символы внутренних голосов
  voiceGlyph(ctx, v, x, y, size, t) {
    const col = AVOICE[v].color;
    ctx.fillStyle = '#08080b'; ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, size + 2, size + 2);
    const cx = x + size / 2, cy = y + size / 2, r = size * 0.32;
    ctx.save();
    ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t * 2);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
    ctx.beginPath();
    if (v === 'R') {           // треугольник и точка — геометрия
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy + r * 0.8); ctx.lineTo(cx - r, cy + r * 0.8); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.25, 3, 0, 7); ctx.fill();
    } else if (v === 'I') {    // глаз
      ctx.moveTo(cx - r, cy); ctx.quadraticCurveTo(cx, cy - r, cx + r, cy); ctx.quadraticCurveTo(cx, cy + r, cx - r, cy); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.32, 0, 7); ctx.fill();
    } else if (v === 'H') {    // кулак-квадрат с трещиной
      ctx.strokeRect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6);
      ctx.moveTo(cx - r * 0.8, cy - r * 0.1); ctx.lineTo(cx - r * 0.1, cy + r * 0.2); ctx.lineTo(cx + r * 0.3, cy - r * 0.3); ctx.lineTo(cx + r * 0.8, cy); ctx.stroke();
    } else {                   // маяк: волны и луч
      ctx.moveTo(cx - r, cy + r * 0.6); for (let i = 0; i <= 8; i++) ctx.lineTo(cx - r + i * r / 4, cy + r * 0.6 + (i % 2 ? -3 : 3)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 4, cy + r * 0.4); ctx.lineTo(cx - 2, cy - r * 0.8); ctx.lineTo(cx + 2, cy - r * 0.8); ctx.lineTo(cx + 4, cy + r * 0.4); ctx.stroke();
      const a = t * 1.2;
      ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.8); ctx.lineTo(cx + Math.cos(a) * r * 1.4, cy - r * 0.8 + Math.sin(a) * r * 0.4); ctx.stroke();
    }
    ctx.restore();
  },

  // ---------------------------------------------------------------
  // титульная сцена: ночной Актау, дом с маяком, море, дождь
  // ---------------------------------------------------------------
  titleScene(c, t) {
    c.imageSmoothingEnabled = false;
    const g = c.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, '#04050b'); g.addColorStop(1, '#141a2a');
    c.fillStyle = g; c.fillRect(0, 0, AW, AH);
    for (let i = 0; i < 70; i++) { const a = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.5 + i)); c.globalAlpha = a * 0.6; R(c, ah(i, 1) * AW | 0, ah(i, 2) * 120 | 0, 1, 1, '#cdd6ff'); }
    c.globalAlpha = 1;
    // дальние дома
    for (let i = 0; i < 22; i++) {
      const w = 14 + (ah(i, 3) * 20 | 0), h = 20 + (ah(i, 4) * 40 | 0), x = (i * 23 + (ah(i, 5) * 10 | 0)) % (AW + 20) - 10;
      R(c, x, 168 - h, w, h, '#0e1119');
      for (let yy = 168 - h + 3; yy < 164; yy += 5) for (let xx = x + 2; xx < x + w - 2; xx += 4) if (ah(xx, yy) > 0.82) R(c, xx, yy, 2, 2, ah(xx, yy, 1) > 0.5 ? '#c99a4a' : '#6a7fa0');
    }
    // дом с маяком
    const bx = 330, bw = 60, bt = 74;
    R(c, bx, bt, bw, 168 - bt, '#161a22');
    for (let yy = bt + 5; yy < 164; yy += 9) for (let xx = bx + 4; xx < bx + bw - 4; xx += 8) {
      const lit = ah(xx, yy, 7);
      R(c, xx, yy, 5, 5, lit > 0.75 ? (lit > 0.92 ? '#7aa0c8' : '#d9a650') : '#0b0d12');
    }
    // маяк на крыше
    R(c, bx + 24, bt - 32, 12, 32, '#c9c2b0'); R(c, bx + 24, bt - 24, 12, 4, '#a83a32'); R(c, bx + 24, bt - 12, 12, 4, '#a83a32');
    R(c, bx + 22, bt - 40, 16, 8, '#2a2a2e'); R(c, bx + 25, bt - 38, 10, 5, '#fff2c0'); R(c, bx + 21, bt - 42, 18, 2, '#3a3a3e');
    // луч
    const ang = t * 0.7, lx = bx + 30, ly = bt - 36;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const s of [0, Math.PI]) {
      const a = ang + s, len = 420;
      const k = Math.abs(Math.cos(a));
      const gr = c.createLinearGradient(lx, ly, lx + Math.cos(a) * len, ly + Math.sin(a) * len * 0.25);
      gr.addColorStop(0, `rgba(255,236,170,${0.32 * (0.4 + k * 0.6)})`); gr.addColorStop(1, 'rgba(255,236,170,0)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(lx, ly);
      c.lineTo(lx + Math.cos(a - 0.08) * len, ly + Math.sin(a - 0.08) * len * 0.25);
      c.lineTo(lx + Math.cos(a + 0.08) * len, ly + Math.sin(a + 0.08) * len * 0.25);
      c.closePath(); c.fill();
    }
    const gl = c.createRadialGradient(lx, ly, 0, lx, ly, 26);
    gl.addColorStop(0, 'rgba(255,230,160,0.6)'); gl.addColorStop(1, 'rgba(255,230,160,0)');
    c.fillStyle = gl; c.fillRect(lx - 26, ly - 26, 52, 52);
    c.restore();
    // обрыв и море
    R(c, 0, 168, AW, 8, '#2a261e');
    for (let x = 0; x < AW; x += 6) R(c, x, 166 + (ah(x, 9) * 3 | 0), 6, 4, '#3a3428');
    const sg = c.createLinearGradient(0, 176, 0, AH);
    sg.addColorStop(0, '#0b1724'); sg.addColorStop(1, '#03070c');
    c.fillStyle = sg; c.fillRect(0, 176, AW, AH - 176);
    for (let i = 0; i < 90; i++) {
      const y = 178 + (ah(i, 11) * 90 | 0), x = ((ah(i, 12) * AW + t * (6 + (y - 176) * 0.1)) % (AW + 20)) - 10;
      R(c, x | 0, y, 3 + (ah(i, 13) * 6 | 0), 1, '#1a3348');
    }
    // отражение маяка
    for (let y = 180; y < AH; y += 3) { c.globalAlpha = 0.25 * (1 - (y - 180) / 90); R(c, lx - 3 + Math.sin(y * 0.4 + t * 2) * 3, y, 6, 1, '#ffe6a0'); }
    c.globalAlpha = 1;
    // силуэт на обрыве
    const sx = 120, sy = 168;
    R(c, sx - 3, sy - 22, 7, 14, '#07080b'); R(c, sx - 4, sy - 10, 9, 6, '#07080b'); R(c, sx - 2, sy - 4, 2, 4, '#07080b'); R(c, sx + 1, sy - 4, 2, 4, '#07080b');
    R(c, sx - 2, sy - 28, 5, 6, '#07080b');
    const sm = (t * 8) % 30;
    c.globalAlpha = 0.25 * (1 - sm / 30); R(c, sx + 4 + sm * 0.3, sy - 20 - sm, 2, 2, '#9a9a9a'); c.globalAlpha = 1;
    R(c, sx + 3, sy - 20, 1, 1, '#ff8a3a');
    // дождь
    c.strokeStyle = 'rgba(160,180,210,0.22)'; c.beginPath();
    for (let i = 0; i < 120; i++) { const x = (ah(i, 20) * (AW + 40) - t * 60 + i * 7) % (AW + 40); const y = (ah(i, 21) * AH + t * 240) % AH; c.moveTo(x, y); c.lineTo(x - 2, y + 6); }
    c.stroke();
  },
};
