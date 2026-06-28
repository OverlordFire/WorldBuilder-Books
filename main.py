from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime, timezone

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

DB = "WB_Sql.db"

print("Banco:", os.path.abspath(DB))

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS Users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT    NOT NULL UNIQUE,
            email    TEXT    NOT NULL UNIQUE,
            password TEXT    NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS Stories (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name     TEXT    NOT NULL,
            user_id  INTEGER NOT NULL,
            genre    TEXT    DEFAULT '',
            status   TEXT    DEFAULT '',
            synopsis TEXT    DEFAULT '',
            image    TEXT    DEFAULT '',
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS Volumes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT    NOT NULL,
            story_id   INTEGER NOT NULL,
            user_id    INTEGER NOT NULL,
            order_num  INTEGER DEFAULT 0,
            FOREIGN KEY (story_id) REFERENCES Stories(id),
            FOREIGN KEY (user_id)  REFERENCES Users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS Chapters (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT    NOT NULL,
            volume_id INTEGER NOT NULL,
            story_id  INTEGER NOT NULL,
            user_id   INTEGER NOT NULL,
            content   TEXT    DEFAULT '',
            order_num INTEGER DEFAULT 0,
            FOREIGN KEY (volume_id) REFERENCES Volumes(id),
            FOREIGN KEY (story_id)  REFERENCES Stories(id),
            FOREIGN KEY (user_id)   REFERENCES Users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS Characters (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            name             TEXT    NOT NULL,
            user_id          INTEGER NOT NULL,
            story_role       TEXT    DEFAULT '',
            character_class  TEXT    DEFAULT '',
            age              TEXT    DEFAULT '',
            race             TEXT    DEFAULT '',
            gender           TEXT    DEFAULT 'N/A',
            description      TEXT    DEFAULT '',
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS Locations (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            user_id     INTEGER NOT NULL,
            loc_type    TEXT    DEFAULT '',
            loc_status  TEXT    DEFAULT '',
            loc_perigo  TEXT    DEFAULT '',
            loc_regiao  TEXT    DEFAULT '',
            description TEXT    DEFAULT '',
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS Objects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            user_id     INTEGER NOT NULL,
            obj_type    TEXT    DEFAULT '',
            element     TEXT    DEFAULT '',
            rarity      TEXT    DEFAULT '',
            status      TEXT    DEFAULT '',
            description TEXT    DEFAULT '',
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    """)
    # Safety migrations for existing databases
    for col in ["story_role", "character_class", "age", "race", "description"]:
        try: conn.execute(f"ALTER TABLE Characters ADD COLUMN {col} TEXT DEFAULT ''")
        except Exception: pass
    try: conn.execute("ALTER TABLE Characters ADD COLUMN gender TEXT DEFAULT 'N/A'")
    except Exception: pass
    for col in ["loc_type", "loc_status", "loc_perigo", "loc_regiao", "description"]:
        try: conn.execute(f"ALTER TABLE Locations ADD COLUMN {col} TEXT DEFAULT ''")
        except Exception: pass
    for col in ["obj_type", "element", "rarity", "status", "description"]:
        try: conn.execute(f"ALTER TABLE Objects ADD COLUMN {col} TEXT DEFAULT ''")
        except Exception: pass
    for table in ["Stories", "Characters", "Locations", "Objects"]:
        try: conn.execute(f"ALTER TABLE {table} ADD COLUMN image TEXT DEFAULT ''")
        except Exception: pass
    for col in ["genre", "status", "synopsis"]:
        try: conn.execute(f"ALTER TABLE Stories ADD COLUMN {col} TEXT DEFAULT ''")
        except Exception: pass
    try: conn.execute("ALTER TABLE Stories ADD COLUMN last_accessed TEXT DEFAULT NULL")
    except Exception: pass
    conn.commit()
    conn.close()

def touch_story(conn, story_id, user_id):
    try:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        conn.execute("UPDATE Stories SET last_accessed = ? WHERE id = ? AND user_id = ?", (now, story_id, user_id))
    except Exception:
        pass

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/register", methods=["POST"])
def register():
    data = request.json
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO Users (username, email, password) VALUES (?, ?, ?)",
            (data["username"], data["email"], generate_password_hash(data["password"]))
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"success": False, "message": "E-mail e senha são obrigatórios"})
    conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM Users WHERE email = ?", (data["email"],)
        ).fetchone()
        if user and check_password_hash(user["password"], data["password"]):
            return jsonify({
                "success": True,
                "user_id": user["id"],
                "username": user["username"],
                "email": user["email"]
            })
        return jsonify({"success": False, "message": "E-mail ou senha inválidos"})
    finally:
        conn.close()

@app.route("/get-items", methods=["GET"])
def get_items():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "Not logged in"})
    conn = get_db()
    try:
        result = {}
        for table in ["Stories", "Characters", "Locations", "Objects"]:
            rows = conn.execute(
                f"SELECT id, name, image, last_accessed FROM {table} WHERE user_id = ? ORDER BY id ASC" if table == "Stories" else f"SELECT id, name, image FROM {table} WHERE user_id = ? ORDER BY id ASC",
                (user_id,)
            ).fetchall()
            if table == "Stories":
                result[table] = [{"id": row["id"], "name": row["name"], "image": row["image"] or "", "last_accessed": row["last_accessed"]} for row in rows]
            else:
                result[table] = [{"id": row["id"], "name": row["name"], "image": row["image"] or ""} for row in rows]
        return jsonify({"success": True, "items": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/create-item", methods=["POST"])
def create_item():
    data = request.json
    section = data.get("section", "")
    name    = data.get("name", "").strip()
    user_id = data.get("user_id")
    allowed = ["Stories", "Characters", "Locations", "Objects"]
    if section not in allowed:
        return jsonify({"success": False, "error": "Invalid section"})
    if not name:
        return jsonify({"success": False, "error": "Name is required"})
    if not user_id:
        return jsonify({"success": False, "error": "Not logged in"})
    conn = get_db()
    try:
        cursor = conn.execute(
            f"INSERT INTO {section} (name, user_id) VALUES (?, ?)", (name, user_id)
        )
        new_id = cursor.lastrowid
        if section == "Stories":
            touch_story(conn, new_id, user_id)
        conn.commit()
        return jsonify({"success": True, "id": new_id, "name": name})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/get-item", methods=["GET"])
def get_item():
    section = request.args.get("section", "")
    item_id = request.args.get("id")
    user_id = request.args.get("user_id")
    allowed = ["Stories", "Characters", "Locations", "Objects"]
    if section not in allowed or not item_id or not user_id:
        return jsonify({"success": False, "error": "Invalid request"})
    conn = get_db()
    try:
        row = conn.execute(
            f"SELECT * FROM {section} WHERE id = ? AND user_id = ?", (item_id, user_id)
        ).fetchone()
        if not row:
            return jsonify({"success": False, "error": "Not found"})
        return jsonify({"success": True, "item": dict(row)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

# ===== STORY ENDPOINTS =====

@app.route("/get-story", methods=["GET"])
def get_story():
    story_id = request.args.get("story_id")
    user_id  = request.args.get("user_id")
    if not story_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        story = conn.execute(
            "SELECT id, name, genre, status, synopsis FROM Stories WHERE id = ? AND user_id = ?",
            (story_id, user_id)
        ).fetchone()
        if not story:
            return jsonify({"success": False, "error": "Not found"})
        volumes = conn.execute(
            "SELECT id, name, order_num FROM Volumes WHERE story_id = ? AND user_id = ? ORDER BY order_num ASC, id ASC",
            (story_id, user_id)
        ).fetchall()
        result_volumes = []
        for v in volumes:
            chapters = conn.execute(
                "SELECT id, name, order_num FROM Chapters WHERE volume_id = ? AND user_id = ? ORDER BY order_num ASC, id ASC",
                (v["id"], user_id)
            ).fetchall()
            result_volumes.append({
                "id": v["id"], "name": v["name"],
                "chapters": [{"id": c["id"], "name": c["name"]} for c in chapters]
            })
        return jsonify({"success": True, "story": dict(story), "volumes": result_volumes})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/update-story", methods=["PUT"])
def update_story():
    data     = request.json
    story_id = data.get("story_id")
    user_id  = data.get("user_id")
    genre    = data.get("genre", "")
    status   = data.get("status", "")
    synopsis = data.get("synopsis", "")
    if not story_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        conn.execute(
            "UPDATE Stories SET genre = ?, status = ?, synopsis = ? WHERE id = ? AND user_id = ?",
            (genre, status, synopsis, story_id, user_id)
        )
        touch_story(conn, story_id, user_id)
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/create-volume", methods=["POST"])
def create_volume():
    data     = request.json
    story_id = data.get("story_id")
    user_id  = data.get("user_id")
    name     = (data.get("name") or "").strip()
    if not story_id or not user_id or not name:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        max_order = conn.execute(
            "SELECT COALESCE(MAX(order_num),0) FROM Volumes WHERE story_id = ? AND user_id = ?",
            (story_id, user_id)
        ).fetchone()[0]
        cursor = conn.execute(
            "INSERT INTO Volumes (name, story_id, user_id, order_num) VALUES (?, ?, ?, ?)",
            (name, story_id, user_id, max_order + 1)
        )
        touch_story(conn, story_id, user_id)
        conn.commit()
        return jsonify({"success": True, "id": cursor.lastrowid, "name": name})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/rename-volume", methods=["PUT"])
def rename_volume():
    data      = request.json
    volume_id = data.get("volume_id")
    user_id   = data.get("user_id")
    new_name  = (data.get("name") or "").strip()
    if not volume_id or not user_id or not new_name:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        conn.execute("UPDATE Volumes SET name = ? WHERE id = ? AND user_id = ?", (new_name, volume_id, user_id))
        vol = conn.execute("SELECT story_id FROM Volumes WHERE id = ? AND user_id = ?", (volume_id, user_id)).fetchone()
        if vol: touch_story(conn, vol["story_id"], user_id)
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/delete-volume", methods=["DELETE"])
def delete_volume():
    data      = request.json
    volume_id = data.get("volume_id")
    user_id   = data.get("user_id")
    if not volume_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        vol = conn.execute("SELECT story_id FROM Volumes WHERE id = ? AND user_id = ?", (volume_id, user_id)).fetchone()
        conn.execute("DELETE FROM Chapters WHERE volume_id = ? AND user_id = ?", (volume_id, user_id))
        conn.execute("DELETE FROM Volumes WHERE id = ? AND user_id = ?", (volume_id, user_id))
        if vol: touch_story(conn, vol["story_id"], user_id)
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/create-chapter", methods=["POST"])
def create_chapter():
    data      = request.json
    volume_id = data.get("volume_id")
    story_id  = data.get("story_id")
    user_id   = data.get("user_id")
    name      = (data.get("name") or "").strip()
    if not volume_id or not story_id or not user_id or not name:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        max_order = conn.execute(
            "SELECT COALESCE(MAX(order_num),0) FROM Chapters WHERE volume_id = ? AND user_id = ?",
            (volume_id, user_id)
        ).fetchone()[0]
        cursor = conn.execute(
            "INSERT INTO Chapters (name, volume_id, story_id, user_id, order_num) VALUES (?, ?, ?, ?, ?)",
            (name, volume_id, story_id, user_id, max_order + 1)
        )
        touch_story(conn, story_id, user_id)
        conn.commit()
        return jsonify({"success": True, "id": cursor.lastrowid, "name": name})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/rename-chapter", methods=["PUT"])
def rename_chapter():
    data       = request.json
    chapter_id = data.get("chapter_id")
    user_id    = data.get("user_id")
    new_name   = (data.get("name") or "").strip()
    if not chapter_id or not user_id or not new_name:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        conn.execute("UPDATE Chapters SET name = ? WHERE id = ? AND user_id = ?", (new_name, chapter_id, user_id))
        ch = conn.execute("SELECT story_id FROM Chapters WHERE id = ? AND user_id = ?", (chapter_id, user_id)).fetchone()
        if ch: touch_story(conn, ch["story_id"], user_id)
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/get-chapter", methods=["GET"])
def get_chapter():
    chapter_id = request.args.get("chapter_id")
    user_id    = request.args.get("user_id")
    if not chapter_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, name, content FROM Chapters WHERE id = ? AND user_id = ?",
            (chapter_id, user_id)
        ).fetchone()
        if not row:
            return jsonify({"success": False, "error": "Not found"})
        return jsonify({"success": True, "chapter": dict(row)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/save-chapter", methods=["PUT"])
def save_chapter():
    data       = request.json
    chapter_id = data.get("chapter_id")
    user_id    = data.get("user_id")
    content    = data.get("content", "")
    if not chapter_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        conn.execute(
            "UPDATE Chapters SET content = ? WHERE id = ? AND user_id = ?",
            (content, chapter_id, user_id)
        )
        ch = conn.execute("SELECT story_id FROM Chapters WHERE id = ? AND user_id = ?", (chapter_id, user_id)).fetchone()
        if ch: touch_story(conn, ch["story_id"], user_id)
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/delete-chapter", methods=["DELETE"])
def delete_chapter():
    data       = request.json
    chapter_id = data.get("chapter_id")
    user_id    = data.get("user_id")
    if not chapter_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        ch = conn.execute("SELECT story_id FROM Chapters WHERE id = ? AND user_id = ?", (chapter_id, user_id)).fetchone()
        conn.execute("DELETE FROM Chapters WHERE id = ? AND user_id = ?", (chapter_id, user_id))
        if ch: touch_story(conn, ch["story_id"], user_id)
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

# ===== OTHER ENDPOINTS =====

@app.route("/update-character", methods=["PUT"])
def update_character():
    data = request.json
    item_id         = data.get("id")
    user_id         = data.get("user_id")
    story_role      = data.get("story_role", "")
    character_class = data.get("character_class", "")
    gender          = data.get("gender", "")
    race            = data.get("race", "")
    description     = data.get("description", "")
    if not item_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        conn.execute(
            "UPDATE Characters SET story_role = ?, character_class = ?, gender = ?, race = ?, description = ? WHERE id = ? AND user_id = ?",
            (story_role, character_class, gender, race, description, item_id, user_id)
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/update-location", methods=["PUT"])
def update_location():
    data        = request.json
    item_id     = data.get("id")
    user_id     = data.get("user_id")
    description = data.get("description", "")
    loc_type    = data.get("loc_type", "")
    loc_status  = data.get("loc_status", "")
    loc_perigo  = data.get("loc_perigo", "")
    loc_regiao  = data.get("loc_regiao", "")
    if not item_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        conn.execute(
            "UPDATE Locations SET description = ?, loc_type = ?, loc_status = ?, loc_perigo = ?, loc_regiao = ? WHERE id = ? AND user_id = ?",
            (description, loc_type, loc_status, loc_perigo, loc_regiao, item_id, user_id)
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/update-object", methods=["PUT"])
def update_object():
    data        = request.json
    item_id     = data.get("id")
    user_id     = data.get("user_id")
    description = data.get("description", "")
    obj_type    = data.get("obj_type", "")
    element     = data.get("element", "")
    rarity      = data.get("rarity", "")
    status      = data.get("status", "")
    if not item_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        conn.execute(
            "UPDATE Objects SET description = ?, obj_type = ?, element = ?, rarity = ?, status = ? WHERE id = ? AND user_id = ?",
            (description, obj_type, element, rarity, status, item_id, user_id)
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/delete-item", methods=["DELETE"])
def delete_item():
    data    = request.json
    section = data.get("section", "")
    item_id = data.get("id")
    user_id = data.get("user_id")
    allowed = ["Stories", "Characters", "Locations", "Objects"]
    if section not in allowed:
        return jsonify({"success": False, "error": "Invalid section"})
    if not item_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        if section == "Stories":
            vol_ids = [r["id"] for r in conn.execute(
                "SELECT id FROM Volumes WHERE story_id = ? AND user_id = ?", (item_id, user_id)
            ).fetchall()]
            for vid in vol_ids:
                conn.execute("DELETE FROM Chapters WHERE volume_id = ?", (vid,))
            conn.execute("DELETE FROM Volumes WHERE story_id = ? AND user_id = ?", (item_id, user_id))
        conn.execute(f"DELETE FROM {section} WHERE id = ? AND user_id = ?", (item_id, user_id))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/rename-item", methods=["PUT"])
def rename_item():
    data     = request.json
    section  = data.get("section", "")
    item_id  = data.get("id")
    user_id  = data.get("user_id")
    new_name = (data.get("name") or "").strip()
    allowed  = ["Stories", "Characters", "Locations", "Objects"]
    if section not in allowed:
        return jsonify({"success": False, "error": "Invalid section"})
    if not item_id or not user_id or not new_name:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        conn.execute(f"UPDATE {section} SET name = ? WHERE id = ? AND user_id = ?", (new_name, item_id, user_id))
        if section == "Stories": touch_story(conn, item_id, user_id)
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/upload-thumb", methods=["PUT"])
def upload_thumb():
    data    = request.json
    section = data.get("section", "")
    item_id = data.get("id")
    user_id = data.get("user_id")
    image   = data.get("image", "")
    allowed = ["Stories", "Characters", "Locations", "Objects"]
    if section not in allowed:
        return jsonify({"success": False, "error": "Invalid section"})
    if not item_id or not user_id:
        return jsonify({"success": False, "error": "Missing data"})
    conn = get_db()
    try:
        conn.execute(f"UPDATE {section} SET image = ? WHERE id = ? AND user_id = ?", (image, item_id, user_id))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
