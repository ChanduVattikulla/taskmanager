# TaskManager Backend — README

This README explains how to set up and run the project (backend + frontend), database requirements, and how to push the repository to GitHub.

## Prerequisites
- Python 3.10+ (or use the provided virtualenv)
- Node.js (for frontend)
- PostgreSQL (local) OR Docker (to run Postgres)
- git

## Environment
Create a `.env` file in `backend/` with values like:

```
DATABASE_URL=postgresql://postgres:YOUR PASSWORD@localhost:5432/taskmanager
JWT_SECRET_KEY=supersecretkey1234567890abcdefghijklmnop
FLASK_ENV=development
FLASK_DEBUG=1
GOOGLE_CLIENT_ID=your-google-client-id-here
FRONTEND_URL=http://localhost:5173
```

Adjust credentials/host as needed.

## Setup (one-time per machine)
1. Backend
```powershell
cd C:\Users\vatti\Desktop\taskmanager\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Frontend
```powershell
cd C:\Users\vatti\Desktop\taskmanager\frontend
npm install
```

## Database
The backend requires a running PostgreSQL server reachable at `DATABASE_URL` in `.env`.

Options:
- Use a local Postgres service (install Postgres and start the service).
- Use Docker (recommended if you don't want to install Postgres):
```powershell
# run once
docker run --name task-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=YOUR PASSWORD -e POSTGRES_DB=taskmanager -p 5432:5432 -d postgres:15
```
- Create the DB if needed:
```powershell
# with psql:
psql -U postgres -h localhost -c "CREATE DATABASE taskmanager;"
# or with docker exec:
docker exec -it task-pg psql -U postgres -c "CREATE DATABASE taskmanager;"
```

Note: The app calls `db.create_all()` at startup which will create missing tables automatically.

## Run (every session)
1. Start DB (if using Docker):
```powershell
docker start task-pg
```

2. Backend (in one terminal)
```powershell
cd C:\Users\vatti\Desktop\taskmanager\backend
.\venv\Scripts\Activate.ps1
python app.py
```
This starts the backend at `http://127.0.0.1:5000`.

3. Frontend (in another terminal)
```powershell
cd C:\Users\vatti\Desktop\taskmanager\frontend
npm run dev
```
This starts the frontend at `http://localhost:5173`.

## Optional: Migrations
If you want to use flask-migrate (Alembic):
```powershell
cd backend
.\venv\Scripts\Activate.ps1
$env:FLASK_APP = "app:create_app()"
$env:FLASK_ENV = "development"
flask db init
flask db migrate -m "init"
flask db upgrade
```

## Git / GitHub: push repository
1. Create a GitHub repository (on github.com) or use `gh` CLI:
```powershell
cd C:\Users\vatti\Desktop\taskmanager
git init
git add .
git commit -m "Initial commit"
# create remote (SSH)
git remote add origin git@github.com:<YOUR_USERNAME>/<REPO>.git
# or HTTPS
git remote add origin https://github.com/<YOUR_USERNAME>/<REPO>.git
git branch -M main
git push -u origin main
```

Or with GitHub CLI:
```powershell
gh repo create <YOUR_USERNAME>/<REPO> --public --source=. --remote=origin --push
```

## Notes & Troubleshooting
- Make sure you use the project `venv` Python when running the server. If another system Python starts the server, SQLAlchemy may not be registered correctly.
- If you see `RuntimeError: The current Flask app is not registered with this 'SQLAlchemy' instance`, stop any running python processes and start the server using the venv python as shown above.
- For development prefer `python -m app` if you need consistent module import behavior.

---
If you want, I can add a top-level `README.md` with a short summary and link to this `backend/README.md`, or add `scripts` (PowerShell) to automate startup. Let me know which.
