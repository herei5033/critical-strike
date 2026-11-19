// =====================================================================
// P2P-сеть корпоратива на WebRTC.
// Хост держит у себя всю сессию (лобби, чат, мир), игроки подключаются
// к нему напрямую. Сервер Flask нужен только чтобы передать SDP
// (offer/answer) при подключении — дальше он в игре не участвует.
//
// У каждого соединения два канала:
//   rel  — надёжный и упорядоченный: события, чат, лобби;
//   fast — без повторов: координаты игроков и снимки мира (лучше потерять
//          старый пакет, чем ждать его).
// =====================================================================

// Публичные STUN-серверы помогают узнать внешний адрес для прямого соединения
const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const PEER_TIMEOUT = 8000;      // мс без сообщений — соединение считается потерянным
const CONNECT_TIMEOUT = 20000;  // мс на подключение к хосту

async function signalPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let j = {};
  try { j = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error(j.error || ('Ошибка сети ' + r.status));
  return j;
}

class P2PPeer {
  constructor(net, pid) {
    this.net = net;
    this.pid = pid;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.rel = null; this.fast = null;
    this.open = false; this.closed = false;
    this.rtt = null;
    this.lastMsg = performance.now();
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === 'failed' || s === 'closed') this.close(s);
    };
  }

  _wire(ch) {
    ch.onopen = () => this._checkOpen();
    ch.onclose = () => this.close('closed');
    ch.onmessage = (ev) => {
      this.lastMsg = performance.now();
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      this.net._onMessage(this, m);
    };
  }

  _checkOpen() {
    if (this.open || !this.rel || !this.fast) return;
    if (this.rel.readyState !== 'open' || this.fast.readyState !== 'open') return;
    this.open = true;
    this.lastMsg = performance.now();
    this.net._onOpen(this);
  }

  // Хост: создаёт каналы и предложение
  async makeOffer() {
    this.rel = this.pc.createDataChannel('rel', { ordered: true });
    this.fast = this.pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 });
    this._wire(this.rel); this._wire(this.fast);
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await this._iceDone();
    return { type: 'offer', sdp: this.pc.localDescription.sdp };
  }

  // Игрок: принимает предложение и отвечает
  async takeOffer(sdp) {
    this.pc.ondatachannel = (ev) => {
      const ch = ev.channel;
      if (ch.label === 'rel') this.rel = ch; else this.fast = ch;
      this._wire(ch);
      if (ch.readyState === 'open') this._checkOpen();
    };
    await this.pc.setRemoteDescription({ type: 'offer', sdp });
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    await this._iceDone();
    return { type: 'answer', sdp: this.pc.localDescription.sdp };
  }

  async takeAnswer(sdp) { await this.pc.setRemoteDescription({ type: 'answer', sdp }); }

  // Ждём, пока соберутся все сетевые адреса (без «trickle» — проще и надёжнее через опрос)
  _iceDone() {
    if (this.pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(res => {
      const t = setTimeout(res, 3000);
      this.pc.addEventListener('icegatheringstatechange', () => {
        if (this.pc.iceGatheringState === 'complete') { clearTimeout(t); res(); }
      });
    });
  }

  send(m, fast) {
    const ch = fast ? this.fast : this.rel;
    if (!ch || ch.readyState !== 'open') return false;
    if (fast && ch.bufferedAmount > 256 * 1024) return false;   // канал забит — пропускаем устаревшее
    try { ch.send(JSON.stringify(m)); return true; } catch (e) { return false; }
  }

  close(reason) {
    if (this.closed) return;
    this.closed = true;
    try { if (this.rel) this.rel.close(); } catch (e) {}
    try { if (this.fast) this.fast.close(); } catch (e) {}
    try { this.pc.close(); } catch (e) {}
    this.net._onClose(this, reason);
  }
}

// h = { canAccept(pid) -> null|причина, onOpen(pid), onMessage(pid, m), onClose(pid, reason), onFail(reason) }
class P2PNet {
  constructor({ isHost, code, id, token, handlers }) {
    this.isHost = isHost;
    this.code = code;
    this.id = id;
    this.token = token;
    this.h = handlers;
    this.peers = new Map();
    this.closed = false;
    this.muted = false;
    this._done = [];
    this._polling = false;
    this._started = performance.now();
    this._pollT = setInterval(() => this._poll(), isHost ? 1000 : 500);
    this._pingT = setInterval(() => this._tick(), 1000);
    this._poll();
  }

  get hostPeer() { return this.peers.get('host'); }

  // Пинг (мс): у игрока — до хоста, у хоста — худший из игроков
  get ping() {
    const list = [...this.peers.values()].filter(p => p.open && p.rtt !== null).map(p => p.rtt);
    if (!list.length) return null;
    return Math.round(Math.max(...list));
  }

  send(pid, m, fast = false) {
    const p = this.peers.get(pid);
    return p && p.open ? p.send(m, fast) : false;
  }

  broadcast(m, fast = false, except = null) {
    for (const p of this.peers.values()) if (p.open && p.pid !== except) p.send(m, fast);
  }

  drop(pid, reason) { const p = this.peers.get(pid); if (p) p.close(reason); }

  signal(to, data) {
    return signalPost('/api/p2p/signal', { code: this.code, from: this.id, to, token: this.token, data }).catch(() => {});
  }

  async _poll() {
    if (this.closed || this._polling) return;
    // игрок уже подключился — сервер ему больше не нужен
    if (!this.isHost && this.hostPeer && this.hostPeer.open) return;
    this._polling = true;
    const done = this._done; this._done = [];
    try {
      const r = await signalPost('/api/p2p/poll', { code: this.code, id: this.id, token: this.token, done });
      if (this.closed) return;
      if (r.closed) {
        if (!this.isHost && !(this.hostPeer && this.hostPeer.open)) this._fail('Комната не найдена или закрыта');
        return;
      }
      for (const m of r.msgs || []) await this._onSignal(m);
    } catch (e) {
      this._done = done.concat(this._done);
    } finally {
      this._polling = false;
    }
  }

  async _onSignal(m) {
    try {
      if (this.isHost) {
        if (m.type === 'join') {
          const reason = this.h.canAccept ? this.h.canAccept(m.from) : null;
          if (reason) { this.signal(m.from, { type: 'reject', reason }); this._done.push(m.from); return; }
          const peer = new P2PPeer(this, m.from);
          this.peers.set(m.from, peer);
          const offer = await peer.makeOffer();
          if (!peer.closed) this.signal(m.from, offer);
        } else if (m.type === 'answer') {
          const peer = this.peers.get(m.from);
          if (peer && !peer.closed) await peer.takeAnswer(m.sdp);
        }
      } else {
        if (m.type === 'offer') {
          if (this.hostPeer) this.hostPeer.close('replaced');
          const peer = new P2PPeer(this, 'host');
          this.peers.set('host', peer);
          const answer = await peer.takeOffer(m.sdp);
          if (!peer.closed) this.signal('host', answer);
        } else if (m.type === 'reject') {
          this._fail(m.reason || 'Хост отклонил подключение');
        }
      }
    } catch (e) {
      console.error('P2P signal', e);
    }
  }

  _tick() {
    if (this.closed) return;
    const now = performance.now();
    for (const p of [...this.peers.values()]) {
      if (p.open) {
        p.send({ t: 'ping', ts: now }, true);
        if (now - p.lastMsg > PEER_TIMEOUT) p.close('timeout');
      } else if (now - p.lastMsg > CONNECT_TIMEOUT) p.close('timeout');
    }
    if (!this.isHost && !(this.hostPeer && this.hostPeer.open) && now - this._started > CONNECT_TIMEOUT) {
      this._fail('Не удалось соединиться с хостом напрямую (P2P). Возможно, сеть блокирует соединение.');
    }
  }

  _onOpen(peer) {
    if (this.isHost) this._done.push(peer.pid);   // освобождаем место в ящике сервера
    if (!this.muted && this.h.onOpen) this.h.onOpen(peer.pid);
  }

  _onMessage(peer, m) {
    if (m.t === 'ping') { peer.send({ t: 'pong', ts: m.ts }, true); return; }
    if (m.t === 'pong') {
      const rtt = performance.now() - m.ts;
      peer.rtt = peer.rtt === null ? rtt : peer.rtt * 0.7 + rtt * 0.3;
      return;
    }
    if (!this.muted && this.h.onMessage) this.h.onMessage(peer.pid, m);
  }

  _onClose(peer, reason) {
    if (this.peers.get(peer.pid) === peer) this.peers.delete(peer.pid);
    if (!this.closed && !this.muted && peer.open && this.h.onClose) this.h.onClose(peer.pid, reason);
    else if (!this.closed && !this.muted && !this.isHost && reason !== 'replaced' && !peer.open) this._fail('Не удалось соединиться с хостом напрямую (P2P)');
  }

  _fail(reason) {
    if (this.closed) return;
    const h = this.h;
    this.close();
    if (h.onFail) h.onFail(reason);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this._pollT); clearInterval(this._pingT);
    for (const p of [...this.peers.values()]) p.close('bye');
    this.peers.clear();
    if (this.isHost) signalPost('/api/p2p/close', { code: this.code, token: this.token }).catch(() => {});
  }

  // Закрытие вкладки: успеваем убрать комнату с сервера
  beacon() {
    if (this.isHost && navigator.sendBeacon) {
      navigator.sendBeacon('/api/p2p/close', new Blob([JSON.stringify({ code: this.code, token: this.token })], { type: 'application/json' }));
    }
  }
}
