// =====================================================================
// Корпоратив: «СПОРТЗАЛ» — передышка между этажами.
//  • футбол 5 на 5: все живые игроки — в одной команде, остальных заменяет ИИ
//    (в каждой команде 4 полевых и вратарь);
//  • мяч ведётся корпусом, ПРОБЕЛ — пинок в сторону прицела: короткое нажатие — пас,
//    удержание — заряженный мощный удар; мяч перехватывает любой, кто его коснулся;
//  • SHIFT — бег (+30% без мяча, +20% с мячом); камера дальше на 15%;
//  • вокруг поля — коллеги из колледжа, с ними можно поговорить (E);
//  • когда все нажали «ГОТОВ» (G) — команда идёт на следующий этаж.
// Мяч и ИИ считает хост и рассылает их положение; клиенты присылают свои удары.
// =====================================================================

const GYM_LAYOUT = {
  id: 'gymbreak', name: 'СПОРТЗАЛ', sub: 'Передышка между этажами', color: '#3fff7f', seed: 515151,
  density: 0, mix: { tank: 0, hound: 0, sniper: 0 }, weapons: [], start: 0, bossRoom: -1,
  rooms: [{ x: 4, y: 5, w: 46, h: 26, type: 'gym', name: 'Спортзал' }],
  links: [],
};

const GYM_BALL_R = 5.5;
const GYM_KICK_MIN = 320, GYM_KICK_MAX = 1150, GYM_CHARGE = 0.9;
const GYM_AI_SPEED = 168;      // ИИ медленнее игроков (герой бежит 220–290)
const GYM_TEAM_COL = ['#2a7aff', '#ff3a3a'];

// Коллеги у поля: внешность для спрайта и что они говорят
const GYM_NPCS = [
  { id: 'asik', look: { skin: '#e3a27e', skinDk: '#b06f50', hair: '#3a2a22', hairStyle: 'bald', jacket: '#1a1a26', jacketDk: '#0d0d16', shirt: '#eef2ff', pants: '#16161f', shoes: '#0a0a0e', collar: 'suit', tie: '#7a1424' },
    spot: [0.5, 0], sit: false, lines: ['Свисток у меня. Играем честно!', 'Пас! Пас давай!', 'Вот это удар, почти как у меня на ринге.', 'Разминка закончена — теперь работаем ногами.'] },
  { id: 'meka', look: { skin: '#d8986e', skinDk: '#a2643e', hair: '#141016', jacket: '#1a6a3a', jacketDk: '#0e3a20', shirt: '#1a6a3a', pants: '#14181a', shoes: '#f0f0f0', collar: 'track', stripes: '#f0f0f0' },
    spot: [0.22, 0], sit: false, lines: ['Зажми пробел подольше — ударишь как из пушки.', 'Корпус над мячом — и он твой.', 'Пасуй! В футбол играют командой.'] },
  { id: 'nurzhan', look: { skin: '#d49a72', skinDk: '#a06842', hair: '#2a2a30', jacket: '#7a1a1a', jacketDk: '#3a0a0a', shirt: '#7a1a1a', pants: '#14141a', shoes: '#e8e8e8', collar: 'track', stripes: '#ffffff' },
    spot: [0.78, 0], sit: false, lines: ['В моё время мяч был тяжелее.', 'Shift — и рвёшь по флангу!', 'Главное в футболе — не забыть, где свои ворота.'] },
  { id: 'ulzhan', look: { skin: '#f0b892', skinDk: '#c08262', hair: '#6a3a1c', hairHi: '#a8622e', jacket: '#d41e3a', jacketDk: '#981428', shirt: '#2a0a12', pants: '#1a1018', shoes: '#c01830', collar: 'suit' },
    spot: [0.18, 1], sit: true, lines: ['Мальчики, только окна не разбейте!', 'Я веду счёт. И пишу протокол.', 'Директор спросит — скажу, что это тимбилдинг.'] },
  { id: 'aseke', look: { skin: '#d8986e', skinDk: '#a2643e', hair: '#141016', hairStyle: 'cap', cap: '#121218', glasses: 'thin', jacket: '#1e3a8a', jacketDk: '#12245c', shirt: '#eef4ff', pants: '#14182a', shoes: '#0a0a0e', collar: 'armor' },
    spot: [0.38, 1], sit: true, lines: ['Камеры включены. Повтор голов — у меня.', 'Wi-Fi тут ловит лучше, чем в 324.', 'Старые мячи, кстати, были лучше.'] },
  { id: 'symbat', look: { skin: '#f0bc98', skinDk: '#c08a66', hair: '#1a1014', jacket: '#eef2f4', jacketDk: '#c8d0d4', shirt: '#7ab4ff', pants: '#2a2a3a', shoes: '#1a1a1a', collar: 'shirt' },
    spot: [0.6, 1], sit: true, lines: ['Ассистирую судье. Неофициально.', 'Я за всех болею. Дипломатично.', 'Чай будет после второго тайма.'] },
  { id: 'ereke', look: { skin: '#cf9268', skinDk: '#9c603c', hair: '#141016', jacket: '#4a5a2a', jacketDk: '#2a3418', shirt: '#4a5a2a', pants: '#2a3018', shoes: '#141414', collar: 'jacket' },
    spot: [0.82, 1], sit: true, lines: ['Футбол — та же тактика. Фланги, прикрытие.', 'После передышки — снова в строй.', 'Дыхание ровное! Как на полигоне.'] },
  { id: 'amir', look: { skin: '#dca07a', skinDk: '#a86e4c', hair: '#141218', glasses: 'thin', jacket: '#3a3a44', jacketDk: '#1a1a22', shirt: '#e0e0e8', pants: '#1a1a22', shoes: '#0a0a0e', collar: 'suit', tie: '#2a2a6a' },
    spot: [0.04, 0.5], sit: false, lines: ['Хороший пас — как хороший код: коротко и по делу.', 'Я тут как старший преподаватель. Наблюдаю.', 'После игры жду всех на совещании. Шучу.'] },
];

// Позиции полевых игроков команды, атакующей вправо (доли поля); вратарь отдельно
const GYM_FORM = [[0.24, 0.3], [0.24, 0.7], [0.42, 0.5], [0.58, 0.35]];

class GymBreak {
  constructor(game) {
    this.g = game;
    const r = game.level.rooms[0];
    this.room = r;
    // поле: вся ширина зала, сверху и снизу по две клетки — места для зрителей
    this.fx0 = (r.x + 1) * TILE + 8; this.fx1 = (r.x + r.w - 1) * TILE - 8;
    this.fy0 = (r.y + 3) * TILE; this.fy1 = (r.y + r.h - 3) * TILE;
    this.cx = (this.fx0 + this.fx1) / 2; this.cy = (this.fy0 + this.fy1) / 2;
    this.fw = this.fx1 - this.fx0; this.fh = this.fy1 - this.fy0;
    this.ball = { x: this.cx, y: this.cy, vx: 0, vy: 0, rot: 0 };
    this.score = [0, 0]; this.ready = new Set(); this.lastTouch = null; this.resetT = 0;
    this.kickCd = 0; this.t = 0; this.msg = null; this.charge = 0;
    this.cup = !!(game.coop && game.coop.cup);
    // две пары ворот: слева наши, справа соперника
    const gh = 150;
    this.goals = [
      { team: 0, rect: { x: this.fx0 - 6, y: this.cy - gh / 2, w: 28, h: gh } },
      { team: 1, rect: { x: this.fx1 - 22, y: this.cy - gh / 2, w: 28, h: gh } },
    ];
    this.npcs = GYM_NPCS.map(n => ({ ...n, say: null, sayT: 0, ph: Math.random() * 6 }));
    for (const n of this.npcs) {
      const [fx, fy] = n.spot;
      if (fy === 0.5) { n.x = this.fx0 + 34; n.y = (r.y + 2) * TILE; }
      else { n.x = this.fx0 + this.fw * fx; n.y = fy === 0 ? (r.y + 1.6) * TILE : (r.y + r.h - 1.6) * TILE; }
      n.face = fy === 0 ? Math.PI / 2 : fy === 1 ? -Math.PI / 2 : 0;
    }
    this._buildTeams();
  }

  // наша команда: живые игроки + ИИ до пяти (вратарь всегда ИИ); соперник — пять ИИ
  _buildTeams() {
    const C = this.g.coop;
    const humans = C ? C.players.length : 1;
    this.ai = [];
    const kit = (team, i) => ({
      skin: ['#e0a07c', '#d8986e', '#f0b892', '#c88a62', '#dca07a'][i % 5], skinDk: '#a06842',
      hair: ['#141016', '#2a1a10', '#0e0a14', '#3a2a1a', '#141218'][i % 5],
      jacket: GYM_TEAM_COL[team], jacketDk: team ? '#8a1414' : '#123a8a', shirt: team ? '#ffd0d0' : '#d0e0ff',
      pants: '#f0f0f0', shoes: '#141414', collar: 'shirt',
    });
    const add = (team, role, slot) => {
      const home = this._home(team, role, slot);
      this.ai.push({ team, role, slot, x: home.x, y: home.y, vx: 0, vy: 0, angle: team ? Math.PI : 0, walk: 0, move: 0, kickCd: 0, look: kit(team, slot + team * 5), name: role === 'gk' ? 'ВРАТАРЬ' : '' });
    };
    add(0, 'gk', 0);
    for (let i = Math.min(4, humans); i < 4; i++) add(0, 'f', i);
    add(1, 'gk', 0);
    for (let i = 0; i < 4; i++) add(1, 'f', i);
  }

  _home(team, role, slot) {
    if (role === 'gk') return { x: team ? this.fx1 - 40 : this.fx0 + 40, y: this.cy };
    const [fx, fy] = GYM_FORM[slot];
    const x = team ? 1 - fx : fx;
    // строй смещается вслед за мячом
    const shift = (this.ball.x - this.cx) * 0.35;
    return { x: this.fx0 + this.fw * x + shift, y: this.fy0 + this.fh * fy + (this.ball.y - this.cy) * 0.2 };
  }

  myPid() { const C = this.g.coop; return C ? (C.isHost ? 'host' : C.pid) : 'host'; }
  isHost() { return !this.g.coop || this.g.coop.isHost; }

  // все, кто касается мяча: люди и ИИ (со скоростью)
  _bodies(dt) {
    const out = [];
    const add = (id, p, team) => {
      if (!p || p.dead || p.x === undefined) return;
      const x = p.x + 9, y = p.y + 9, prev = p._gymPrev || { x, y };
      p._gymPrev = { x, y };
      out.push({ id, x, y, team, vx: (x - prev.x) / Math.max(dt, 0.001), vy: (y - prev.y) / Math.max(dt, 0.001) });
    };
    add(this.myPid(), this.g.player, 0);
    if (this.g.coop) for (const [pid, rp] of this.g.coop.remotes) if (rp.hasState) add(pid, rp, 0);
    for (const a of this.ai) out.push({ id: a, x: a.x, y: a.y, team: a.team, vx: a.vx, vy: a.vy, ai: a });
    return out;
  }

  _aimAngle() {
    const p = this.g.player, cam = this.g.cam;
    if (Input.touch.aimActive) return Math.atan2(Input.touch.aimY, Input.touch.aimX);
    if (Input.isMobile) return Input.touch.moveActive ? Math.atan2(Input.touch.moveY, Input.touch.moveX) : p.angle;
    const mx = cam.x + Input.mouse.x / cam.zoom, my = cam.y + Input.mouse.y / cam.zoom;
    return Math.atan2(my - (p.y + 9), mx - (p.x + 9));
  }

  _kick(id, ang, power, bx, by, reach = 26) {
    const b = this.ball;
    if (Utils.dist(b.x, b.y, bx, by) > GYM_BALL_R + reach) return false;
    b.vx = Math.cos(ang) * power; b.vy = Math.sin(ang) * power;
    this.lastTouch = id;
    AudioSys.play('ball_kick', 0.4 + power / GYM_KICK_MAX * 0.5);
    Effects.ring(b.x, b.y, '255,255,255', 10 + power / 60);
    return true;
  }

  hasBall(x, y) { return Utils.dist(this.ball.x, this.ball.y, x, y) < GYM_BALL_R + 20; }

  update(dt) {
    this.t += dt;
    const g = this.g, C = g.coop, p = g.player;
    this.kickCd = Math.max(0, this.kickCd - dt);
    // бег: SHIFT (вместо «заглянуть вперёд»)
    if (p) {
      const run = Input.isDown('ShiftLeft') || Input.isDown('ShiftRight') || !!Input._mobileRun;
      p.sprintMul = run ? (this.hasBall(p.x + 9, p.y + 9) ? 1.2 : 1.3) : 1;
      p.isLooking = false;
    }
    // удар: коротко — пас, удержание — заряженный пинок
    const held = Input.isDown('Space');
    if (held && p && !p.dead) this.charge = Math.min(1, this.charge + dt / GYM_CHARGE);
    if (!held && this._held && p && !p.dead && this.kickCd <= 0) {
      this.kickCd = 0.2;
      const ang = this._aimAngle(), power = GYM_KICK_MIN + (GYM_KICK_MAX - GYM_KICK_MIN) * this.charge;
      if (this.isHost()) this._kick(this.myPid(), ang, power, p.x + 9, p.y + 9);
      else { if (g.coopUI.net) g.coopUI.net.send('host', { t: 'gk', a: +ang.toFixed(3), p: Math.round(power) }); this._predictKick(ang, power); }
    }
    if (!held) this.charge = 0;
    this._held = held;
    // готов
    if (Input.wasPressed('KeyG') && !TextField.active) {
      const me = this.myPid(), v = !this.ready.has(me);
      if (v) this.ready.add(me); else this.ready.delete(me);
      AudioSys.play(v ? 'ready_on' : 'ready_off');
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

    if (this.isHost()) { this._updateAI(dt); this._simulate(dt); }
    else this._follow(dt);
    for (const a of this.ai) { a.walk += dt * 13 * a.move; }

    // хост: все готовы — следующий этаж
    if (this.isHost() && C) {
      const all = C.players.length;
      if (this.ready.size >= all && all > 0 && this.cup) {
        this.ready.clear(); this.score = [0, 0]; this.resetT = 0.01;
        this._showMsg('НОВЫЙ МАТЧ!', '#ffd319');
      } else if (this.ready.size >= all && all > 0 && !this._leaving) {
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
        g.coopUI.net && g.coopUI.net.broadcast({
          t: 'gb', b: [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy)], sc: this.score, rd: [...this.ready],
          ai: this.ai.map(a => [Math.round(a.x), Math.round(a.y), +a.angle.toFixed(2), +a.move.toFixed(2)]),
          m: this.msg ? [this.msg.text, this.msg.col, this._msgId] : null,
        }, true);
      }
    }
  }

  // ---------- ИИ: вратари держат ворота, ближайший к мячу идёт отбирать, остальные держат строй ----------
  _updateAI(dt) {
    const b = this.ball, bodies = this._bodies(dt);
    // кто ближе всех к мячу в каждой команде
    const chaser = [null, null];
    for (const t of [0, 1]) {
      let best = null, bd = Infinity;
      for (const q of bodies) {
        if (q.team !== t || (q.ai && q.ai.role === 'gk')) continue;
        const d = Utils.dist(q.x, q.y, b.x, b.y);
        if (d < bd) { bd = d; best = q; }
      }
      chaser[t] = best;
    }
    // чья команда сейчас ближе к мячу
    let nearAll = null, nd = Infinity;
    for (const q of bodies) { const d = Utils.dist(q.x, q.y, b.x, b.y); if (d < nd) { nd = d; nearAll = q; } }
    const ballTeam = nearAll && nd < GYM_BALL_R + 24 ? nearAll.team : -1;
    for (const a of this.ai) {
      a.kickCd = Math.max(0, a.kickCd - dt);
      let tx, ty, sp = GYM_AI_SPEED;
      const goalX = a.team ? this.fx0 : this.fx1;           // куда атакует
      const ownX = a.team ? this.fx1 : this.fx0;
      if (this.resetT > 0) { const h = this._home(a.team, a.role, a.slot); tx = h.x; ty = h.y; }
      else if (a.role === 'gk') {
        tx = ownX + (a.team ? -36 : 36);
        a.gy = (a.gy === undefined ? this.cy : a.gy) + (b.y - (a.gy === undefined ? this.cy : a.gy)) * Math.min(1, dt * 2.2);   // реагирует с запозданием
        ty = Utils.clamp(a.gy, this.cy - 46, this.cy + 46);
        sp *= 0.75;
        const near = Utils.dist(a.x, a.y, b.x, b.y);
        if (near < 60 && Math.abs(b.x - ownX) < 110) { tx = b.x; ty = b.y; }
        if (near < GYM_BALL_R + 20 && a.kickCd <= 0) {
          // вынос мяча подальше от ворот
          const ang = Math.atan2(this.cy + Utils.rand(-160, 160) - b.y, (a.team ? this.cx - 200 : this.cx + 200) - b.x);
          this._kick(a, ang, 760, a.x, a.y, 26); a.kickCd = 1.0;
        }
      } else if (chaser[a.team] && chaser[a.team].ai === a) {
        // отбирать / вести мяч к чужим воротам
        const dGoal = Utils.dist(b.x, b.y, goalX, this.cy);
        const toGoal = Math.atan2(this.cy - b.y, goalX - b.x);
        // мяч «наш», только если стоим за ним (между мячом и своими воротами)
        const behind = (a.x - b.x) * Math.cos(toGoal) + (a.y - b.y) * Math.sin(toGoal) < -3;
        const own = Utils.dist(a.x, a.y, b.x, b.y) < GYM_BALL_R + 18 && behind;
        if (!own) {
          // заходим за мяч по дуге, а не упираемся в него лбом
          const side = (a.y < b.y ? -1 : 1) * 16;
          tx = b.x - Math.cos(toGoal) * 16 + (behind ? 0 : -Math.sin(toGoal) * side);
          ty = b.y - Math.sin(toGoal) * 16 + (behind ? 0 : Math.cos(toGoal) * side);
        }
        else {
          tx = b.x + Math.cos(toGoal) * 30; ty = b.y + Math.sin(toGoal) * 30;
          if (a.kickCd <= 0) {
            const opp = bodies.filter(q => q.team !== a.team);
            const pressed = opp.some(q => Utils.dist(q.x, q.y, a.x, a.y) < 70);
            if (dGoal < 300 && Math.random() < 0.6) {
              this._kick(a, toGoal + Utils.rand(-0.3, 0.3), Utils.rand(620, 880), a.x, a.y); a.kickCd = 1.1;
            } else if (pressed && Math.random() < 0.5) {
              // пас партнёру, который ближе к чужим воротам и не закрыт
              const mates = bodies.filter(q => q.team === a.team && q.ai !== a && !(q.ai && q.ai.role === 'gk'));
              let best = null, bs = -Infinity;
              for (const m of mates) {
                const ahead = (a.team ? a.x - m.x : m.x - a.x);
                const free = Math.min(...opp.map(q => Utils.dist(q.x, q.y, m.x, m.y)));
                const s = ahead * 0.5 + free - Utils.dist(a.x, a.y, m.x, m.y) * 0.2;
                if (s > bs) { bs = s; best = m; }
              }
              if (best) {
                const d = Utils.dist(a.x, a.y, best.x, best.y);
                this._kick(a, Math.atan2(best.y - b.y, best.x - b.x) + Utils.rand(-0.15, 0.15), Utils.clamp(240 + d * 1.2, 360, 820), a.x, a.y);
                a.kickCd = 0.9;
              }
            }
          }
        }
      } else {
        const h = this._home(a.team, a.role, a.slot);
        tx = h.x; ty = h.y; sp *= 0.8;
        // второй по близости игрок подстраховывает
        const d = Utils.dist(a.x, a.y, b.x, b.y);
        if (d < 70 && ballTeam === 1 - a.team) { tx = b.x; ty = b.y; sp *= 0.9; }
      }
      const dx = tx - a.x, dy = ty - a.y, dl = Math.hypot(dx, dy);
      const want = dl > 4 ? Math.min(sp, dl * 6) : 0;
      const nvx = dl > 0 ? dx / dl * want : 0, nvy = dl > 0 ? dy / dl * want : 0;
      a.vx += (nvx - a.vx) * Math.min(1, dt * 4); a.vy += (nvy - a.vy) * Math.min(1, dt * 4);   // разгон плавнее — можно обыграть
      a.x = Utils.clamp(a.x + a.vx * dt, this.fx0 + 8, this.fx1 - 8);
      a.y = Utils.clamp(a.y + a.vy * dt, this.fy0 + 8, this.fy1 - 8);
      a.move = Math.min(1, Math.hypot(a.vx, a.vy) / GYM_AI_SPEED);
      const face = Math.hypot(a.vx, a.vy) > 20 ? Math.atan2(a.vy, a.vx) : Math.atan2(b.y - a.y, b.x - a.x);
      let da = face - a.angle; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      a.angle += da * Math.min(1, dt * 10);
    }
    // ИИ не наслаиваются друг на друга
    for (let i = 0; i < this.ai.length; i++) for (let j = i + 1; j < this.ai.length; j++) {
      const p = this.ai[i], q = this.ai[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < 20) { const k = (20 - d) / 2 / d; p.x -= dx * k; p.y -= dy * k; q.x += dx * k; q.y += dy * k; }
    }
  }

  _simulate(dt) {
    const b = this.ball;
    if (this.resetT > 0) {
      this.resetT -= dt;
      if (this.resetT <= 0) { b.x = this.cx; b.y = this.cy; b.vx = b.vy = 0; Effects.ring(b.x, b.y, '255,255,255', 30); }
      return;
    }
    // ведение: мяч отскакивает от корпуса, а при беге «липнет» к ногам; касание — перехват
    for (const body of this._bodies(dt)) {
      const dx = b.x - body.x, dy = b.y - body.y, d = Math.hypot(dx, dy) || 0.001;
      const minD = GYM_BALL_R + 10;
      const sp = Math.hypot(body.vx, body.vy);
      if (d < minD) {
        const nx = dx / d, ny = dy / d;
        b.x = body.x + nx * minD; b.y = body.y + ny * minD;
        const rel = b.vx * nx + b.vy * ny;
        if (rel < sp) { b.vx += nx * (sp * 1.05 - rel); b.vy += ny * (sp * 1.05 - rel); }
        this.lastTouch = body.id;
      } else if (d < minD + 12 && sp > 40 && (!body.ai || Math.random() < 0.6)) {
        const mx = body.vx / sp, my = body.vy / sp;
        if (dx * mx + dy * my > 0) {
          const tx = body.x + mx * (minD + 2), ty = body.y + my * (minD + 2);
          const k = Math.min(1, dt * 12);
          b.x += (tx - b.x) * k; b.y += (ty - b.y) * k;
          b.vx += (body.vx - b.vx) * k; b.vy += (body.vy - b.vy) * k;
          this.lastTouch = body.id;
        }
      }
    }
    this._move(dt);
    for (const gl of this.goals) {
      const r = gl.rect;
      if (b.x > r.x && b.x < r.x + r.w && b.y > r.y && b.y < r.y + r.h) { this._goal(gl); break; }
    }
  }

  _move(dt) {
    const b = this.ball;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.vx *= Math.exp(-dt * 1.15); b.vy *= Math.exp(-dt * 1.15);
    b.rot += Math.hypot(b.vx, b.vy) * dt / GYM_BALL_R;
    const mouth = Math.abs(b.y - this.cy) < 72;
    if (b.x < this.fx0 + GYM_BALL_R && !mouth) { b.x = this.fx0 + GYM_BALL_R; b.vx = Math.abs(b.vx) * 0.8; }
    if (b.x > this.fx1 - GYM_BALL_R && !mouth) { b.x = this.fx1 - GYM_BALL_R; b.vx = -Math.abs(b.vx) * 0.8; }
    if (b.y < this.fy0 + GYM_BALL_R) { b.y = this.fy0 + GYM_BALL_R; b.vy = Math.abs(b.vy) * 0.8; }
    if (b.y > this.fy1 - GYM_BALL_R) { b.y = this.fy1 - GYM_BALL_R; b.vy = -Math.abs(b.vy) * 0.8; }
    b.x = Utils.clamp(b.x, this.fx0 - 24, this.fx1 + 24);
  }

  _goal(gl) {
    const scorer = 1 - gl.team;
    this.score[scorer]++;
    const who = this.lastTouch, C = this.g.coop;
    let name = '';
    if (typeof who === 'string' && C) { const pl = C.players.find(q => q.pid === who); name = pl ? pl.name : ''; }
    else if (who === this.myPid() && !C) name = 'ВЫ';
    this._showMsg(scorer === 0 ? `ГОЛ!${name ? ' ' + name : ''}` : 'ГОЛ СОПЕРНИКА', scorer === 0 ? '#3dff8a' : '#ff4060');
    this.resetT = 1.4;
    this.ball.vx = this.ball.vy = 0;
  }

  _showMsg(text, col) {
    this.msg = { text, col, t: 0 };
    this._msgId = (this._msgId || 0) + 1;
    AudioSys.play('whistle', 0.7);
    Effects.screenFlash(0.12, '255,255,255');
  }

  // клиент: мяч и ИИ — от хоста; свой удар показываем сразу
  _predictKick(ang, power) {
    const p = this.g.player, b = this.ball;
    if (Utils.dist(b.x, b.y, p.x + 9, p.y + 9) > GYM_BALL_R + 30) return;
    b.vx = Math.cos(ang) * power; b.vy = Math.sin(ang) * power;
    this._predT = 0.15;
    AudioSys.play('ball_kick', 0.7);
  }

  _follow(dt) {
    const b = this.ball, n = this._net;
    this._predT = Math.max(0, (this._predT || 0) - dt);
    if (n && this._predT <= 0) {
      const k = Math.min(1, dt * 14);
      b.x += (n[0] - b.x) * k; b.y += (n[1] - b.y) * k; b.vx = n[2]; b.vy = n[3];
    } else this._move(dt);
    b.rot += Math.hypot(b.vx, b.vy) * dt / GYM_BALL_R;
    if (this._netAi) this._netAi.forEach((q, i) => {
      const a = this.ai[i]; if (!a) return;
      const k = Math.min(1, dt * 12);
      a.x += (q[0] - a.x) * k; a.y += (q[1] - a.y) * k; a.angle = q[2]; a.move = q[3];
    });
  }

  onNet(pid, m) {
    if (m.t === 'gk' && this.isHost()) {
      const rp = this.g.coop.remotes.get(pid);
      if (rp) this._kick(pid, m.a, Utils.clamp(m.p || GYM_KICK_MIN, GYM_KICK_MIN, GYM_KICK_MAX), rp.x + 9, rp.y + 9, 40);
    } else if (m.t === 'gr' && this.isHost()) {
      if (m.v) this.ready.add(pid); else this.ready.delete(pid);
    } else if (m.t === 'gb' && !this.isHost()) {
      this._net = m.b; this.score = m.sc || [0, 0]; this.ready = new Set(m.rd || []); this._netAi = m.ai;
      if (m.m && m.m[2] !== this._seenMsg) { this._seenMsg = m.m[2]; this._showMsg(m.m[0], m.m[1]); }
    }
  }

  // ---------- отрисовка в мире ----------
  drawWorld(ctx) {
    const t = this.t;
    ctx.save();
    // газон-разметка
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    ctx.strokeRect(this.fx0, this.fy0, this.fw, this.fh);
    ctx.beginPath(); ctx.moveTo(this.cx, this.fy0); ctx.lineTo(this.cx, this.fy1); ctx.stroke();
    ctx.beginPath(); ctx.arc(this.cx, this.cy, 80, 0, Math.PI * 2); ctx.stroke();
    for (const s of [-1, 1]) {
      const gx = s < 0 ? this.fx0 : this.fx1;
      ctx.strokeRect(s < 0 ? gx : gx - 150, this.cy - 150, 150, 300);
      ctx.strokeRect(s < 0 ? gx : gx - 60, this.cy - 90, 60, 180);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(this.cx, this.cy, 4, 0, Math.PI * 2); ctx.fill();
    // ворота
    for (const gl of this.goals) {
      const r = gl.rect, col = GYM_TEAM_COL[gl.team];
      ctx.fillStyle = col + '33'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.shadowColor = col; ctx.shadowBlur = 12;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
      for (let i = 6; i < r.h; i += 8) { ctx.beginPath(); ctx.moveTo(r.x, r.y + i); ctx.lineTo(r.x + r.w, r.y + i); ctx.stroke(); }
      ctx.font = 'bold 12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = col;
      ctx.lineWidth = 3; ctx.strokeStyle = '#000';
      const lbl = gl.team === 0 ? 'НАШИ ВОРОТА' : 'ЧУЖИЕ ВОРОТА';
      ctx.strokeText(lbl, r.x + r.w / 2, r.y - 8); ctx.fillText(lbl, r.x + r.w / 2, r.y - 8);
    }
    ctx.restore();
    // ИИ-игроки
    for (const a of this.ai) {
      ctx.save(); ctx.translate(a.x, a.y);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2, 4, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = GYM_TEAM_COL[a.team]; ctx.globalAlpha = 0.7; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 2, 13, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.rotate(a.angle); ctx.scale(1.1, 1.1);
      Sprites.drawHuman(ctx, a.look, { t: t + a.slot, walk: a.walk, move: a.move });
      ctx.restore();
      if (a.role === 'gk') {
        ctx.font = 'bold 9px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = GYM_TEAM_COL[a.team];
        ctx.fillText('ВРАТАРЬ', a.x, a.y - 16);
      }
    }
    // свой цвет команды под живыми игроками
    const marks = [this.g.player, ...(this.g.coop ? [...this.g.coop.remotes.values()] : [])];
    for (const p of marks) {
      if (!p || p.dead || p.x === undefined) continue;
      ctx.strokeStyle = GYM_TEAM_COL[0]; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.ellipse(p.x + 9, p.y + 11, 14, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
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
    const b = this.ball, R = GYM_BALL_R;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(b.x + 2, b.y + 3, R, R * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(b.x, b.y); ctx.rotate(b.rot);
    ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.arc(0, 0, R + 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a22';
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, R * 0.22, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // заряд удара и направление
    const p = this.g.player;
    if (p && this.charge > 0) {
      const x = p.x + 9, y = p.y - 12, w = 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
      ctx.fillStyle = this.charge >= 1 ? '#ff3a3a' : this.charge > 0.6 ? '#ffd319' : '#3dff8a';
      ctx.fillRect(x - w / 2, y, w * this.charge, 4);
      const ang = this._aimAngle();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(ang) * (40 + 120 * this.charge), b.y + Math.sin(ang) * (40 + 120 * this.charge)); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // реплики коллег и табло — в экранных координатах
  drawHud(ctx, W, H, s) {
    const g = this.g, cam = g.cam, C = g.coop;
    if (cam) for (const n of this.npcs) {
      if (!n.say) continue;
      const sx = (n.x - cam.x) * cam.zoom, sy = (n.y - cam.y) * cam.zoom - 22;
      Thoughts.bubble(ctx, g, sx, sy, `${(CAST[n.id] && CAST[n.id].name) || ''}: ${n.say}`, n.sayT, 4, (CAST[n.id] && CAST[n.id].color) || '#ffd319');
    }
    const ps = C ? C.players.slice().sort((a, b) => a.slot - b.slot) : [];
    const bw = Math.min(440, W * 0.6), bh = 50 * s + 8, bx = W / 2 - bw / 2, by = 10 * s;
    ctx.save();
    ctx.fillStyle = 'rgba(6,10,8,0.82)'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#3fff7f'; ctx.lineWidth = 2; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(10 * s + 1)}px "Courier New", monospace`; ctx.fillStyle = '#3fff7f';
    ctx.fillText(this.cup ? 'GORILLA CUP · 5 на 5 · G — новый матч' : `СПОРТЗАЛ · 5 на 5 · дальше этаж ${C ? C.levelNo + 1 : ''}`, W / 2, by + 13 * s);
    ctx.font = `bold ${Math.round(18 * s + 2)}px "Courier New", monospace`;
    ctx.fillStyle = GYM_TEAM_COL[0]; ctx.textAlign = 'right'; ctx.fillText(`НАШИ ${this.score[0]}`, W / 2 - 10, by + 34 * s);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(':', W / 2, by + 34 * s);
    ctx.fillStyle = GYM_TEAM_COL[1]; ctx.textAlign = 'left'; ctx.fillText(`${this.score[1]} СОПЕРНИКИ`, W / 2 + 10, by + 34 * s);
    ctx.textAlign = 'center'; ctx.font = `${Math.round(10 * s + 1)}px "Courier New", monospace`;
    const rd = ps.length ? ps.map(p => `${p.name}${this.ready.has(p.pid) ? ' ✓' : ''}`).join('   ') : '';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`готовы ${this.ready.size}/${Math.max(1, ps.length)}: ${rd}`, W / 2, by + 48 * s, bw - 12);
    ctx.font = `${Math.round(11 * s + 1)}px "Courier New", monospace`; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(Input.isMobile ? 'УДАР: тап — пас, удержание — мощный удар · БЕГ · ГОТОВ — дальше'
      : `ПРОБЕЛ — пас (держите — мощный удар) в сторону прицела · SHIFT — бег · G — ${this.cup ? 'новый матч' : 'готов'} · E — поговорить`, W / 2, H - 14, W - 20);
    if (this.msg) {
      const k = Math.min(1, this.msg.t * 6, (2 - this.msg.t) * 3);
      ctx.globalAlpha = Math.max(0, k);
      g.menu.glowText(ctx, this.msg.text, W / 2, H * 0.32, this.msg.col, Math.min(46, W * 0.06) * (1 + 0.2 * (1 - Math.min(1, this.msg.t * 4))), 'center', 20);
    }
    ctx.restore();
  }
}
