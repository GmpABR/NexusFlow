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

## Option 1: Local Docker (Recommended)

Run the entire Supabase stack (PostgreSQL, Auth, Storage) on your machine.

### Prerequisites
1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) — must be running
2. [Node.js](https://nodejs.org/) (for the frontend)
3. [.NET 9.0 SDK](https://dotnet.microsoft.com/download) (for the C# backend)

### First-Time Setup
Only needed once after cloning:
1. Make sure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed.
2. Open PowerShell in the project root.
3. Run the initialization script:
   ```powershell
   .\init-dev.ps1
   ```
   This automatically:
   - Checks that Docker is running (and starts it if needed)
   - Downloads and starts the local Supabase containers (PostgreSQL + Auth + Storage)
   - Restores .NET backend packages (`dotnet restore`)
   - Applies all database migrations (`dotnet ef database update`)

### Daily Development
Once setup is complete, just run this every time you want to code:
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

## Optional: AI Features (OpenRouter)

NexusFlow supports AI-powered board generation. To enable it:
1. Get a free API key from [openrouter.ai](https://openrouter.ai/)
2. Log in to NexusFlow → go to **Profile → AI Configuration**
3. Paste your key there — it's stored per-account in the database.

> Your OpenRouter key is personal — treat it like a password.
