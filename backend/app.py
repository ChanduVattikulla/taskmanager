from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from datetime import timedelta
import os
from dotenv import load_dotenv
from flask import current_app

from extensions import db

load_dotenv()
jwt = JWTManager()
migrate = Migrate()

def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "postgresql://postgres:password@localhost:5432/taskmanager"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)

    db.init_app(app)
    print("[DEBUG] registered app id after init_app:", id(app), "registered apps:", [id(a) for a in db._app_engines.keys()])
    jwt.init_app(app)
    migrate.init_app(app, db)

    # ✅ Simplified CORS setup for local dev
    # Allow both localhost and 127.0.0.1 on port 5173
    CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5000", "http://127.0.0.1:5000"], supports_credentials=True)


    # Import AFTER db is ready
    from routes.auth import auth_bp
    from routes.tasks import tasks_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")

    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    @app.route("/api/debug/db")
    def debug_db():
        # Return whether the current Flask app is registered with SQLAlchemy
        try:
            current = current_app._get_current_object()
            registered = current in db._app_engines
            app_infos = [
                {
                    "name": getattr(app, "name", str(app)),
                    "id": id(app),
                    "repr": repr(app),
                }
                for app in db._app_engines.keys()
            ]
            current_info = {
                "name": getattr(current, "name", str(current)),
                "id": id(current),
                "repr": repr(current),
            }
        except Exception:
            registered = False
            app_infos = []
            current_info = {
                "name": getattr(current_app, "name", str(current_app)) if current_app else None,
                "id": id(current_app) if current_app else None,
                "repr": repr(current_app) if current_app else None,
            }
        return {
            "registered": registered,
            "engines_count": len(db._app_engines),
            "apps": app_infos,
            "current_app": current_info,
            "registered_by_id": any(id(app) == id(current) for app in db._app_engines.keys()),
        }, 200

    # ✅ Create tables automatically if they don't exist
    with app.app_context():
        try:
            db.create_all()
            print("✅ Tables created successfully")
        except Exception as e:
            print("⚠️ Error creating tables:", e)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=False, port=5000, use_reloader=False)
