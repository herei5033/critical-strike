// =====================================================================
// КОРПОРАТИВ — совместная игра до 3 человек.
// Хост (создатель комнаты) держит у себя всю сессию: лобби, чат и мир
// (врагов, двери, предметы, боссов). Игроки подключаются к нему напрямую
// по WebRTC (см. p2p.js), сервер нужен только для знакомства.
// Каждый игрок сам управляет своим героем и сообщает хосту о попаданиях.
// =====================================================================

const CHAR_NAMES = { dani: 'ДАНИ', gal: 'ГАЛА', daur: 'ДАУР' };
const DEATH_KINDS = ['bullet', 'shotgun', 'blunt', 'blade', 'fist', 'throw', 'crush', 'explosion', 'burn'];
const DEATH_POSES = ['back', 'side', 'face', 'crawl'];
const CHAR_IDS = ['dani', 'gal', 'daur'];
const SLOT_COLORS = ['#ffd319', '#05d9e8', '#ff2a6d'];
const LOBBY_RETURN = 8;   // сек экрана итогов, потом все в лобби хоста

// ---------- Никнейм (хранится только в браузере) ----------
const Nick = {
  get() { try { return localStorage.getItem('cs_nick') || ''; } catch (e) { return ''; } },
  set(v) { try { localStorage.setItem('cs_nick', v); } catch (e) {} },
};

// ---------- Текстовое поле поверх игры (ник, код комнаты, чат) ----------
const TextField = {
  el: null, onSubmit: null, onCancel: null,
  get active() { return !!(this.el && this.el.style.display === 'block'); },

  init() {
    this.el = document.getElementById('text-input');
    if (!this.el) return;
    this.el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = this.el.value, cb = this.onSubmit;
        this.close(); if (cb) cb(v);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        const cb = this.onCancel;
        this.close(); if (cb) cb();
      }
    });
    this.el.addEventListener('keyup', (e) => e.stopPropagation());
    this.el.addEventListener('blur', () => {
      setTimeout(() => {
        if (this.active && document.activeElement !== this.el) { const cb = this.onCancel; this.close(); if (cb) cb(); }
      }, 120);
    });
  },

  open({ value = '', placeholder = '', maxLength = 100, upper = false, onSubmit, onCancel }) {
    if (!this.el) this.init();
    if (!this.el) return;
    this.onSubmit = onSubmit; this.onCancel = onCancel;
    this.el.value = value;
    this.el.placeholder = placeholder;
    this.el.maxLength = maxLength;
    this.el.style.textTransform = upper ? 'uppercase' : 'none';
    this.el.style.display = 'block';
    Input.typing = true;
    Input.keys = {};
    Input.mouse.down = false;
    setTimeout(() => this.el.focus(), 0);
  },

  close() {
    if (!this.el) return;
    this.el.style.display = 'none';
    this.el.blur();
    Input.typing = false;
    this.onSubmit = this.onCancel = null;
  },
};

// =====================================================================
// Меню корпоратива и лобби
// =====================================================================
class CoopUI {
  constructor(game) {
    this.game = game;
    this.screen = 'home';
    this.sel = 0;
    this.t = 0;
    this.msg = ''; this.msgT = 0;
    this.reset();
  }

  reset() {
    if (this.net) { this.net.muted = true; this.net.close(); }
    this.net = null;
    this.code = null; this.pid = null; this.isHost = false;
    this.players = []; this.chat = [];
    this.pendingChar = null;
    this.busy = false; this.inMatch = false; this.connecting = false;
    this.lobbySel = 0;
  }

  open() {
    this.screen = this.code ? 'lobby' : 'home';
    this.sel = 0;
    this.game.state = 'coop';
  }

  flash(msg) { this.msg = msg; this.msgT = 4; }

  homeItems() {
    return [`НИКНЕЙМ: ${Nick.get() || '— задать —'}`, 'СОЗДАТЬ КОМНАТУ', 'ВОЙТИ ПО КОДУ', 'НАЗАД'];
  }

  lobbyButtons() {
    const b = [];
    if (this.isHost) b.push('НАЧАТЬ КОРПОРАТИВ', 'SAMSA KOMBAT');
    b.push('НАПИСАТЬ В ЧАТ', 'ВЫЙТИ ИЗ КОМНАТЫ');
    return b;
  }

  _askNick(then) {
    TextField.open({
      value: Nick.get(), placeholder: 'Ваш никнейм (до 14 символов)', maxLength: 14,
      onSubmit: (v) => {
        v = v.trim().slice(0, 14);
        if (v) { Nick.set(v); this.flash('Никнейм сохранён: ' + v); if (then) then(); }
      },
    });
  }

  _p2pSupported() {
    if (typeof RTCPeerConnection === 'undefined') { this.flash('Браузер не поддерживает P2P (WebRTC)'); return false; }
    return true;
  }

  // ---------- хост: создаёт комнату и держит лобби у себя ----------
  async _create() {
    if (!Nick.get()) { this._askNick(() => this._create()); return; }
    if (this.busy || !this._p2pSupported()) return;
    this.busy = true;
    try {
      const r = await signalPost('/api/p2p/host', {});
      this.reset();
      this.code = r.code; this.pid = 'host'; this.isHost = true;
      this.players = [{ pid: 'host', name: Nick.get(), char: 'dani', slot: 0, host: true }];
      this.net = new P2PNet({ isHost: true, code: r.code, id: 'host', token: r.token, handlers: this._hostHandlers() });
      this.addChat('', `${Nick.get()} создал комнату ${r.code}`, true);
      Assets.run(Assets.gameplayList());
      this.screen = 'lobby'; this.lobbySel = 0;
      AudioSys.play('menu_select');
    } catch (e) { this.flash(e.message); }
    this.busy = false;
  }

  _hostHandlers() {
    return {
      canAccept: () => this.inMatch ? 'Игра уже идёт — дождитесь возврата в лобби' : this.players.length >= 3 ? 'Комната заполнена (максимум 3 игрока)' : null,
      onOpen: () => {},
      onMessage: (pid, m) => this._hostMsg(pid, m),
      onClose: (pid) => this._hostPeerGone(pid),
    };
  }

  _hostMsg(pid, m) {
    const p = this.players.find(q => q.pid === pid);
    if (m.t === 'hello') {
      if (p) return;
      const reason = this._hostHandlers().canAccept();
      if (reason) { this.net.send(pid, { t: 'reject', reason }); setTimeout(() => this.net && this.net.drop(pid, 'rejected'), 300); return; }
      const used = new Set(this.players.map(q => q.slot)), taken = new Set(this.players.map(q => q.char));
      const slot = [0, 1, 2].find(i => !used.has(i));
      const char = CHAR_IDS.find(c => !taken.has(c)) || null;
      const name = String(m.name || 'ИГРОК').replace(/[^\p{L}\p{N} _\-.]/gu, '').trim().slice(0, 14) || 'ИГРОК';
      this.players.push({ pid, name, char, slot, host: false });
      this.net.send(pid, { t: 'welcome', pid, chat: this.chat });
      this.addChat('', `${name} присоединился`, true);
      this.broadcastLobby();
      AudioSys.play('menu_select');
      return;
    }
    if (!p) return;
    if (m.t === 'char') {
      if (!this.inMatch && CHAR_IDS.includes(m.c) && !this.players.some(q => q.char === m.c && q.pid !== pid)) p.char = m.c;
      this.broadcastLobby();
    } else if (m.t === 'chat') this.addChat(p.name, m.text);
    else if (m.t === 'bye') this.net.drop(pid, 'bye');
    else if (m.t && m.t[0] === 'K') { if (this.game.kombat.net) this.game.kombat.onNet(m); }
    else if (this.game.coop) this.game.coop.onNet(pid, m);
  }

  // Игрок отключился (сам вышел, закрыл вкладку или пропала связь)
  _hostPeerGone(pid) {
    const i = this.players.findIndex(q => q.pid === pid);
    if (i < 0) return;
    const p = this.players[i];
    this.players.splice(i, 1);
    if (this.game.coop) this.game.coop.onLeft(pid);
    if (this.game.kombat.net) this.game.kombat._backToLobby('Соперник отключился');
    this.net.broadcast({ t: 'left', pid });
    this.addChat('', this.inMatch ? `${p.name} покинул игру` : `${p.name} вышел из комнаты`, true);
    this.broadcastLobby();
  }

  broadcastLobby() { if (this.net) this.net.broadcast({ t: 'lobby', players: this.players }); }

  // Чат хранится только у хоста и рассылается всем
  addChat(name, text, sys = false) {
    text = String(text || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 120);
    if (!text) return;
    const m = { name, text, sys };
    this._recvChat(m);
    if (this.net) this.net.broadcast({ t: 'chat', m });
  }

  _recvChat(m) {
    this.chat.push(m);
    this.chat = this.chat.slice(-40);
    if (this.game.coop) this.game.coop.pushChatLine(m);
    else if (!m.sys && m.name !== Nick.get()) AudioSys.play('menu_move');
  }

  sendChat(text) {
    text = String(text || '').trim();
    if (!text) return;
    if (this.isHost) this.addChat(Nick.get() || 'ХОСТ', text);
    else if (this.net) this.net.send('host', { t: 'chat', text });
  }

  // ---------- игрок: подключается к хосту по коду ----------
  _join() {
    if (!Nick.get()) { this._askNick(() => this._join()); return; }
    if (!this._p2pSupported()) return;
    TextField.open({
      placeholder: 'Код комнаты (4 символа)', maxLength: 6, upper: true,
      onSubmit: async (v) => {
        v = v.trim().toUpperCase();
        if (!v || this.busy) return;
        this.busy = true;
        try {
          const r = await signalPost('/api/p2p/join', { code: v });
          this.reset();
          this.code = v; this.pid = r.id; this.isHost = false; this.connecting = true;
          this.net = new P2PNet({ isHost: false, code: v, id: r.id, handlers: this._clientHandlers() });
          Assets.run(Assets.gameplayList());
          this.screen = 'lobby'; this.lobbySel = 0;
          AudioSys.play('menu_select');
        } catch (e) { this.flash(e.message); }
        this.busy = false;
      },
    });
  }

  _clientHandlers() {
    return {
      onOpen: () => { this.net.send('host', { t: 'hello', name: Nick.get() }); },
      onMessage: (pid, m) => this._clientMsg(m),
      onClose: () => this._hostGone('Хост покинул игру'),
      onFail: (reason) => this._hostGone(reason),
    };
  }

  _clientMsg(m) {
    const g = this.game;
    if (m.t === 'welcome') { this.connecting = false; this.pid = m.pid; this.chat = (m.chat || []).slice(-40); }
    else if (m.t === 'lobby') {
      this.players = m.players || [];
      const me = this.players.find(p => p.pid === this.pid);
      if (me && (!this.pendingChar || me.char === this.pendingChar || this.players.some(p => p.char === this.pendingChar && p.pid !== this.pid))) this.pendingChar = null;
    }
    else if (m.t === 'chat') this._recvChat(m.m);
    else if (m.t === 'reject') this._hostGone(m.reason || 'Хост отклонил подключение');
    else if (m.t === 'closed') this._hostGone(m.reason || 'Хост закрыл комнату');
    else if (m.t === 'start') {
      this.inMatch = true;
      this.players = m.players || this.players;
      g.startCoopMatch({ code: this.code, pid: this.pid, isHost: false, players: this.players, seed: m.seed, lvl: m.lvl }, this.net);
    }
    else if (m.t === 'toLobby') { if (g.coop) g.leaveMatch(); }
    else if (m.t === 'Kstart') { this.inMatch = true; g.kombat.openNet('client', 'host', m.names); }
    else if (m.t && m.t[0] === 'K') { if (g.kombat.net) g.kombat.onNet(m); }
    else if (m.t === 'left') { if (g.coop) g.coop.onLeft(m.pid); }
    else if (g.coop) g.coop.onNet('host', m);
  }

  _hostGone(reason) {
    const g = this.game;
    if (g.kombat.net) { g.kombat.net = null; g.kombat.screen = 'select'; }
    this.reset();
    if (g.coop) { g.coop.closed = true; g.coop.closeReason = reason; }
    else { this.screen = 'home'; this.flash(reason); if (g.state !== 'coop' && g.state !== 'menu') this.open(); }
  }

  // Выйти из комнаты (или закрыть её, если вы хост)
  leave(silent) {
    const net = this.net;
    if (net) {
      if (this.isHost) net.broadcast({ t: 'closed', reason: 'Хост закрыл комнату' });
      else net.send('host', { t: 'bye' });
      net.muted = true;
      this.net = null;
      setTimeout(() => net.close(), 250);   // даём сообщению уйти
    }
    this.reset();
    this.screen = 'home';
    if (!silent) this.flash('Вы покинули комнату');
  }

  _openChat() {
    TextField.open({ placeholder: 'Сообщение в чат комнаты', maxLength: 120, onSubmit: (v) => this.sendChat(v) });
  }

  // ---------- хост: старт матча и возврат в лобби ----------
  _start(lvl = 1) {
    if (!this.isHost || this.inMatch) return;
    if (this.players.some(p => !p.char)) { this.flash('Не все выбрали персонажа'); return; }
    const seed = (Math.random() * 2e9) | 0;
    this.inMatch = true;
    const players = this.players.map(p => ({ ...p }));
    this.net.broadcast({ t: 'start', seed, players, lvl });
    this.addChat('', 'Корпоратив начинается!', true);
    this.game.startCoopMatch({ code: this.code, pid: 'host', isHost: true, players, seed, lvl }, this.net);
  }

  // Хост: начать корпоратив заново с теми же игроками (все проходят через лобби и сразу стартуют)
  restart() {
    if (!this.isHost) return;
    const lvl = this.game.coop ? this.game.coop.levelNo : 1;     // этаж сохраняется
    if (this.net) this.net.broadcast({ t: 'toLobby' });
    this.game.leaveMatch();
    this.addChat('', `Хост перезапустил этаж ${lvl}`, true);
    this._start(lvl);
  }

  // Хост: файтинг один на один с напарником по той же P2P-связи
  _startKombat() {
    if (!this.isHost || this.inMatch) return;
    if (this.players.length !== 2) { this.flash('Для SAMSA KOMBAT нужно ровно 2 игрока в комнате'); return; }
    const other = this.players.find(p => !p.host);
    const names = [Nick.get() || 'ХОСТ', other.name];
    this.inMatch = true;
    this.net.broadcast({ t: 'Kstart', names });
    this.addChat('', `SAMSA KOMBAT: ${names[0]} против ${names[1]}`, true);
    this.game.kombat.openNet('host', other.pid, names);
  }

  backToLobby() {
    if (!this.isHost) return;
    if (this.net) this.net.broadcast({ t: 'toLobby' });
    this.game.leaveMatch();
    this.addChat('', 'Все вернулись в лобби', true);
  }

  _myChar() {
    if (this.pendingChar) return this.pendingChar;
    const me = this.players.find(p => p.pid === this.pid);
    return me ? me.char : null;
  }

  _pickChar(id) {
    if (this.connecting) return;
    const taken = this.players.find(p => p.char === id && p.pid !== this.pid);
    if (taken) { this.flash(`${CHAR_NAMES[id]} уже выбран игроком ${taken.name}`); return; }
    AudioSys.play('char_select');
    if (this.isHost) { const me = this.players.find(p => p.pid === 'host'); if (me) me.char = id; this.broadcastLobby(); }
    else { this.pendingChar = id; if (this.net) this.net.send('host', { t: 'char', c: id }); }
  }

  // ---------- ввод ----------
  update(dt) {
    this.t += dt;
    this.msgT = Math.max(0, this.msgT - dt);
    if (TextField.active) return;

    const W = this.game.W, H = this.game.H;
    const mx = Input.mouse.x, my = Input.mouse.y;
    const click = Input.consumeClick();
    const up = Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW') || Input.wasPressed('MobileUp');
    const down = Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS') || Input.wasPressed('MobileDown');
    const enter = Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('MobileEnter');

    if (this.screen === 'home') {
      const items = this.homeItems();
      if (up) { this.sel = (this.sel + items.length - 1) % items.length; AudioSys.play('menu_move'); }
      if (down) { this.sel = (this.sel + 1) % items.length; AudioSys.play('menu_move'); }
      const rects = this._homeRects(W, H);
      rects.forEach((r, i) => { if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) this.sel = i; });
      let act = enter ? this.sel : -1;
      if (click) rects.forEach((r, i) => { if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) act = i; });
      if (act === 0) this._askNick();
      else if (act === 1) this._create();
      else if (act === 2) this._join();
      else if (act === 3 || Input.wasPressed('Escape')) { this.game.toMenu(); this.game.modesUI.open(); }
      if (act >= 0) AudioSys.play('menu_select');
      return;
    }

    // --- лобби ---
    if (Input.wasPressed('KeyT')) { this._openChat(); return; }
    if (Input.wasPressed('Escape')) { this.leave(); return; }

    const cur = CHAR_IDS.indexOf(this._myChar());
    if (Input.wasPressed('KeyA') || Input.wasPressed('ArrowLeft')) this._pickChar(CHAR_IDS[(cur + 2) % 3]);
    if (Input.wasPressed('KeyD') || Input.wasPressed('ArrowRight')) this._pickChar(CHAR_IDS[(cur + 1) % 3]);

    const btns = this.lobbyButtons();
    if (up) { this.lobbySel = (this.lobbySel + btns.length - 1) % btns.length; AudioSys.play('menu_move'); }
    if (down) { this.lobbySel = (this.lobbySel + 1) % btns.length; AudioSys.play('menu_move'); }
    const L = this._lobbyLayout(W, H);
    let act = enter ? this.lobbySel : -1;
    L.buttons.forEach((r, i) => {
      if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) { this.lobbySel = i; if (click) act = i; }
    });
    if (click) L.chars.forEach((r, i) => { if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) this._pickChar(CHAR_IDS[i]); });
    if (click && this._hit(L.chat, mx, my)) this._openChat();
    if (act >= 0) {
      const name = btns[act];
      AudioSys.play('menu_select');
      if (name === 'НАЧАТЬ КОРПОРАТИВ') this._start();
      else if (name === 'SAMSA KOMBAT') this._startKombat();
      else if (name === 'НАПИСАТЬ В ЧАТ') this._openChat();
      else this.leave();
    }
  }

  _hit(r, x, y) { return r && x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h; }

  _homeRects(w, h) {
    const bw = Math.min(380, w * 0.6), bh = 44;
    return this.homeItems().map((_, i) => ({ x: w / 2 - bw / 2, y: h * 0.42 + i * (bh + 12), w: bw, h: bh }));
  }

  _lobbyLayout(w, h) {
    const top = 96;
    const colW = (w - 80) / 3;
    const players = { x: 20, y: top, w: colW, h: h - top - 90 };
    const charsBox = { x: 40 + colW, y: top, w: colW, h: h - top - 90 };
    const chat = { x: 60 + colW * 2, y: top, w: colW, h: h - top - 90 };
    const cs = Math.min(84, (colW - 40) / 3);
    const chars = CHAR_IDS.map((_, i) => ({ x: charsBox.x + 14 + i * (cs + 6), y: charsBox.y + 50, w: cs, h: cs + 40 }));
    const names = this.lobbyButtons();
    const bw = Math.min(250, (w - 80) / names.length - 10), bh = 40;
    const bx0 = w / 2 - (names.length * (bw + 12) - 12) / 2;
    const buttons = names.map((_, i) => ({ x: bx0 + i * (bw + 12), y: h - 68, w: bw, h: bh }));
    return { players, charsBox, chat, chars, buttons };
  }

  // ---------- отрисовка ----------
  _button(ctx, r, text, active, accent = '#ff2a6d', disabled = false) {
    const M = this.game.menu;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r.x + 12, r.y); ctx.lineTo(r.x + r.w, r.y); ctx.lineTo(r.x + r.w - 12, r.y + r.h); ctx.lineTo(r.x, r.y + r.h); ctx.closePath();
    if (active && !disabled) {
      const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
      g.addColorStop(0, accent); g.addColorStop(1, 'rgba(120,20,200,0.9)');
      ctx.fillStyle = g; ctx.shadowColor = accent; ctx.shadowBlur = 18; ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(8,4,18,0.75)'; ctx.fill();
      ctx.strokeStyle = disabled ? 'rgba(255,255,255,0.15)' : 'rgba(5,217,232,0.4)'; ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.min(17, r.w / 13)}px "Courier New", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = disabled ? '#666' : active ? '#fff' : '#b8b0d0';
    ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.restore();
    void M;
  }

  draw(ctx, w, h) {
    const M = this.game.menu;
    M.drawBackground(ctx, w, h, this.t, 0.45);
    M.glowText(ctx, 'КОРПОРАТИВ', w / 2, 52, '#ff2a6d', Math.min(40, w * 0.06), 'center', 20);
    ctx.font = '13px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
    if (this.screen === 'home') ctx.fillText('совместная игра до 3 человек', w / 2, 74);

    if (this.screen === 'home') this._drawHome(ctx, w, h);
    else { this._drawLobby(ctx, w, h); if (this.net) drawPing(ctx, w - 12, 18, this.net.ping, this.isHost); }

    if (this.msgT > 0) {
      ctx.globalAlpha = Math.min(1, this.msgT);
      ctx.font = 'bold 15px "Courier New", monospace'; ctx.textAlign = 'center';
      const tw = ctx.measureText(this.msg).width + 30;
      // всплывающее сообщение — под заголовком, чтобы не закрывать кнопки
      ctx.fillStyle = 'rgba(10,4,20,0.92)'; ctx.fillRect(w / 2 - tw / 2, 84, tw, 30);
      ctx.strokeStyle = '#ffd319'; ctx.strokeRect(w / 2 - tw / 2 + 0.5, 84.5, tw - 1, 29);
      ctx.fillStyle = '#ffd319'; ctx.fillText(this.msg, w / 2, 104);
      ctx.globalAlpha = 1;
    }
  }

  _drawHome(ctx, w, h) {
    const M = this.game.menu;
    const items = this.homeItems();
    this._homeRects(w, h).forEach((r, i) => this._button(ctx, r, items[i], i === this.sel, i === 0 ? '#05a9c8' : '#ff2a6d'));
    ctx.font = '13px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#05d9e8';
    const lines = [
      'Никнейм используется в сетевой игре и в таблице лидеров.',
      'Создайте комнату и сообщите код друзьям — или войдите по их коду.',
    ];
    // всё раскладываем от верхней кнопки, чтобы ничего не налезало на заголовок
    const top = this._homeRects(w, h)[0].y;
    lines.forEach((l, i) => ctx.fillText(l, w / 2, top - 34 + i * 18, w - 24));
    // три героя бок о бок — в свободном месте между подзаголовком и текстом
    const free = top - 50 - 84;
    if (free > 30) {
      const sc = Math.min(1.7, free / 44), hy = 84 + free / 2 + 4;
      ['dani', 'gal', 'daur'].forEach((id, i) => {
        ctx.save();
        ctx.translate(w / 2 - 90 + i * 90, hy);
        ctx.scale(sc, sc);
        Sprites.drawHuman(ctx, Sprites.HEROES[id], { t: this.t + i, walk: this.t * 9 + i, move: 0.7, weaponId: [null, null, 'shotgun'][i] });
        ctx.restore();
      });
    }
    void M;
  }

  _drawLobby(ctx, w, h) {
    const M = this.game.menu;
    const L = this._lobbyLayout(w, h);

    // --- код комнаты
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Courier New", monospace'; ctx.fillStyle = '#9a94b8';
    ctx.fillText('КОД КОМНАТЫ', w / 2, 92);
    ctx.save();
    ctx.font = 'bold 30px "Courier New", monospace'; ctx.letterSpacing = '6px';
    ctx.shadowColor = '#ffd319'; ctx.shadowBlur = 16; ctx.fillStyle = '#ffd319';
    ctx.fillText(this.code || '----', w / 2, 124);
    ctx.restore();

    // --- игроки
    const P = L.players;
    M.panel(ctx, P.x, P.y + 40, P.w, P.h - 40, '#05d9e8');
    ctx.textAlign = 'left'; ctx.font = 'bold 14px "Courier New", monospace'; ctx.fillStyle = '#05d9e8';
    ctx.fillText(`ИГРОКИ ${this.players.length}/3`, P.x + 14, P.y + 64);
    for (let s = 0; s < 3; s++) {
      const p = this.players.find(q => q.slot === s);
      const y = P.y + 78 + s * 66;
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(P.x + 10, y, P.w - 20, 58);
      ctx.fillStyle = SLOT_COLORS[s]; ctx.fillRect(P.x + 10, y, 3, 58);
      if (!p) {
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(this.t * 3 + s);
        ctx.font = '13px "Courier New", monospace'; ctx.fillStyle = '#9a94b8';
        ctx.fillText(this.connecting && s === 0 ? 'соединение с хостом…' : 'ожидание игрока…', P.x + 24, y + 33, P.w - 40);
        ctx.globalAlpha = 1;
        continue;
      }
      const img = p.char ? this.game.images[p.char] : null;
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, P.x + 20, y + 5, 48, 48);
      else { ctx.fillStyle = '#222'; ctx.fillRect(P.x + 20, y + 5, 48, 48); }
      ctx.strokeStyle = SLOT_COLORS[s]; ctx.strokeRect(P.x + 19.5, y + 4.5, 49, 49);
      ctx.font = 'bold 15px "Courier New", monospace'; ctx.fillStyle = '#fff';
      ctx.fillText(p.name + (p.pid === this.pid ? ' (вы)' : ''), P.x + 78, y + 24, P.w - 96);
      ctx.font = '12px "Courier New", monospace'; ctx.fillStyle = p.char ? '#ffd319' : '#888';
      ctx.fillText(p.char ? CHAR_NAMES[p.char] : 'выбирает…', P.x + 78, y + 44);
      if (p.host) { ctx.fillStyle = '#ff2a6d'; ctx.font = 'bold 11px "Courier New", monospace'; ctx.fillText('ХОСТ', P.x + P.w - 56, y + 44); }
    }

    // --- выбор персонажа
    const C = L.charsBox;
    M.panel(ctx, C.x, C.y + 40, C.w, C.h - 40, '#ffd319');
    ctx.textAlign = 'center'; ctx.font = 'bold 14px "Courier New", monospace'; ctx.fillStyle = '#ffd319';
    ctx.fillText('ВАШ ПЕРСОНАЖ  (A/D или клик)', C.x + C.w / 2, C.y + 64);
    const mine = this._myChar();
    L.chars.forEach((r, i) => {
      const id = CHAR_IDS[i];
      const owner = this.players.find(p => p.char === id && p.pid !== this.pid);
      const isMine = id === mine;
      const rr = { x: r.x, y: r.y + 30, w: r.w, h: r.w };
      ctx.save();
      if (owner) ctx.globalAlpha = 0.35;
      const img = this.game.images[id];
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, rr.x, rr.y, rr.w, rr.h);
      ctx.strokeStyle = isMine ? '#ffd319' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = isMine ? 3 : 1;
      if (isMine) { ctx.shadowColor = '#ffd319'; ctx.shadowBlur = 14 + 6 * Math.sin(this.t * 5); }
      ctx.strokeRect(rr.x - 1, rr.y - 1, rr.w + 2, rr.h + 2);
      ctx.restore();
      ctx.font = 'bold 13px "Courier New", monospace'; ctx.fillStyle = isMine ? '#ffd319' : '#c8c2e0';
      ctx.fillText(CHAR_NAMES[id], rr.x + rr.w / 2, rr.y + rr.h + 18);
      if (owner) { ctx.font = '11px "Courier New", monospace'; ctx.fillStyle = '#ff2a6d'; ctx.fillText(owner.name, rr.x + rr.w / 2, rr.y + rr.h + 32, rr.w + 10); }
    });
    // живой спрайт выбранного героя
    if (mine) {
      ctx.save();
      ctx.translate(C.x + C.w / 2, C.y + C.h - 52);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 6, 26, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(-Math.PI / 2 + Math.sin(this.t) * 0.3);
      ctx.scale(2.4, 2.4);
      Sprites.drawHuman(ctx, Sprites.HEROES[mine], { t: this.t, walk: this.t * 9, move: 0.8, weaponId: { dani: 'm4s', gal: 'flamer', daur: 'uzi' }[mine] });
      ctx.restore();
    }

    // --- чат
    const H = L.chat;
    M.panel(ctx, H.x, H.y + 40, H.w, H.h - 40, '#ff2a6d');
    ctx.textAlign = 'left'; ctx.font = 'bold 14px "Courier New", monospace'; ctx.fillStyle = '#ff2a6d';
    ctx.fillText('ЧАТ КОМНАТЫ', H.x + 14, H.y + 64);
    ctx.font = '12px "Courier New", monospace';
    const lines = [];
    for (const m of this.chat.slice(-14)) {
      const text = m.sys ? '• ' + m.text : `${m.name}: ${m.text}`;
      const words = text.split(' ');
      let line = '';
      for (const wd of words) {
        const test = line ? line + ' ' + wd : wd;
        if (ctx.measureText(test).width > H.w - 28 && line) { lines.push([line, m.sys]); line = wd; } else line = test;
      }
      lines.push([line, m.sys]);
    }
    const maxLines = Math.floor((H.h - 110) / 16);
    lines.slice(-maxLines).forEach(([l, sys], i) => {
      ctx.fillStyle = sys ? '#05d9e8' : '#e8e4f8';
      ctx.fillText(l, H.x + 14, H.y + 86 + i * 16, H.w - 28);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(H.x + 10, H.y + H.h - 34, H.w - 20, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('T / клик — написать сообщение', H.x + 18, H.y + H.h - 18);

    // --- кнопки
    const btns = this.lobbyButtons();
    L.buttons.forEach((r, i) => this._button(ctx, r, btns[i], i === this.lobbySel, btns[i] === 'НАЧАТЬ КОРПОРАТИВ' ? '#ff2a6d' : '#05a9c8'));
    if (!this.isHost) {
      ctx.textAlign = 'center'; ctx.font = '13px "Courier New", monospace';
      ctx.fillStyle = `rgba(255,211,25,${0.6 + 0.4 * Math.sin(this.t * 3)})`;
      ctx.fillText('Ожидаем, пока хост начнёт игру…', w / 2, L.buttons[0].y - 5, w - 24);
    }
  }
}

// =====================================================================
// Напарник на экране (данные приходят по сети)
// =====================================================================
class RemotePlayer {
  constructor(info, session) {
    this.session = session;
    this.pid = info.pid;
    this.name = info.name;
    this.charId = info.char || 'dani';
    this.slot = info.slot || 0;
    this.look = Sprites.HEROES[this.charId] || Sprites.HEROES.dani;
    this.w = 18; this.h = 18;
    this.x = this.tx = -9999; this.y = this.ty = -9999;
    this.angle = this.ta = 0;
    this.hp = 3; this.maxHp = 3;
    this.dead = false; this.deathAngle = 0;
    this.weaponId = null; this.ammo = 0;
    this.moveAmt = 0; this.walkPhase = 0; this.animT = 0;
    this.swing = null; this.punch = null; this.flash = false; this.recoil = 0; this.hurt = false;
    this.hurtCooldown = 0;
    this.hasState = false;
    this._shots = 0;
    this._seenBullets = new Set();
  }

  applyState(s, game) {
    if (!s) return;
    const first = !this.hasState;
    this.hasState = true;
    this.tx = s.x; this.ty = s.y; this.ta = s.a;
    if (first || Math.hypot(s.x - this.x, s.y - this.y) > 140) { this.x = s.x; this.y = s.y; this.angle = s.a; }
    this.hp = s.hp; this.maxHp = s.mhp;
    this.weaponId = s.w || null; this.ammo = s.am || 0;
    this.weapon2Id = s.w2 || null; this.spread = !!s.sp; this.ff = !!s.ff; this.grenades = s.gr || 0;
    const th = game.thoughts, pm = this.mode, ppc = this.pc;
    this.armor = s.ar || 0; this.mode = s.md || 0; this.pc = s.pc || 0; this.allies = s.al || [];
    if ((s.th || '') !== (this.thText || '')) { this.thText = s.th || ''; this.thT = 0; }
    if (!first && th) {
      if (this.mode === 1 && pm !== 1) th.react('mateRage', this.name);
      if (this.mode === 4 && pm !== 4) th.react('mateBabah', this.name);
      if (this.pc && !ppc) th.react('mateClone', this.name);
    }
    this.moveAmt = s.mv || 0;
    this.flash = !!s.fl; this.hurt = !!s.hc;
    if (s.sw) {
      if (!this.swing || s.sw[0] < this.swing.p - 0.25) this.swing = { p: s.sw[0], side: s.sw[1], stab: !!s.sw[2] };
    }
    if (s.pu) {
      if (!this.punch || s.pu[0] < this.punch.p - 0.25) this.punch = { p: s.pu[0], side: s.pu[1] };
    }
    if (s.d && !this.dead) {
      if (!first && game.thoughts) game.thoughts.react('mateDown', this.name);
      this.dead = true; this.deathAngle = s.da || 0;
      Effects.bloodSplat(this.x + 9, this.y + 9, this.deathAngle, 30);
      AudioSys.play('player_death');
    } else if (!s.d && this.dead) {
      if (game.thoughts) game.thoughts.react('mateUp', this.name);
      this.dead = false;
      Effects.ring(this.x + 9, this.y + 9, '60,255,140', 34);
    }
    // выстрелы напарника: звук, гильза, дым
    if ((s.sh || 0) > this._shots) {
      if (!first && this.weaponId && WEAPONS[this.weaponId]) {
        AudioSys.play(WEAPONS[this.weaponId].sound);
        Effects.casing(this.x + 9, this.y + 9, this.angle, this.weaponId === 'shotgun');
        this.recoil = 1;
      }
      this._shots = s.sh;
    }
    for (const b of s.bl || []) {
      if (this._seenBullets.has(b[0])) continue;
      this._seenBullets.add(b[0]);
      if (first) continue;
      const fb = new Bullet(b[1], b[2], Math.atan2(b[4], b[3]), Math.hypot(b[3], b[4]), true, b[5]);
      fb.cosmetic = true;
      game.fxBullets.push(fb);
    }
    if (this._seenBullets.size > 400) this._seenBullets = new Set([...this._seenBullets].slice(-200));
  }

  update(dt) {
    if (!this.hasState) return;
    const k = 1 - Math.exp(-dt * 14);
    this.x += (this.tx - this.x) * k;
    this.y += (this.ty - this.y) * k;
    let da = this.ta - this.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.angle += da * Math.min(1, dt * 18);
    this.animT += dt;
    this.thT = (this.thT || 0) + dt;
    // ярость напарника видна всем: красные искры вокруг
    if (this.mode === 1 && !this.dead && Math.random() < dt * 30) Effects.burst(this.x + 9 + Utils.rand(-12, 12), this.y + 9 + Utils.rand(-12, 12), '255,30,40', 1, 60);
    this.walkPhase += dt * 13 * this.moveAmt;
    this.recoil = Math.max(0, this.recoil - dt * 9);
    this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);
    // удары доигрываем локально, чтобы анимация была плавной
    const dur = (this.weaponId && MELEE_SWING[this.weaponId]) || 0.22;
    if (this.swing) { this.swing.p += dt / dur; if (this.swing.p >= 1) this.swing = null; }
    if (this.punch) { this.punch.p += dt / 0.22; if (this.punch.p >= 1) this.punch = null; }
  }

  // Урон считает хост: отправляем его владельцу героя
  takeDamage(amount, cause) {
    if (this.dead || this.hurtCooldown > 0 || !this.session) return;
    this.hurtCooldown = 0.6;
    const ev = { t: 'dmg', a: amount };
    if (cause) { ev.c = DEATH_KINDS.indexOf(cause.kind); ev.g = +(cause.angle || 0).toFixed(2); }
    this.session.sendTo(this.pid, ev);
  }

  draw(ctx) {
    if (!this.hasState) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    if (this.dead) {
      ctx.fillStyle = '#5a0010';
      ctx.beginPath(); ctx.ellipse(cx, cy, 20, 14, this.deathAngle, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.blood;
      ctx.beginPath(); ctx.ellipse(cx, cy, 18, 12, this.deathAngle, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.deathAngle + Math.PI); ctx.scale(1.15, 1.15);
      Sprites.drawHumanDown(ctx, this.look, { seed: this.slot * 991 + 7 });
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(cx + 2, cy + 4, 13, 9, this.angle, 0, Math.PI * 2); ctx.fill();
    drawModeAura(ctx, cx, cy, this.mode, this.animT);
    for (const [ax, ay, aa, perf] of this.allies || []) {
      ctx.save(); ctx.translate(ax + 8, ay + 8); ctx.rotate(aa); ctx.globalAlpha = perf ? 1 : 0.55;
      Sprites.drawHuman(ctx, perf ? Sprites.HEROES.dani : Ally.shadowLook(), { t: this.animT, walk: this.walkPhase, move: 0.5, weaponId: perf ? 'm4s' : 'glock' });
      ctx.restore();
    }
    // цветной круг под напарником, чтобы отличать от врагов
    ctx.strokeStyle = SLOT_COLORS[this.slot % 3]; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, cy + 2, 15, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(this.angle); ctx.scale(1.15, 1.15);
    const st = { t: this.animT, walk: this.walkPhase, move: this.moveAmt, weaponId: this.weaponId, recoil: this.recoil, flash: this.flash, hurt: this.hurt };
    if (this.swing && this.weaponId && WEAPONS[this.weaponId] && WEAPONS[this.weaponId].type === 'melee') st.swing = this.swing;
    if (this.weapon2Id && this.weaponId) st.dual = { a: this.weaponId, b: this.weapon2Id, spread: this.spread, f1: this.flash, f2: this.flash, r1: this.recoil, r2: this.recoil };
    if (this.punch && !this.weaponId) st.punch = this.punch;
    Sprites.drawHuman(ctx, this.look, st);
    ctx.restore();
    if (this.mode === 1) {
      // красное свечение ярости поверх напарника (без экранного фильтра)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pl = 0.5 + 0.5 * Math.sin(this.animT * 14);
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
      g.addColorStop(0, `rgba(255,40,40,${0.45 + 0.25 * pl})`); g.addColorStop(1, 'rgba(255,0,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.font = 'bold 9px "Courier New", monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,60,70,${0.7 + 0.3 * pl})`; ctx.fillText('ЯРОСТЬ', cx, cy + 28);
    }
  }
}

// =====================================================================
// Сетевая сессия матча
// =====================================================================
class CoopSession {
  constructor(game, info, net) {
    this.game = game;
    this.net = net;
    this.code = info.code;
    this.pid = info.pid;
    this.isHost = info.isHost;
    this.players = info.players.map(p => ({ ...p }));
    this.me = this.players.find(p => p.pid === this.pid) || { slot: 0, char: 'dani', name: Nick.get() };
    this.remotes = new Map();
    for (const p of this.players) if (p.pid !== this.pid) this.remotes.set(p.pid, new RemotePlayer(p, this));

    this.seed = info.seed;
    this.levelNo = info.lvl || 1;
    this.chatLines = [];
    this.events = [];      // клиент → хост
    this.out = {};         // хост → клиенты
    this.states = {};      // хост: последние состояния всех героев
    this.stT = 0; this.snapT = 0;
    this.seq = 0; this.snapSeq = 0;
    this._inSeq = {}; this._inSnap = 0;
    this.netId = 1;
    this.recentBullets = [];
    this.shots = 0;
    this.revive = {};
    this.teamOver = false;
    this.ended = false;
    this.closed = false;
    this.closeReason = '';
    this.overT = 0; this.lobbyT = 0;
    this.introT = 0;
    this._doorEvT = {};
    this._lastFrame = performance.now();
    // вкладка в фоне почти не рисует кадры — всё равно шлём данные, чтобы связь не рвалась
    this._hb = setInterval(() => {
      if (!this.closed && performance.now() - this._lastFrame > 400) this._flush(true);
    }, 250);
  }

  get playerCount() { return 1 + this.remotes.size; }

  event(e) { if (!this.isHost) this.events.push(e); }
  sendTo(pid, e) { if (!this.out[pid]) this.out[pid] = []; this.out[pid].push(e); }

  sendChat(text) { this.game.coopUI.sendChat(text); }

  pushChatLine(m) {
    this.chatLines.push({ name: m.name, text: m.text, sys: !!m.sys, t: 12 });
    if (this.chatLines.length > 30) this.chatLines.shift();
    if (!m.sys && m.name !== this.me.name) AudioSys.play('menu_move');
  }

  // Игрок вышел из матча: убираем его героя (сообщение в чат присылает хост)
  onLeft(pid) {
    this.remotes.delete(pid);
    delete this.states[pid];
    delete this.revive[pid];
  }

  dispose() {
    clearInterval(this._hb);
    this.closed = true;
  }

  // Подготовка уровня у клиента: враги становятся "репликами" хоста
  prepareLevel() {
    const g = this.game;
    if (!this.isHost) {
      g.pickups = [];
      g.enemies.forEach((e, i) => this._markReplica(e, i));
      g.level.addNoise = (x, y, r) => this.event({ t: 'noise', x: Math.round(x), y: Math.round(y), r });
      g.level.netClient = true;
      g.level.onNetDamage = (k, i, a) => this.event({ t: 'env', k, i, a });
      g.level.doors.forEach((d, i) => {
        const orig = d.push.bind(d);
        d.push = (en, ex, ey, vx, vy, byPlayer) => {
          orig(en, ex, ey, vx, vy, byPlayer);
          if (byPlayer && ex !== undefined) {
            d._localPushT = 0.4;
            const now = performance.now();
            if (!this._doorEvT[i] || now - this._doorEvT[i] > 70) {
              this._doorEvT[i] = now;
              this.event({ t: 'door', d: i, x: Math.round(ex), y: Math.round(ey), vx: Math.round(vx), vy: Math.round(vy) });
            }
          }
        };
      });
    }
    for (const rp of this.remotes.values()) { rp.dead = false; rp.hasState = false; }
    this.revive = {};
  }

  _markReplica(e, i) {
    e._replica = true;
    e._idx = i;
    const cz = c => c ? { c: DEATH_KINDS.indexOf(c.kind), g: +(c.angle || 0).toFixed(2), b: c.by || '' } : {};
    e.takeDamage = (a, pickups, cause) => this.event({ t: 'hit', e: e._idx, k: 'dmg', a: a || 1, ...cz(cause) });
    e.stun = () => { if (!e.stunned && !e.dead) this.event({ t: 'hit', e: e._idx, k: 'stun' }); };
    e.bossStun = () => { if (!e.dead) this.event({ t: 'hit', e: e._idx, k: 'bstun' }); };
    e.die = (pickups, cause) => { if (!e.dead) this.event({ t: 'hit', e: e._idx, k: 'kill', ...cz(cause) }); };
  }

  // ---------- каждый кадр ----------
  update(dt) {
    this._lastFrame = performance.now();
    this._flush(false, dt);
    for (const rp of this.remotes.values()) rp.update(dt);
    for (const l of this.chatLines) l.t -= dt;
    const now = performance.now() / 1000;
    this.recentBullets = this.recentBullets.filter(b => now - b.t < 0.6);
    if (!this.isHost) {
      for (const d of this.game.level ? this.game.level.doors : []) if (d._localPushT > 0) d._localPushT -= dt;
    }
  }

  // Новые пули своего героя — чтобы напарники их увидели
  trackMyBullets() {
    const now = performance.now() / 1000;
    for (const b of this.game.bullets) {
      if (!b.isPlayer || b.netId) continue;
      b.netId = this.pid + ':' + (this.netId++);
      this.recentBullets.push({ t: now, d: [b.netId, Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), b.color] });
    }
  }

  _buildMe() {
    const p = this.game.player;
    if (!p) return null;
    const st = p._animState();
    return {
      x: Math.round(p.x), y: Math.round(p.y), a: +p.angle.toFixed(2),
      hp: p.hp, mhp: p.maxHp, w: p.weapon ? p.weapon.id : '', am: p.weapon ? p.weapon.ammo : 0,
      mv: +p.moveAmt.toFixed(2),
      sw: st.swing ? [+st.swing.p.toFixed(2), st.swing.side, st.swing.stab ? 1 : 0] : 0,
      pu: st.punch ? [+st.punch.p.toFixed(2), st.punch.side] : 0,
      fl: p.flashTimer > 0 ? 1 : 0, hc: p.hurtCooldown > 0.45 ? 1 : 0,
      d: p.dead ? 1 : 0, da: +(p.deathAngle || 0).toFixed(2),
      sh: p._netShots || 0,
      w2: p.weapon2 ? p.weapon2.id : '', am2: p.weapon2 ? p.weapon2.ammo : 0, sp: p.dualSpread ? 1 : 0,
      ff: (p._ffT || 0) > 0 ? 1 : 0, gr: p.grenades || 0,
      ar: p.armor || 0, md: p.dashT > 0 ? 3 : p.rageT > 0 ? 1 : p.babahReady ? 4 : 0,
      pc: this.game.allies.some(a => a.kind === 'perfect' && !a.dead) ? 1 : 0,
      al: this.game.allies.filter(a => !a.dead).map(a => [Math.round(a.x), Math.round(a.y), +a.angle.toFixed(2), a.kind === 'perfect' ? 1 : 0]),
      bl: this.recentBullets.map(b => b.d),
      th: this.game.thoughts && this.game.thoughts.cur ? this.game.thoughts.cur.text : '',
    };
  }

  _buildSnap() {
    const g = this.game;
    if (!g.level || !g.level.doors) return null;
    for (const p of g.pickups) if (!p.netId) p.netId = this.netId++;
    for (const b of g.bullets) if (!b.netId) b.netId = this.netId++;
    let st = 'play';
    if (this.teamOver) st = 'over';
    else if (g.state === 'levelClear') st = 'clear';
    return {
      lvl: this.levelNo, seed: this.seed, st, gym: g.gym ? 1 : 0,
      sc: g.score, k: g.kills, tot: g.totalEnemies, cb: g.combo, ct: +(g.comboTimer || 0).toFixed(2),
      en: g.enemies.map(e => [
        Math.round(e.x), Math.round(e.y), +e.angle.toFixed(2),
        (e.dead ? 1 : 0) | (e.stunned ? 2 : 0) | (e.type === 'sniper' && e.state === 'attack' ? 4 : 0),
        e.hp, e.weapon ? e.weapon.id : '', e._shots || 0,
        e.swingTimer > 0 ? Math.round((1 - e.swingTimer / (e.swingDur || 0.3)) * 100) : 0,
        e.type, e.seed, e.isBoss ? BOSS_PHASES.indexOf(e.phase) : 0, e.maxHp, e.swingSide || 1,
        e.deathAnim ? DEATH_KINDS.indexOf(e.deathAnim.kind) + 10 * DEATH_POSES.indexOf(e.deathAnim.endPose || 'back') + (e.deathAnim.crawl || e.deathAnim.pose === 'crawl' ? 100 : 0) : -1,
        +(e.deathAngle || 0).toFixed(2),
      ]),
      dr: g.level.doors.map(d => d.broken ? 9 : Math.round(d.angle * 100) / 100),
      fd: g.level.destroyed || [],
      wb: g.level.brokenWindows || [],
      pk: g.pickups.filter(p => !p.pickedUp).map(p => [p.netId, Math.round(p.x), Math.round(p.y), p.isHealth ? 1 : p.isGrenade ? 2 : p.isArmor ? 3 : 0, p.weapon ? p.weapon.id : '', p.thrown ? 1 : 0]),
      pj: g.projectiles.map(pr => { if (!pr.netId) pr.netId = this.netId++; return [pr.netId, pr.kind === 'rocket' ? 0 : 1, Math.round(pr.x), Math.round(pr.y), +(pr.a || pr.rot || 0).toFixed(2), Math.round(pr.z || 0)]; }),
      ex: (g.explosions || []).filter(x => performance.now() - x.t < 1500).map(x => [x.id, x.x, x.y, x.r]),
      bu: g.bullets.filter(b => !b.isPlayer && !b.dead).map(b => [b.netId, Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), b.color]),
      rv: Object.fromEntries(Object.entries(this.revive).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    };
  }

  // ---------- обмен данными по P2P ----------
  // Состояние героев ~20 раз/с, снимок мира от хоста ~15 раз/с, события — сразу.
  _flush(force, dt = 0) {
    if (this.closed || !this.net) return;
    this.stT -= dt; this.snapT -= dt;
    if (this.stT <= 0 || force) { this.stT = 0.05; this._sendStates(); }
    if (this.isHost && (this.snapT <= 0 || force)) { this.snapT = 0.066; this._sendSnap(); }
    if (this.isHost) {
      for (const [pid, l] of Object.entries(this.out)) if (l.length) this.net.send(pid, { t: 'evs', l });
      this.out = {};
    } else if (this.events.length) {
      this.net.send('host', { t: 'ev', l: this.events });
      this.events = [];
    }
  }

  _sendStates() {
    const me = this._buildMe();
    if (!me) return;
    this.seq++;
    if (!this.isHost) { this.net.send('host', { t: 'st', q: this.seq, s: me }, true); return; }
    this.states[this.pid] = me;
    for (const pid of this.remotes.keys()) {
      const s = {};
      for (const [q, st] of Object.entries(this.states)) if (q !== pid) s[q] = st;
      this.net.send(pid, { t: 'sts', q: this.seq, s }, true);
    }
  }

  _sendSnap() {
    const g = this.game;
    if (!(g.state === 'playing' || g.state === 'levelClear' || this.teamOver)) return;
    const snap = this._buildSnap();
    if (!snap) return;
    this.snapSeq++;
    this.net.broadcast({ t: 'snap', q: this.snapSeq, s: snap }, true);
  }

  // Сообщения матча (лобби-сообщения разбирает CoopUI)
  onNet(pid, m) {
    const g = this.game;
    if (m.t === 'gb' || m.t === 'gk' || m.t === 'gr') { if (g.gym) g.gym.onNet(pid, m); return; }
    try {
      if (this.isHost) {
        if (m.t === 'st') {
          if (m.q <= (this._inSeq[pid] || 0)) return;     // устаревший пакет пришёл позже нового
          this._inSeq[pid] = m.q;
          this.states[pid] = m.s;
          const rp = this.remotes.get(pid);
          if (rp) rp.applyState(m.s, g);
        } else if (m.t === 'ev') for (const e of m.l || []) this._hostEvent(pid, e);
      } else {
        if (m.t === 'sts') {
          if (m.q <= (this._inSeq.host || 0)) return;
          this._inSeq.host = m.q;
          for (const [q, st] of Object.entries(m.s || {})) { const rp = this.remotes.get(q); if (rp) rp.applyState(st, g); }
        } else if (m.t === 'snap') {
          if (m.q <= this._inSnap) return;
          this._inSnap = m.q;
          this._applySnap(m.s);
        } else if (m.t === 'evs') for (const e of m.l || []) this._clientEvent(e);
      }
    } catch (err) { console.error('coop net', m && m.t, err); }
  }

  // ---------- хост: события от клиентов ----------
  _hostEvent(pid, e) {
    const g = this.game;
    const rp = this.remotes.get(pid);
    if (!g.level || !e) return;
    if (e.t === 'env') {
      if (e.k === 'f') g.level.damageFurniture(e.i, e.a || 1);
      else if (e.k === 'w') g.level.damageWindow(e.i);
      else if (e.k === 'd') g.level.damageDoor(e.i, e.a || 1);
      return;
    }
    if (e.t === 'hit') {
      const en = g.enemies[e.e];
      if (!en || en.dead) return;
      const cause = e.c !== undefined && e.c >= 0 ? { kind: DEATH_KINDS[e.c], angle: e.g, by: e.b || (rp && rp.charId) } : undefined;
      if (e.k === 'dmg') {
        en.takeDamage(e.a || 1, g.pickups, cause);
        en.particles.push(...Utils.spawnBloodParticles(en.cx(), en.cy(), 10));
      } else if (e.k === 'stun') en.stun();
      else if (e.k === 'bstun') { if (en.bossStun) en.bossStun(1.0); }
      else if (e.k === 'kill') en.die(g.pickups, cause);
    } else if (e.t === 'door') {
      const d = g.level.doors[e.d];
      if (d) d.push(g.enemies, e.x, e.y, e.vx, e.vy, true);
    } else if (e.t === 'take') {
      const p = g.pickups.find(q => q.netId === e.p && !q.pickedUp);
      if (!p || !rp || rp.dead) return;
      const slot = pickupSlot({ hp: rp.hp, maxHp: rp.maxHp, armor: rp.armor, charId: rp.charId, grenades: rp.grenades, w1: rp.weaponId, w2: rp.weapon2Id }, p);
      if (!slot) return;
      p.pickedUp = true;
      if (slot === 'health') { this.sendTo(pid, { t: 'heal' }); rp.hp++; }
      else if (slot === 'grenade') { this.sendTo(pid, { t: 'gren+' }); rp.grenades = (rp.grenades || 0) + 1; }
      else if (slot === 'armor') { this.sendTo(pid, { t: 'armor+' }); rp.armor = 2; }
      else {
        if (slot === 'w1') rp.weaponId = p.weapon.id; else rp.weapon2Id = p.weapon.id;
        this.sendTo(pid, { t: 'give', w: p.weapon.id, am: p.weapon.ammo, s: slot });
      }
    } else if (e.t === 'gren') {
      g.projectiles.push(new Grenade(e.x, e.y, e.vx, e.vy, rp && rp.charId));
    } else if (e.t === 'rocket') {
      g.projectiles.push(new Rocket(e.x, e.y, e.a, rp && rp.charId));
    } else if (e.t === 'throw') {
      if (!WEAPONS[e.w]) return;
      const p = new Pickup(e.x, e.y, makeWeapon(e.w, e.am));
      p.throwAt(e.a, 1200);
      g.pickups.push(p);
    } else if (e.t === 'pull') {
      if (rp && !rp.dead) g._arsenalFor(rp, pid, e.n);
    } else if (e.t === 'noise') {
      g.level.addNoise(e.x, e.y, Math.min(600, e.r || 300));
    }
  }

  // ---------- клиент: события от хоста ----------
  _clientEvent(e) {
    const p = this.game.player;
    if (!p) return;
    if (e.t === 'dmg') { p.takeDamage(e.a || 1, e.c >= 0 ? { kind: DEATH_KINDS[e.c], angle: e.g } : undefined); this.game.shake = Math.max(this.game.shake, 0.6); this.game.chromaticOffset = 10; }
    else if (e.t === 'heal') { if (p.hp < p.maxHp) { p.hp++; AudioSys.play('pickup_health'); } }
    else if (e.t === 'adm') {
      // враг хоста ударил моего клона
      const a = this.game.allies.filter(q => !q.dead)[e.i];
      if (a) a.hit(1);
    }
    else if (e.t === 'give' && e.fx !== undefined) {
      // арсенал: ствол летит к Дауру и попадает в руку по прилёту
      this.game.pulls.push({ w: makeWeapon(e.w, e.am), sx: e.fx, sy: e.fy, x: e.fx, y: e.fy, t: 0, target: p, equip: true });
    }
    else if (e.t === 'give') {
      if (e.s === 'w2') { if (!p.weapon2) p.weapon2 = prepWeapon(p.charId, makeWeapon(e.w, e.am)); }
      else if (!p.weapon) p.weapon = prepWeapon(p.charId, makeWeapon(e.w, e.am));
      AudioSys.play('pickup_weapon');
    }
    else if (e.t === 'gren+') { p.grenades = (p.grenades || 0) + 1; AudioSys.play('pickup_weapon'); }
    else if (e.t === 'armor+') { p.armor = 2; AudioSys.play('pickup_weapon'); Effects.popup(p.x + 9, p.y - 8, '+БРОНЯ', '#5aa8ff', 12); }
    else if (e.t === 'kc') { p.kills = e.n; }
    else if (e.t === 'chg') { p.charge = e.n; }
    else if (e.t === 'mode') {
      this.game._applyMode(p, e.m);
    }
    else if (e.t === 'revive') { p.revive(); }
  }

  // ---------- клиент: применяем снимок мира ----------
  _applySnap(s) {
    const g = this.game;
    if (s.gym && !g.gym && s.lvl === this.levelNo) { g.startGym(); return; }
    if (s.lvl !== this.levelNo) {
      this.levelNo = s.lvl;
      this.seed = s.seed;
      g.startCoopLevel(s.seed);
    }
    if (!g.level || !g.level.doors) return;
    g.score = s.sc; g.kills = s.k; g.totalEnemies = s.tot; g.combo = s.cb; g.comboTimer = s.ct;

    if (s.st === 'clear' && g.state === 'playing') { g.state = 'levelClear'; g.levelClearTimer = g._lcMax = 2.6; AudioSys.play('game_start'); }
    if (s.st === 'over' && !this.teamOver) { this.teamOver = true; g.enterTeamOver(); }

    // враги
    s.en.forEach((a, i) => {
      let e = g.enemies[i];
      if (!e || e.seed !== a[9]) {
        e = this._createEnemy(a);
        g.enemies[i] = e;
      }
      if (!e._replica) this._markReplica(e, i);
      e._idx = i;
      this._applyEnemy(e, a, s.cb);
    });
    if (g.enemies.length > s.en.length) g.enemies.length = s.en.length;

    // двери (кроме тех, что мы только что толкнули сами)
    s.dr.forEach((ang, i) => {
      const d = g.level.doors[i];
      if (!d) return;
      if (ang === 9) { if (!d.broken) { d.hp = 1; d.damage(99); } return; }
      if (!(d._localPushT > 0)) { d.angle = ang; d.omega = 0; }
    });
    // разрушенная мебель и разбитые окна
    for (const i of s.fd || []) { const f = g.level.furniture[i]; if (f && !f.destroyed) g.level.destroyFurniture(i); }
    for (const i of s.wb || []) { const w = g.level.windows[i]; if (w && !w.broken) g.level.breakWindow(i); }

    // предметы
    const byId = new Map(g.pickups.map(p => [p.netId, p]));
    const next = [];
    for (const a of s.pk) {
      let p = byId.get(a[0]);
      if (p && (!!p.isHealth !== (a[3] === 1) || (p.weapon ? p.weapon.id : '') !== (a[4] || ''))) p = null;
      if (!p) {
        p = new Pickup(a[1], a[2], a[4] ? makeWeapon(a[4]) : null, a[3] === 1);
        if (a[3] === 2) p.isGrenade = true;
        if (a[3] === 3) p.isArmor = true;
        p.netId = a[0];
      }
      p.x = a[1]; p.y = a[2]; p.thrown = !!a[5];
      if (p.thrown) p.rotation += 0.6;
      next.push(p);
    }
    g.pickups = next;

    // вражеские пули: создаём новые и убираем исчезнувшие
    const live = new Set(s.bu.map(b => b[0]));
    g.fxBullets = g.fxBullets.filter(b => !b.enemyNet || live.has(b.netId));
    const have = new Set(g.fxBullets.filter(b => b.enemyNet).map(b => b.netId));
    for (const b of s.bu) {
      if (have.has(b[0])) continue;
      const fb = new Bullet(b[1], b[2], Math.atan2(b[4], b[3]), Math.hypot(b[3], b[4]), false, b[5]);
      fb.netId = b[0]; fb.enemyNet = true; fb.cosmetic = true;
      g.fxBullets.push(fb);
    }

    this.revive = s.rv || {};

    // гранаты и ракеты хоста — только картинка
    const prev = new Map(g.projectiles.map(pr => [pr.netId, pr]));
    g.projectiles = (s.pj || []).map(a => {
      let pr = prev.get(a[0]);
      if (!pr) { pr = a[1] === 0 ? new Rocket(a[2], a[3], a[4]) : new Grenade(a[2], a[3], 0, 0); pr.netId = a[0]; }
      pr.x = a[2]; pr.y = a[3];
      if (a[1] === 0) pr.a = a[4]; else { pr.rot = a[4]; pr.z = a[5]; pr.t += 0.1; pr.fuse = 1; }
      return pr;
    });
    // взрывы — эффекты один раз на каждый
    this._seenEx = this._seenEx || new Set();
    for (const x of s.ex || []) {
      if (this._seenEx.has(x[0])) continue;
      this._seenEx.add(x[0]);
      Explosives.explode(g, x[1], x[2], x[3], { cosmetic: true });
    }
  }

  // Огнемёт напарников: у хоста огонь наносит урон, у клиента — только картинка
  remoteFlames(dt) {
    for (const rp of this.remotes.values()) {
      if (!rp.hasState || rp.dead || !rp.ff) continue;
      rp._flT = (rp._flT || 0) - dt;
      if (rp._flT > 0) continue;
      rp._flT = 0.05;
      const a = rp.angle;
      Flames.spawn(rp.x + 9 + Math.cos(a) * 26, rp.y + 9 + Math.sin(a) * 26, a, this.isHost, rp.charId);
    }
  }

  _createEnemy(a) {
    const type = a[8];
    let e;
    if (type.startsWith('boss_')) {
      e = new Boss(a[0], a[1], type.slice(5), this.playerCount);
      e.maxHp = a[11];
      if (this.game.bossDirector) this.game.bossDirector.showBanner(e);
    } else {
      e = new Enemy(a[0], a[1], 'static', null, type);
      e.look = Sprites.enemyLook(type, a[9]);
    }
    e.seed = a[9];
    return e;
  }

  _applyEnemy(e, a, combo) {
    e._tx = a[0]; e._ty = a[1]; e._ta = a[2];
    if (!e._hasNet) { e.x = a[0]; e.y = a[1]; e.angle = a[2]; e._px = e.x; e._py = e.y; e._hasNet = true; e._netShots = a[6]; }
    const dead = !!(a[3] & 1), stunned = !!(a[3] & 2);
    if (dead && !e.dead) {
      e.dead = true; e.stunned = false;
      const code = a[13] >= 0 ? a[13] : 0;
      e._deathFx({ kind: DEATH_KINDS[code % 10] || 'bullet', angle: a[14] },
                 { pose: DEATH_POSES[Math.floor(code / 10) % 10] || 'back', crawl: code >= 100, angle: a[14] });
      const pts = 100 * Math.max(1, combo || 1);
      Effects.popup(e.cx(), e.cy() - 14, `+${pts}`, combo > 1 ? '#ff2a6d' : '#ffd319', 13 + Math.min(combo || 1, 5) * 2);
      if (combo > 1) Effects.popup(e.cx(), e.cy() - 30, `x${combo} КОМБО`, '#05d9e8', 11);
      if (e.isBoss) { Effects.screenFlash(0.45, '255,230,180'); Effects.popup(e.cx(), e.cy() - 44, `БОСС ПОВЕРЖЕН +${e.bossBonus}`, '#ffd319', 16); }
    } else if (!dead && stunned && !e.stunned) {
      e.stunned = true; e._stunFx();
    } else if (!stunned && e.stunned && !dead) e.stunned = false;
    e.state = (a[3] & 4) ? 'attack' : 'chase';
    e.laserAngle = a[2];
    e.hp = a[4];
    if (e.isBoss) { e.maxHp = a[11]; e.phase = BOSS_PHASES[a[10]] || 'hunt'; e.chargeAngle = e.angle; }
    const wid = a[5];
    if (!wid) { if (!e.isBoss) e.weapon = null; }
    else if (!e.weapon || e.weapon.id !== wid) e.weapon = makeWeapon(wid);
    if (a[6] > (e._netShots || 0)) {
      e._netShots = a[6];
      e.flashTimer = 0.06; e.recoil = 1;
      if (e.type === 'sniper') AudioSys.play('sniper_shot');
      else if (e.isBoss) { if (Math.random() < 0.5) AudioSys.play('shoot_uzi'); }
      else if (e.weapon) AudioSys.play(e.weapon.sound);
      Effects.casing(e.cx(), e.cy(), e.angle, e.weapon && e.weapon.id === 'shotgun');
    }
    if (a[7] > 0 && !(e.swingTimer > 0)) {
      e.swingDur = e.isBoss ? 0.36 : 0.3;
      e.swingSide = a[12] || 1;
      e.swingTimer = e.swingDur * (1 - a[7] / 100);
    }
  }

  // Плавное движение реплик врагов между снимками
  updateReplicas(dt) {
    const k = 1 - Math.exp(-dt * 12);
    for (const e of this.game.enemies) {
      if (e._hasNet) {
        e.x += (e._tx - e.x) * k;
        e.y += (e._ty - e.y) * k;
        let da = e._ta - e.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        e.angle += da * Math.min(1, dt * 14);
      }
      e._animTick(dt, this.game.level);
    }
  }

  // Пули своего героя попадают во врагов на нашем экране — сообщаем хосту
  clientBulletHits() {
    const g = this.game;
    for (const b of g.bullets) {
      if (b.dead || !b.isPlayer) continue;
      for (const e of g.enemies) {
        if (e.dead) continue;
        const r = e.isBoss ? 15 : 12;
        if (Utils.segDist(b.px, b.py, b.x, b.y, e.cx(), e.cy()) < r) {
          b.dead = true;
          e.takeDamage(b.dmg || 1, null, { kind: b.src === 'shotgun' ? 'shotgun' : 'bullet', angle: Math.atan2(b.vy, b.vx), by: b.owner });
          e.particles.push(...Utils.spawnBloodParticles(e.cx(), e.cy(), 10, Math.atan2(b.vy, b.vx)));
          break;
        }
      }
    }
  }

  // Клиент хочет подобрать предмет — решает хост
  clientPickups() {
    const g = this.game, pl = g.player;
    if (!pl || pl.dead) return;
    this._takeCd = Math.max(0, (this._takeCd || 0) - 1 / 60);
    for (const p of g.pickups) {
      if (p.thrown) continue;
      if (Utils.dist(p.x, p.y, pl.x + 9, pl.y + 9) > 24) continue;
      if (p.weapon && (pl._pullUntil || 0) > performance.now()) continue;
      const slot = pickupSlot({ hp: pl.hp, maxHp: pl.maxHp, armor: pl.armor, charId: pl.charId, grenades: pl.grenades, w1: pl.weapon && pl.weapon.id, w2: pl.weapon2 && pl.weapon2.id }, p);
      if (!slot) continue;
      if (p._reqT && performance.now() - p._reqT < 600) continue;
      if (slot.startsWith('w') && this._takeCd > 0) continue;
      p._reqT = performance.now();
      if (slot.startsWith('w')) this._takeCd = 0.6;
      this.event({ t: 'take', p: p.netId });
    }
  }

  // ---------- хост: подъём раненых и конец матча ----------
  hostUpdate(dt) {
    const g = this.game;
    const all = g.allPlayers();
    for (const P of all) {
      const id = P === g.player ? this.pid : P.pid;
      if (!P.dead) { delete this.revive[id]; continue; }
      if (P._reviveLock > 0) { P._reviveLock -= dt; continue; }
      const helper = all.find(Q => Q !== P && !Q.dead && Utils.dist(Q.x, Q.y, P.x, P.y) < 40);
      let v = this.revive[id] || 0;
      v = helper ? v + dt / 2.5 : Math.max(0, v - dt * 0.5);
      if (v >= 1) {
        v = 0;
        if (P === g.player) P.revive();
        else { this.sendTo(P.pid, { t: 'revive' }); P._reviveLock = 1.5; }
      }
      this.revive[id] = v;
    }
    if (!this.teamOver && all.every(P => P.dead)) {
      this.overT += dt;
      if (this.overT > 1.8) { this.teamOver = true; g.enterTeamOver(); }
    } else this.overT = 0;
  }

  // Хост: после экрана итогов все возвращаются в лобби
  get lobbyIn() { return Math.max(0, Math.ceil(LOBBY_RETURN - this.lobbyT)); }
  overUpdate(dt) {
    if (!this.isHost || !this.teamOver) return;
    this.lobbyT += dt;
    if (this.lobbyT >= LOBBY_RETURN) this.game.coopUI.backToLobby();
  }

  // ---------- отрисовка ----------
  // Имена и сердца над напарниками + круги подъёма (поверх тумана)
  drawWorldOverlay(ctx) {
    const g = this.game;
    const list = [[g.player, this.me.name, this.me.slot, this.pid], ...[...this.remotes.values()].map(r => [r, r.name, r.slot, r.pid])];
    for (const [P, name, slot, id] of list) {
      if (!P || (P.hasState === false)) continue;
      const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
      const prog = this.revive[id] || 0;
      if (P.dead) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.stroke();
        if (prog > 0) {
          ctx.strokeStyle = '#3fff8f'; ctx.shadowColor = '#3fff8f'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
      if (P === g.player) continue;
      ctx.save();
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = '#05030a';
      ctx.strokeText(name, cx, cy - 22);
      ctx.fillStyle = SLOT_COLORS[slot % 3];
      ctx.fillText(name, cx, cy - 22);
      const cells = P.maxHp + (P.armor || 0);
      for (let i = 0; i < cells; i++) {
        ctx.fillStyle = i >= P.maxHp ? '#3a9cff' : i < P.hp ? '#ff2a6d' : 'rgba(255,255,255,0.2)';
        ctx.fillRect(cx - cells * 3 + i * 6 + 1, cy - 18, 5, 4);
      }
      if (P.dead) { ctx.fillStyle = '#ff4060'; ctx.fillText('РАНЕН', cx, cy + 32); }
      ctx.restore();
    }
  }

  // ---------- стрелки к напарникам за краем экрана ----------
  drawTeamArrows(ctx, W, H, scale) {
    const g = this.game, cam = g.cam;
    if (!cam) return;
    for (const rp of this.remotes.values()) {
      if (!rp.hasState) continue;
      const sx = (rp.x + 9 - cam.x) * cam.zoom, sy = (rp.y + 9 - cam.y) * cam.zoom;
      if (sx > 16 && sy > 16 && sx < W - 16 && sy < H - 16) continue;
      const cx = W / 2, cy = H / 2, a = Math.atan2(sy - cy, sx - cx);
      const k = Math.min((W / 2 - 34) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 34) / Math.abs(Math.sin(a) || 1e-6));
      const ex = Utils.clamp(cx + Math.cos(a) * k, 30, W - 30), ey = Utils.clamp(cy + Math.sin(a) * k, (g._hudBottom || 90 * scale) + 50 * scale, H - 30);   // не залезать на панели HUD
      const col = rp.dead ? '#ff4060' : SLOT_COLORS[rp.slot % 3];
      ctx.save();
      ctx.translate(ex, ey);
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, -10); ctx.lineTo(-4, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
      ctx.restore();
      // имя и расстояние
      const dist = Math.round(Math.hypot(rp.x - g.player.x, rp.y - g.player.y) / TILE);
      ctx.font = `bold ${Math.round(10 * scale + 1)}px "Courier New", monospace`; ctx.textAlign = 'center';
      const tx = -Math.cos(a) * 22, ty = -Math.sin(a) * 22 + 4;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      const label = `${rp.name}${rp.dead ? ' ✚' : ''} ${dist}м`;
      ctx.strokeText(label, tx, ty); ctx.fillStyle = col; ctx.fillText(label, tx, ty);
      ctx.restore();
    }
  }

  // Панель команды: здоровье всех игроков постоянно на экране
  drawPartyHud(ctx, W, scale) {
    const g = this.game;
    let y = (g._hudBottom || 84 * scale) + 5 * scale;
    for (const rp of this.remotes.values()) {
      const x = 14 * scale;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, 200 * scale, 30 * scale);
      ctx.fillStyle = SLOT_COLORS[rp.slot % 3]; ctx.fillRect(x, y, 3 * scale, 30 * scale);
      const img = g.images[rp.charId];
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x + 6 * scale, y + 3 * scale, 24 * scale, 24 * scale);
      ctx.font = `bold ${12 * scale}px "Courier New", monospace`; ctx.textAlign = 'left';
      ctx.fillStyle = '#fff'; ctx.fillText(rp.name, x + 36 * scale, y + 13 * scale, 120 * scale);
      if (!rp.hasState) { ctx.fillStyle = '#888'; ctx.fillText('подключается…', x + 36 * scale, y + 26 * scale); }
      else if (rp.dead) {
        const prog = this.revive[rp.pid] || 0;
        ctx.fillStyle = '#ff4060'; ctx.fillText(prog > 0 ? `ПОДНИМАЮТ ${Math.round(prog * 100)}%` : 'РАНЕН — ПОДНИМИТЕ!', x + 36 * scale, y + 26 * scale);
      } else {
        const cells = rp.maxHp + (rp.armor || 0);
        for (let i = 0; i < cells; i++) {
          ctx.fillStyle = i >= rp.maxHp ? '#3a9cff' : i < rp.hp ? '#ff2a6d' : '#3a2a3a';
          ctx.fillRect(x + 36 * scale + i * 10 * scale, y + 18 * scale, 8 * scale, 7 * scale);
        }
        ctx.fillStyle = '#9a94b8'; ctx.font = `${10 * scale}px "Courier New", monospace`;
        ctx.fillText(rp.weaponId ? WEAPONS[rp.weaponId].name : 'кулаки', x + 36 * scale + cells * 10 * scale + 6, y + 25 * scale, 200 * scale - (36 + cells * 10 + 10) * scale);
      }
      y += 34 * scale;
    }
  }

  drawChat(ctx, W, H) {
    const typing = TextField.active;
    const lines = this.chatLines.filter(l => typing || l.t > 0).slice(-7);
    const x = 14, y0 = H - 110;
    ctx.save();
    ctx.font = '13px "Courier New", monospace';
    ctx.textAlign = 'left';
    lines.forEach((l, i) => {
      const y = y0 - (lines.length - 1 - i) * 18;
      ctx.globalAlpha = typing ? 1 : Math.min(1, l.t / 2);
      const text = l.sys ? '• ' + l.text : `${l.name}: ${l.text}`;
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 4, y - 13, tw + 10, 17);
      ctx.fillStyle = l.sys ? '#05d9e8' : '#ffffff';
      if (!l.sys) {
        const p = this.players.find(q => q.name === l.name);
        ctx.fillStyle = p ? SLOT_COLORS[p.slot % 3] : '#fff';
        ctx.fillText(l.name + ':', x, y);
        ctx.fillStyle = '#fff';
        ctx.fillText(' ' + l.text, x + ctx.measureText(l.name + ':').width, y);
      } else ctx.fillText(text, x, y);
    });
    ctx.globalAlpha = 0.5;
    ctx.font = '11px "Courier New", monospace'; ctx.fillStyle = '#fff';
    if (!typing) ctx.fillText('T — чат', x, H - 88);
    ctx.restore();
  }

  // Заставка перед началом корпоратива
  drawIntro(ctx, W, H, t) {
    const M = this.game.menu;
    M.drawBackground(ctx, W, H, t, 0.35);
    // вспышки и полосы
    if (t < 0.25 || (t > 1.2 && t < 1.3)) { ctx.fillStyle = `rgba(255,255,255,${0.6 - (t % 1) * 2})`; ctx.fillRect(0, 0, W, H); }
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 5; i++) {
      const y = (t * 400 + i * 130) % (H + 100) - 50;
      ctx.fillStyle = i % 2 ? '#ff2a6d' : '#05d9e8';
      ctx.fillRect(0, y, W, 3);
    }
    ctx.restore();

    // заголовок
    const ts = Math.min(64, W * 0.09);
    const tIn = Utils.clamp(t / 0.6, 0, 1);
    const shake = t < 0.8 ? (Math.random() - 0.5) * 8 * (1 - tIn) : 0;
    ctx.save();
    ctx.translate(W / 2 + shake, 70 + (1 - tIn) * -60);
    ctx.globalAlpha = tIn;
    ctx.font = `bold ${ts}px "Courier New", monospace`; ctx.textAlign = 'center';
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(5,217,232,0.7)'; ctx.fillText('КОРПОРАТИВ', -3, 0);
    ctx.fillStyle = 'rgba(255,42,109,0.7)'; ctx.fillText('КОРПОРАТИВ', 3, 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = '#ff2a6d'; ctx.shadowBlur = 26; ctx.fillStyle = '#ffd319';
    ctx.fillText('КОРПОРАТИВ', 0, 0);
    ctx.shadowBlur = 0;
    ctx.font = `bold ${ts * 0.28}px "Courier New", monospace`; ctx.fillStyle = '#fff';
    ctx.fillText(`ЭТАЖ ${this.levelNo}  •  ${this.players.length} ${this.players.length === 1 ? 'ИГРОК' : 'ИГРОКА'}  •  КОМНАТА ${this.code}`, 0, ts * 0.55);
    ctx.restore();

    // карточки игроков вылетают по очереди
    const n = this.players.length;
    const cw = Math.min(220, (W - 80) / 3), chh = cw * 1.35;
    const gap = 26;
    const x0 = W / 2 - (n * cw + (n - 1) * gap) / 2;
    this.players.slice().sort((a, b) => a.slot - b.slot).forEach((p, i) => {
      const start = 0.7 + i * 0.45;
      const k = Utils.clamp((t - start) / 0.45, 0, 1);
      if (k <= 0) return;
      if (!p._introSfx) { p._introSfx = true; AudioSys.play('char_select'); }
      const e = 1 - Math.pow(1 - k, 3);
      const x = x0 + i * (cw + gap);
      const y = H * 0.26 + (1 - e) * H * 0.7;
      ctx.save();
      ctx.globalAlpha = e;
      ctx.translate(x + cw / 2, y + chh / 2);
      ctx.rotate((1 - e) * (i % 2 ? 0.3 : -0.3));
      ctx.translate(-cw / 2, -chh / 2);
      M.panel(ctx, 0, 0, cw, chh, SLOT_COLORS[p.slot % 3], 0.9);
      const img = this.game.images[p.char];
      const is = cw - 24;
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, 12, 12, is, is);
      ctx.strokeStyle = SLOT_COLORS[p.slot % 3]; ctx.lineWidth = 2; ctx.strokeRect(11, 11, is + 2, is + 2);
      // скан-полоса по портрету
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(12, 12 + ((t * 120 + i * 40) % is), is, 5);
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.min(22, cw / 9)}px "Courier New", monospace`;
      ctx.shadowColor = SLOT_COLORS[p.slot % 3]; ctx.shadowBlur = 12; ctx.fillStyle = SLOT_COLORS[p.slot % 3];
      ctx.fillText(p.name, cw / 2, is + 40, cw - 16);
      ctx.shadowBlur = 0;
      ctx.font = `bold ${Math.min(14, cw / 14)}px "Courier New", monospace`; ctx.fillStyle = '#fff';
      ctx.fillText(CHAR_NAMES[p.char] || '', cw / 2, is + 60);
      ctx.restore();
    });

    // финальная надпись
    if (t > 3.2) {
      const k = Utils.clamp((t - 3.2) / 0.3, 0, 1);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(W / 2, H - 50);
      ctx.scale(1 + (1 - k) * 1.5, 1 + (1 - k) * 1.5);
      ctx.font = `bold ${Math.min(44, W * 0.06)}px "Courier New", monospace`; ctx.textAlign = 'center';
      ctx.shadowColor = '#ff2a6d'; ctx.shadowBlur = 24; ctx.fillStyle = '#ffffff';
      ctx.fillText('ВПЕРЁД!', 0, 0);
      ctx.restore();
    }
  }
}

// Маленький индикатор пинга (правый верхний угол)
function drawPing(ctx, x, y, ms, isHost) {
  ctx.save();
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  const col = ms === null ? '#6a6488' : ms < 80 ? '#3dff8a' : ms < 160 ? '#ffd319' : '#ff2a6d';
  const text = ms === null ? (isHost ? 'ХОСТ' : '— мс') : `${ms} мс`;
  const tw = ctx.measureText(text).width;
  // столбики сигнала
  const bars = ms === null ? 0 : ms < 80 ? 3 : ms < 160 ? 2 : 1;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < bars ? col : 'rgba(255,255,255,0.15)';
    ctx.fillRect(x - tw - 18 + i * 4, y - 3 - i * 3, 3, 3 + i * 3);
  }
  ctx.fillStyle = col;
  ctx.fillText(text, x, y);
  ctx.restore();
}
