from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

DB = "WB_Sql.db"

print("Banco:", os.path.abspath(DB))
def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

    for table in ["Stories", "Characters", "Locations", "Objects"]:
        conn.execute(f"""
            CREATE TABLE IF NOT EXISTS {table} (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                name    TEXT    NOT NULL,
                user_id INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES Users(id)
            )
        """)
    conn.commit()
    conn.close()

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
        print("Usuário salvo!")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

@app.route("/login", methods=["POST"])
def login():
    data = request.json
        if not data or not data.get("email") or not data.get("password"):
            return jsonify({
            "success": False,
            "message": "E-mail e senha são obrigatórios"
        })
        conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM Users WHERE email = ?",
            (data["email"],)
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

@app.route("/create-item", methods=["POST"])
def create_item():
    data = request.json
    section  = data.get("section", "")
    name     = data.get("name", "").strip()
    user_id  = data.get("user_id")

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
            f"INSERT INTO {section} (name, user_id) VALUES (?, ?)",
            (name, user_id)
        )
        conn.commit()
        return jsonify({"success": True, "id": cursor.lastrowid, "name": name})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        conn.close()

def init_db():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS Characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS Stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS Objects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS Locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
