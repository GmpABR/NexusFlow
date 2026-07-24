# NexusFlow – Setup Guide

Welcome! There are two ways to run NexusFlow: **Local Docker** (recommended for development) or **Cloud Supabase** (no Docker needed).

---

## ⚠️ First: Configure Your Secrets

After cloning, you need to fill in two files with your local credentials. These files are **git-ignored** — they will never be committed.

### Backend secrets → `backend/appsettings.Development.json`
Create this file (copy the template below) and fill in your values:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=127.0.0.1;Port=54322;Database=postgres;Username=postgres;Password=postgres;Trust Server Certificate=true"
  },
  "JwtSettings": {
    "SecretKey": "REPLACE_WITH_A_STRONG_RANDOM_STRING_AT_LEAST_32_CHARS",
    "Issuer": "NexusFlowBackend",
    "Audience": "NexusFlowFrontend"
  },
  "AllowedOrigins": "http://localhost:5173"
}
```
> 💡 **SecretKey tip:** Generate a strong key with: `openssl rand -base64 48` or use any random 32+ character string.

### Frontend secrets → `frontend/.env`
Create this file (a template exists at `frontend/.env.example`):
```env
VITE_API_URL=http://localhost:5145/api
```

---

## Option 1: Full Docker Compose (Recommended - Single Command)

Run the entire application stack (PostgreSQL 16, .NET 9 Backend, React Frontend) in Docker with zero host dependencies (no .NET SDK or Node.js required locally).

### Prerequisites
1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) — installed and running.

### Quick Start
Open terminal in the project root and run:
```bash
docker compose up --build
```
This automatically:
- Starts PostgreSQL 16 container on port `54322`
- Builds and starts the .NET 9 Backend on `http://localhost:5145` (and automatically applies database migrations)
- Builds and starts the React Frontend on `http://localhost:5173` with hot-reload enabled

To stop the containers, press `Ctrl+C` or run:
```bash
docker compose down
```
1. Open PowerShell in the project root.
2. Run:
   ```powershell
   .\start-dev.ps1
   ```
   This automatically:
   - Checks Docker is running (and starts it if not)
   - Starts/resumes local Supabase containers
   - Starts the .NET backend in a new window on `http://localhost:5145`
   - Starts the React frontend in the current window on `http://localhost:5173`

---

## Option 2: Cloud Supabase (No Docker)

Connect to a cloud-hosted Supabase project instead.

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com/) and create a new project.
2. Go to **Project Settings → Database** → copy the **Connection string (URI)**.

### 2. Configure Backend
In `backend/appsettings.Development.json`, replace the `DefaultConnection` value with your Supabase URI:
```json
"DefaultConnection": "Host=db.YOURPROJECT.supabase.co;Database=postgres;Username=postgres;Password=YOUR_DB_PASSWORD;SSL Mode=Require"
```

> ⚠️ Never put production secrets in `appsettings.json` — that file is committed to Git. Always use `appsettings.Development.json`.

### 3. Configure Frontend
Update `frontend/.env`:
```env
VITE_API_URL=http://localhost:5145/api
```
*(No change needed for local testing — this points to your local backend which connects to the cloud DB.)*

### 4. Apply Database Migrations
```bash
cd backend
dotnet ef database update
```

### 5. Run the App
```bash
# Terminal 1 – Backend
cd backend && dotnet run

# Terminal 2 – Frontend
cd frontend && npm install && npm run dev
```

---

## 🚀 Development Workflow

| Script | Purpose | When to run |
| :--- | :--- | :--- |
| `.\init-dev.ps1` | **Initial Setup** | Only once after cloning or if you delete your Docker volumes. |
| `.\start-dev.ps1` | **Daily Run** | Every time you start working. Boots the DB, Backend, and Frontend. |

---

## ❓ Troubleshooting & FAQ

### 1. Docker issues
*   **"Docker is not running"**: Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is open and the engine has started (the whale icon in the tray should be solid).
*   **"Access Denied" (Permission issues)**: Run your PowerShell terminal as **Administrator**.
*   **Port 54322 is busy**: Another service is using the Supabase Postgres port. Stop any other local Postgres instances or Docker containers using that port.

### 2. Database & Migrations
*   **"dotnet ef command not found"**: `init-dev.ps1` tries to install this automatically, but you can also run:  
    `dotnet tool install --global dotnet-ef`
*   **Migration failed**: Ensure Docker is running. If the database state is corrupt, you can reset everything by running:  
    `npx supabase stop --no-backup` and then `.\init-dev.ps1` again.

### 3. Backend/Frontend Failures
*   **Backend doesn't start**: Check `backend/appsettings.Development.json`. Ensure the `DefaultConnection` matches the port shown in `npx supabase status`.
*   **Node/NPM errors**: Ensure you are using a modern Node version (v18 or v20 recommended). Try deleting `node_modules` and running `npm install` inside the `frontend` folder.

### 4. AI Features (401 Unauthorized)
*   **Error: Missing Authentication header**: This means your OpenRouter API key is missing or invalid. Check your **Profile** page in the app and ensure the key is saved correctly.

---

## Optional: AI Features (OpenRouter)

NexusFlow supports AI-powered board generation. To enable it:
1. Get a free API key from [openrouter.ai](https://openrouter.ai/)
2. Log in to NexusFlow → go to **Profile → AI Configuration**
3. Paste your key there — it's stored per-account in the database.

> Your OpenRouter key is personal — treat it like a password.
