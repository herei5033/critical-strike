// Детализированные спрайты персонажей, врагов, оружия и аптечки.
// Все фигуры смотрят вдоль +X (вперёд), правая рука — сторона +Y.
const Sprites = (() => {
  const TAU = Math.PI * 2;

  // ---------- примитивы ----------
  function circ(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, rot, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); }
  function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function line(ctx, x1, y1, x2, y2, w, c) {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // Деталь оружия с тёмным контуром (пиксель-арт стиль)
  function part(ctx, x, y, w, h, c) {
    ctx.fillStyle = '#050407'; ctx.fillRect(x - 0.7, y - 0.7, w + 1.4, h + 1.4);
    ctx.fillStyle = c; ctx.fillRect(x, y, w, h);
  }
  // Тонкая деталь оружия: тёмный контур, основной цвет, блик сверху
  function metal(ctx, x, y, w, h, c, hi) {
    ctx.fillStyle = '#050407'; ctx.fillRect(x - 0.5, y - 0.5, w + 1, h + 1);
    ctx.fillStyle = c; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = hi; ctx.fillRect(x, y, w, Math.max(0.4, h * 0.28));
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y + h * 0.72, w, h * 0.28);
  }

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // ---------- внешность ----------
  const HEROES = {
    // Дани: короткая стрижка с боковым пробором, тонкие металлические очки,
    // тёмно-зелёный бомбер с чёрным вязаным воротником, бордовый свитер на молнии, белая футболка, джинсы
    dani: { skin: '#dfa57e', skinDk: '#ad7752', hair: '#121016', hairHi: '#3a3c52', hairStyle: 'side', glasses: 'thin',
            jacket: '#26393a', jacketDk: '#142224', shirt: '#5a1a28', tee: '#e8e8ea', knit: '#0e0e10',
            pants: '#1a2233', shoes: '#3e3328', collar: 'bomber', cuff: '#0e0e10' },
    // Гала: аккуратная короткая стрижка, тёмные прямоугольные очки, бородка-эспаньолка с усами,
    // светло-голубая рубашка с длинным рукавом, чёрные брюки, чёрные туфли
    gal:  { skin: '#e2ab84', skinDk: '#b07a56', hair: '#141218', hairHi: '#3a3850', hairStyle: 'short', glasses: 'rect',
            beard: '#16121a', beardStyle: 'goatee',
            jacket: '#bcd3ea', jacketDk: '#8aa4c4', shirt: '#c8dcf0', pants: '#141418', shoes: '#0b0b0d', collar: 'dress', cuff: '#d4e4f4' },
    // Даур: густая короткая стрижка, чёрная куртка с поднятым воротником поверх тёмной рубашки в клетку
    daur: { skin: '#e0a57c', skinDk: '#ac7450', hair: '#0f0d12', hairHi: '#34304a', hairStyle: 'crop',
            jacket: '#18181b', jacketDk: '#09090b', shirt: '#2a2d36', pants: '#1c1c22', shoes: '#0a0a0c', collar: 'jacket', shirtCollar: true },
  };

  const SKINS = [['#d8b08e', '#a07a5c'], ['#c89a78', '#94684a'], ['#b08060', '#7c5236'], ['#8a5a3c', '#5e3820'], ['#e0c0a8', '#a88a74']];
  const HAIR = ['#0c0a0e', '#1a120c', '#2a1c12', '#3a3a40', '#4a2a18'];
  // тёмная, потёртая одежда: кожанки, худи, чёрные костюмы, рабочие куртки
  const OUTFITS = [
    { jacket: '#2a1a12', jacketDk: '#140c08', shirt: '#1a1414', collar: 'jacket' },                   // старая кожанка
    { jacket: '#1c1e24', jacketDk: '#0c0d10', shirt: '#1c1e24', collar: 'track', stripes: '#5a5a62' }, // чёрный спортивный костюм
    { jacket: '#141416', jacketDk: '#060607', shirt: '#2a2a2e', collar: 'suit', tie: '#5a0a12' },     // чёрный костюм
    { jacket: '#26262c', jacketDk: '#111114', shirt: '#26262c', collar: 'hood' },                     // тёмное худи
    { jacket: '#3a1010', jacketDk: '#1c0606', shirt: '#121212', collar: 'jacket' },                   // бордовая куртка
    { jacket: '#2a2e22', jacketDk: '#14170f', shirt: '#2a2e22', collar: 'hood' },                     // оливковое худи
    { jacket: '#1e2430', jacketDk: '#0c1018', shirt: '#3a3a3a', collar: 'jacket' },                   // рабочая куртка
    { jacket: '#3a3430', jacketDk: '#1c1816', shirt: '#5a0a12', collar: 'suit' },                     // мятый пиджак
  ];
  const PANTS = ['#121216', '#1a1e28', '#2a2620', '#18181a', '#221a16'];

  function enemyLook(type, seed) {
    const r = rng(seed);
    const pick = a => a[Math.floor(r() * a.length)];
    const [skin, skinDk] = pick(SKINS);
    if (type === 'tank') {
      return { skin, skinDk, hair: '#121016', hairStyle: 'helmet', helmet: '#1a1c1a', visor: '#2a0608',
               jacket: '#22241f', jacketDk: '#0e100c', shirt: '#1a1c18', pants: '#1a1c18', shoes: '#060606',
               collar: 'armor', skull: true, bulk: 1.28, blood: r() < 0.6 };
    }
    if (type === 'sniper') {
      return { skin, skinDk, hair: '#121016', hairStyle: 'balaclava', mask: '#16180f',
               jacket: '#22281a', jacketDk: '#10140a', shirt: '#22281a', pants: '#1c2214', shoes: '#0c0a06',
               collar: 'camo', camo: ['#10140a', '#323a22', '#2a2216'], glasses: 'goggles' };
    }
    if (type === 'hound') {
      const coats = [['#0e0b0b', '#5a3a1c'], ['#1a120c', '#7a5430'], ['#16161a', '#4a4a50']];
      const [coat, tan] = pick(coats);
      return { coat, tan, collar: pick(['#5a0a0a', '#1a1a1a', '#3a2a10']), scars: true };
    }
    const o = pick(OUTFITS);
    const style = pick(['bald', 'buzz', 'slick', 'balaclava', 'hoodup', 'short', 'balaclava', 'buzz', 'long', 'cap']);
    return {
      skin, skinDk, hair: pick(HAIR), hairHi: 'rgba(255,255,255,0.1)', hairStyle: o.collar === 'hood' && r() < 0.6 ? 'hoodup' : style,
      cap: pick(['#141414', '#2a0a0a', '#1a1e14']), mask: pick(['#0e0e10', '#1a1414', '#16180f']),
      glasses: r() < 0.3 ? 'shades' : null, beard: r() < 0.35 ? '#0e0a08' : null,
      jacket: o.jacket, jacketDk: o.jacketDk, shirt: o.shirt, collar: o.collar, stripes: o.stripes, print: o.print, tie: o.tie,
      pants: pick(PANTS), shoes: '#060607', bulk: 0.95 + r() * 0.12, blood: r() < 0.35, scar: r() < 0.3,
    };
  }

  // ---------- голова ----------
  function drawHead(ctx, L, t) {
    const hx = 1.6;
    // уши
    ell(ctx, hx - 0.6, -5.2, 1.4, 1.8, 0, L.skinDk);
    ell(ctx, hx - 0.6, 5.2, 1.4, 1.8, 0, L.skinDk);
    // лицо/кожа (видна спереди)
    circ(ctx, hx, 0, 5.4, '#050407');
    circ(ctx, hx, 0, 4.9, L.skin);
    ell(ctx, hx + 4.6, 0, 1.3, 1.1, 0, L.skinDk); // нос

    const st = L.hairStyle;
    if (st === 'balaclava') {
      // балаклава: закрыта вся голова, видна только полоска глаз
      circ(ctx, hx - 0.2, 0, 5.6, '#050407');
      circ(ctx, hx - 0.2, 0, 5.1, L.mask || '#0e0e10');
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.5;
      for (let i = -3; i <= 3; i += 1.5) { ctx.beginPath(); ctx.moveTo(hx - 4.6, i); ctx.lineTo(hx + 3, i * 1.05); ctx.stroke(); }
      R(ctx, hx + 3.2, -2.6, 1.6, 5.2, L.skin);
      R(ctx, hx + 3.8, -2, 0.8, 1, '#c01020'); R(ctx, hx + 3.8, 1, 0.8, 1, '#c01020');
    } else if (st === 'hoodup') {
      // капюшон на голове, лицо в тени
      circ(ctx, hx - 0.8, 0, 6.4, '#050407');
      circ(ctx, hx - 0.8, 0, 5.9, L.jacketDk);
      ctx.fillStyle = L.jacket; ctx.beginPath(); ctx.arc(hx - 1.2, 0, 4.8, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(hx + 3.4, 0, 1.8, 3.4, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
    } else if (st === 'helmet') {
      circ(ctx, hx - 0.4, 0, 5.8, '#050407');
      circ(ctx, hx - 0.4, 0, 5.3, L.helmet);
      ctx.fillStyle = L.visor; ctx.beginPath(); ctx.arc(hx, 0, 5, -0.9, 0.9); ctx.lineTo(hx + 2, 0); ctx.fill();
      R(ctx, hx - 5, -0.6, 7, 1.2, 'rgba(255,255,255,0.12)');
      circ(ctx, hx - 2.5, -2, 1.2, 'rgba(255,255,255,0.15)');
    } else if (st === 'beanie') {
      ctx.fillStyle = L.beanie; ctx.beginPath(); ctx.arc(hx - 0.3, 0, 5.2, Math.PI * 0.42, Math.PI * 1.58); ctx.closePath(); ctx.fill();
      circ(ctx, hx - 1.8, 0, 3.6, L.beanie);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.6;
      for (let i = -3; i <= 3; i += 1.5) { ctx.beginPath(); ctx.moveTo(hx - 5, i); ctx.lineTo(hx + 1, i * 1.1); ctx.stroke(); }
      circ(ctx, hx - 3, 0, 1.3, '#4a5a3a');
    } else if (st === 'cap') {
      ctx.fillStyle = L.cap; ctx.beginPath(); ctx.arc(hx - 0.4, 0, 5.3, Math.PI * 0.35, Math.PI * 1.65); ctx.closePath(); ctx.fill();
      circ(ctx, hx - 1.3, 0, 4.2, L.cap);
      ctx.fillStyle = '#050407'; ctx.beginPath(); ctx.ellipse(hx + 4.2, 0, 3.2, 4.4, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.fillStyle = L.cap; ctx.beginPath(); ctx.ellipse(hx + 4, 0, 2.7, 3.9, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
      circ(ctx, hx - 1.4, 0, 0.8, 'rgba(255,255,255,0.4)');
    } else if (st !== 'bald') {
      // общая "шапка" волос, лицо спереди остаётся открытым
      const back = st === 'long' ? 6.4 : st === 'short' || st === 'buzz' || st === 'side' ? 4.8 : st === 'crop' ? 5.2 : 5.4;
      ctx.fillStyle = L.hair;
      ctx.beginPath();
      ctx.arc(hx - 0.5, 0, back, Math.PI * 0.38, Math.PI * 1.62);
      ctx.quadraticCurveTo(hx + 3.8, -2.5, hx + 3.2, 0);
      ctx.quadraticCurveTo(hx + 3.8, 2.5, hx - 0.5 + Math.cos(Math.PI * 0.38) * back, Math.sin(Math.PI * 0.38) * back);
      ctx.fill();
      if (st === 'buzz') {
        ctx.globalAlpha = 0.55; circ(ctx, hx - 0.6, 0, 4.6, L.skin); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 10; i++) ctx.fillRect(hx - 4 + (i % 5) * 1.5, -2 + Math.floor(i / 5) * 3, 0.6, 0.6);
      }
      if (st === 'slick') {
        // зачёс назад с пробором и бликом
        ctx.strokeStyle = L.hairHi; ctx.lineWidth = 0.7;
        for (let i = -3; i <= 3; i += 1.5) { ctx.beginPath(); ctx.moveTo(hx + 2.6, i * 0.7); ctx.quadraticCurveTo(hx - 1, i * 1.25, hx - 4.6, i * 1.05); ctx.stroke(); }
        line(ctx, hx + 2.8, -1.7, hx - 4.2, -2.2, 0.6, '#000');
        ctx.globalAlpha = 0.35; ell(ctx, hx - 1, -2.5, 2.6, 1, 0.15, '#9aa0d0'); ctx.globalAlpha = 1;
      } else if (st === 'messy') {
        // растрёпанные пряди
        const pts = [[-5.4, -2.5], [-5.6, 1.5], [-3.5, -4.8], [-3.2, 4.8], [-0.4, -5.6], [-0.2, 5.5], [2.6, -4.4], [2.8, 4.2], [3.6, -1.6], [3.4, 1.8]];
        for (const [px, py] of pts) circ(ctx, hx + px * 0.98, py, 1.5, L.hair);
        ctx.strokeStyle = L.hairHi; ctx.lineWidth = 0.6;
        for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.5; ctx.beginPath(); ctx.moveTo(hx - 1, 0); ctx.lineTo(hx - 1 + Math.cos(a + Math.PI) * 4.5, Math.sin(a + Math.PI) * 4.5); ctx.stroke(); }
        circ(ctx, hx + 3.6, -0.4, 1.2, L.hair); // чёлка
      } else if (st === 'short') {
        ctx.strokeStyle = L.hairHi; ctx.lineWidth = 0.6;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(hx + 2.4, i); ctx.lineTo(hx - 3.6, i * 1.4); ctx.stroke(); }
        ctx.globalAlpha = 0.35; ell(ctx, hx - 1.2, -2.2, 2, 0.9, 0.2, '#8a8ab0'); ctx.globalAlpha = 1;
      } else if (st === 'side') {
        // короткая стрижка с боковым пробором
        ctx.strokeStyle = L.hairHi; ctx.lineWidth = 0.6;
        for (let i = -3; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(hx + 2.6, i * 0.9 + 0.6); ctx.lineTo(hx - 3.8, i * 1.3 + 1.2); ctx.stroke(); }
        line(ctx, hx + 2.4, -2.2, hx - 3.6, -2.6, 0.6, '#000');
        ctx.globalAlpha = 0.3; ell(ctx, hx - 0.6, 1.4, 2.2, 0.9, 0.1, '#9aa0c8'); ctx.globalAlpha = 1;
      } else if (st === 'crop') {
        // густые короткие волосы с объёмом на макушке
        for (const [px, py] of [[-4, -3], [-4.4, 1.4], [-1.6, -4.6], [-1.4, 4.4], [1.4, -3.8], [1.6, 3.6], [-2.4, 0]]) circ(ctx, hx + px, py, 1.7, L.hair);
        ctx.strokeStyle = L.hairHi; ctx.lineWidth = 0.55;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(hx + 3, i * 0.9); ctx.lineTo(hx - 3.4, i * 1.5); ctx.stroke(); }
        circ(ctx, hx + 3.2, 0.8, 1.1, L.hair);
      } else if (st === 'mohawk') {
        ctx.globalAlpha = 0.5; circ(ctx, hx - 0.6, 0, 4.7, L.skin); ctx.globalAlpha = 1;
        R(ctx, hx - 5.6, -1.2, 9, 2.4, L.hair);
      } else if (st === 'long') {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.6;
        for (let i = -4; i <= 4; i += 2) { ctx.beginPath(); ctx.moveTo(hx + 2, i * 0.5); ctx.lineTo(hx - 6.5, i * 1.1); ctx.stroke(); }
      }
    } else {
      ctx.globalAlpha = 0.5; ell(ctx, hx - 1.4, -1.6, 2.2, 1.4, 0, '#ffffff'); ctx.globalAlpha = 1;
    }

    // борода
    if (L.beard && L.beardStyle === 'goatee') {
      // эспаньолка: острая бородка на подбородке + тонкие усы
      ctx.fillStyle = L.beard;
      ctx.beginPath(); ctx.moveTo(hx + 3.6, -1.6); ctx.lineTo(hx + 6.4, 0); ctx.lineTo(hx + 3.6, 1.6); ctx.closePath(); ctx.fill();
      line(ctx, hx + 4.6, -1.6, hx + 4.6, 1.6, 0.6, L.beard);
      ell(ctx, hx + 4.9, 0, 0.7, 0.9, 0, L.skinDk);
    } else if (L.beard) {
      ctx.fillStyle = L.beard;
      ctx.beginPath(); ctx.ellipse(hx + 3.8, 0, 2.3, 3.4, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.ellipse(hx + 2.4, 0, 2.6, 4.6, 0, -Math.PI / 2, Math.PI / 2); ctx.fill(); ctx.globalAlpha = 1;
      ell(ctx, hx + 4.7, 0, 0.9, 1.3, 0, L.skinDk);
    }
    if (L.scar) line(ctx, hx + 1, -3.6, hx + 3.6, -1.6, 0.6, '#7a2a24');

    // очки
    if (L.glasses === 'thin' || L.glasses === 'thick' || L.glasses === 'rect') {
      const thick = L.glasses === 'thick';
      const fc = L.glasses === 'thin' ? '#c8d2e2' : '#1a1a20';
      const lw = thick ? 1.1 : L.glasses === 'rect' ? 0.8 : 0.55;
      ctx.strokeStyle = fc; ctx.lineWidth = lw;
      ctx.strokeRect(hx + 3.5, -3.6, 1.6, 2.6);
      ctx.strokeRect(hx + 3.5, 1.0, 1.6, 2.6);
      line(ctx, hx + 4.3, -1.0, hx + 4.3, 1.0, lw, fc);
      line(ctx, hx + 3.5, -3.3, hx - 0.6, -5.0, lw, fc);
      line(ctx, hx + 3.5, 3.3, hx - 0.6, 5.0, lw, fc);
      const glint = 0.35 + 0.25 * Math.sin(t * 1.7);
      ctx.fillStyle = `rgba(170,220,255,${glint})`;
      ctx.fillRect(hx + 3.7, -3.4, 1.2, 0.9);
      ctx.fillRect(hx + 3.7, 1.2, 1.2, 0.9);
    } else if (L.glasses === 'goggles') {
      R(ctx, hx + 3.2, -4, 2.2, 8, '#050407');
      R(ctx, hx + 3.6, -3.4, 1.4, 2.6, 'rgba(120,255,140,0.55)'); R(ctx, hx + 3.6, 0.8, 1.4, 2.6, 'rgba(120,255,140,0.55)');
    } else if (L.glasses === 'shades') {
      R(ctx, hx + 3.4, -3.8, 2, 3, '#050407'); R(ctx, hx + 3.4, 0.8, 2, 3, '#050407');
      R(ctx, hx + 4.3, -1, 0.8, 2, '#050407');
      R(ctx, hx + 3.6, -3.5, 1, 0.8, 'rgba(120,180,255,0.6)'); R(ctx, hx + 3.6, 1.1, 1, 0.8, 'rgba(120,180,255,0.6)');
    }
  }

  // ---------- торс ----------
  function drawTorso(ctx, L, breathe) {
    const b = L.bulk || 1;
    const ry = 10.2 * b * breathe, rx = 6.4 * b;
    ell(ctx, 0, 0, rx + 0.8, ry + 0.8, 0, '#050407');
    ell(ctx, 0, 0, rx, ry, 0, L.jacketDk);
    ell(ctx, -0.6, -0.3, rx - 0.8, ry - 1, 0, L.jacket);
    // складки и свет
    ctx.globalAlpha = 0.18; ell(ctx, -1.6, -3.5 * b, rx * 0.55, ry * 0.38, 0, '#ffffff'); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-4 * b, 4 * b, 5, 0.8); ctx.fillRect(-3.4 * b, -6 * b, 4, 0.8);

    const c = L.collar;
    if (c === 'bomber') {
      // бомбер: свитер на молнии и белая футболка под ним, чёрный вязаный воротник, карман на молнии
      ctx.fillStyle = L.shirt;
      ctx.beginPath(); ctx.moveTo(1.6, -3.4); ctx.lineTo(6 * b, -0.6); ctx.lineTo(6 * b, 0.6); ctx.lineTo(1.6, 3.4); ctx.closePath(); ctx.fill();
      R(ctx, 4.4, -0.9, 1.6, 1.8, L.tee);
      line(ctx, 2.4, 0, 5.6, 0, 0.5, '#9a9aa2');
      ell(ctx, 0.4, 0, 1.8, 5.8, 0, L.knit);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.4;
      for (let i = -4; i <= 4; i += 1.5) { ctx.beginPath(); ctx.moveTo(-0.6, i); ctx.lineTo(1.6, i); ctx.stroke(); }
      line(ctx, 3, -3.6, 3, 3.6, 0.5, '#5a5e60');
      line(ctx, -1.5, -6.5 * b, 2.5, -6.2 * b, 0.6, '#5a5e60');
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 5; i++) ctx.fillRect(-4 + i * 1.6, 3.2 + (i % 2), 1, 0.6);
    } else if (c === 'dress') {
      // классическая рубашка: воротник с уголками и планка с пуговицами
      ctx.fillStyle = L.jacketDk;
      ctx.beginPath(); ctx.moveTo(0.6, -3.6); ctx.lineTo(4.4, -1.6); ctx.lineTo(2, -0.4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.6, 3.6); ctx.lineTo(4.4, 1.6); ctx.lineTo(2, 0.4); ctx.closePath(); ctx.fill();
      line(ctx, 2.2, 0, 6 * b, 0, 0.6, L.jacketDk);
      for (let i = 0; i < 3; i++) circ(ctx, 3 + i * 1.2, 0, 0.35, '#ffffff');
      ctx.strokeStyle = 'rgba(80,110,150,0.35)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-4, -6); ctx.quadraticCurveTo(-1, -4, 1, -7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 6); ctx.quadraticCurveTo(-1, 4, 1, 7); ctx.stroke();
    } else if (c === 'suit') {
      ctx.fillStyle = L.shirt;
      ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(6.2 * b, 0); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
      line(ctx, 2, -3, 5.8 * b, -0.4, 0.9, L.jacketDk);
      line(ctx, 2, 3, 5.8 * b, 0.4, 0.9, L.jacketDk);
      if (L.tie) { ctx.fillStyle = L.tie; ctx.beginPath(); ctx.moveTo(3.6, -0.6); ctx.lineTo(6, 0); ctx.lineTo(3.6, 0.6); ctx.fill(); }
    } else if (c === 'shirt') {
      ctx.fillStyle = L.shirt;
      ctx.beginPath(); ctx.moveTo(2.4, -3.2); ctx.lineTo(5.6, -0.4); ctx.lineTo(5.6, 0.4); ctx.lineTo(2.4, 3.2); ctx.closePath(); ctx.fill();
      line(ctx, 2.4, -3.2, 4.4, -1.6, 0.8, '#ffffff');
      line(ctx, 2.4, 3.2, 4.4, 1.6, 0.8, '#ffffff');
      if (L.print) {
        ctx.fillStyle = L.print;
        for (const [px, py] of [[-3, -6], [-1, 5], [-4, 2], [1, -7], [-2, -2], [0, 7]]) { ctx.beginPath(); ctx.arc(px, py, 1, 0, TAU); ctx.fill(); }
      }
    } else if (c === 'jacket') {
      ctx.fillStyle = L.shirt;
      ctx.beginPath(); ctx.moveTo(2.6, -2.6); ctx.lineTo(5.6, 0); ctx.lineTo(2.6, 2.6); ctx.closePath(); ctx.fill();
      if (L.shirtCollar) {
        // рубашка в клетку и её воротник
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.4;
        for (let i = 3; i < 6; i += 0.9) { ctx.beginPath(); ctx.moveTo(i, -1.8); ctx.lineTo(i, 1.8); ctx.stroke(); }
        line(ctx, 2.4, -2.6, 4, -1.2, 0.8, '#3a3e48'); line(ctx, 2.4, 2.6, 4, 1.2, 0.8, '#3a3e48');
      }
      ell(ctx, 0.6, 0, 2.2, 5.4, 0, L.jacketDk);   // поднятый воротник
      line(ctx, 3.2, -2.8, 3.2, 2.8, 0.5, 'rgba(255,255,255,0.15)');
      R(ctx, 3.4, -0.3, 2.6, 0.6, '#8a8a90'); // молния
    } else if (c === 'track') {
      line(ctx, -5, -7.8 * b, 4, -7.4 * b, 1, L.stripes);
      line(ctx, -5, 7.8 * b, 4, 7.4 * b, 1, L.stripes);
      R(ctx, 2.5, -0.4, 3.6, 0.8, L.stripes);
    } else if (c === 'hood') {
      ell(ctx, -3.6, 0, 3, 5.6, 0, L.jacketDk);
      line(ctx, 4, -1.6, 6.4, -1.4, 0.7, '#d0d0d0');
      line(ctx, 4, 1.6, 6.4, 1.4, 0.7, '#d0d0d0');
    } else if (c === 'armor') {
      R(ctx, -5.6, -7, 11.2, 14, '#050407');
      R(ctx, -5, -6.4, 10, 12.8, '#2a2e26');
      R(ctx, -4.4, -5.8, 8.8, 5, '#3a4034'); R(ctx, -4.4, 0.8, 8.8, 5, '#3a4034');
      for (const py of [-9.5, 9.5]) { R(ctx, -3, py - 1.6, 6, 3.2, '#050407'); R(ctx, -2.6, py - 1.2, 5.2, 2.4, '#4a4030'); }
      R(ctx, 2.8, -2.6, 2.6, 5.2, '#1a1e18');
      R(ctx, -4, -0.4, 8, 0.8, '#1a1e18');
    } else if (c === 'apron') {
      R(ctx, -4.6, -6, 9.2, 12, '#050407');
      R(ctx, -4, -5.4, 8, 10.8, '#d8d2c4');
      ctx.globalAlpha = 0.85;
      for (const [px, py, r] of [[-1, -2, 1.8], [2, 2.5, 1.4], [-2.4, 3, 1.1], [1.5, -3.6, 0.9]]) circ(ctx, px, py, r, '#8a0010');
      ctx.globalAlpha = 1;
      line(ctx, -4, -6, 3, -9, 0.8, '#3a3a3a'); line(ctx, -4, 6, 3, 9, 0.8, '#3a3a3a');
    } else if (c === 'camo') {
      const cm = L.camo;
      for (let i = 0; i < 9; i++) ell(ctx, -4 + (i * 37 % 9), -8 + (i * 53 % 16), 2.2, 1.4, i, cm[i % cm.length]);
      line(ctx, -3, -8, 4, 8, 1.2, '#2a1a10'); // ремень винтовки
    }
    if (L.skull) {
      // белый череп на бронежилете
      circ(ctx, -1, 0, 2, '#c8c4b8'); R(ctx, -1.6, 1.4, 1.2, 1, '#c8c4b8');
      circ(ctx, -0.4, -0.8, 0.5, '#050407'); circ(ctx, -0.4, 0.8, 0.5, '#050407');
    }
    if (L.blood) {
      // засохшая кровь на одежде
      ctx.globalAlpha = 0.75;
      for (const [px, py, rr] of [[-2, 3, 1.6], [1, 5, 1], [-3.6, -4, 1.2], [0, -6, 0.8]]) circ(ctx, px, py, rr, '#4a0008');
      ctx.globalAlpha = 1;
    }
  }

  // ---------- руки ----------
  function arm(ctx, L, sx, sy, hx, hy, bendSide) {
    const UP = 6.2, FO = 6.4;
    const dx = hx - sx, dy = hy - sy;
    let d = Math.hypot(dx, dy) || 0.001;
    const maxD = UP + FO - 0.2;
    if (d > maxD) { hx = sx + dx / d * maxD; hy = sy + dy / d * maxD; d = maxD; }
    const a = (UP * UP - FO * FO + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, UP * UP - a * a));
    const mx = sx + dx * a / d, my = sy + dy * a / d;
    const ex = mx + (-dy / d) * h * bendSide, ey = my + (dx / d) * h * bendSide;
    line(ctx, sx, sy, ex, ey, 4.6, '#050407');
    line(ctx, ex, ey, hx, hy, 4.2, '#050407');
    line(ctx, sx, sy, ex, ey, 3.4, L.jacket);
    line(ctx, ex, ey, hx, hy, 3.0, L.jacketDk);
    if (L.cuff) {
      const cx = ex + (hx - ex) * 0.78, cy = ey + (hy - ey) * 0.78;
      line(ctx, cx, cy, ex + (hx - ex) * 0.92, ey + (hy - ey) * 0.92, 3.2, L.cuff);
    }
    circ(ctx, hx, hy, 2.5, '#050407');
    circ(ctx, hx, hy, 2.0, L.skin);
    return { hx, hy };
  }

  // ---------- оружие ----------
  // Ориентация: рукоять/хват в (0,0), ствол вдоль +X
  const WEAPON_ART = {
    // Огнестрел — вид СВЕРХУ: видны ствольная коробка, планка, прицел и ствол.
    // Магазин и рукоять находятся под оружием и сверху не видны.
    glock(ctx) {
      metal(ctx, -1, -1.2, 13, 2.4, '#26262c', '#4a4a56');
      for (let i = 0; i < 4; i++) R(ctx, -0.4 + i * 0.9, -1, 0.35, 2, '#121216');
      R(ctx, 5.6, -0.5, 2.4, 1, '#56565f');
      R(ctx, 11.2, -0.3, 0.7, 0.6, '#d8d8d8');
      R(ctx, 0.2, -0.25, 0.6, 0.5, '#d8d8d8');
    },
    uzi(ctx) {
      line(ctx, -9, -1.3, -2, -1.1, 0.7, '#3a3a42'); line(ctx, -9, 1.3, -2, 1.1, 0.7, '#3a3a42');
      line(ctx, -9, -1.3, -9, 1.3, 0.8, '#3a3a42');
      metal(ctx, -2, -1.6, 15, 3.2, '#2c2c34', '#50505c');
      R(ctx, 2, -0.5, 6, 1, '#1a1a1e');
      metal(ctx, 13, -0.6, 4.5, 1.2, '#18181c', '#3a3a42');
      R(ctx, 0, -0.3, 0.9, 0.6, '#6a6a74'); R(ctx, 11, -0.3, 0.9, 0.6, '#6a6a74');
    },
    m4(ctx) {
      metal(ctx, -11, -1.3, 7, 2.6, '#1c1c20', '#34343a');
      metal(ctx, -4, -0.7, 4, 1.4, '#16161a', '#2a2a30');
      metal(ctx, 0, -1.4, 11, 2.8, '#26262c', '#44444c');
      for (let i = 0; i < 6; i++) R(ctx, 0.8 + i * 1.6, -0.25, 0.8, 0.5, '#5a5a64');
      metal(ctx, 11, -1.3, 9, 2.6, '#202026', '#3a3a42');
      for (let i = 0; i < 3; i++) R(ctx, 12.2 + i * 2.6, -0.5, 1.6, 1, '#101014');
      metal(ctx, 20, -0.5, 6, 1, '#141418', '#2a2a30');
      metal(ctx, 26, -0.8, 2.4, 1.6, '#0c0c0e', '#26262c');
      circ(ctx, 4.5, 0, 1.3, '#050407'); circ(ctx, 4.5, 0, 0.9, '#2a2a30'); circ(ctx, 4.5, 0, 0.35, '#ff3030');
    },
    ak47(ctx) {
      metal(ctx, -11, -1.3, 9, 2.6, '#5a2e12', '#86502a');
      ctx.strokeStyle = 'rgba(30,12,4,0.5)'; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(-10, -0.4); ctx.lineTo(-3, -0.6); ctx.moveTo(-10, 0.5); ctx.lineTo(-3, 0.4); ctx.stroke();
      metal(ctx, -2, -1.3, 12, 2.6, '#2a2a2e', '#4a4a52');
      for (let i = 0; i < 4; i++) R(ctx, 0.5 + i * 2.4, -1.1, 0.4, 2.2, '#18181c');
      metal(ctx, 10, -1.4, 7, 2.8, '#6a3816', '#94562a');
      metal(ctx, 13, -0.4, 8, 0.8, '#202024', '#3a3a42');
      metal(ctx, 17, -0.5, 8, 1, '#18181c', '#2e2e34');
      R(ctx, 22, -0.7, 0.8, 1.4, '#0e0e10');
      metal(ctx, 25, -0.8, 2, 1.6, '#101012', '#2a2a30');
    },
    shotgun(ctx) {
      metal(ctx, -11, -1.4, 9, 2.8, '#4e2a12', '#7e4a24');
      metal(ctx, -2, -1.4, 10, 2.8, '#26262c', '#46464e');
      R(ctx, 1, -0.4, 4, 0.8, '#121216');
      metal(ctx, 8, -0.7, 22, 1.4, '#2e2e36', '#5a5a66');
      metal(ctx, 12, -1.5, 8, 3, '#5e3216', '#8a5028');
      for (let i = 0; i < 5; i++) R(ctx, 12.8 + i * 1.5, -1.4, 0.5, 2.8, '#3a1e0a');
      circ(ctx, 29.4, 0, 0.5, '#e0d0a0');
    },
    sniper(ctx) {
      metal(ctx, -13, -1.5, 11, 3, '#1e2216', '#363e28');
      metal(ctx, -2, -1.3, 14, 2.6, '#202420', '#3a3e36');
      metal(ctx, 0, -1.8, 11, 3.6, '#0e100c', '#2a2e26');
      R(ctx, -0.6, -1.6, 0.8, 3.2, '#3a6a9a'); R(ctx, 10.8, -1.6, 0.8, 3.2, '#3a6a9a');
      R(ctx, 5, -2.4, 1.2, 4.8, '#0a0a08');
      metal(ctx, 12, -0.55, 21, 1.1, '#141612', '#2a2e26');
      metal(ctx, 33, -0.9, 3, 1.8, '#0a0a08', '#22221e');
      R(ctx, 2, -0.2, 7, 0.4, 'rgba(255,60,60,0.65)');
    },
    bat(ctx) {
      part(ctx, -5, -1, 7, 2, '#1a1a1a');             // обмотка рукояти
      for (let i = 0; i < 3; i++) R(ctx, -4.5 + i * 2.2, -1, 0.6, 2, '#3a3a3a');
      ctx.fillStyle = '#050407';
      ctx.beginPath(); ctx.moveTo(1.4, -1.7); ctx.lineTo(23.6, -3.6); ctx.quadraticCurveTo(26.6, 0, 23.6, 3.6); ctx.lineTo(1.4, 1.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a0622b';
      ctx.beginPath(); ctx.moveTo(2, -1); ctx.lineTo(23.4, -2.9); ctx.quadraticCurveTo(25.8, 0, 23.4, 2.9); ctx.lineTo(2, 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c88848';
      ctx.beginPath(); ctx.moveTo(2, -1); ctx.lineTo(23.4, -2.9); ctx.lineTo(23.4, -1.6); ctx.lineTo(2, -0.3); ctx.closePath(); ctx.fill();
      R(ctx, 14, -2.2, 0.6, 4.4, '#7a4a20');
      circ(ctx, -5.4, 0, 1.6, '#1a1a1a');
    },
    pipe(ctx) {
      part(ctx, -4, -1.4, 26, 2.8, '#7a7e86');
      R(ctx, -3.4, -1.4, 25, 0.9, '#b8bcc4');
      R(ctx, -3.4, 0.8, 25, 0.6, '#4a4e56');
      part(ctx, 18, -2.2, 4, 4.4, '#5a5e66');          // муфта
      part(ctx, -5, -2, 3, 4, '#5a5e66');
      ctx.globalAlpha = 0.5; R(ctx, 6, -1.4, 3, 2.8, '#6a3a1a'); R(ctx, 12, -1, 2, 2, '#6a3a1a'); ctx.globalAlpha = 1;
    },
    knife(ctx) {
      part(ctx, -5, -1.4, 6, 2.8, '#2a1a10');
      R(ctx, -4.4, -1.4, 5, 0.8, '#4a3020');
      circ(ctx, -3, 0, 0.5, '#c8c8c8'); circ(ctx, -1, 0, 0.5, '#c8c8c8');
      part(ctx, 1, -2.2, 1.2, 4.4, '#8a8a92');         // гарда
      ctx.fillStyle = '#050407';
      ctx.beginPath(); ctx.moveTo(2, -1.8); ctx.lineTo(10, -1.6); ctx.lineTo(13.4, 0.2); ctx.lineTo(2, 1.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8dce4';
      ctx.beginPath(); ctx.moveTo(2.4, -1.2); ctx.lineTo(10, -1); ctx.lineTo(12.4, 0.2); ctx.lineTo(2.4, 1.2); ctx.closePath(); ctx.fill();
      R(ctx, 2.6, -1.1, 7.4, 0.6, '#ffffff');
    },
    sword(ctx) {
      part(ctx, -7, -1.3, 7, 2.6, '#1a1020');
      for (let i = 0; i < 3; i++) R(ctx, -6.4 + i * 2.2, -1.3, 0.7, 2.6, '#5a3a8a');
      circ(ctx, -7.6, 0, 1.6, '#c8a040');
      part(ctx, -0.4, -4.6, 1.8, 9.2, '#c8a040');      // гарда
      ctx.fillStyle = '#050407';
      ctx.beginPath(); ctx.moveTo(1.6, -2); ctx.lineTo(27, -1.8); ctx.lineTo(31, 0); ctx.lineTo(27, 1.8); ctx.lineTo(1.6, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#dfe4f2';
      ctx.beginPath(); ctx.moveTo(2, -1.4); ctx.lineTo(27, -1.2); ctx.lineTo(30, 0); ctx.lineTo(27, 1.2); ctx.lineTo(2, 1.4); ctx.closePath(); ctx.fill();
      R(ctx, 2, -1.4, 25, 0.6, '#ffffff');
      R(ctx, 3, -0.15, 22, 0.3, '#9aa4c0');
    },
  };

  // Оружие боссов
  WEAPON_ART.cleaver = function (ctx) {
    part(ctx, -5, -1.4, 7, 2.8, '#2a1a10');
    R(ctx, -4.4, -1.4, 6, 0.8, '#4a3020');
    ctx.fillStyle = '#050407';
    ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(20, -3); ctx.lineTo(21, 9); ctx.lineTo(2, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c8ccd4';
    ctx.beginPath(); ctx.moveTo(2.6, -1.4); ctx.lineTo(19.4, -2.3); ctx.lineTo(20.2, 8.2); ctx.lineTo(2.6, 6.4); ctx.closePath(); ctx.fill();
    R(ctx, 3, 5, 17, 1, '#ffffff');
    circ(ctx, 6, 0.8, 1.2, '#050407');
    ctx.globalAlpha = 0.7; R(ctx, 10, 2, 5, 3, '#8a0010'); R(ctx, 15, 5, 3, 2, '#8a0010'); ctx.globalAlpha = 1;
  };
  WEAPON_ART.minigun = function (ctx) {
    metal(ctx, -6, -3, 12, 6, '#24242a', '#44444e');
    R(ctx, -4, -0.4, 8, 0.8, '#121216');
    line(ctx, -4, -3.4, 4, -3.4, 0.8, '#3a3a42');                 // ручка сверху
    for (const y of [-1.8, -0.6, 0.6, 1.8]) metal(ctx, 6, y - 0.4, 26, 0.8, '#18181c', '#34343c');
    metal(ctx, 6, -2.6, 2, 5.2, '#3a3a42', '#5a5a64');
    metal(ctx, 19, -2.6, 1.6, 5.2, '#3a3a42', '#5a5a64');
    metal(ctx, 31, -2.4, 2, 4.8, '#0e0e10', '#2a2a30');
    for (let i = 0; i < 4; i++) R(ctx, -5 + i * 1.3, 3, 0.8, 1.6, '#d0a040');  // лента
  };

  const WEAPON_META = {
    glock: { kind: 'pistol', muzzle: 12, eject: 6 }, uzi: { kind: 'smg', muzzle: 17, eject: 5 }, m4: { kind: 'rifle', muzzle: 28, eject: 5 },
    ak47: { kind: 'rifle', muzzle: 27, eject: 4 }, shotgun: { kind: 'rifle', muzzle: 30, eject: 3 }, sniper: { kind: 'rifle', muzzle: 36, eject: 6 },
    bat: { kind: 'melee', reach: 24, trail: '255,200,140' }, pipe: { kind: 'melee', reach: 22, trail: '200,210,230' },
    knife: { kind: 'melee', reach: 13, trail: '255,255,255' }, sword: { kind: 'melee', reach: 30, trail: '170,230,255' },
    cleaver: { kind: 'melee', reach: 22, trail: '255,80,80' }, minigun: { kind: 'rifle', muzzle: 34 },
  };

  function drawWeapon(ctx, id) {
    const f = WEAPON_ART[id];
    if (f) f(ctx);
  }

  // ---------- аптечка ----------
  function drawMedkit(ctx) {
    ctx.fillStyle = '#050407'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-9.6, -7.6, 19.2, 15.2, 2.5) : ctx.rect(-9.6, -7.6, 19.2, 15.2); ctx.fill();
    R(ctx, -9, -7, 18, 14, '#e8e8ec');
    R(ctx, -9, -7, 18, 2.2, '#ffffff');
    R(ctx, -9, 5, 18, 2, '#b8b8c2');
    R(ctx, -3.5, -10, 7, 3, '#050407'); R(ctx, -2.6, -9.4, 5.2, 2, '#c82a2a'); // ручка
    R(ctx, -1.8, -5, 3.6, 10, '#d81e2e');
    R(ctx, -5, -1.8, 10, 3.6, '#d81e2e');
    R(ctx, -1.8, -5, 3.6, 1, '#ff5a64');
    R(ctx, -8.4, -1, 1.4, 2, '#8a8a94'); R(ctx, 7, -1, 1.4, 2, '#8a8a94');  // защёлки
  }

  // ---------- позы рук для разных видов оружия ----------
  // Возвращает угол (относительно направления взгляда) руки с холодным оружием
  function meleeAngle(swing) {
    const READY = 0.95;
    if (!swing) return { a: READY, phase: 'idle', p: 0 };
    const p = swing.p, side = swing.side;
    const A = side > 0 ? 2.1 : -1.6;  // замах
    const B = side > 0 ? -1.5 : 2.0;  // удар до
    if (p < 0.22) return { a: READY + (A - READY) * ease(p / 0.22), phase: 'wind', p };
    if (p < 0.55) return { a: A + (B - A) * ease((p - 0.22) / 0.33), phase: 'strike', p, A, B };
    return { a: B + (READY - B) * ease((p - 0.55) / 0.45), phase: 'recover', p };
  }

  function drawMeleeTrail(ctx, shoulderX, shoulderY, swing, reach, color) {
    if (!swing || swing.p < 0.22 || swing.p > 0.7) return;
    const now = meleeAngle(swing).a;
    const tail = meleeAngle({ p: Math.max(0.22, swing.p - 0.2), side: swing.side }).a;
    const r0 = 9, r1 = 11 + reach;
    const fade = swing.p < 0.55 ? 1 : 1 - (swing.p - 0.55) / 0.15;
    const steps = 10;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < steps; i++) {
      const a0 = tail + (now - tail) * (i / steps), a1 = tail + (now - tail) * ((i + 1) / steps);
      const al = (i / steps) * 0.55 * fade;
      ctx.fillStyle = `rgba(${color},${al})`;
      ctx.beginPath();
      ctx.moveTo(shoulderX + Math.cos(a0) * r0, shoulderY + Math.sin(a0) * r0);
      ctx.lineTo(shoulderX + Math.cos(a0) * r1, shoulderY + Math.sin(a0) * r1);
      ctx.lineTo(shoulderX + Math.cos(a1) * r1, shoulderY + Math.sin(a1) * r1);
      ctx.lineTo(shoulderX + Math.cos(a1) * r0, shoulderY + Math.sin(a1) * r0);
      ctx.closePath(); ctx.fill();
    }
    // яркая кромка
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * fade})`; ctx.lineWidth = 1.2;
    ctx.beginPath();
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const a = tail + (now - tail) * (i / n);
      const x = shoulderX + Math.cos(a) * r1, y = shoulderY + Math.sin(a) * r1;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- гуманоид ----------
  // st: { t, walk, move, weaponId, swing:{p,side}|null, punch:{p,side}|null, recoil, flash, hurt }
  function drawHuman(ctx, L, st) {
    const t = st.t || 0;
    const move = st.move || 0;
    const walk = st.walk || 0;
    const b = L.bulk || 1;
    const meta = st.weaponId ? WEAPON_META[st.weaponId] : null;
    const kind = meta ? meta.kind : 'fists';

    // --- ноги ---
    const stride = 10 * move;
    for (const side of [-1, 1]) {
      const ph = walk + (side > 0 ? 0 : Math.PI);
      const fx = Math.sin(ph) * stride + (move < 0.1 ? 2 : 0);
      const lift = Math.max(0, Math.cos(ph)) * move;
      const hipY = side * 3.8 * b, footY = side * (4.6 + lift * 0.8) * b;
      line(ctx, -1, hipY, fx, footY, 6, '#050407');
      line(ctx, -1, hipY, fx, footY, 4.6, L.pants);
      line(ctx, -1, hipY - side * 1.2, fx, footY - side * 1.2, 1, 'rgba(255,255,255,0.16)');
      ell(ctx, fx + 2.4, footY, 4, 2.7, 0, '#050407');
      ell(ctx, fx + 2.4, footY, 3.3, 2.1, 0, L.shoes);
      R(ctx, fx + 1, footY - 1.4, 3, 0.7, 'rgba(255,255,255,0.28)');
    }

    // --- корпус с покачиванием ---
    ctx.save();
    ctx.rotate(Math.sin(walk) * 0.07 * move);
    const breathe = 1 + Math.sin(t * 2.2) * 0.018;
    drawTorso(ctx, L, breathe);

    const sR = { x: 0.8, y: 8.3 * b }, sL = { x: 0.8, y: -8.3 * b };
    const rec = (st.recoil || 0) * 3.2;

    if (kind === 'rifle') {
      ctx.save(); ctx.translate(6 - rec, 2.4); drawWeapon(ctx, st.weaponId); ctx.restore();
      arm(ctx, L, sR.x, sR.y, 6 - rec, 4.2, 1);
      arm(ctx, L, sL.x, sL.y, 16 - rec, 1.2, -1);
      if (st.flash) muzzleFlash(ctx, 6 - rec + meta.muzzle, 2.4, st.weaponId === 'shotgun' ? 1.5 : 1);
    } else if (kind === 'pistol' || kind === 'smg') {
      const gx = (kind === 'pistol' ? 11.5 : 10) - rec * 1.2;
      ctx.save(); ctx.translate(gx, 1.2); drawWeapon(ctx, st.weaponId); ctx.restore();
      arm(ctx, L, sR.x, sR.y, gx, 2.6, 1);
      arm(ctx, L, sL.x, sL.y, gx - 0.6, 0.4, -1);
      if (st.flash) muzzleFlash(ctx, gx + meta.muzzle, 1.2, kind === 'smg' ? 0.8 : 0.7);
    } else if (kind === 'melee') {
      const isKnife = st.weaponId === 'knife';
      let handX, handY, wa;
      if (isKnife && st.swing && st.swing.stab) {
        // выпад ножом
        const p = st.swing.p;
        const k = p < 0.3 ? -ease(p / 0.3) * 0.3 : p < 0.55 ? ease((p - 0.3) / 0.25) : 1 - ease((p - 0.55) / 0.45);
        handX = 8 + k * 9; handY = 4 - k * 2.4; wa = -0.08;
        if (p > 0.3 && p < 0.65) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - Math.abs(p - 0.48) * 5)})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(handX - 8, handY + 1); ctx.lineTo(handX + 16, handY - 1); ctx.stroke(); ctx.restore();
        }
      } else {
        const m = meleeAngle(st.swing);
        drawMeleeTrail(ctx, sR.x, sR.y, st.swing, meta.reach, meta.trail);
        const L2 = 10.5;
        handX = sR.x + Math.cos(m.a) * L2;
        handY = sR.y + Math.sin(m.a) * L2;
        wa = m.a + (m.phase === 'idle' ? -1.15 : -0.35);
      }
      arm(ctx, L, sL.x, sL.y, 8, -4.5, -1);          // вторая рука — у груди
      const hand = arm(ctx, L, sR.x, sR.y, handX, handY, 1);
      ctx.save(); ctx.translate(hand.hx, hand.hy); ctx.rotate(wa); drawWeapon(ctx, st.weaponId); ctx.restore();
      circ(ctx, hand.hx, hand.hy, 2.5, '#050407'); circ(ctx, hand.hx, hand.hy, 2.0, L.skin);
    } else {
      // кулаки: стойка и удары по очереди
      let rx = 7.5, ry = 5.2, lx = 7.5, ly = -5.2;
      if (st.punch) {
        const p = st.punch.p;
        const k = p < 0.4 ? ease(p / 0.4) : 1 - ease((p - 0.4) / 0.6);
        if (st.punch.side > 0) { rx += k * 10; ry -= k * 3.5; } else { lx += k * 10; ly += k * 3.5; }
      } else if (move > 0.2) {
        rx += Math.sin(walk) * 2 * move; lx -= Math.sin(walk) * 2 * move;
      }
      arm(ctx, L, sR.x, sR.y, rx, ry, 1);
      arm(ctx, L, sL.x, sL.y, lx, ly, -1);
      circ(ctx, rx, ry, 2.7, '#050407'); circ(ctx, rx, ry, 2.2, L.skin);
      circ(ctx, lx, ly, 2.7, '#050407'); circ(ctx, lx, ly, 2.2, L.skin);
      R(ctx, rx + 0.6, ry - 1, 1, 2, L.skinDk); R(ctx, lx + 0.6, ly - 1, 1, 2, L.skinDk);
    }

    drawHead(ctx, L, t);
    ctx.restore();

    if (st.hurt) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45;
      ell(ctx, 0, 0, 9 * b, 12 * b, 0, '#ff4060'); ctx.restore();
    }
  }

  function muzzleFlash(ctx, x, y, s) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = 9 * s;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,230,1)');
    g.addColorStop(0.35, 'rgba(255,210,90,0.9)');
    g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 3 * s); ctx.lineTo(x + r * 1.6, y); ctx.lineTo(x - 2, y + 3 * s);
    ctx.lineTo(x + r * 0.4, y + r * 0.9); ctx.lineTo(x + r * 0.2, y); ctx.lineTo(x + r * 0.4, y - r * 0.9);
    ctx.closePath(); ctx.fill();
    circ(ctx, x + 2, y, 3 * s, 'rgba(255,255,255,0.9)');
    ctx.restore();
  }

  // ---------- лежащее тело (мёртв / оглушён) ----------
  // st.pose: 'back' (на спине, руки раскинуты), 'side' (скрючился на боку), 'face' (лицом вниз),
  //         'crawl' (ползёт, st.crawl — фаза движения), а также st.stunned
  function drawHumanDown(ctx, L, st) {
    const r = rng(st.seed || 1);
    const stunned = !!st.stunned;
    const pose = stunned ? 'back' : (st.pose || 'back');
    const b = L.bulk || 1;
    const cr = st.crawl || 0;

    // ноги
    for (const side of [-1, 1]) {
      let fx, fy, kx = null, ky = null;
      if (pose === 'side') {
        kx = -8; ky = side * 2 + 5; fx = -12 + (side > 0 ? 3 : 0); fy = 9 + side;
      } else if (pose === 'crawl') {
        const k = Math.sin(cr + (side > 0 ? 0 : Math.PI));
        kx = -9 + k * 2; ky = side * (5 + k * 1.5); fx = -16 + k * 3; fy = side * (4 + Math.max(0, k) * 2);
      } else {
        const spread = stunned ? 2 : 3 + r() * 3;
        fx = -15 - r() * 3; fy = side * (spread + r() * 2);
      }
      if (kx !== null) {
        line(ctx, -5, side * 3 * b, kx, ky, 5.6, '#050407'); line(ctx, kx, ky, fx, fy, 5.2, '#050407');
        line(ctx, -5, side * 3 * b, kx, ky, 4.4, L.pants); line(ctx, kx, ky, fx, fy, 4, L.pants);
      } else {
        line(ctx, -5, side * 3 * b, fx, fy, 5.6, '#050407');
        line(ctx, -5, side * 3 * b, fx, fy, 4.4, L.pants);
      }
      ell(ctx, fx - 1.6, fy, 2.4, 2.8, 0, L.shoes);
    }
    // корпус
    ell(ctx, 0, 0, 9 * b + 0.8, 7 * b + 0.8, 0, '#050407');
    ell(ctx, 0, 0, 9 * b, 7 * b, 0, L.jacketDk);
    ell(ctx, 0.4, -0.4, 8 * b, 6 * b, 0, L.jacket);
    if (pose !== 'face' && pose !== 'crawl' && (L.collar === 'suit' || L.collar === 'shirt' || L.collar === 'jacket' || L.collar === 'bomber' || L.collar === 'dress')) {
      ctx.fillStyle = L.shirt; ctx.beginPath(); ctx.moveTo(2, -2.4); ctx.lineTo(8, 0); ctx.lineTo(2, 2.4); ctx.fill();
    }
    if (pose === 'face' || pose === 'crawl') { ctx.globalAlpha = 0.25; ell(ctx, -1, 0, 6, 4, 0, '#000'); ctx.globalAlpha = 1; }
    if (L.collar === 'armor') { R(ctx, -5, -4.5, 10, 9, '#22241f'); R(ctx, -4.4, -4, 8.8, 3.4, '#2e3228'); }
    if (L.blood || pose !== 'back') { ctx.globalAlpha = 0.8; circ(ctx, -1, 2, 2.4, '#5a0010'); circ(ctx, 2, -2, 1.6, '#5a0010'); ctx.globalAlpha = 1; }

    // руки
    for (const side of [-1, 1]) {
      let hx, hy;
      if (pose === 'crawl') {
        // попеременно тянется руками вперёд
        const k = Math.sin(cr + (side > 0 ? Math.PI : 0));
        hx = 12 + k * 4; hy = side * (7 - Math.max(0, k) * 2);
      } else if (pose === 'face') {
        hx = 14 + r() * 3; hy = side * (5 + r() * 3);
      } else if (pose === 'side') {
        hx = 8 + side * 2; hy = 7 + side * 2;
      } else {
        const ang = stunned ? side * (0.25 + r() * 0.2) : side * (0.6 + r() * 1.2);
        hx = 4 + Math.cos(ang) * 14; hy = side * 6 + Math.sin(ang) * 10;
      }
      line(ctx, 3, side * 6 * b, hx, hy, 4.4, '#050407');
      line(ctx, 3, side * 6 * b, hx, hy, 3.2, L.jacket);
      circ(ctx, hx, hy, 2.2, (pose === 'crawl' && side > 0) ? '#8a1020' : L.skin);
    }
    // голова
    ctx.save(); ctx.translate(10, 0);
    ctx.rotate(stunned ? 0 : pose === 'side' ? 0.6 : pose === 'crawl' ? Math.sin(cr * 0.5) * 0.15 : (r() - 0.5) * 0.8);
    ctx.translate(-1.6, 0);
    if (pose === 'face' || pose === 'crawl') {
      // лицом вниз — видим затылок
      circ(ctx, 1.6, 0, 5.4, '#050407');
      circ(ctx, 1.6, 0, 4.9, L.hairStyle === 'bald' ? L.skin : (L.hairStyle === 'balaclava' ? (L.mask || '#0e0e10') : (L.hairStyle === 'helmet' ? L.helmet : L.hair)));
      ell(ctx, 1, -5.2, 1.3, 1.7, 0, L.skinDk); ell(ctx, 1, 5.2, 1.3, 1.7, 0, L.skinDk);
    } else drawHead(ctx, L, 0);
    ctx.restore();

    if (stunned) {
      // кружащиеся звёздочки
      const t = st.t || 0;
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * (TAU / 3);
        const sx = 10 + Math.cos(a) * 7, sy = Math.sin(a) * 4.5 - 1;
        star(ctx, sx, sy, 2.2, i % 2 ? '#ffd319' : '#ffffff');
      }
    }
  }

  function star(ctx, x, y, r, c) {
    ctx.fillStyle = c; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  // ---------- пёс ----------
  function drawDog(ctx, L, st) {
    const t = st.t || 0, move = st.move || 0, walk = st.walk || 0;
    const bite = st.bite || 0;
    // лапы (галоп)
    const legs = [[6, -3.6, 0], [6, 3.6, 0.5], [-8, -3.6, 2.6], [-8, 3.6, 3.1]];
    for (const [lx, ly, off] of legs) {
      const fx = lx + Math.sin(walk * 1.2 + off) * 6 * move;
      const fy = ly * 1.25;
      line(ctx, lx, ly, fx, fy, 3.4, '#050407');
      line(ctx, lx, ly, fx, fy, 2.4, L.coat);
      circ(ctx, fx + 0.8, fy, 1.6, L.tan);
    }
    // хвост
    const wag = Math.sin(t * (move > 0.2 ? 18 : 8)) * 3.5;
    line(ctx, -12, 0, -18, wag, 2.6, '#050407');
    line(ctx, -12, 0, -18, wag, 1.6, L.coat);
    // туловище
    const stretch = 1 + Math.sin(walk * 1.2) * 0.05 * move;
    ell(ctx, -2, 0, 12.4 * stretch, 6.4, 0, '#050407');
    ell(ctx, -2, 0, 11.6 * stretch, 5.6, 0, L.coat);
    ctx.globalAlpha = 0.25; ell(ctx, -3, -2, 8, 2, 0, '#ffffff'); ctx.globalAlpha = 1;
    ell(ctx, 4, 0, 4, 3.6, 0, L.tan);  // грудь
    ell(ctx, 4, 0, 3, 2.6, 0, L.coat);
    // ошейник с шипами
    ell(ctx, 7.4, 0, 1.4, 4.4, 0, L.collar);
    for (const sy of [-3.6, -1.2, 1.2, 3.6]) circ(ctx, 7.6, sy, 0.7, '#d0d0d8');
    // голова
    const hx = 11 + bite * 3;
    ell(ctx, hx, 0, 5.6, 4.6, 0, '#050407');
    ell(ctx, hx, 0, 5, 4, 0, L.coat);
    // уши
    ctx.fillStyle = L.coat;
    ctx.beginPath(); ctx.moveTo(hx - 2, -3); ctx.lineTo(hx - 4.4, -6.6); ctx.lineTo(hx + 0.6, -3.4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 2, 3); ctx.lineTo(hx - 4.4, 6.6); ctx.lineTo(hx + 0.6, 3.4); ctx.fill();
    // морда и пасть
    if (bite > 0.1) {
      ctx.fillStyle = '#5a0a14';
      ctx.beginPath(); ctx.moveTo(hx + 3, 0); ctx.lineTo(hx + 9, -3 * bite); ctx.lineTo(hx + 9, 3 * bite); ctx.fill();
      R(ctx, hx + 6, -2.4 * bite, 0.8, 1, '#ffffff'); R(ctx, hx + 6, 1.6 * bite, 0.8, 1, '#ffffff');
    }
    ell(ctx, hx + 4.6, -bite * 1.6, 3.2, 2.1, 0, L.tan);
    ell(ctx, hx + 4.6, bite * 1.6, 3.2, 2.1, 0, L.tan);
    circ(ctx, hx + 7.4, 0, 1.2, '#050407');
    circ(ctx, hx + 1.6, -2.1, 0.8, '#ff3030'); circ(ctx, hx + 1.6, 2.1, 0.8, '#ff3030');

    if (st.hurt) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ell(ctx, 0, 0, 14, 7, 0, '#ff4060'); ctx.restore(); }
  }

  function drawDogDown(ctx, L, st) {
    ell(ctx, 0, 0, 12, 6.4, 0, '#050407');
    ell(ctx, 0, 0, 11.2, 5.6, 0, L.coat);
    for (const [lx, ly] of [[5, 4], [7, 6], [-6, 4], [-4, 7]]) { line(ctx, lx - 2, 2, lx + 3, ly + 4, 2.4, L.coat); circ(ctx, lx + 3, ly + 4, 1.4, L.tan); }
    ell(ctx, 12, -1, 4.6, 3.8, 0.3, L.coat);
    ell(ctx, 16, 0, 2.8, 1.8, 0.3, L.tan);
    line(ctx, -11, 0, -17, 3, 1.6, L.coat);
    if (st.stunned) {
      const t = st.t || 0;
      for (let i = 0; i < 3; i++) { const a = t * 5 + i * (TAU / 3); star(ctx, 12 + Math.cos(a) * 6, -1 + Math.sin(a) * 4, 2, i % 2 ? '#ffd319' : '#fff'); }
    }
  }

  return { HEROES, enemyLook, drawHuman, drawHumanDown, drawDog, drawDogDown, drawWeapon, drawMedkit, WEAPON_META, muzzleFlash, star, rng };
})();
