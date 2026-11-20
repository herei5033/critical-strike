from flask import Flask, render_template, request, jsonify
from contextlib import contextmanager
import json
import os
import random
import sqlite3
import string
import tempfile
import threading
import time
import uuid

app = Flask(__name__)


# Версия статики = время изменения файла: после обновления браузер
# не берёт из кэша старые скрипты (иначе новые и старые файлы смешиваются).
@app.url_defaults
def _static_version(endpoint, values):
    if endpoint == 'static' and 'filename' in values:
        try:
            values['v'] = int(os.path.getmtime(os.path.join(app.static_folder, values['filename'])))
        except OSError:
            pass

LEADERBOARD_FILE = os.path.join(os.path.dirname(__file__), 'leaderboard.json')
_lock = threading.Lock()
MAX_ENTRIES = 50
CHARS = ('dani', 'gal', 'daur')


def _load():
    if not os.path.exists(LEADERBOARD_FILE):
        return []
    try:
        with open(LEADERBOARD_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _save(entries):
    try:
        with open(LEADERBOARD_FILE, 'w', encoding='utf-8') as f:
            json.dump(entries[:MAX_ENTRIES], f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def _clean_name(value, default='ANON', limit=16):
    name = ''.join(ch for ch in str(value or '') if ch.isprintable()).strip()[:limit]
    return name or default


@app.route("/")
def index():
    return render_template("index.html", media=_media_files())


# Какие аудио и картинки реально лежат в static/audio и static/img.
# Игра запрашивает только их — необязательные файлы, которых нет, не дают ошибок 404.
def _media_files():
    out = []
    for sub in ('audio', 'img'):
        root = os.path.join(app.static_folder, sub)
        for dirpath, _, files in os.walk(root):
            for f in files:
                if f.lower().endswith(('.mp3', '.ogg', '.wav', '.png', '.jpg', '.jpeg', '.webp')):
                    out.append(os.path.relpath(os.path.join(dirpath, f), app.static_folder).replace(os.sep, '/'))
    return sorted(out)


@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    with _lock:
        entries = _load()
    entries.sort(key=lambda e: e.get("score", 0), reverse=True)
    return jsonify(entries[:MAX_ENTRIES])


@app.route("/api/leaderboard", methods=["POST"])
def post_leaderboard():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "invalid payload"}), 400

    try:
        score = int(data.get("score", 0))
    except Exception:
        score = 0
    score = max(0, min(score, 10_000_000))

    players = []
    raw_players = data.get("players")
    if isinstance(raw_players, list):
        for p in raw_players[:3]:
            if not isinstance(p, dict):
                continue
            char = p.get("char") if p.get("char") in CHARS else None
            players.append({"name": _clean_name(p.get("name")), "char": char})

    if players:
        entry = {"name": " + ".join(p["name"] for p in players)[:52], "score": score,
                 "mode": "coop", "players": players}
    else:
        entry = {"name": _clean_name(data.get("name")), "score": score}
        if data.get("char") in CHARS:
            entry["char"] = data["char"]

    with _lock:
        entries = _load()
        entries.append(entry)
        entries.sort(key=lambda e: e.get("score", 0), reverse=True)
        entries = entries[:MAX_ENTRIES]
        _save(entries)

    return jsonify({"ok": True, "entries": entries}), 201


# =====================================================================
# КОРПОРАТИВ (P2P): сервер только помогает игрокам найти друг друга.
# Хост регистрирует код комнаты, игроки по коду обмениваются с ним
# WebRTC-сигналами (SDP). Дальше вся игра, лобби и чат идут напрямую
# между браузерами — сервер их не видит и не хранит.
# Почтовые ящики сигналов лежат во временной SQLite-базе и удаляются,
# когда хост перестаёт отмечаться.
# =====================================================================

COOP_DB = os.path.join(tempfile.gettempdir(), 'critical_strike_signal.db')
HOST_TIMEOUT = 25        # сек без опроса от хоста — комната пропадает
ROOM_IDLE_TIMEOUT = 600  # страховка: удалить любую запись старше 10 минут простоя
MAX_BOX = 40             # сообщений в одном ящике
MAX_SIGNAL = 24000       # размер одного сигнала (SDP) в символах


def _db():
    conn = sqlite3.connect(COOP_DB, timeout=5, isolation_level=None)
    conn.execute('CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, data TEXT NOT NULL, updated REAL NOT NULL)')
    return conn


@contextmanager
def _room_tx(code):
    """Атомарно читает и сохраняет комнату. yield-ит {'room': dict|None, 'delete': bool}."""
    conn = _db()
    try:
        conn.execute('BEGIN IMMEDIATE')
        now = time.time()
        conn.execute('DELETE FROM rooms WHERE updated < ?', (now - ROOM_IDLE_TIMEOUT,))
        row = conn.execute('SELECT data FROM rooms WHERE code = ?', (code,)).fetchone()
        room = json.loads(row[0]) if row else None
        if room is not None and now - room.get("hostSeen", 0) > HOST_TIMEOUT:
            conn.execute('DELETE FROM rooms WHERE code = ?', (code,))
            room = None
        box = {'room': room, 'delete': False}
        yield box
        if box['delete'] and box['room'] is not None:
            conn.execute('DELETE FROM rooms WHERE code = ?', (code,))
        elif box['room'] is not None:
            conn.execute('INSERT OR REPLACE INTO rooms (code, data, updated) VALUES (?, ?, ?)',
                         (code, json.dumps(box['room'], ensure_ascii=False, separators=(',', ':')), now))
        conn.execute('COMMIT')
    except Exception:
        try:
            conn.execute('ROLLBACK')
        except Exception:
            pass
        raise
    finally:
        conn.close()


def _new_code(conn):
    for _ in range(50):
        code = ''.join(random.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(4))
        row = conn.execute('SELECT data FROM rooms WHERE code = ?', (code,)).fetchone()
        if not row or time.time() - json.loads(row[0]).get("hostSeen", 0) > HOST_TIMEOUT:
            return code
    return uuid.uuid4().hex[:6].upper()


def _bad(msg, code=400):
    return jsonify({"error": msg}), code


def _push(room, to, msg):
    box = room["boxes"].setdefault(to, [])
    box.append(msg)
    del box[:-MAX_BOX]


def _req():
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).strip().upper()[:6]
    return data, code


@app.route("/api/p2p/host", methods=["POST"])
def p2p_host():
    """Хост открывает комнату: получает код и секретный токен."""
    conn = _db()
    try:
        conn.execute('BEGIN IMMEDIATE')
        code = _new_code(conn)
        token = uuid.uuid4().hex
        room = {"token": token, "hostSeen": time.time(), "peers": [], "boxes": {"host": []}}
        conn.execute('INSERT OR REPLACE INTO rooms (code, data, updated) VALUES (?, ?, ?)',
                     (code, json.dumps(room), time.time()))
        conn.execute('COMMIT')
    finally:
        conn.close()
    return jsonify({"code": code, "token": token})


@app.route("/api/p2p/join", methods=["POST"])
def p2p_join():
    """Игрок стучится в комнату по коду — хост получит уведомление и пришлёт предложение (offer)."""
    _, code = _req()
    with _room_tx(code) as box:
        room = box['room']
        if room is None:
            return _bad("Комната не найдена", 404)
        if len(room["peers"]) >= 12:
            return _bad("Слишком много попыток входа, попробуйте позже", 429)
        pid = uuid.uuid4().hex[:10]
        room["peers"].append(pid)
        room["boxes"][pid] = []
        _push(room, "host", {"from": pid, "type": "join"})
    return jsonify({"id": pid})


@app.route("/api/p2p/signal", methods=["POST"])
def p2p_signal():
    """Передать сигнал (offer/answer/reject) другой стороне."""
    data, code = _req()
    sender, to = str(data.get("from", "")), str(data.get("to", ""))
    payload = data.get("data")
    if not isinstance(payload, dict) or len(json.dumps(payload)) > MAX_SIGNAL:
        return _bad("Плохой сигнал")
    with _room_tx(code) as box:
        room = box['room']
        if room is None:
            return _bad("Комната не найдена", 404)
        if sender == "host":
            if data.get("token") != room["token"] or to not in room["peers"]:
                return _bad("Нет доступа", 403)
        elif sender not in room["peers"] or to != "host":
            return _bad("Нет доступа", 403)
        _push(room, to, {"from": sender, **payload})
    return jsonify({"ok": True})


@app.route("/api/p2p/poll", methods=["POST"])
def p2p_poll():
    """Забрать свои сигналы. Опрос хоста заодно держит комнату открытой."""
    data, code = _req()
    me = str(data.get("id", ""))
    with _room_tx(code) as box:
        room = box['room']
        if room is None:
            return jsonify({"closed": True})
        if me == "host":
            if data.get("token") != room["token"]:
                return _bad("Нет доступа", 403)
            room["hostSeen"] = time.time()
        elif me not in room["peers"]:
            return jsonify({"closed": True})
        msgs = room["boxes"].get(me, [])
        room["boxes"][me] = []
        # подключившиеся игроки больше не нужны в списке — освобождаем место
        for pid in data.get("done") or []:
            if me == "host" and pid in room["peers"]:
                room["peers"].remove(pid)
                room["boxes"].pop(pid, None)
    return jsonify({"msgs": msgs})


@app.route("/api/p2p/close", methods=["POST"])
def p2p_close():
    data, code = _req()
    with _room_tx(code) as box:
        if box['room'] is not None and data.get("token") == box['room']["token"]:
            box['delete'] = True
    return jsonify({"ok": True})


if __name__ == '__main__':
    app.run(debug=True, threaded=True)
