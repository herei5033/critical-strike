from flask import Flask, render_template, request, jsonify
import json
import os
import threading

app = Flask(__name__)

LEADERBOARD_FILE = os.path.join(os.path.dirname(__file__), 'leaderboard.json')
_lock = threading.Lock()
MAX_ENTRIES = 50

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

    name = str(data.get("name", "ANON"))[:16].strip() or "ANON"
    try:
        score = int(data.get("score", 0))
    except Exception:
        score = 0
    score = max(0, min(score, 10_000_000))

    entry = {"name": name, "score": score}

    with _lock:
        entries = _load()
        entries.append(entry)
        entries.sort(key=lambda e: e.get("score", 0), reverse=True)
        entries = entries[:MAX_ENTRIES]
        _save(entries)

    return jsonify({"ok": True, "entries": entries}), 201

if __name__ == '__main__':
    app.run(debug=True)