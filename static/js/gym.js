// =====================================================================
// Корпоратив: «СПОРТЗАЛ» — передышка между этажами.
//  • без оружия и врагов: огромный мяч, у каждого игрока свои ворота;
//  • мяч ведётся телом (липнет к ногам при движении), ПРОБЕЛ — удар туда, куда смотрит прицел;
//  • вокруг поля — коллеги из колледжа, с ними можно поговорить (E);
//  • когда все нажали «ГОТОВ» (G) — команда идёт на следующий этаж.
// Мяч считает хост и рассылает его положение; клиенты присылают свои удары.
// =====================================================================

const GYM_LAYOUT = {
  id: 'gymbreak', name: 'СПОРТЗАЛ', sub: 'Передышка между этажами', color: '#3fff7f', seed: 515151,
  density: 0, mix: { tank: 0, hound: 0, sniper: 0 }, weapons: [], start: 0, bossRoom: -1,
  rooms: [{ x: 4, y: 6, w: 34, h: 20, type: 'gym', name: 'Спортзал' }],
  links: [],
};

const GYM_BALL_R = 11;
const GYM_KICK = 760;

// Коллеги у поля: внешность для спрайта и что они говорят
const GYM_NPCS = [
  { id: 'asik', look: { skin: '#e3a27e', skinDk: '#b06f50', hair: '#3a2a22', hairStyle: 'bald', jacket: '#1a1a26', jacketDk: '#0d0d16', shirt: '#eef2ff', pants: '#16161f', shoes: '#0a0a0e', collar: 'suit', tie: '#7a1424' },
    spot: [0.5, 0], sit: false, lines: ['Свисток у меня. Играем честно!', 'Пас! Пас давай!', 'Вот это удар, почти как у меня на ринге.', 'Разминка закончена — теперь работаем ногами.'] },
  { id: 'meka', look: { skin: '#d8986e', skinDk: '#a2643e', hair: '#141016', jacket: '#1a6a3a', jacketDk: '#0e3a20', shirt: '#1a6a3a', pants: '#14181a', shoes: '#f0f0f0', collar: 'track', stripes: '#f0f0f0' },
    spot: [0.22, 0], sit: false, lines: ['Ворота держи низко!', 'Корпус над мячом — и он твой.', 'Неплохо. Но в сборную пока не возьму.'] },
  { id: 'nurzhan', look: { skin: '#d49a72', skinDk: '#a06842', hair: '#2a2a30', jacket: '#7a1a1a', jacketDk: '#3a0a0a', shirt: '#7a1a1a', pants: '#14141a', shoes: '#e8e8e8', collar: 'track', stripes: '#ffffff' },
    spot: [0.78, 0], sit: false, lines: ['В моё время мяч был тяжелее.', 'Отдохните, бойцы. Этаж никуда не денется.', 'Главное в футболе — не забыть, где свои ворота.'] },
  { id: 'ulzhan', look: { skin: '#f0b892', skinDk: '#c08262', hair: '#6a3a1c', hairHi: '#a8622e', jacket: '#d41e3a', jacketDk: '#981428', shirt: '#2a0a12', pants: '#1a1018', shoes: '#c01830', collar: 'suit' },
    spot: [0.18, 1], sit: true, lines: ['Мальчики, только окна не разбейте!', 'Я веду счёт. И пишу протокол.', 'Директор спросит — скажу, что это тимбилдинг.'] },
  { id: 'aseke', look: { skin: '#d8986e', skinDk: '#a2643e', hair: '#141016', hairStyle: 'cap', cap: '#121218', glasses: 'thin', jacket: '#1e3a8a', jacketDk: '#12245c', shirt: '#eef4ff', pants: '#14182a', shoes: '#0a0a0e', collar: 'armor' },
    spot: [0.38, 1], sit: true, lines: ['Камеры включены. Повтор голов — у меня.', 'Wi-Fi тут ловит лучше, чем в 324.', 'Старые мячи, кстати, были лучше.'] },
  { id: 'symbat', look: { skin: '#f0bc98', skinDk: '#c08a66', hair: '#1a1014', jacket: '#eef2f4', jacketDk: '#c8d0d4', shirt: '#7ab4ff', pants: '#2a2a3a', shoes: '#1a1a1a', collar: 'shirt' },
    spot: [0.6, 1], sit: true, lines: ['Ассистирую судье. Неофициально.', 'Я за всех болею. Дипломатично.', 'Чай будет после второго тайма.'] },
  { id: 'ereke', look: { skin: '#cf9268', skinDk: '#9c603c', hair: '#141016', jacket: '#4a5a2a', jacketDk: '#2a3418', shirt: '#4a5a2a', pants: '#2a3018', shoes: '#141414', collar: 'jacket' },
    spot: [0.82, 1], sit: true, lines: ['Футбол — та же тактика. Фланги, прикрытие.', 'После передышки — снова в строй.', 'Дыхание ровное! Как на полигоне.'] },
  { id: 'amir', look: { skin: '#dca07a', skinDk: '#a86e4c', hair: '#141218', glasses: 'thin', jacket: '#3a3a44', jacketDk: '#1a1a22', shirt: '#e0e0e8', pants: '#1a1a22', shoes: '#0a0a0e', collar: 'suit', tie: '#2a2a6a' },
    spot: [0.06, 0.5], sit: false, lines: ['Хороший пас — как хороший код: коротко и по делу.', 'Я тут как старший преподаватель. Наблюдаю.', 'После игры жду всех на совещании. Шучу.'] },
];

class GymBreak {
  constructor(game) {
    this.g = game;
    const r = game.level.rooms[0];
    this.room = r;
    // поле: вся ширина зала, сверху и снизу по две клетки — места для зрителей
    this.fx0 = (r.x + 1) * TILE + 8; this.fx1 = (r.x + r.w - 1) * TILE - 8;
    this.fy0 = (r.y + 3) * TILE; this.fy1 = (r.y + r.h - 3) * TILE;
    this.cx = (this.fx0 + this.fx1) / 2; this.cy = (this.fy0 + this.fy1) / 2;
    this.ball = { x: this.cx, y: this.cy, vx: 0, vy: 0, rot: 0 };
    this.scores = {}; this.ready = new Set(); this.lastTouch = null; this.resetT = 0;
    this.kickCd = 0; this.t = 0; this.msg = null;
    this.npcs = GYM_NPCS.map(n => ({ ...n, x: 0, y: 0, say: null, sayT: 0, ph: Math.random() * 6 }));
    for (const n of this.npcs) {
      const [fx, fy] = n.spot;
      if (fy === 0.5) { n.x = this.fx0 + 30; n.y = (r.y + 2) * TILE; }
      else { n.x = this.fx0 + (this.fx1 - this.fx0) * fx; n.y = fy === 0 ? (r.y + 1.6) * TILE : (r.y + r.h - 1.6) * TILE; }
      n.face = fy === 0 ? Math.PI / 2 : fy === 1 ? -Math.PI / 2 : 0;
    }
    this._buildGoals();
  }

  // свои ворота у каждого: двое — слева и справа, трое — ещё одни сверху
  _buildGoals() {
    const C = this.g.coop, ps = C ? C.players.slice().sort((a, b) => a.slot - b.slot) : [{ pid: 'host', name: 'ВЫ', slot: 0 }];
    const gw = 120;
    const sides = ['left', 'right', 'top'];
    this.goals = [];
    const list = ps.length >= 2 ? ps : [ps[0], { pid: null, name: 'ТРЕНИРОВКА', slot: 1 }];
    list.slice(0, 3).forEach((p, i) => {
      const side = sides[i];
      let rect;
      if (side === 'left') rect = { x: this.fx0 - 4, y: this.cy - gw / 2, w: 26, h: gw };
      else if (side === 'right') rect = { x: this.fx1 - 22, y: this.cy - gw / 2, w: 26, h: gw };
      else rect = { x: this.cx - gw / 2, y: this.fy0 - 4, w: gw, h: 26 };
      this.goals.push({ side, rect, pid: p.pid, name: p.name, slot: p.slot });
      if (p.pid) this.scores[p.pid] = this.scores[p.pid] || 0;
    });
  }

  myPid() { const C = this.g.coop; return C ? (C.isHost ? 'host' : C.pid) : 'host'; }
  isHost() { return !this.g.coop || this.g.coop.isHost; }

  // все игроки на поле: свой герой и напарники (с их скоростью)
  _bodies(dt) {
    const out = [];
    const add = (pid, p) => {
      if (!p || p.dead || p.x === undefined) return;
      const x = p.x + 9, y = p.y + 9, prev = p._gymPrev || { x, y };
      p._gymPrev = { x, y };
      out.push({ pid, p, x, y, vx: (x - prev.x) / Math.max(dt, 0.001), vy: (y - prev.y) / Math.max(dt, 0.001) });
    };
    add(this.myPid(), this.g.player);
    if (this.g.coop) for (const [pid, rp] of this.g.coop.remotes) if (rp.hasState) add(pid, rp);
    return out;
  }

  _kickAngle() {
    const p = this.g.player, cam = this.g.cam;
    if (Input.touch.aimActive) return Math.atan2(Input.touch.aimY, Input.touch.aimX);
    if (Input.touch.moveActive) return Math.atan2(Input.touch.moveY, Input.touch.moveX);
    if (Input.isMobile) return p.angle;
    const mx = cam.x + Input.mouse.x / cam.zoom, my = cam.y + Input.mouse.y / cam.zoom;
    return Math.atan2(my - (p.y + 9), mx - (p.x + 9));
  }

  _kick(pid, ang, bx, by) {
    const b = this.ball;
    if (Utils.dist(b.x, b.y, bx, by) > GYM_BALL_R + 34) return false;
    b.vx = Math.cos(ang) * GYM_KICK; b.vy = Math.sin(ang) * GYM_KICK;
    this.lastTouch = pid;
    AudioSys.play('punch', 0.7);
    Effects.ring(b.x, b.y, '255,255,255', 20);
    return true;
  }

  update(dt) {
    this.t += dt;
    const g = this.g, C = g.coop, p = g.player;
    this.kickCd = Math.max(0, this.kickCd - dt);
    // удар по мячу
    if (p && !p.dead && Input.wasPressed('Space') && this.kickCd <= 0) {
      this.kickCd = 0.25;
      const ang = this._kickAngle();
      if (this.isHost()) this._kick(this.myPid(), ang, p.x + 9, p.y + 9);
      else { if (g.coopUI.net) g.coopUI.net.send('host', { t: 'gk', a: +ang.toFixed(3) }); this._predictKick(ang); }
    }
    // готов
    if (Input.wasPressed('KeyG') && !TextField.active) {
      const me = this.myPid(), v = !this.ready.has(me);
      if (v) this.ready.add(me); else this.ready.delete(me);
      AudioSys.play(v ? 'menu_select' : 'menu_move');
      if (!this.isHost() && g.coopUI.net) g.coopUI.net.send('host', { t: 'gr', v: v ? 1 : 0 });
    }
    // разговор с коллегой
    this.nearNpc = null;
    if (p) for (const n of this.npcs) if (Utils.dist(n.x, n.y, p.x + 9, p.y + 9) < 46) this.nearNpc = n;
    if (this.nearNpc && Input.wasPressed('KeyE')) {
      const n = this.nearNpc;
      n.i = ((n.i === undefined ? -1 : n.i) + 1) % n.lines.length;
      n.say = n.lines[n.i]; n.sayT = 0;
      AudioSys.play('menu_move', 0.6);
    }
    for (const n of this.npcs) { n.sayT += dt; if (n.sayT > 4) n.say = null; }
    if (this.msg) { this.msg.t += dt; if (this.msg.t > 2) this.msg = null; }

    if (this.isHost()) this._simulate(dt);
    else this._follow(dt);

    // хост: все готовы — следующий этаж
    if (this.isHost() && C) {
      const all = C.players.length;
      if (this.ready.size >= all && all > 0 && !this._leaving) {
        this._leaving = true;
        C.levelNo++;
        C.seed = (Math.random() * 2e9) | 0;
        g.startCoopLevel(C.seed);
        return;
      }
      this._sendT = (this._sendT || 0) - dt;
      if (this._sendT <= 0) {
        this._sendT = 1 / 30;
        const b = this.ball;
        g.coopUI.net && g.coopUI.net.broadcast({ t: 'gb', b: [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy)], sc: this.scores, rd: [...this.ready], lt: this.lastTouch, m: this.msg ? [this.msg.text, this.msg.col, this._msgId] : null }, true);
      }
    }
  }

  _simulate(dt) {
    const b = this.ball;
    if (this.resetT > 0) {
      this.resetT -= dt;
      if (this.resetT <= 0) { b.x = this.cx; b.y = this.cy; b.vx = b.vy = 0; Effects.ring(b.x, b.y, '255,255,255', 30); }
      return;
    }
    // ведение мяча: игрок толкает его корпусом, при движении мяч «прилипает» к ногам
    for (const body of this._bodies(dt)) {
      const dx = b.x - body.x, dy = b.y - body.y, d = Math.hypot(dx, dy) || 0.001;
      const minD = GYM_BALL_R + 11;
      const sp = Math.hypot(body.vx, body.vy);
      if (d < minD) {
        const nx = dx / d, ny = dy / d;
        b.x = body.x + nx * minD; b.y = body.y + ny * minD;
        const rel = b.vx * nx + b.vy * ny;
        if (rel < sp) { b.vx += nx * (sp * 1.1 - rel); b.vy += ny * (sp * 1.1 - rel); }
        this.lastTouch = body.pid;
      } else if (d < minD + 14 && sp > 40) {
        // мяч впереди по ходу — мягко тянем его за игроком
        const mx = body.vx / sp, my = body.vy / sp;
        if (dx * mx + dy * my > 0) {
          const tx = body.x + mx * (minD + 2), ty = body.y + my * (minD + 2);
          const k = Math.min(1, dt * 10);
          b.x += (tx - b.x) * k; b.y += (ty - b.y) * k;
          b.vx += (body.vx - b.vx) * k; b.vy += (body.vy - b.vy) * k;
          this.lastTouch = body.pid;
        }
      }
    }
    this._move(dt);
    // гол?
    for (const gl of this.goals) {
      const r = gl.rect;
      if (b.x > r.x && b.x < r.x + r.w && b.y > r.y && b.y < r.y + r.h) { this._goal(gl); break; }
    }
  }

  _move(dt) {
    const b = this.ball;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.vx *= Math.exp(-dt * 1.1); b.vy *= Math.exp(-dt * 1.1);
    b.rot += Math.hypot(b.vx, b.vy) * dt / GYM_BALL_R;
    const inGoalMouth = (side) => this.goals.some(gl => gl.side === side && (side === 'top' ? Math.abs(b.x - this.cx) < gl.rect.w / 2 : Math.abs(b.y - this.cy) < gl.rect.h / 2));
    if (b.x < this.fx0 + GYM_BALL_R && !inGoalMouth('left')) { b.x = this.fx0 + GYM_BALL_R; b.vx = Math.abs(b.vx) * 0.8; }
    if (b.x > this.fx1 - GYM_BALL_R && !inGoalMouth('right')) { b.x = this.fx1 - GYM_BALL_R; b.vx = -Math.abs(b.vx) * 0.8; }
    if (b.y < this.fy0 + GYM_BALL_R && !inGoalMouth('top')) { b.y = this.fy0 + GYM_BALL_R; b.vy = Math.abs(b.vy) * 0.8; }
    if (b.y > this.fy1 - GYM_BALL_R) { b.y = this.fy1 - GYM_BALL_R; b.vy = -Math.abs(b.vy) * 0.8; }
    b.x = Utils.clamp(b.x, this.fx0 - 20, this.fx1 + 20); b.y = Utils.clamp(b.y, this.fy0 - 20, this.fy1);
  }

  _goal(gl) {
    const who = this.lastTouch, C = this.g.coop;
    const name = (pid) => { if (!C) return 'ВЫ'; const pl = C.players.find(q => q.pid === pid); return pl ? pl.name : '?'; };
    let text, col = '#3dff8a';
    if (who && who !== gl.pid && this.scores[who] !== undefined) { this.scores[who]++; text = `ГОЛ! ${name(who)}`; }
    else if (who && who === gl.pid) { text = `АВТОГОЛ — ${name(who)}`; col = '#ff4060'; }
    else text = 'ГОЛ!';
    this._showMsg(text, col);
    this.resetT = 1.2;
    this.ball.vx = this.ball.vy = 0;
  }

  _showMsg(text, col) {
    this.msg = { text, col, t: 0 };
    this._msgId = (this._msgId || 0) + 1;
    AudioSys.play('game_start', 0.7);
    Effects.screenFlash(0.12, '255,255,255');
  }

  // клиент: мяч от хоста + свой удар показываем сразу
  _predictKick(ang) {
    const p = this.g.player, b = this.ball;
    if (Utils.dist(b.x, b.y, p.x + 9, p.y + 9) > GYM_BALL_R + 34) return;
    b.vx = Math.cos(ang) * GYM_KICK; b.vy = Math.sin(ang) * GYM_KICK;
    this._predT = 0.15;
    AudioSys.play('punch', 0.7);
  }

  _follow(dt) {
    const b = this.ball, n = this._net;
    this._predT = Math.max(0, (this._predT || 0) - dt);
    if (n && this._predT <= 0) {
      const k = Math.min(1, dt * 14);
      b.x += (n[0] - b.x) * k; b.y += (n[1] - b.y) * k; b.vx = n[2]; b.vy = n[3];
    } else this._move(dt);
    b.rot += Math.hypot(b.vx, b.vy) * dt / GYM_BALL_R;
  }

  onNet(pid, m) {
    if (m.t === 'gk' && this.isHost()) {
      const rp = this.g.coop.remotes.get(pid);
      if (rp) this._kick(pid, m.a, rp.x + 9, rp.y + 9);
    } else if (m.t === 'gr' && this.isHost()) {
      if (m.v) this.ready.add(pid); else this.ready.delete(pid);
    } else if (m.t === 'gb' && !this.isHost()) {
      this._net = m.b; this.scores = m.sc || {}; this.ready = new Set(m.rd || []); this.lastTouch = m.lt;
      if (m.m && m.m[2] !== this._seenMsg) { this._seenMsg = m.m[2]; this._showMsg(m.m[0], m.m[1]); }
    }
  }

  // ---------- отрисовка в мире ----------
  drawWorld(ctx) {
    const t = this.t;
    // разметка поля
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    ctx.strokeRect(this.fx0, this.fy0, this.fx1 - this.fx0, this.fy1 - this.fy0);
    ctx.beginPath(); ctx.moveTo(this.cx, this.fy0); ctx.lineTo(this.cx, this.fy1); ctx.stroke();
    ctx.beginPath(); ctx.arc(this.cx, this.cy, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(this.cx, this.cy, 4, 0, Math.PI * 2); ctx.fill();
    // ворота
    for (const gl of this.goals) {
      const r = gl.rect, col = SLOT_COLORS[gl.slot % 3] || '#ffffff';
      ctx.fillStyle = col + '33'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.shadowColor = col; ctx.shadowBlur = 12;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
      for (let i = 6; i < Math.max(r.w, r.h); i += 8) {
        ctx.beginPath();
        if (r.h > r.w) { ctx.moveTo(r.x, r.y + i); ctx.lineTo(r.x + r.w, r.y + i); } else { ctx.moveTo(r.x + i, r.y); ctx.lineTo(r.x + i, r.y + r.h); }
        ctx.stroke();
      }
      ctx.font = 'bold 12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = col;
      const lx = gl.side === 'left' ? r.x + 50 : gl.side === 'right' ? r.x - 26 : r.x + r.w / 2, ly = gl.side === 'top' ? r.y + r.h + 16 : r.y - 8;
      ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(gl.name, lx, ly); ctx.fillText(gl.name, lx, ly);
    }
    ctx.restore();
    // коллеги у поля
    for (const n of this.npcs) {
      ctx.save(); ctx.translate(n.x, n.y);
      if (n.sit) { ctx.fillStyle = '#5a3a1c'; ctx.fillRect(-16, -2, 32, 12); ctx.fillStyle = '#3a2410'; ctx.fillRect(-16, 8, 32, 3); }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2, 4, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(n.face + Math.sin(t * 1.5 + n.ph) * 0.15); ctx.scale(1.1, 1.1);
      Sprites.drawHuman(ctx, n.look, { t: t + n.ph, walk: 0, move: 0 });
      ctx.restore();
      if (this.nearNpc === n) {
        ctx.font = 'bold 10px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd319';
        ctx.fillText(Input.isMobile ? 'ГОВОРИТЬ' : 'E — поговорить', n.x, n.y + 26);
      }
    }
    // мяч
    const b = this.ball;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(b.x + 3, b.y + 5, GYM_BALL_R, GYM_BALL_R * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(b.x, b.y); ctx.rotate(b.rot);
    ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.arc(0, 0, GYM_BALL_R + 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.arc(0, 0, GYM_BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a22';
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7, 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // реплики коллег и табло — в экранных координатах
  drawHud(ctx, W, H, s) {
    const g = this.g, cam = g.cam, C = g.coop;
    if (cam) for (const n of this.npcs) {
      if (!n.say) continue;
      const sx = (n.x - cam.x) * cam.zoom, sy = (n.y - cam.y) * cam.zoom - 22;
      Thoughts.bubble(ctx, g, sx, sy, `${(CAST[n.id] && CAST[n.id].name) || ''}: ${n.say}`, n.sayT, 4, (CAST[n.id] && CAST[n.id].color) || '#ffd319');
    }
    // табло
    const ps = C ? C.players.slice().sort((a, b) => a.slot - b.slot) : [];
    const bw = Math.min(460, W * 0.7), bh = 46 * s + 8, bx = W / 2 - bw / 2, by = (g._hudBottom ? 10 * s : 10 * s);
    ctx.save();
    ctx.fillStyle = 'rgba(6,10,8,0.82)'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#3fff7f'; ctx.lineWidth = 2; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(11 * s + 1)}px "Courier New", monospace`; ctx.fillStyle = '#3fff7f';
    ctx.fillText(`СПОРТЗАЛ · передышка перед этажом ${C ? C.levelNo + 1 : ''}`, W / 2, by + 14 * s);
    const n = Math.max(1, ps.length), cw = bw / n;
    ps.forEach((p, i) => {
      const x = bx + cw * i + cw / 2, rd = this.ready.has(p.pid);
      ctx.font = `bold ${Math.round(13 * s + 1)}px "Courier New", monospace`; ctx.fillStyle = SLOT_COLORS[p.slot % 3];
      ctx.fillText(`${p.name}  ${this.scores[p.pid] || 0}`, x, by + 32 * s, cw - 8);
      ctx.font = `${Math.round(10 * s + 1)}px "Courier New", monospace`; ctx.fillStyle = rd ? '#3dff8a' : 'rgba(255,255,255,0.5)';
      ctx.fillText(rd ? '✓ ГОТОВ' : 'ещё играет', x, by + 45 * s);
    });
    // подсказка
    ctx.font = `${Math.round(11 * s + 1)}px "Courier New", monospace`; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(Input.isMobile ? 'УДАР — по мячу · ГОТОВ — дальше · подойдите к коллегам, чтобы поговорить'
      : 'ПРОБЕЛ — удар по мячу (куда смотрит прицел) · G — готов · E — поговорить с коллегой', W / 2, H - 14, W - 20);
    // сообщение о голе
    if (this.msg) {
      const k = Math.min(1, this.msg.t * 6, (2 - this.msg.t) * 3);
      ctx.globalAlpha = Math.max(0, k);
      g.menu.glowText(ctx, this.msg.text, W / 2, H * 0.32, this.msg.col, Math.min(46, W * 0.06) * (1 + 0.2 * (1 - Math.min(1, this.msg.t * 4))), 'center', 20);
    }
    ctx.restore();
  }
}
