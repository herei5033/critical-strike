// =====================================================================
// SAMSA KOMBAT — бойцы: внешность, характеристики и отрисовка.
// Каждый боец — «скелет» из сегментов (бедро, голень, плечо, предплечье),
// поверх которого рисуются одежда, руки и детальная голова.
// Рисуем в буфер вдвое меньшего размера и растягиваем без сглаживания —
// получается пиксель-арт в стиле остальной игры.
// =====================================================================

const KF = {
  asik: {
    name: 'АСИК', style: 'БОКСЁР', color: '#ff9a3a', pron: 'ЕГО',
    bio: 'Физрук колледжа и боксёр. Руки быстрее свистка.',
    feats: ['Самые быстрые и тяжёлые удары руками', 'Серия из четырёх ударов', 'Приём: рывок с апперкотом'],
    special: 'РЫВОК-АППЕРКОТ', fatality: 'ПОСЛЕДНИЙ СВИСТОК',
    speed: 228, punch: 1.3, kick: 0.8, reach: 1, armor: 1, combo: 4, cd: 3.2,
    look: {
      skin: '#e3a27e', skinDk: '#b06f50', hair: '#3a2a22', hairStyle: 'bald',
      top: '#1a1a26', topDk: '#0d0d16', shirt: '#eef2ff', tie: 'bow', tieC: '#7a1424',
      pants: '#16161f', shoes: '#0a0a0e', gloves: '#d81e2c', brow: '#2a1a14',
    },
  },
  gal: {
    name: 'ГАЛА', style: 'ПОДЖИГАТЕЛЬ', color: '#ff2a6d', pron: 'ЕГО',
    bio: 'Самый адекватный в коллективе — пока его не довести.',
    feats: ['Огненный шар с поджогом', 'Сбалансированный стиль', 'Подожжённый враг теряет здоровье'],
    special: 'ОГНЕННЫЙ ШАР', fatality: 'ЗАЖАРКА',
    speed: 214, punch: 1, kick: 1, reach: 1, armor: 1, combo: 3, cd: 2.6,
    look: {
      skin: '#e8a882', skinDk: '#b4745a', hair: '#141022', hairStyle: 'swept',
      glasses: 'thick', beard: 'goatee',
      top: '#7ec8f0', topDk: '#4f94c4', shirt: '#9ad8ff', tie: null,
      pants: '#2a3a5a', shoes: '#1a1a22', brow: '#141022',
    },
  },
  daur: {
    name: 'ДАУР', style: 'СТРЕЛОК', color: '#ffd319', pron: 'ЕГО',
    bio: 'Разбирается в технике и машинах. Сигара — для солидности.',
    feats: ['Очередь из Uzi издалека', 'Сильные удары ногами', 'Приём бьёт, даже если враг убегает'],
    special: 'ОЧЕРЕДЬ UZI', fatality: 'АРСЕНАЛ',
    speed: 216, punch: 0.95, kick: 1.2, reach: 1, armor: 1, combo: 3, cd: 3,
    look: {
      skin: '#e0a07c', skinDk: '#aa6c4e', hair: '#0e0a16', hairStyle: 'messy',
      cigar: true,
      top: '#1c1c28', topDk: '#0e0e16', shirt: '#f2f2f2', tie: null, tee: true,
      pants: '#1e2230', shoes: '#0c0c10', brow: '#0e0a16',
    },
  },
  dani: {
    name: 'ДАНИ', style: 'ТЕНЕВОЙ', color: '#b48aff', pron: 'ЕГО',
    bio: 'Работает тихо — и никогда не работает один.',
    feats: ['Самый быстрый на ногах', 'Телепорт за спину врага', 'Удар из тени нельзя заблокировать спереди'],
    special: 'ТЕНЕВОЙ ШАГ', fatality: 'ТЕНЕВОЙ СУД',
    speed: 246, punch: 1, kick: 0.95, reach: 1, armor: 1, combo: 3, cd: 3.4,
    look: {
      skin: '#dc9c78', skinDk: '#a8684c', hair: '#0c0a18', hairStyle: 'slick',
      glasses: 'thin',
      top: '#1a1830', topDk: '#0e0c1e', shirt: '#dfe6ff', tie: 'tie', tieC: '#1a1830',
      pants: '#14142a', shoes: '#08080e', brow: '#0c0a18',
    },
  },
  aseke: {
    name: 'АСЕКЕ', style: 'СИСАДМИН', color: '#7ab4ff', pron: 'ЕГО',
    bio: 'Видит всё через камеры. Бронежилет носит «на всякий случай».',
    feats: ['Электрокабель бьёт через полэкрана', 'Бронежилет: −15% урона', 'Медленный, но тяжёлый'],
    special: 'ЭЛЕКТРОКАБЕЛЬ', fatality: 'ПЕРЕЗАГРУЗКА',
    speed: 192, punch: 1.1, kick: 1.05, reach: 1, armor: 0.85, combo: 3, cd: 3,
    look: {
      skin: '#d8986e', skinDk: '#a2643e', hair: '#141016', hairStyle: 'cap', cap: '#121218',
      glasses: 'thin', beard: 'mustache', earpiece: true,
      top: '#1e3a8a', topDk: '#12245c', shirt: '#eef4ff', tie: 'tie', tieC: '#0c0c10', vest: '#3a3a22',
      pants: '#14182a', shoes: '#0a0a0e', brow: '#141016',
    },
  },
  ulzhan: {
    name: 'УЛЖАН', style: 'СЕКРЕТАРЬ', color: '#ff7ad9', pron: 'ЕЁ',
    bio: 'Секретарь директора. Без её печати не уходит ни один приказ.',
    feats: ['Длинные быстрые удары ногами', 'Метает папку с приказом по дуге', 'Двойной удар ногой в серии'],
    special: 'ПАПКА С ПРИКАЗОМ', fatality: 'ПРИКАЗ ОБ УВОЛЬНЕНИИ',
    speed: 236, punch: 0.85, kick: 1.25, reach: 1.15, armor: 1, combo: 3, cd: 2.6,
    look: {
      skin: '#f0b892', skinDk: '#c08262', hair: '#6a3a1c', hairHi: '#a8622e', hairStyle: 'long',
      female: true, lips: '#d8506a',
      top: '#d41e3a', topDk: '#981428', shirt: '#2a0a12', tie: null,
      pants: '#1a1018', shoes: '#c01830', brow: '#3a2010',
    },
  },
};
const KF_IDS = ['asik', 'gal', 'daur', 'dani', 'aseke', 'ulzhan'];

// длины сегментов (в «единицах» арены)
const RIG = { thigh: 40, shin: 40, torso: 54, ua: 29, fa: 27 };

// ---------- позы ----------
// углы в радианах: 0 — вниз, плюс — вперёд (к сопернику).
// fs/fe — переднее плечо и локоть, bs/be — заднее; fh/fk, bh/bk — бёдра и колени.
const KPOSE = {
  stance: { lean: 0.08, head: 0.02, fs: 0.55, fe: 2.25, bs: 0.25, be: 2.45, fh: 0.3, fk: -0.3, bh: -0.28, bk: -0.08 },
  crouch: { lean: 0.3, head: -0.1, fs: 0.7, fe: 2.1, bs: 0.45, be: 2.3, fh: 1.25, fk: -2.0, bh: 0.5, bk: -1.9 },
  jump: { lean: 0.12, head: 0, fs: 0.9, fe: 1.9, bs: 0.4, be: 2.1, fh: 1.2, fk: -1.8, bh: 0.55, bk: -1.6 },
  jab: { lean: 0.2, head: 0.05, fs: 1.57, fe: 0.04, bs: 0.3, be: 2.4, fh: 0.38, fk: -0.25, bh: -0.38, bk: -0.04 },
  cross: { lean: 0.32, head: 0.08, fs: 0.6, fe: 2.2, bs: 1.6, be: 0.04, fh: 0.42, fk: -0.35, bh: -0.45, bk: 0 },
  hook: { lean: 0.28, head: 0.1, fs: 1.45, fe: 1.1, bs: 0.25, be: 2.4, fh: 0.36, fk: -0.3, bh: -0.4, bk: 0 },
  upper: { lean: -0.12, head: -0.15, fs: 2.95, fe: 0.15, bs: 0.2, be: 2.2, fh: 0.25, fk: -0.05, bh: -0.25, bk: 0 },
  kick: { lean: -0.38, head: 0.1, fs: 0.25, fe: 1.7, bs: -0.5, be: 1.5, fh: 1.78, fk: -0.04, bh: -0.12, bk: 0 },
  kick2: { lean: -0.55, head: 0.2, fs: -0.3, fe: 1.2, bs: -0.8, be: 1.2, fh: 2.25, fk: -0.1, bh: -0.08, bk: 0 },
  sweep: { lean: 0.4, head: -0.05, fs: 0.9, fe: 1.6, bs: 0.2, be: 1.8, fh: 1.5, fk: 0.02, bh: 0.65, bk: -2.3 },
  jkick: { lean: -0.22, head: 0.05, fs: 0.6, fe: 1.8, bs: 0.1, be: 2.0, fh: 1.35, fk: 0, bh: 0.35, bk: -1.7 },
  jpunch: { lean: 0.15, head: 0.05, fs: 1.15, fe: 0.05, bs: 0.3, be: 2.2, fh: 1.0, fk: -1.6, bh: 0.5, bk: -1.5 },
  block: { lean: -0.05, head: -0.12, fs: 1.15, fe: 2.15, bs: 0.95, be: 2.3, fh: 0.28, fk: -0.32, bh: -0.3, bk: -0.06 },
  cblock: { lean: 0.15, head: -0.15, fs: 1.15, fe: 2.15, bs: 0.95, be: 2.3, fh: 1.25, fk: -2.0, bh: 0.5, bk: -1.9 },
  hit: { lean: -0.42, head: -0.45, fs: -0.35, fe: 0.7, bs: -0.6, be: 0.5, fh: 0.2, fk: -0.15, bh: -0.35, bk: 0 },
  dizzy: { lean: -0.12, head: -0.3, fs: 0.15, fe: 0.3, bs: -0.1, be: 0.25, fh: 0.18, fk: -0.1, bh: -0.18, bk: -0.05 },
  win: { lean: -0.05, head: -0.12, fs: 3.05, fe: 0.25, bs: 0.25, be: 0.4, fh: 0.28, fk: -0.1, bh: -0.3, bk: 0 },
  throw: { lean: 0.35, head: 0.1, fs: 0.55, fe: 1.9, bs: 1.65, be: 0.06, fh: 0.45, fk: -0.4, bh: -0.5, bk: 0 },
  air: { lean: -0.6, head: -0.5, fs: -0.9, fe: 0.4, bs: -1.4, be: 0.3, fh: 0.5, fk: -0.4, bh: 0.1, bk: -0.2 },
};

function kLerpPose(a, b, k) {
  const o = {};
  for (const key in a) o[key] = a[key] + ((b[key] !== undefined ? b[key] : a[key]) - a[key]) * k;
  return o;
}

const KArt = {
  _buf: null, _bctx: null,
  BW: 150, BH: 150,          // буфер: 300×300 единиц при масштабе 0.5

  buf() {
    if (!this._buf) {
      this._buf = document.createElement('canvas');
      this._buf.width = this.BW; this._buf.height = this.BH;
      this._bctx = this._buf.getContext('2d');
    }
    return this._bctx;
  },

  // Положение суставов (бедро в начале координат, «вверх» — минус)
  joints(P) {
    const s = (a) => Math.sin(a), c = (a) => Math.cos(a);
    const tA = Math.PI - P.lean;
    const sh = [s(tA) * RIG.torso, c(tA) * RIG.torso];
    const neck = [sh[0] + s(tA - P.head * 0.3) * 7, sh[1] + c(tA - P.head * 0.3) * 7];
    const arm = (a0, e0, off) => {
      const a = a0 + P.lean * 0.6;
      const p0 = [sh[0] + off, sh[1] + 3];
      const p1 = [p0[0] + s(a) * RIG.ua, p0[1] + c(a) * RIG.ua];
      const p2 = [p1[0] + s(a + e0) * RIG.fa, p1[1] + c(a + e0) * RIG.fa];
      return [p0, p1, p2];
    };
    const leg = (h, k, off) => {
      const p0 = [off, 0];
      const p1 = [p0[0] + s(h) * RIG.thigh, p0[1] + c(h) * RIG.thigh];
      const sa = h + k;
      const p2 = [p1[0] + s(sa) * RIG.shin, p1[1] + c(sa) * RIG.shin];
      const p3 = [p2[0] + c(sa) * 15, p2[1] - s(sa) * 15 * 0.25];
      return [p0, p1, p2, p3];
    };
    return { sh, neck, tA, fa: arm(P.fs, P.fe, 2), ba: arm(P.bs, P.be, -3), fl: leg(P.fh, P.fk, 3), bl: leg(P.bh, P.bk, -3) };
  },

  // высота бедра над полом, чтобы нижняя ступня стояла на земле
  hipHeight(P) {
    const J = this.joints(P);
    return Math.max(J.fl[2][1], J.bl[2][1], J.fl[3][1], J.bl[3][1]) + 4;
  },

  seg(ctx, a, b, w, col, out = '#0a0612') {
    ctx.lineCap = 'round';
    ctx.strokeStyle = out; ctx.lineWidth = w + 4;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  },

  dot(ctx, p, r, col, out = '#0a0612') {
    ctx.fillStyle = out; ctx.beginPath(); ctx.arc(p[0], p[1], r + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
  },

  shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (s) => Math.min(255, Math.round(((n >> s) & 255) * k));
    return '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
  },

  // Полное тело. opt: { t, skeleton, noHead, burn (0..1 обугливание), alpha, shadow, handItem }
  drawBody(ctx, id, P, opt = {}) {
    const L = KF[id].look, J = this.joints(P), t = opt.t || 0;
    const char = opt.burn || 0;
    const col = (c) => char > 0 ? this._mix(c, '#140806', char) : c;
    if (opt.skeleton) { this.drawSkeleton(ctx, J, P, opt); return J; }
    const shadowLook = opt.shadow;
    const C = (c) => shadowLook ? shadowLook : col(c);
    const skin = C(L.skin), skinDk = C(L.skinDk);
    const out = shadowLook ? '#05020c' : '#0a0612';

    // волосы за спиной (длинные)
    if (L.hairStyle === 'long' && !opt.noHead) {
      const hc = this._headCenter(J, P);
      ctx.fillStyle = out;
      ctx.beginPath(); ctx.ellipse(hc[0] - 9, hc[1] + 12, 15, 25, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C(L.hair);
      ctx.beginPath(); ctx.ellipse(hc[0] - 9, hc[1] + 12, 13, 23, 0.15, 0, Math.PI * 2); ctx.fill();
    }

    // задняя рука
    const sleeveB = C(this.shadeIf(L.topDk));
    this.seg(ctx, J.ba[0], J.ba[1], 11, sleeveB, out);
    this.seg(ctx, J.ba[1], J.ba[2], 10, sleeveB, out);
    this._hand(ctx, J.ba[2], L, skinDk, out, C, true);

    // задняя нога
    const pantsB = C(this.shadeIf(L.pants, 0.75));
    this.seg(ctx, J.bl[0], J.bl[1], 14, pantsB, out);
    this.seg(ctx, J.bl[1], J.bl[2], 12, pantsB, out);
    this._shoe(ctx, J.bl[2], J.bl[3], C(L.shoes), out);

    // туловище
    this._torso(ctx, J, P, L, C, out);

    // передняя нога
    const pants = C(L.pants);
    this.seg(ctx, J.fl[0], J.fl[1], 15, pants, out);
    this.seg(ctx, J.fl[1], J.fl[2], 12, pants, out);
    this._shoe(ctx, J.fl[2], J.fl[3], C(L.shoes), out);

    // голова
    if (!opt.noHead) this.drawHead(ctx, id, this._headCenter(J, P), P.head - P.lean * 0.2, { t, C, out, look: L, shadow: !!shadowLook });
    else {
      // шея-обрубок
      ctx.fillStyle = '#7a0a10'; ctx.beginPath(); ctx.ellipse(J.neck[0], J.neck[1] - 2, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c01020'; ctx.beginPath(); ctx.ellipse(J.neck[0], J.neck[1] - 3, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }

    // передняя рука
    const sleeve = C(L.top);
    this.seg(ctx, J.fa[0], J.fa[1], 12, sleeve, out);
    this.seg(ctx, J.fa[1], J.fa[2], 11, sleeve, out);
    // манжета рубашки
    if (!L.gloves && !shadowLook) {
      const d = [J.fa[2][0] - J.fa[1][0], J.fa[2][1] - J.fa[1][1]], l = Math.hypot(d[0], d[1]) || 1;
      const cuff = [J.fa[2][0] - d[0] / l * 3, J.fa[2][1] - d[1] / l * 3];
      this.dot(ctx, cuff, 5, col(L.shirt), out);
    }
    this._hand(ctx, J.fa[2], L, skin, out, C, false);
    if (opt.handItem) opt.handItem(ctx, J.fa[2], J);
    return J;
  },

  shadeIf(c, k = 1) { return c; },

  _mix(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  },

  _headCenter(J, P) {
    const a = J.tA - P.head * 0.4;
    return [J.neck[0] + Math.sin(a) * 15 + 2, J.neck[1] + Math.cos(a) * 15];
  },

  _hand(ctx, p, L, skin, out, C, back) {
    if (L.gloves) { this.dot(ctx, p, back ? 8 : 9, C(back ? this.shade(L.gloves, 0.7) : L.gloves), out); return; }
    this.dot(ctx, p, 5.5, skin, out);
  },

  _shoe(ctx, a, b, col, out) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = out; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(a[0] - 2, a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(a[0] - 2, a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  },

  _torso(ctx, J, P, L, C, out) {
    const tA = J.tA, ux = Math.sin(tA), uy = Math.cos(tA);    // вверх по туловищу
    const nx = -uy, ny = ux;                                   // «вперёд» поперёк туловища
    const hipW = 15, shW = 20;
    const at = (k, side) => [J.sh[0] * k + nx * side, J.sh[1] * k + ny * side];
    const poly = (p, c, w = 0) => {
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
      ctx.closePath();
      if (w) { ctx.lineJoin = 'round'; ctx.strokeStyle = out; ctx.lineWidth = w; ctx.stroke(); }
      ctx.fillStyle = c; ctx.fill();
    };
    // силуэт: грудь вперёд, спина ровнее
    const body = [at(0, hipW), at(0.45, hipW + 1), at(0.8, shW + 2), at(1, shW - 3), at(1.04, 2), at(1, -shW + 4), at(0.7, -shW + 2), at(0.3, -hipW), at(0, -hipW)];
    poly(body, C(L.top), 5);
    // тень на спине и блик на груди
    poly([at(0, -hipW), at(0.3, -hipW), at(0.7, -shW + 2), at(1, -shW + 4), at(1, -shW + 11), at(0.6, -7), at(0, -6)], C(L.topDk));
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    { const a = at(0.85, shW - 3), b = at(0.5, hipW - 2); ctx.fillRect(Math.min(a[0], b[0]) - 1, a[1], 3, b[1] - a[1]); }
    if (L.tee) {
      poly([at(1, shW - 3), at(1, 6), at(0.7, 5), at(0.2, 8), at(0.2, hipW - 1), at(0.6, shW)], C(L.shirt));
      ctx.fillStyle = C(this.shade(L.shirt, 0.82)); { const q = at(0.98, 9); ctx.fillRect(q[0] - 4, q[1], 8, 2); }
    } else if (!L.female) {
      // рубашка между лацканами, воротник
      poly([at(1, shW - 3), at(1.02, 7), at(0.5, 13), at(0.62, shW)], C(L.shirt));
      poly([at(1.04, 8), at(0.92, 6), at(0.94, 13)], C(this.shade(L.shirt, 0.85)));
      if (L.tie === 'tie') poly([at(0.97, 14), at(0.97, 11), at(0.45, 12), at(0.38, 14.5), at(0.45, 17)], C(L.tieC));
      if (L.tie === 'bow') {
        const c0 = at(0.96, 15);
        poly([[c0[0] - 6, c0[1] - 4], [c0[0] + 6, c0[1] + 4], [c0[0] + 6, c0[1] - 4], [c0[0] - 6, c0[1] + 4]], C(L.tieC));
        ctx.fillStyle = C(this.shade(L.tieC, 0.7)); ctx.fillRect(c0[0] - 2, c0[1] - 2, 4, 4);
      }
      // лацкан и пуговицы
      ctx.strokeStyle = C(L.topDk); ctx.lineWidth = 2.5;
      ctx.beginPath(); const l0 = at(1, 7), l1 = at(0.5, 13); ctx.moveTo(l0[0], l0[1]); ctx.lineTo(l1[0], l1[1]); ctx.stroke();
      ctx.fillStyle = C(L.topDk);
      for (const kk of [0.38, 0.22]) { const q = at(kk, hipW - 2); ctx.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); }
    } else {
      // блейзер с вырезом и брошью
      poly([at(1, shW - 3), at(1.03, 7), at(0.6, 14)], C(L.skin));
      poly([at(0.8, 13), at(0.78, shW), at(0.6, shW - 1), at(0.6, 15)], C(L.shirt));
      ctx.fillStyle = C('#ffd319'); const b0 = at(0.42, hipW + 1); ctx.fillRect(b0[0] - 2, b0[1] - 2, 4, 4);
      ctx.strokeStyle = C(L.topDk); ctx.lineWidth = 2.5;
      ctx.beginPath(); const l0 = at(1, 7), l1 = at(0.55, 14); ctx.moveTo(l0[0], l0[1]); ctx.lineTo(l1[0], l1[1]); ctx.stroke();
    }
    // бронежилет с подсумками
    if (L.vest) {
      const v = [at(0.95, shW + 2), at(0.98, 3), at(0.95, -shW + 6), at(0.12, -hipW + 1), at(0.12, hipW + 2)];
      poly(v, C(L.vest), 4);
      ctx.fillStyle = C(this.shade(L.vest, 0.72));
      for (let i = 0; i < 3; i++) { const q = at(0.28 + i * 0.2, hipW - 1); ctx.fillRect(q[0] - 5, q[1] - 3, 9, 6); }
      ctx.fillStyle = C(this.shade(L.vest, 1.25)); { const q = at(0.9, 10); ctx.fillRect(q[0] - 7, q[1], 14, 3); }
    }
    // ремень с пряжкой
    if (!L.female) {
      const a = at(0.06, hipW), b = at(0.06, -hipW);
      ctx.strokeStyle = C('#0a0a0e'); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      const q = at(0.06, hipW - 4); ctx.fillStyle = C('#b8a060'); ctx.fillRect(q[0] - 2.5, q[1] - 2.5, 5, 5);
    }
  },

  // Голова в профиль-три-четверти (лицом вперёд = +x)
  drawHead(ctx, id, c, tilt, o) {
    const L = o.look || KF[id].look, C = o.C || ((x) => x), out = o.out || '#0a0612', t = o.t || 0;
    ctx.save();
    ctx.translate(c[0], c[1]);
    ctx.rotate(tilt * 0.5);
    ctx.scale(1.1, 1.1);
    const skin = C(L.skin), skinDk = C(L.skinDk);
    // шея
    ctx.fillStyle = out; ctx.fillRect(-7, 6, 14, 13);
    ctx.fillStyle = skinDk; ctx.fillRect(-5, 6, 10, 12);
    // голова и челюсть
    ctx.fillStyle = out; ctx.beginPath(); ctx.ellipse(0, -1, 14.5, 16.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, 7, 10, 8.5, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, -1, 12.5, 14.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, 7, 8, 6.5, 0.2, 0, Math.PI * 2); ctx.fill();
    // тени: затылок, скула, под челюстью
    ctx.fillStyle = skinDk;
    ctx.beginPath(); ctx.ellipse(-6, 1, 6.5, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.ellipse(3, 4, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-2, 11, 12, 3);
    ctx.globalAlpha = 1;
    if (o.shadow) {
      ctx.fillStyle = '#c8a0ff'; ctx.fillRect(6, -3, 4, 2);
      ctx.restore(); return;
    }
    // ухо
    ctx.fillStyle = out; ctx.beginPath(); ctx.ellipse(-5.5, 1.5, 3.6, 5.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(-5.5, 1.5, 2.4, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = skinDk; ctx.fillRect(-6, 0, 1.5, 3);
    // нос с тенью
    ctx.fillStyle = out; ctx.beginPath(); ctx.moveTo(11, -4); ctx.lineTo(16, 3.5); ctx.lineTo(11.5, 5.5); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(11, -3); ctx.lineTo(14.3, 3.2); ctx.lineTo(11, 4.6); ctx.fill();
    ctx.fillStyle = skinDk; ctx.fillRect(10, 4, 3, 1.5);
    // глаз: белок, зрачок, веко
    ctx.fillStyle = '#f4f0ea'; ctx.fillRect(5, -3.5, 5.5, 3);
    ctx.fillStyle = '#1a0a08'; ctx.fillRect(7.6, -3.5, 2.6, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(8.4, -3.3, 1, 1);
    ctx.fillStyle = C(this.shade(L.skinDk, 0.7)); ctx.fillRect(4.5, -4.6, 6.5, 1.2);
    ctx.globalAlpha = 0.5; ctx.fillRect(5, -0.4, 5, 1); ctx.globalAlpha = 1;
    if (L.female) { ctx.fillStyle = '#1a0a08'; ctx.fillRect(4.5, -5, 7, 1.4); ctx.fillRect(10.5, -6, 1.5, 2.2); ctx.fillStyle = 'rgba(230,110,140,0.35)'; ctx.fillRect(3, 2, 6, 3); }
    // бровь
    ctx.fillStyle = C(L.brow); ctx.beginPath(); ctx.moveTo(3.5, -6.5); ctx.lineTo(12.5, -8.2); ctx.lineTo(12.5, L.female ? -6.8 : -5.8); ctx.lineTo(3.5, -4.8); ctx.fill();
    // носогубная складка и рот
    ctx.strokeStyle = C(this.shade(L.skinDk, 0.85)); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(10, 5); ctx.quadraticCurveTo(7.5, 7.5, 8, 10); ctx.stroke();
    ctx.fillStyle = L.lips ? C(L.lips) : C(this.shade(L.skinDk, 0.7));
    ctx.fillRect(8, 9.2, 5.5, L.lips ? 2.4 : 1.6);
    // борода/усы
    if (L.beard === 'goatee') {
      ctx.fillStyle = C(L.hair);
      ctx.beginPath(); ctx.moveTo(6, 11.5); ctx.lineTo(13, 11); ctx.lineTo(11, 18.5); ctx.lineTo(6.5, 17.5); ctx.fill();
      ctx.fillRect(8.5, 7.6, 5, 1.2);
      ctx.globalAlpha = 0.22; ctx.fillRect(-1, 7, 9, 9); ctx.globalAlpha = 1;
    }
    if (L.beard === 'mustache') {
      ctx.fillStyle = C(L.hair);
      ctx.beginPath(); ctx.moveTo(7, 6.6); ctx.lineTo(14, 6.4); ctx.lineTo(14.5, 9); ctx.lineTo(12, 8.4); ctx.lineTo(7, 9.2); ctx.fill();
      ctx.globalAlpha = 0.28; ctx.fillRect(1, 9, 12, 8); ctx.globalAlpha = 1;
    }
    // очки
    if (L.glasses) {
      const thick = L.glasses === 'thick';
      ctx.fillStyle = 'rgba(170,225,255,0.3)'; ctx.fillRect(4, -5.6, 8.5, 6.2);
      ctx.strokeStyle = thick ? '#05030a' : '#5a6a88';
      ctx.lineWidth = thick ? 2.6 : 1.3;
      ctx.strokeRect(4, -5.6, 8.5, 6.2);
      ctx.beginPath(); ctx.moveTo(4, -3.5); ctx.lineTo(-4.5, -2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(5.2, -4.8, 2, 1.2);
    }
    // волосы
    const hair = C(L.hair), hi = C(L.hairHi || this.shade(L.hair, 2.4));
    ctx.fillStyle = hair;
    if (L.hairStyle === 'bald') {
      ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.ellipse(-2, -7, 12, 8, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(-12, -6, 6, 10); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-3, -14, 7, 2); ctx.fillRect(4, -12.5, 2, 1.5);
    } else if (L.hairStyle === 'slick') {
      // зачёс назад, короткие виски
      ctx.beginPath(); ctx.moveTo(-13, 2); ctx.quadraticCurveTo(-15, -14, -2, -16.5); ctx.quadraticCurveTo(10, -17, 13, -8);
      ctx.lineTo(10, -9.5); ctx.quadraticCurveTo(2, -12, -5, -8); ctx.lineTo(-7, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hi; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 5, -14 + i * 0.5); ctx.quadraticCurveTo(-2 + i * 5, -16, 6 + i * 3, -12); ctx.stroke(); }
    } else if (L.hairStyle === 'swept') {
      // объёмный зачёс вверх-назад (Гала)
      ctx.beginPath(); ctx.moveTo(-13, 3); ctx.quadraticCurveTo(-17, -15, -3, -19); ctx.quadraticCurveTo(10, -22, 15, -11);
      ctx.lineTo(11, -9); ctx.quadraticCurveTo(4, -12, -4, -9); ctx.lineTo(-7, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hi; ctx.lineWidth = 1.1;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 4, -12 - i); ctx.quadraticCurveTo(-3 + i * 4, -19, 9 + i, -15 + i); ctx.stroke(); }
    } else if (L.hairStyle === 'messy') {
      // растрёпанная чёлка на лоб (Даур)
      ctx.beginPath(); ctx.moveTo(-13, 3); ctx.quadraticCurveTo(-16, -15, -2, -17.5); ctx.quadraticCurveTo(11, -18, 14, -8);
      ctx.lineTo(12, -6); ctx.lineTo(9, -9); ctx.lineTo(7, -4.5); ctx.lineTo(4, -9); ctx.lineTo(1, -6); ctx.lineTo(-2, -10); ctx.lineTo(-7, 3); ctx.closePath(); ctx.fill();
      for (const [x0, y0, x1, y1] of [[-6, -17, -3, -22], [0, -18, 4, -22], [6, -16, 11, -19], [-11, -12, -15, -15]]) {
        ctx.beginPath(); ctx.moveTo(x0 - 2, y0 + 2); ctx.lineTo(x1, y1); ctx.lineTo(x0 + 3, y0 + 2); ctx.fill();
      }
      ctx.strokeStyle = hi; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-6, -13); ctx.quadraticCurveTo(2, -17, 8, -12); ctx.stroke();
    } else if (L.hairStyle === 'cap') {
      ctx.fillStyle = hair; ctx.fillRect(-12, -6, 6, 8);
      ctx.fillStyle = out; ctx.beginPath(); ctx.ellipse(-1, -8, 15.5, 11.5, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(-16.5, -9.5, 32, 5.5);
      ctx.fillStyle = C(L.cap); ctx.beginPath(); ctx.ellipse(-1, -8, 14, 10, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(-15, -9, 29, 3.5);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-6, -16, 8, 2);
      ctx.fillStyle = out; ctx.fillRect(7, -10.5, 17, 4.5);       // козырёк
      ctx.fillStyle = C(L.cap); ctx.fillRect(8, -9.8, 15, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(4, -6, 10, 1.5);
    } else if (L.hairStyle === 'long') {
      ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(-18, -14, -3, -18.5); ctx.quadraticCurveTo(12, -20, 15, -8);
      ctx.quadraticCurveTo(11, -3, 10, -1); ctx.quadraticCurveTo(8, -9, 2, -10); ctx.quadraticCurveTo(-3, -6, -6, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-14, -2); ctx.quadraticCurveTo(-20, 12, -12, 24); ctx.quadraticCurveTo(-6, 18, -6, 6); ctx.fill();
      ctx.strokeStyle = hi; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(-2, -5, 11, Math.PI * 1.08, Math.PI * 1.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-15, 2); ctx.quadraticCurveTo(-17, 12, -12, 20); ctx.stroke();
    }
    // наушник с проводом
    if (L.earpiece) {
      ctx.fillStyle = '#1a1a22'; ctx.fillRect(-7.5, 0, 4, 4);
      ctx.strokeStyle = '#d8e0ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-5.5, 4); ctx.quadraticCurveTo(-9, 12, -6, 20); ctx.stroke();
    }
    // сигара
    if (L.cigar) {
      ctx.fillStyle = out; ctx.fillRect(11, 8.5, 13, 5);
      ctx.fillStyle = '#7a4a22'; ctx.fillRect(12, 9.5, 11, 3);
      ctx.fillStyle = '#d8a050'; ctx.fillRect(14, 9.5, 2, 3);
      ctx.fillStyle = Math.sin(t * 9) > 0 ? '#ff7a20' : '#ffc040'; ctx.fillRect(23, 9.5, 2, 3);
    }
    ctx.restore();
  },

  // Рентген: кости поверх силуэта
  drawSkeleton(ctx, J, P, opt) {
    const bone = opt.boneColor || '#f4efe0', out = '#1a1410';
    const S = (a, b, w) => this.seg(ctx, a, b, w, bone, out);
    if (opt.xray) {
      ctx.fillStyle = 'rgba(80,180,255,0.35)';
      ctx.beginPath(); ctx.ellipse(J.sh[0] / 2, J.sh[1] / 2 - 10, 26, 60, 0, 0, Math.PI * 2); ctx.fill();
    }
    S(J.ba[0], J.ba[1], 4); S(J.ba[1], J.ba[2], 4);
    S(J.bl[0], J.bl[1], 5); S(J.bl[1], J.bl[2], 5);
    // позвоночник и рёбра
    S([0, 0], J.sh, 4);
    for (let i = 1; i <= 4; i++) {
      const k = 0.35 + i * 0.14, p = [J.sh[0] * k, J.sh[1] * k];
      ctx.strokeStyle = bone; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(p[0] - 11, p[1] + 2); ctx.quadraticCurveTo(p[0], p[1] - 4, p[0] + 11, p[1] + 2); ctx.stroke();
    }
    ctx.fillStyle = bone; ctx.beginPath(); ctx.ellipse(0, 2, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
    S(J.fl[0], J.fl[1], 5); S(J.fl[1], J.fl[2], 5);
    if (!opt.noHead) {
      const hc = this._headCenter(J, P);
      ctx.fillStyle = out; ctx.beginPath(); ctx.ellipse(hc[0], hc[1], 13, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = bone; ctx.beginPath(); ctx.ellipse(hc[0], hc[1], 11, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(hc[0] + 1, hc[1] + 6, 10, 8);
      ctx.fillStyle = '#1a1410'; ctx.fillRect(hc[0] + 4, hc[1] - 3, 5, 5); ctx.fillRect(hc[0] + 10, hc[1] + 3, 2, 3);
      for (let i = 0; i < 4; i++) ctx.fillRect(hc[0] + 2 + i * 2.5, hc[1] + 10, 1, 4);
    }
    S(J.fa[0], J.fa[1], 4); S(J.fa[1], J.fa[2], 4);
  },

  // Отрисовка бойца на экране: (x, y) — точка между ступнями на полу, k — масштаб, dir — куда смотрит
  render(ctx, id, P, x, y, k, dir, opt = {}) {
    const b = this.buf(), BW = this.BW, BH = this.BH;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, BW, BH);
    // в буфере бедро в точке (BW/2, BH*0.56), масштаб 0.5
    b.setTransform(0.5, 0, 0, 0.5, BW / 2, BH * 0.56);
    if (opt.rot) b.rotate(opt.rot);
    this.drawBody(b, id, P, opt);
    const hip = opt.hipH !== undefined ? opt.hipH : this.hipHeight(P);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
    // точка опоры — пол под бойцом: приплюснутый боец остаётся на полу
    ctx.translate(x, y - (opt.z || 0) * k);
    ctx.scale(dir * k * 2, k * 2 * (opt.squash || 1));
    const sx = -BW / 2, sy = -BH * 0.56 - hip * 0.5;
    if (opt.clip) {
      // разрез пополам: верх или низ по линии над бедром
      const cut = BH * 0.56 - (opt.clip.at || 14) / 2;
      if (opt.clip.part === 'top') { ctx.translate(opt.clip.dx || 0, opt.clip.dy || 0); ctx.rotate(opt.clip.rot || 0); ctx.drawImage(this._buf, 0, 0, BW, cut, sx, sy, BW, cut); }
      else ctx.drawImage(this._buf, 0, cut, BW, BH - cut, sx, sy + cut, BW, BH - cut);
    } else {
      if (opt.glow) { ctx.shadowColor = opt.glow; ctx.shadowBlur = 10; }
      ctx.drawImage(this._buf, sx, sy);
      ctx.shadowBlur = 0;
      if (opt.flash > 0) {
        // белая вспышка от удара: тот же силуэт поверх в режиме «осветление»
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha *= Math.min(1, opt.flash);
        ctx.drawImage(this._buf, sx, sy);
        ctx.drawImage(this._buf, sx, sy);
      }
    }
    ctx.restore();
  },

  // Портрет для экрана выбора: голова и плечи крупно
  portrait(ctx, id, x, y, size, t = 0) {
    const L = KF[id].look;
    ctx.save();
    ctx.translate(x, y);
    const k = size / 46;
    ctx.scale(k, k);
    // плечи
    ctx.fillStyle = '#0a0612';
    ctx.beginPath(); ctx.ellipse(0, 26, 25, 14, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = L.vest || L.top;
    ctx.beginPath(); ctx.ellipse(0, 27, 23, 12, 0, Math.PI, 0); ctx.fill();
    if (L.tee || !L.female) { ctx.fillStyle = L.shirt; ctx.beginPath(); ctx.moveTo(-5, 15); ctx.lineTo(5, 15); ctx.lineTo(0, 24); ctx.fill(); }
    if (L.tie === 'bow') { ctx.fillStyle = L.tieC; ctx.fillRect(-5, 15, 10, 4); }
    if (L.tie === 'tie') { ctx.fillStyle = L.tieC; ctx.fillRect(-1.5, 16, 3, 10); }
    if (L.hairStyle === 'long') { ctx.fillStyle = L.hair; ctx.beginPath(); ctx.ellipse(-6, 6, 16, 20, 0, 0, Math.PI * 2); ctx.fill(); }
    this.drawHead(ctx, id, [0, 0], 0, { t, look: L });
    ctx.restore();
  },
};
