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
    return render_template("index.html")


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
# КОРПОРАТИВ: комнаты для совместной игры до 3 человек.
# Хранятся во временной SQLite-базе (общая для всех процессов веб-сервера)
# и удаляются после матча или через пару минут простоя. Чат живёт только
# внутри комнаты и пропадает вместе с ней.
# =====================================================================

COOP_DB = os.path.join(tempfile.gettempdir(), 'critical_strike_coop.db')
MAX_PLAYERS = 3
PLAYER_TIMEOUT = 10      # сек без запросов — игрок считается отключившимся
ROOM_IDLE_TIMEOUT = 120  # сек без запросов — комната удаляется
MAX_CHAT = 60


def _db():
    conn = sqlite3.connect(COOP_DB, timeout=5, isolation_level=None)
    conn.execute('CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, data TEXT NOT NULL, updated REAL NOT NULL)')
    return conn


@contextmanager
def _room_tx(code):
    """Атомарно читает и сохраняет комнату. yield-ит dict или None."""
    conn = _db()
    try:
        conn.execute('BEGIN IMMEDIATE')
        now = time.time()
        conn.execute('DELETE FROM rooms WHERE updated < ?', (now - ROOM_IDLE_TIMEOUT,))
        row = conn.execute('SELECT data FROM rooms WHERE code = ?', (code,)).fetchone()
        room = json.loads(row[0]) if row else None
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
        if not conn.execute('SELECT 1 FROM rooms WHERE code = ?', (code,)).fetchone():
            return code
    return uuid.uuid4().hex[:6].upper()


def _public_players(room):
    return [{"pid": pid, "name": p["name"], "char": p.get("char"), "slot": p["slot"],
             "host": pid == room["host"]}
            for pid, p in sorted(room["players"].items(), key=lambda kv: kv[1]["slot"])]


def _add_chat(room, name, text, system=False):
    text = ''.join(ch for ch in str(text) if ch.isprintable()).strip()[:120]
    if not text:
        return
    room["chatSeq"] += 1
    room["chat"].append({"n": room["chatSeq"], "name": name, "text": text, "sys": system})
    room["chat"] = room["chat"][-MAX_CHAT:]


def _drop_stale(room, now):
    gone = [pid for pid, p in room["players"].items() if now - p["seen"] > PLAYER_TIMEOUT]
    for pid in gone:
        name = room["players"][pid]["name"]
        del room["players"][pid]
        room["states"].pop(pid, None)
        room["toPlayer"].pop(pid, None)
        _add_chat(room, '', f'{name} отключился', system=True)
    return gone


def _bad(msg, code=400):
    return jsonify({"error": msg}), code


@app.route("/api/coop/create", methods=["POST"])
def coop_create():
    data = request.get_json(silent=True) or {}
    name = _clean_name(data.get("name"), 'ИГРОК', 14)
    conn = _db()
    try:
        conn.execute('BEGIN IMMEDIATE')
        code = _new_code(conn)
        pid = uuid.uuid4().hex[:10]
        room = {
            "code": code, "host": pid, "state": "lobby", "created": time.time(),
            "seed": None, "players": {pid: {"name": name, "char": "dani", "slot": 0, "seen": time.time()}},
            "chat": [], "chatSeq": 0, "snap": None, "snapSeq": 0,
            "states": {}, "toHost": [], "toPlayer": {},
        }
        _add_chat(room, '', f'{name} создал комнату {code}', system=True)
        conn.execute('INSERT INTO rooms (code, data, updated) VALUES (?, ?, ?)',
                     (code, json.dumps(room, ensure_ascii=False), time.time()))
        conn.execute('COMMIT')
    finally:
        conn.close()
    return jsonify({"code": code, "pid": pid})


@app.route("/api/coop/join", methods=["POST"])
def coop_join():
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).strip().upper()[:6]
    name = _clean_name(data.get("name"), 'ИГРОК', 14)
    with _room_tx(code) as box:
        room = box['room']
        if room is None:
            return _bad("Комната не найдена", 404)
        _drop_stale(room, time.time())
        if room["state"] != "lobby":
            return _bad("Игра уже началась", 409)
        if len(room["players"]) >= MAX_PLAYERS:
            return _bad("Комната заполнена (максимум 3 игрока)", 409)
        used_slots = {p["slot"] for p in room["players"].values()}
        used_chars = {p.get("char") for p in room["players"].values()}
        slot = next(s for s in range(MAX_PLAYERS) if s not in used_slots)
        char = next((c for c in CHARS if c not in used_chars), None)
        pid = uuid.uuid4().hex[:10]
        room["players"][pid] = {"name": name, "char": char, "slot": slot, "seen": time.time()}
        _add_chat(room, '', f'{name} присоединился', system=True)
    return jsonify({"code": code, "pid": pid})


@app.route("/api/coop/lobby", methods=["POST"])
def coop_lobby():
    """Опрос комнаты до старта: игроки, выбор персонажа, чат."""
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).upper()
    pid = str(data.get("pid", ""))
    with _room_tx(code) as box:
        room = box['room']
        if room is None or pid not in room["players"]:
            return jsonify({"state": "closed"})
        now = time.time()
        room["players"][pid]["seen"] = now
        _drop_stale(room, now)
        if room["host"] not in room["players"]:
            box['delete'] = True
            return jsonify({"state": "closed", "reason": "Хост покинул комнату"})

        char = data.get("char")
        if char in CHARS and room["state"] == "lobby":
            taken = {p.get("char") for q, p in room["players"].items() if q != pid}
            if char not in taken:
                room["players"][pid]["char"] = char
        if data.get("chat"):
            _add_chat(room, room["players"][pid]["name"], data["chat"])
        since = int(data.get("chatSince") or 0)
        return jsonify({
            "state": room["state"], "seed": room["seed"], "code": room["code"],
            "host": room["host"], "players": _public_players(room),
            "chat": [m for m in room["chat"] if m["n"] > since],
        })


@app.route("/api/coop/start", methods=["POST"])
def coop_start():
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).upper()
    pid = str(data.get("pid", ""))
    with _room_tx(code) as box:
        room = box['room']
        if room is None or room["host"] != pid:
            return _bad("Только хост может начать игру", 403)
        if any(not p.get("char") for p in room["players"].values()):
            return _bad("Не все выбрали персонажа", 409)
        room["state"] = "playing"
        room["seed"] = random.randint(1, 2_000_000_000)
        _add_chat(room, '', 'Корпоратив начинается!', system=True)
    return jsonify({"ok": True})


@app.route("/api/coop/tick", methods=["POST"])
def coop_tick():
    """Обмен данными во время матча.
    Клиент: присылает своё состояние и события для хоста, получает снимок мира.
    Хост: присылает снимок мира и события для клиентов, получает их состояния и события."""
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).upper()
    pid = str(data.get("pid", ""))
    with _room_tx(code) as box:
        room = box['room']
        if room is None or pid not in room["players"]:
            return jsonify({"state": "closed"})
        now = time.time()
        room["players"][pid]["seen"] = now
        gone = _drop_stale(room, now)
        if room["host"] not in room["players"]:
            box['delete'] = True
            return jsonify({"state": "closed", "reason": "Хост отключился"})
        is_host = pid == room["host"]

        if isinstance(data.get("me"), dict):
            room["states"][pid] = data["me"]
        if data.get("chat"):
            _add_chat(room, room["players"][pid]["name"], data["chat"])

        if is_host:
            if data.get("snap") is not None:
                room["snap"] = data["snap"]
                room["snapSeq"] += 1
            out = data.get("out")
            if isinstance(out, dict):
                for target, events in out.items():
                    if target in room["players"] and isinstance(events, list):
                        room["toPlayer"].setdefault(target, []).extend(events[:60])
            if data.get("ended"):
                room["state"] = "ended"
        else:
            events = data.get("events")
            if isinstance(events, list) and events:
                room["toHost"].extend([[pid, e] for e in events[:60]])
                room["toHost"] = room["toHost"][-400:]

        since = int(data.get("chatSince") or 0)
        resp = {
            "state": room["state"],
            "players": _public_players(room),
            "states": {q: s for q, s in room["states"].items() if q != pid},
            "chat": [m for m in room["chat"] if m["n"] > since],
            "gone": gone,
        }
        if is_host:
            resp["events"] = room["toHost"]
            room["toHost"] = []
        else:
            if room["snap"] is not None and room["snapSeq"] > int(data.get("snapSeq") or 0):
                resp["snap"] = room["snap"]
                resp["snapSeq"] = room["snapSeq"]
            resp["events"] = room["toPlayer"].pop(pid, [])
        return jsonify(resp)


@app.route("/api/coop/leave", methods=["POST"])
def coop_leave():
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).upper()
    pid = str(data.get("pid", ""))
    with _room_tx(code) as box:
        room = box['room']
        if room is None or pid not in room["players"]:
            return jsonify({"ok": True})
        name = room["players"][pid]["name"]
        # Хост ушёл или матч закончен — комната и чат удаляются целиком
        if pid == room["host"] or room["state"] == "ended":
            box['delete'] = True
        else:
            del room["players"][pid]
            room["states"].pop(pid, None)
            _add_chat(room, '', f'{name} вышел', system=True)
    return jsonify({"ok": True})


if __name__ == '__main__':
    app.run(debug=True, threaded=True)
