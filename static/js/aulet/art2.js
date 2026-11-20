// =====================================================================
// РАССЛЕДОВАНИЕ АУЛЕТА — детальная графика.
// Мир рисуется с удвоенной точностью (RS = 2), поэтому здесь можно рисовать
// «полупикселями»: персонажи вдвое подробнее, фактура полов и стен,
// тени у стен, открытые дверные проёмы, мелкие детали мебели.
// Загружается после art.js и props.js и заменяет часть их функций.
// =====================================================================

(function () {
  const H = 0.5;                                  // полпикселя мира
  const F = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

  // =================================================================
  // ПЕРСОНАЖИ: сетка 0,5 px (24 × 52 «тонких» пикселя на человека)
  // =================================================================
  Art.char = function (c, L, dir, step, x, y, pose, t) {
    if (!L) return;
    x = Math.round(x * 2) / 2; y = Math.round(y * 2) / 2;
    // мягкая тень
    c.fillStyle = 'rgba(0,0,0,0.26)'; c.beginPath(); c.ellipse(x, y, 6.5, 2.1, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x, y, 4, 1.3, 0, 0, 7); c.fill();
    if (pose === 'body') { this.body(c, L, x, y); return; }
    if (pose === 'sit') { this.sitChar(c, L, dir, x, y, t); return; }
    const side = dir === 1 || dir === 2, s = dir === 1 ? -1 : 1;
    // f — прямоугольник в «тонких» пикселях относительно ступней
    const f = (fx, fy, w, h, col) => { if (side && s < 0) fx = -fx - w; c.fillStyle = col; c.fillRect(x + fx * H, y + fy * H, w * H, h * H); };
    const P = this.pal(L);
    const st = step % 4, legA = st === 1 ? 1 : st === 3 ? -1 : 0;
    const bob = st === 1 || st === 3 ? 1 : 0;
    const breathe = !step && t !== undefined && Math.sin(t * 2) > 0.5 ? 1 : 0;
    const top = -34 + bob, len = L.long ? 26 : 19;

    if (!side) {
      // ---------- ноги ----------
      const lL = legA > 0 ? 2 : 0, lR = legA < 0 ? 2 : 0;
      if (!L.long || true) {
        f(-6, -17, 5, 14 - lL, P.pants); f(-2, -17, 1, 14 - lL, P.pantsD); f(-5, -11 - lL, 2, 1, P.pantsH);
        f(1, -17, 5, 14 - lR, P.pants); f(1, -17, 1, 14 - lR, P.pantsD); f(3, -11 - lR, 2, 1, P.pantsH);
      }
      if (L.skirt) f(-7, -18, 14, 8, L.skirt);
      f(-7, -3 - lL, 6, 3, P.shoes); f(-7, -1 - lL, 6, 1, P.shoesD); f(-6, -3 - lL, 2, 1, P.shoesH);
      f(1, -3 - lR, 6, 3, P.shoes); f(1, -1 - lR, 6, 1, P.shoesD); f(4, -3 - lR, 2, 1, P.shoesH);
      // ---------- корпус ----------
      f(-8, top, 16, len, P.coat);
      f(4, top, 4, len, P.coatD); f(-8, top, 1, len, P.coatH);
      if (L.long) { f(-8, top + len - 2, 16, 2, P.coatD); f(-1, top + len - 6, 1, 6, P.coatD); }
      if (dir === 0) {
        if (L.shirt) { f(-2, top, 4, 6, L.shirt); f(-1, top + 6, 2, 2, L.shirt); }
        if (L.tie) { f(-1, top + 1, 2, 9, L.tie); f(0, top + 1, 1, 9, shade(L.tie, 0.2)); }
        if (L.collar) { f(-5, top - 1, 4, 2, L.collar); f(1, top - 1, 4, 2, L.collar); }
        f(-4, top, 2, 8, P.coatD); f(2, top, 2, 8, P.coatD);                      // лацканы
        if (L.long) { f(-1, top + 9, 1, 1, P.coatH); f(-1, top + 14, 1, 1, P.coatH); f(-1, top + 19, 1, 1, P.coatH); }
        f(-6, top + 15, 4, 1, P.coatD); f(2, top + 15, 4, 1, P.coatD);             // карманы
        if (L.belt) f(-8, top + 13, 16, 1, L.belt);
      } else {
        f(-1, top, 1, len, P.coatD); f(-5, top - 1, 10, 2, P.coatD);               // шов и воротник со спины
        if (L.long) f(-4, top + len - 7, 8, 1, P.coatD);
      }
      if (L.vest) { f(-8, top + 2, 16, 12, L.vest); f(-8, top + 6, 16, 1, '#eef4b0'); f(-8, top + 10, 16, 1, '#eef4b0'); f(4, top + 2, 4, 12, shade(L.vest, -0.2)); }
      // ---------- руки ----------
      const aL = legA < 0 ? 1 : legA > 0 ? -1 : 0, aR = -aL;
      f(-12, top + 1 + aL, 4, 14, P.coatD); f(-12, top + 1 + aL, 1, 14, P.coat); f(-12, top + 14 + aL, 4, 1, shade(P.coatD, -0.25));
      f(-12, top + 15 + aL, 4, 4, P.skin); f(-11, top + 18 + aL, 2, 1, P.skinD);
      f(8, top + 1 + aR, 4, 14, P.coatD); f(11, top + 1 + aR, 1, 14, shade(P.coatD, -0.2)); f(8, top + 14 + aR, 4, 1, shade(P.coatD, -0.25));
      f(8, top + 15 + aR, 4, 4, P.skinD2); f(9, top + 18 + aR, 2, 1, P.skinD);
      if (L.carry) { f(9, top + 17, 6, 7, L.carry); f(9, top + 17, 6, 1, shade(L.carry, 0.2)); }
      // ---------- голова ----------
      f(-2, top - 2, 4, 2, P.skinD);
      this.headFront(f, L, P, top - 15 + breathe * 0, dir === 3);
    } else {
      // ---------- в профиль ----------
      const k = legA * 3;
      f(-2 - k, -17, 4, 14, P.pantsD); f(-3 - k, -3, 6, 3, shade(P.shoes, -0.15));            // дальняя нога
      f(-2 + k, -17, 4, 14, P.pants); f(1 + k, -17, 1, 14, P.pantsH);                          // ближняя нога
      f(-2 + k, -3, 7, 3, P.shoes); f(-2 + k, -1, 7, 1, P.shoesD); f(3 + k, -3, 2, 1, P.shoesH);
      f(-5, top, 10, len, P.coat); f(-5, top, 3, len, P.coatD); f(4, top, 1, len, P.coatH);
      if (L.long) f(-5, top + len - 2, 10, 2, P.coatD);
      if (L.vest) { f(-5, top + 2, 10, 12, L.vest); f(-5, top + 6, 10, 1, '#eef4b0'); f(-5, top + 10, 10, 1, '#eef4b0'); }
      if (L.shirt && !L.vest) f(3, top, 2, 5, L.shirt);
      const ka = -legA * 3;
      f(-2 + ka, top + 1, 4, 14, P.coatD); f(1 + ka, top + 1, 1, 14, P.coat); f(-2 + ka, top + 15, 4, 4, P.skin);
      f(-2, top - 2, 4, 2, P.skinD);
      this.headSide(f, L, P, top - 15);
    }
  };

  // палитра персонажа
  Art.pal = function (L) {
    if (L._pal) return L._pal;
    const skin = L.skin, coat = L.coat, pants = L.pants || '#222', shoes = L.shoes || '#141414';
    return (L._pal = {
      skin, skinD: L.skinDk || shade(skin, -0.22), skinD2: shade(skin, -0.12), skinH: shade(skin, 0.14),
      coat, coatD: L.coatDk || shade(coat, -0.3), coatH: shade(coat, 0.16),
      pants, pantsD: shade(pants, -0.3), pantsH: shade(pants, 0.18),
      shoes, shoesD: shade(shoes, -0.4), shoesH: shade(shoes, 0.35),
      hair: L.hair || '#111', hairH: L.hairHi || shade(L.hair || '#111', 0.25), hairD: shade(L.hair || '#111', -0.3),
      eye: L.eye || '#1a1414', lips: L.lips || (L.female ? '#9a4a52' : shade(skin, -0.38)),
      beard: L.beardCol || shade(L.hair || '#222', 0.1), glass: L.glasses === true ? '#c8c8d0' : L.glasses,
    });
  };

  // голова анфас (back — со спины). hy — верх головы
  Art.headFront = function (f, L, P, hy, back) {
    f(-5, hy, 10, 13, P.skin); f(-6, hy + 1, 12, 11, P.skin);
    f(3, hy + 1, 3, 11, P.skinD2); f(-5, hy + 12, 10, 1, P.skinD);
    if (!back) {
      f(-7, hy + 5, 1, 3, P.skinD); f(6, hy + 5, 1, 3, P.skinD);                       // уши
      f(-4, hy + 2, 2, 2, P.skinH);                                                      // блик на лбу
      f(-5, hy + 5, 3, 1, P.hairD); f(2, hy + 5, 3, 1, P.hairD);                       // брови
      f(-5, hy + 6, 3, 2, '#ece6da'); f(2, hy + 6, 3, 2, '#dcd4c8');                   // белки
      f(-4, hy + 6, 1, 2, P.eye); f(3, hy + 6, 1, 2, P.eye);
      if (L.tired) { f(-5, hy + 8, 3, 1, P.skinD); f(2, hy + 8, 3, 1, P.skinD); }
      if (L.old) { f(-3, hy + 3, 5, 1, P.skinD2); f(-5, hy + 10, 1, 2, P.skinD2); f(4, hy + 10, 1, 2, P.skinD); }
      f(0, hy + 7, 1, 3, P.skinD); f(-1, hy + 9, 3, 1, P.skinD);                       // нос
      f(-2, hy + 11, 4, 1, P.lips);
      if (L.female) { f(-6, hy + 6, 1, 1, P.eye); f(5, hy + 6, 1, 1, P.eye); }       // ресницы
      // борода
      if (L.beard === 'stubble') { f(-6, hy + 9, 12, 3, P.beard + '44'); f(-5, hy + 12, 10, 1, P.beard + '55'); f(-3, hy + 10, 6, 1, P.beard + '33'); f(-2, hy + 11, 4, 1, P.lips); }
      if (L.beard === 'mustache') { f(-3, hy + 10, 6, 1, P.beard); f(-3, hy + 10, 1, 2, P.beard); f(2, hy + 10, 1, 2, P.beard); }
      if (L.beard === 'full') { f(-6, hy + 8, 12, 5, P.beard); f(-5, hy + 13, 10, 2, P.beard); f(-3, hy + 15, 6, 1, P.beard); f(-2, hy + 10, 4, 1, '#3a2222'); f(-4, hy + 9, 2, 1, shade(P.beard, 0.2)); }
      if (P.glass) { const g = P.glass; f(-6, hy + 5, 5, 1, g); f(-6, hy + 8, 5, 1, g); f(-6, hy + 5, 1, 4, g); f(-2, hy + 5, 1, 4, g); f(1, hy + 5, 5, 1, g); f(1, hy + 8, 5, 1, g); f(1, hy + 5, 1, 4, g); f(5, hy + 5, 1, 4, g); f(-1, hy + 6, 2, 1, g); f(-5, hy + 6, 1, 1, 'rgba(255,255,255,0.5)'); }
    }
    this.hairFront(f, L, P, hy, back);
  };
  Art.hairFront = function (f, L, P, hy, back) {
    const h = P.hair, hh = P.hairH, hd = P.hairD, hs = L.hairStyle || 'short';
    if (hs === 'scarf') {
      f(-8, hy - 2, 16, 7, h); f(-7, hy - 1, 14, 1, hh);
      for (let i = -6; i < 7; i += 3) f(i, hy + 1, 1, 1, L.scarfDot || hh);
      f(-8, hy + 4, 2, 10, h); f(6, hy + 4, 2, 10, h); f(-6, hy + 13, 12, 2, h);
      if (back) f(-8, hy - 2, 16, 17, h);
      return;
    }
    if (hs === 'knit' || hs === 'cap') {
      f(-7, hy - 2, 14, 6, h);
      if (hs === 'knit') { for (let i = -6; i < 7; i += 2) f(i, hy - 2, 1, 4, hd); f(-7, hy + 2, 14, 2, hh); }
      else { f(-7, hy - 4, 14, 3, h); f(-7, hy + 2, 14, 1, '#111'); if (!back) { f(-6, hy + 3, 12, 1, '#151515'); f(-1, hy - 2, 2, 2, '#d8b84a'); } }
      if (L.under) { f(-7, hy + 4, 1, 3, L.under); f(6, hy + 4, 1, 3, L.under); }
      if (back) f(-6, hy + 4, 12, 5, L.under || hd);
      return;
    }
    if (hs === 'bald') {
      f(-3, hy, 4, 1, P.skinH);
      f(-7, hy + 4, 1, 3, h); f(6, hy + 4, 1, 3, h);
      if (back) f(-6, hy + 5, 12, 4, h);
      return;
    }
    // обычные волосы
    f(-6, hy - 1, 12, 4, h); f(-5, hy - 2, 10, 1, h);
    if (back) {
      f(-6, hy - 1, 12, hs === 'long' ? 18 : 10, h); f(-4, hy, 3, 1, hh);
      if (hs === 'bun') { f(-2, hy - 5, 5, 4, h); f(-1, hy - 5, 2, 1, hh); }
      if (L.grey) { f(-4, hy + 5, 8, 1, L.grey); f(-2, hy + 7, 4, 1, L.grey); }
      return;
    }
    f(-7, hy + 1, 1, 5, h); f(6, hy + 1, 1, 5, h);
    if (hs === 'buzz') { f(-6, hy - 1, 12, 3, hd); f(-6, hy + 2, 12, 1, hd + '88'); return; }
    if (hs === 'side') { f(-6, hy + 3, 8, 1, h); f(-5, hy + 2, 6, 1, h); f(1, hy - 1, 1, 3, hd); f(-4, hy - 1, 4, 1, hh); }
    else if (hs === 'long') { f(-8, hy + 1, 2, 17, h); f(6, hy + 1, 2, 17, h); f(-6, hy + 3, 12, 1, h); f(-7, hy + 4, 1, 12, hh); }
    else if (hs === 'bun') { f(-2, hy - 5, 5, 4, h); f(-1, hy - 5, 2, 1, hh); f(-6, hy + 3, 12, 1, h); }
    else { f(-5, hy + 3, 4, 1, h); f(2, hy + 3, 3, 1, h); f(-3, hy - 1, 4, 1, hh); f(3, hy, 2, 1, hh); }
    if (L.grey) { f(-7, hy + 3, 1, 3, L.grey); f(6, hy + 3, 1, 3, L.grey); f(1, hy - 1, 2, 1, L.grey); f(-2, hy, 1, 1, L.grey); }
  };
  // голова в профиль (лицом в сторону +x)
  Art.headSide = function (f, L, P, hy) {
    f(-5, hy, 10, 13, P.skin); f(-5, hy + 1, 3, 11, P.skinD2); f(-4, hy + 12, 8, 1, P.skinD);
    f(5, hy + 6, 1, 3, P.skin); f(5, hy + 8, 1, 1, P.skinD);                          // нос
    f(-1, hy + 5, 2, 3, P.skinD);                                                       // ухо
    f(2, hy + 5, 3, 1, P.hairD); f(3, hy + 6, 2, 2, '#ece6da'); f(4, hy + 6, 1, 2, P.eye);
    if (L.tired) f(3, hy + 8, 2, 1, P.skinD);
    f(2, hy + 11, 3, 1, P.lips);
    if (L.beard === 'stubble') { f(-1, hy + 9, 6, 4, P.beard + '44'); f(2, hy + 11, 3, 1, P.lips); }
    if (L.beard === 'mustache') f(2, hy + 10, 4, 1, P.beard);
    if (L.beard === 'full') { f(-1, hy + 8, 7, 6, P.beard); f(0, hy + 14, 5, 2, P.beard); }
    if (P.glass) { f(2, hy + 5, 4, 1, P.glass); f(2, hy + 8, 4, 1, P.glass); f(5, hy + 5, 1, 4, P.glass); f(-1, hy + 6, 3, 1, P.glass); }
    const h = P.hair, hh = P.hairH, hs = L.hairStyle || 'short';
    if (hs === 'scarf') { f(-7, hy - 2, 13, 7, h); f(-7, hy + 4, 5, 11, h); f(-2, hy + 13, 6, 2, h); return; }
    if (hs === 'knit' || hs === 'cap') {
      f(-6, hy - 2, 12, 6, h); if (hs === 'cap') { f(-6, hy - 4, 12, 3, h); f(4, hy + 3, 4, 1, '#111'); } else f(-6, hy + 2, 12, 2, hh);
      if (L.under) f(-5, hy + 4, 2, 4, L.under);
      return;
    }
    if (hs === 'bald') { f(-5, hy + 4, 3, 4, h); return; }
    f(-6, hy - 1, 11, 4, h); f(-6, hy + 2, 4, hs === 'long' ? 16 : 7, h); f(-4, hy - 1, 5, 1, hh);
    if (hs === 'bun') f(-8, hy - 1, 4, 4, h);
    if (hs === 'side') f(1, hy + 2, 4, 1, h);
    if (L.grey) { f(-5, hy + 4, 2, 2, L.grey); f(-1, hy, 2, 1, L.grey); }
  };

  // сидит (на стуле, на ящике, на корточках)
  Art.sitChar = function (c, L, dir, x, y, t) {
    const f = (fx, fy, w, h, col) => { c.fillStyle = col; c.fillRect(x + fx * H, y + fy * H, w * H, h * H); };
    const P = this.pal(L);
    const top = -28, sway = t && Math.sin(t * 1.5) > 0.7 ? 1 : 0;
    f(-7, -12, 14, 5, P.pants); f(-7, -12, 14, 1, P.pantsH);                         // бёдра к зрителю
    f(-7, -7, 5, 6, P.pantsD); f(2, -7, 5, 6, P.pantsD);                               // голени
    f(-8, -2, 6, 2, P.shoes); f(2, -2, 6, 2, P.shoes);
    f(-8, top, 16, 17, P.coat); f(4, top, 4, 17, P.coatD); f(-8, top, 1, 17, P.coatH);
    if (L.long) f(-9, -14, 18, 4, P.coat);
    if (L.shirt) f(-2, top, 4, 5, L.shirt);
    f(-4, top, 2, 7, P.coatD); f(2, top, 2, 7, P.coatD);
    f(-11, top + 2, 4, 12, P.coatD); f(7, top + 2, 4, 12, P.coatD);
    f(-6, top + 12, 12, 3, P.skin); f(-6, top + 14, 12, 1, P.skinD);                 // руки на коленях
    f(-2, top - 2, 4, 2, P.skinD);
    this.headFront(f, L, P, top - 15 + sway, false);
  };

  // =================================================================
  // ДВЕРИ: внутренние проёмы — открытые, с наличником и приоткрытой створкой
  // =================================================================
  const baseDoor = Art.door.bind(Art);
  Art.door = function (c, px, py, kind, x, y) {
    if (kind === 'open') {
      // глубина проёма: свет из соседней комнаты падает на пол
      const g = c.createLinearGradient(0, py, 0, py + 16);
      g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.5, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(px + 2, py, 12, 16);
      F(c, px, py, 2, 16, '#5e4630'); F(c, px + 14, py, 2, 16, '#4e3a28');            // наличники
      F(c, px + 1.5, py, 0.5, 16, '#7a5c40'); F(c, px + 14, py, 0.5, 16, '#6a5038');
      F(c, px, py, 16, 1.5, '#6a4e36'); F(c, px, py + 1.5, 16, 0.5, 'rgba(0,0,0,0.4)'); // перемычка
      // приоткрытая створка у левого косяка
      F(c, px + 2, py + 1.5, 2.5, 14.5, '#7d5a3c'); F(c, px + 2, py + 1.5, 0.5, 14.5, '#9a7450'); F(c, px + 4, py + 1.5, 0.5, 14.5, '#4a3222');
      F(c, px + 3, py + 8, 1, 1, '#c9a95a');
      F(c, px + 2, py + 15.5, 12, 0.5, 'rgba(255,230,180,0.18)');                         // порожек
      return;
    }
    if (kind === 'balcony') {
      F(c, px, py, 16, 16, '#d6d2c4'); F(c, px + 0.5, py + 0.5, 15, 15, '#c4c0b2');
      F(c, px + 2, py + 1.5, 12, 6, '#132238'); F(c, px + 2, py + 8.5, 12, 6, '#132238');
      F(c, px + 3, py + 2, 4, 0.5, 'rgba(255,255,255,0.35)'); F(c, px + 3, py + 9, 3, 0.5, 'rgba(255,255,255,0.25)');
      F(c, px + 8, py + 4, 0.5, 2, 'rgba(255,255,255,0.15)');
      F(c, px + 12, py + 7.5, 1.5, 1, '#9a9a9a');
      F(c, px, py + 15.5, 16, 0.5, 'rgba(0,0,0,0.4)');
      return;
    }
    baseDoor(c, px, py, kind, x, y);
    // мелкие детали на закрытых дверях
    F(c, px + 1, py, 0.5, 16, 'rgba(255,230,180,0.15)'); F(c, px + 14.5, py, 0.5, 16, 'rgba(0,0,0,0.35)');
    if (kind === 'padded') { F(c, px + 7, py + 3.5, 2, 0.5, 'rgba(255,255,255,0.4)'); F(c, px + 3, py + 13, 10, 0.5, '#5a2c26'); }
  };

  // =================================================================
  // ОКНА: рамы, шторы со складками, отражения
  // =================================================================
  Art.window = function (c, px, py, x, y, m) {
    const sea = m.def.windowView === 'sea';
    F(c, px + 2, py + 1, 12, 11, '#cfcabb');
    F(c, px + 3, py + 2, 10, 9, sea ? '#0b182a' : '#0e1526');
    if (sea) { F(c, px + 3, py + 7.5, 10, 3.5, '#081e2e'); F(c, px + 4, py + 8.5, 3, 0.5, '#2a4a5e'); F(c, px + 8.5, py + 9.5, 2.5, 0.5, '#2a4a5e'); F(c, px + 3, py + 7.5, 10, 0.5, '#1a3046'); }
    if (ah(x, y, 2) > 0.4) F(c, px + 4.5, py + 3, 0.5, 0.5, '#d8e0ff');
    if (ah(x, y, 3) > 0.5) F(c, px + 10.5, py + 4, 0.5, 0.5, '#ffe7a8');
    F(c, px + 7, py + 2, 1, 9, '#cfcabb'); F(c, px + 3, py + 6, 10, 0.75, '#cfcabb');
    F(c, px + 3.5, py + 2.5, 2.5, 0.5, 'rgba(255,255,255,0.3)'); F(c, px + 3.5, py + 2.5, 0.5, 2.5, 'rgba(255,255,255,0.2)');
    F(c, px + 8.5, py + 6.5, 0.5, 3, 'rgba(255,255,255,0.12)');
    F(c, px + 1, py + 12, 14, 1.5, '#e2ded0'); F(c, px + 1, py + 13.5, 14, 0.5, 'rgba(0,0,0,0.4)');    // подоконник
    // шторы со складками
    for (const [sx, dk] of [[0, 0], [13.5, 1]]) {
      F(c, px + sx, py + 0.5, 2.5, 12.5, dk ? '#5e2826' : '#76332f');
      F(c, px + sx + 0.5, py + 0.5, 0.5, 12.5, dk ? '#4a1e1c' : '#8e423c');
      F(c, px + sx + 1.5, py + 0.5, 0.5, 12.5, dk ? '#4a1e1c' : '#5e2826');
    }
    F(c, px, py, 16, 1, '#3a2a1e');                                                        // карниз
  };

  // =================================================================
  // ФАКТУРА: тонкий проход по запечённой карте + тени у стен
  // =================================================================
  const WALLISH2 = new Set(['#', 'W', ' ', 'P', 'E']);
  const baseBake = Art.bakeMap.bind(Art);
  Art.bakeMap = function (m) {
    const src = baseBake(m);
    const cv = aMk(src.width * 2, src.height * 2), c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(src, 0, 0, cv.width, cv.height);
    c.scale(2, 2);
    const st = m.def.style || {};
    const g = m.grid;
    const at = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? ' ' : g[y][x]);
    const floorKind = (ch, x, y) => {
      if (ch === 'D') return this.regionStyle(st.floors, x, y) || st.floor || 'parquet';
      const map = { '.': st.floor || 'parquet', ',': st.floor2 || 'tile', '_': st.floor3 || 'lino', ';': st.floor4 || 'carpet' };
      if (!map[ch]) return null;
      return ch === '.' && this.regionStyle(st.floors, x, y) ? this.regionStyle(st.floors, x, y) : map[ch];
    };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const ch = g[y][x], px = x * TS, py = y * TS;
      const fk = floorKind(ch, x, y) || ({ o: 'roof', a: 'asphalt', '+': 'asphalt', s: 'sidewalk', d: 'sand', g: 'grass', x: 'stairs' })[ch];
      if (fk) this.fineFloor(c, fk, px, py, x, y);
      // стена лицом к нам — обои, плинтус, карниз
      if ((ch === '#' || ch === 'W') && !WALLISH2.has(at(x, y + 1)) && at(x, y + 1) !== 'D') {
        const ws = this.regionStyle(st.walls, x, y) || st.wall || 'home';
        this.fineWall(c, ws, px, py, x, y, ch === 'W');
      }
      // тени: под стеной и вдоль боковых стен
      const walk = fk && ch !== 'D' || ch === 'D';
      if (walk && !m.def.outdoor) {
        const up = at(x, y - 1);
        if (WALLISH2.has(up) || up === 'D') {
          const gr = c.createLinearGradient(0, py, 0, py + 6);
          gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = gr; c.fillRect(px, py, 16, 6);
        }
        if (WALLISH2.has(at(x - 1, y))) { const gr = c.createLinearGradient(px, 0, px + 4, 0); gr.addColorStop(0, 'rgba(0,0,0,0.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(px, py, 4, 16); }
        if (WALLISH2.has(at(x + 1, y))) { const gr = c.createLinearGradient(px + 16, 0, px + 12, 0); gr.addColorStop(0, 'rgba(0,0,0,0.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(px + 12, py, 4, 16); }
      }
      // вертикальный порог между комнатами
      if (ch === 'D' && !WALLISH2.has(at(x - 1, y)) && !WALLISH2.has(at(x + 1, y))) {
        F(c, px + 7, py, 2, 16, 'rgba(60,40,24,0.55)'); F(c, px + 7, py, 0.5, 16, 'rgba(255,220,170,0.15)');
        F(c, px, py, 16, 2, '#3a2a1e'); F(c, px, py + 14, 16, 2, 'rgba(0,0,0,0.3)');
      }
      // тротуар у стены дома — тень
      if (m.def.outdoor && (ch === 's' || ch === 'a') && (at(x, y - 1) === 'P' || at(x, y - 1) === 'E')) {
        const gr = c.createLinearGradient(0, py, 0, py + 7);
        gr.addColorStop(0, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr; c.fillRect(px, py, 16, 7);
      }
      if (ch === 'P' || ch === 'E') this.fineFacade(c, px, py, x, y, m);
    }
    return cv;
  };

  Art.fineFloor = function (c, k, px, py, x, y) {
    const n = (i) => ah(x, y, 100 + i);
    if (k === 'parquet') {
      const vert = (x + y) % 2;
      for (let i = 0; i < 4; i++) {
        // волокна дерева
        for (let j = 0; j < 3; j++) {
          const o = 0.5 + n(i * 7 + j) * 3;
          const a = 0.08 + n(i * 3 + j) * 0.1;
          c.fillStyle = `rgba(30,18,10,${a})`;
          if (vert) c.fillRect(px + i * 4 + o, py + n(j) * 6, 0.5, 6 + n(j + 5) * 8);
          else c.fillRect(px + n(j) * 6, py + i * 4 + o, 6 + n(j + 5) * 8, 0.5);
        }
        c.fillStyle = 'rgba(255,220,170,0.06)';
        if (vert) c.fillRect(px + i * 4 + 0.5, py, 0.5, 16); else c.fillRect(px, py + i * 4 + 0.5, 16, 0.5);
      }
      if (n(40) > 0.9) { F(c, px + 4 + n(41) * 8, py + 4 + n(42) * 8, 1, 1, 'rgba(40,20,10,0.45)'); }   // сучок
    } else if (k === 'lino') {
      for (let i = 0; i < 10; i++) F(c, px + n(i) * 16, py + n(i + 20) * 16, 0.5, 0.5, i % 2 ? 'rgba(255,230,190,0.08)' : 'rgba(0,0,0,0.15)');
      F(c, px + 4, py + 4, 8, 0.5, 'rgba(120,90,60,0.15)'); F(c, px + 4, py + 11.5, 8, 0.5, 'rgba(120,90,60,0.15)');
    } else if (k === 'tile' || k === 'btile') {
      F(c, px + 0.5, py + 0.5, 6, 0.5, 'rgba(255,255,255,0.18)'); F(c, px + 0.5, py + 0.5, 0.5, 6, 'rgba(255,255,255,0.12)');
      if (n(3) > 0.7) F(c, px + 3 + n(4) * 8, py + 3 + n(5) * 8, 3, 0.5, 'rgba(0,0,0,0.2)');
    } else if (k === 'concrete' || k === 'stairs') {
      for (let i = 0; i < 14; i++) F(c, px + n(i) * 16, py + n(i + 30) * 16, 0.5, 0.5, i % 3 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)');
    } else if (k === 'roof' || k === 'asphalt') {
      for (let i = 0; i < 16; i++) F(c, px + n(i) * 16, py + n(i + 30) * 16, 0.5, 0.5, i % 3 ? 'rgba(0,0,0,0.3)' : 'rgba(200,210,220,0.14)');
      if (n(60) > 0.75) { F(c, px + n(61) * 10, py + n(62) * 14, 4 + n(63) * 4, 0.5, 'rgba(150,170,190,0.12)'); }   // мокрый блик
    } else if (k === 'sidewalk') {
      for (let i = 0; i < 8; i++) F(c, px + n(i) * 16, py + n(i + 30) * 16, 0.5, 0.5, 'rgba(0,0,0,0.22)');
      F(c, px, py + 7.5, 16, 0.5, 'rgba(255,255,255,0.06)');
    } else if (k === 'sand') {
      for (let i = 0; i < 18; i++) F(c, px + n(i) * 16, py + n(i + 30) * 16, 0.5, 0.5, i % 2 ? 'rgba(255,240,200,0.14)' : 'rgba(40,30,20,0.2)');
    } else if (k === 'grass') {
      for (let i = 0; i < 10; i++) F(c, px + n(i) * 15, py + n(i + 30) * 13, 0.5, 2 + n(i + 50) * 2, i % 2 ? 'rgba(140,140,80,0.35)' : 'rgba(30,30,10,0.35)');
    }
  };

  Art.fineWall = function (c, ws, px, py, x, y, win) {
    const n = (i) => ah(x, y, 200 + i);
    if (ws === 'home' || ws === 'kam' || ws === 'dani') {
      // мелкий узор обоев: ромбики
      const col = ws === 'kam' ? 'rgba(160,180,200,0.16)' : 'rgba(220,210,160,0.13)';
      for (let yy = 1.5; yy < 12; yy += 3) for (let xx = 1; xx < 16; xx += 4) {
        const o = ((yy - 1.5) / 3) % 2 ? 2 : 0;
        F(c, px + xx + o, py + yy, 0.5, 0.5, col); F(c, px + xx + o - 0.5, py + yy + 0.5, 1.5, 0.5, col); F(c, px + xx + o, py + yy + 1, 0.5, 0.5, col);
      }
      F(c, px, py + 12.5, 16, 0.5, 'rgba(255,220,170,0.15)');            // кромка плинтуса
      F(c, px, py + 1, 16, 0.5, 'rgba(255,240,210,0.08)');               // карниз
      if (n(1) > 0.85) F(c, px + 2 + n(2) * 10, py + 3, 0.5, 6, 'rgba(0,0,0,0.1)');   // шов обоев
    } else if (ws === 'stair') {
      for (let i = 0; i < 10; i++) F(c, px + n(i) * 16, py + n(i + 10) * 6, 0.5, 0.5, 'rgba(0,0,0,0.15)');
      F(c, px, py + 7.5, 16, 0.5, 'rgba(255,255,255,0.1)');
      if (n(30) > 0.8) F(c, px + n(31) * 12, py + 9 + n(32) * 4, 3, 0.5, 'rgba(0,0,0,0.3)');   // царапины
    } else if (ws === 'bath' || ws === 'kitchen') {
      const top = ws === 'kitchen' ? 7 : 0;
      for (let yy = top; yy < 16; yy += 4) for (let xx = 0; xx < 16; xx += 4) F(c, px + xx + 0.5, py + yy + 0.5, 1.5, 0.5, 'rgba(255,255,255,0.22)');
    }
  };

  Art.fineFacade = function (c, px, py, x, y, m) {
    // швы панелей и отливы под окнами
    F(c, px + 15.5, py, 0.5, 16, 'rgba(0,0,0,0.25)');
    for (let i = 0; i < 6; i++) F(c, px + ah(x, y, 300 + i) * 16, py + ah(x, y, 310 + i) * 16, 0.5, 0.5, 'rgba(0,0,0,0.2)');
    F(c, px + 4, py + 12.5, 8, 0.5, 'rgba(255,255,255,0.12)');
    if (ah(x, y, 11) > 0.72) F(c, px + 5, py + 5, 0.5, 6, 'rgba(255,255,255,0.18)');    // занавеска в светлом окне
    // балконы: плита и решётка под частью окон (кроме первого этажа)
    const g = m.grid, isB = (yy) => yy < m.h && (g[yy][x] === 'P' || g[yy][x] === 'E');
    let d = 0; while (isB(y + d + 1)) d++;
    if (d >= 1 && d < 3 && ah(x, y, 77) > 0.55 && g[y][x] === 'P') {
      F(c, px + 2, py + 12, 12, 1.5, '#5e6166'); F(c, px + 2, py + 13.5, 12, 0.5, 'rgba(0,0,0,0.5)');
      for (let i = 2.5; i < 14; i += 1.5) F(c, px + i, py + 9, 0.5, 3, 'rgba(150,155,160,0.7)');
      F(c, px + 2, py + 9, 12, 0.5, '#7a7e84');
      if (ah(x, y, 78) > 0.6) { F(c, px + 4, py + 9.5, 2, 2, '#8a3a3a'); F(c, px + 9, py + 10, 3, 1.5, '#d8d2c0'); }   // бельё
    }
  };

  // =================================================================
  // МЕБЕЛЬ: тонкие детали поверх старых рисунков
  // =================================================================
  const P = Art.props;
  const add = (k, fn) => { const o = P[k] && P[k].draw; if (!o) return; P[k].draw = function (c, x, y, op, t, E) { o.call(this, c, x, y, op, t, E); fn(c, x, y, op, t, E); }; };
  add('sofa', (c, x, y, o) => {
    const col = o.col || '#4a3b2e';
    for (let i = 0; i < 46; i += 3) F(c, x + 1 + i, y - 7.5, 1, 0.5, shade(col, -0.45));                     // строчка на спинке
    F(c, x + 4, y + 1, 19, 0.5, shade(col, 0.25)); F(c, x + 25, y + 1, 19, 0.5, shade(col, 0.25));
    F(c, x + 4, y + 8.5, 40, 0.5, shade(col, -0.4));
    F(c, x + 13, y + 4, 0.5, 2, shade(col, -0.35)); F(c, x + 34, y + 4, 0.5, 2, shade(col, -0.35));        // пуговицы
  });
  add('bookshelf', (c, x, y) => {
    for (let s = 0; s < 4; s++) for (let i = 0; i < 26; i += 2.5) if (ah(i * 3, s + y) > 0.4) F(c, x + 3 + i, y - 16 + s * 8, 0.5, 2, 'rgba(255,230,180,0.25)');   // надписи на корешках
    F(c, x + 1, y - 20, 30, 0.5, 'rgba(255,220,170,0.2)');
  });
  add('wardrobe', (c, x, y, o) => {
    const col = o.col || '#4e3826';
    for (let i = 0; i < 6; i++) F(c, x + 4 + ah(i, x) * 22, y - 15 + ah(x, i) * 20, 0.5, 4 + ah(i, i) * 6, shade(col, -0.2));
    F(c, x + 3, y - 16, 10, 0.5, shade(col, 0.25)); F(c, x + 18, y - 16, 10, 0.5, shade(col, 0.25));
  });
  add('desk', (c, x, y, o) => {
    const col = o.col || '#5a3e2a';
    F(c, x + 2, y - 1.5, 28, 0.5, shade(col, 0.3)); for (let i = 0; i < 4; i++) F(c, x + 3 + i * 7, y + 1 + (i % 2), 5, 0.5, shade(col, -0.2));
    if ((o.items || []).includes('lamp')) { F(c, x + 3.5, y - 6.5, 5, 0.5, '#fff2c0'); F(c, x + 4, y - 9.5, 4, 0.5, '#3d5a4a'); }
    if ((o.items || []).includes('laptop')) { for (let i = 0; i < 4; i++) F(c, x + 13.5, y - 6.5 + i, 3 + (i % 2) * 2, 0.5, 'rgba(220,235,255,0.6)'); }
  });
  add('tv', (c, x, y, o, t) => {
    for (let i = 0; i < 9; i += 1) F(c, x + 2, y - 8 + i, 10, 0.5, 'rgba(0,0,0,0.18)');                    // строки кинескопа
    F(c, x + 2.5, y - 7.5, 3, 0.5, 'rgba(255,255,255,0.2)');
  });
  add('fridge', (c, x, y) => {
    F(c, x + 1.5, y - 13.5, 0.5, 26, 'rgba(255,255,255,0.4)'); F(c, x + 3, y - 10, 0.5, 4, '#d8d8d0'); F(c, x + 3, y - 1, 0.5, 4, '#d8d8d0');
    F(c, x + 1, y + 13.5, 14, 0.5, 'rgba(0,0,0,0.4)');
  });
  add('wallcarpet', (c, x, y) => {
    for (let i = 0; i < 42; i += 1.5) F(c, x + 3 + i, y + 2.5, 0.5, 0.5, i % 3 ? '#e0b85a' : '#1e2a4a');
    for (let i = 0; i < 42; i += 1.5) F(c, x + 3 + i, y + 10.5, 0.5, 0.5, i % 3 ? '#e0b85a' : '#1e2a4a');
  });
  add('kiosk', (c, x, y) => {
    F(c, x + 6, y - 4, 36, 0.5, 'rgba(255,255,255,0.35)'); F(c, x + 6.5, y - 3, 0.5, 15, 'rgba(255,255,255,0.2)');
    for (let i = 0; i < 40; i += 4) F(c, x + 4 + i, y + 18, 2, 0.5, 'rgba(0,0,0,0.3)');
  });
  add('car', (c, x, y, o) => {
    const f = o.face === 'left';
    F(c, x + (f ? 16 : 14), y + 8.5, 16, 0.5, 'rgba(255,255,255,0.35)'); F(c, x + 4, y + 5, 40, 0.5, 'rgba(255,255,255,0.15)');
    F(c, x + 7, y + 3, 1, 1, '#555'); F(c, x + 36, y + 3, 1, 1, '#555'); F(c, x + 7, y + 26, 1, 1, '#555'); F(c, x + 36, y + 26, 1, 1, '#555');   // колпаки
  });
  add('lighthouse', (c, x, y) => {
    const by = y + 30;
    for (let i = 0; i < 9; i++) { const yy = by - 30 - i * 7, w = 30 - i; F(c, x + 24 - w / 2, yy - 7, w, 0.5, 'rgba(255,255,255,0.18)'); F(c, x + 24 - w / 2 + 2, yy - 4, 0.5, 3, 'rgba(0,0,0,0.15)'); }
    const ly = by - 30 - 63;
    for (let i = 0; i < 12; i += 2) F(c, x + 18 + i, ly - 12, 0.5, 8, 'rgba(120,90,30,0.4)');               // переплёт фонаря
  });
  add('phone_table', (c, x, y) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) F(c, x + 6.5 + i, y - 2.5 + j, 0.5, 0.5, '#555'); });
  add('box', (c, x, y) => { F(c, x + 1, y + 1, 14, 0.5, 'rgba(0,0,0,0.25)'); F(c, x + 4, y + 5, 7, 0.5, '#111'); });
  add('bed', (c, x, y, o) => { for (let i = 0; i < 4; i++) F(c, x + 2, y + 16 + i * 7, 28, 0.5, shade(o.col || '#5a3a4a', -0.25)); });
  add('itable', (c, x, y) => { F(c, x + 4, y + 0.5, 6, 0.5, '#555'); F(c, x + 4, y + 2.5, 5, 0.5, '#555'); F(c, x + 1, y - 1.5, 30, 0.5, 'rgba(255,255,255,0.25)'); });
})();
