# ☁️ NexusFlow — Cloud Deployment Setup Guide

A step-by-step walkthrough of how this app was deployed to the cloud using **Supabase** (database), **Render** (backend), and **Vercel** (frontend).

---

## Overview

| Service | What it hosts | URL |
|---|---|---|
| **Supabase** | PostgreSQL database | [supabase.com](https://supabase.com) |
| **Render** | .NET 9 backend API | [render.com](https://render.com) |
| **Vercel** | React frontend | [vercel.com](https://vercel.com) |
| **GitHub** | Source code + CI/CD trigger | [github.com](https://github.com) |

---

## Step 1 — Supabase (Database)

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project** → fill in project name, password, and select a region.
3. Wait for the project to initialize (~2 min).
4. Go to **Project Settings → Database → Connection String → URI** (or use the Connection Pooler section).
5. Copy the **Session Pooler** connection string (Port **6543** — important!).

> ⚠️ **Critical:** Use the **Pooler URL** (port 6543), NOT the direct connection (port 5432). The pooler is more stable on free-tier cloud hosts that open/close connections frequently.

6. Run your EF Core migrations to apply the schema:
   ```bash
   dotnet ef database update
   ```
   Or you can apply migrations from the backend on the Supabase SQL Editor directly.

---

## Step 2 — GitHub Repository

1. Create a new repository on [github.com](https://github.com).
2. Make sure your project root contains a **solution file** (`.sln`) — this is required for CI/CD:
   ```bash
   dotnet new sln --name YourApp
   dotnet sln add backend/backend.csproj
   ```
3. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

---

## Step 3 — Render (Backend)

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New → Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Name:** `nexusflow-backend` (or anything you like)
   - **Root Directory:** `backend`
   - **Build Command:** `dotnet publish -c Release -o out`
   - **Start Command:** `dotnet out/backend.dll`
   - **Instance Type:** Free

5. Under **Environment Variables**, add the following (⚠️ never hardcode these in code):

   | Key | Value |
   |---|---|
   | `ASPNETCORE_ENVIRONMENT` | `Production` |
   | `ConnectionStrings__DefaultConnection` | *(see below)* |
   | `JwtSettings__SecretKey` | A long random string (min 32 chars) |
   | `JwtSettings__Issuer` | `NexusFlowBackend` |
   | `JwtSettings__Audience` | `NexusFlowFrontend` |
   | `AllowedOrigins` | `https://YOUR_VERCEL_APP.vercel.app` |

6. For `ConnectionStrings__DefaultConnection`, use this exact format from your Supabase pooler:
   ```
   Host=YOUR_HOST.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.YOUR_PROJECT_REF;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true;No Reset On Close=true;Max Auto Prepare=0;
   ```

   > ⚠️ **The `Max Auto Prepare=0` and `No Reset On Close=true` parameters are critical.**
   > Without them, EF Core's prepared statements are incompatible with Supabase's PgBouncer
   > in transaction mode — writes (INSERT/UPDATE) will fail with a "transient failure" error.

7. Click **Create Web Service** and wait for the first build to complete.

---

## Step 4 — Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **New Project** → import your GitHub repository.
3. Configure the project:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://YOUR_RENDER_APP.onrender.com` |

5. Create a `vercel.json` file inside your `frontend/` folder to enable SPA routing (so `/login`, `/boards` etc. work on refresh):
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

6. Click **Deploy**.

---

## Step 5 — CORS Configuration

Your backend needs to allow requests from your Vercel domain. In `Program.cs`:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
```

Also make sure `app.UseCors("AllowFrontend")` is called **before** `app.UseAuthentication()`.

---

## Step 6 — EF Core Migration History Sync

If you deployed by running migrations locally and then applying schema via SQL dump (instead of running `dotnet ef database update` against production), you need to **mark all migrations as applied** in the production database. Otherwise EF Core will try to re-run them and crash.

Run this SQL in your Supabase SQL Editor:

```sql
DELETE FROM "__EFMigrationsHistory";
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES
('20260216165215_AddBoardMembers', '9.0.2'),
('20260216180103_AddInvitationWorkflow', '9.0.2'),
-- ... add all your migration IDs here
('20260303022339_AddWorkspaceLogoFinal', '9.0.2');
```

You can get the migration IDs by running:
```bash
dotnet ef migrations list
```

---

## Step 7 — CI/CD Pipeline (GitHub Actions)

A `.github/workflows/ci.yml` file runs tests automatically on every push. Make sure:

1. The solution file (`.sln`) is at the **repository root** — Render's build and GitHub Actions both need it.
2. The workflow file points to the correct project paths.

Example minimal CI step:
```yaml
- name: Restore
  run: dotnet restore

- name: Build
  run: dotnet build --no-restore
```

---

## Common Gotchas & Fixes

| Problem | Cause | Fix |
|---|---|---|
| `404` on `/login` or `/register` in Vercel | SPA routes not handled | Add `vercel.json` with rewrite rules |
| CORS error in browser | Backend doesn't allow Vercel origin | Use `SetIsOriginAllowed(origin => true)` |
| `transient failure` on register (not login) | PgBouncer incompatible with EF Core prepared statements | Add `Max Auto Prepare=0` to connection string |
| `MSB1003` in CI pipeline | No `.sln` file at repo root | Create one with `dotnet new sln` |
| Backend slow first request | Render free tier sleeps after 15min idle | Normal — wakes up after ~30s on first request |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                        User Browser                       │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  Vercel (Frontend)                        │
│              nexusflow123.vercel.app                      │
│  React 19 + Vite · SPA routing via vercel.json           │
└──────────────────────┬───────────────────────────────────┘
                       │ REST API + SignalR (HTTPS/WSS)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  Render (Backend)                         │
│           nexusflow-jdof.onrender.com                     │
│  .NET 9 Web API · JWT Auth · Rate Limiting · SignalR      │
└──────────────────────┬───────────────────────────────────┘
                       │ PostgreSQL (TLS, Port 6543)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                Supabase (Database)                        │
│     PostgreSQL 15 · PgBouncer Pooler · Row-Level Security │
└──────────────────────────────────────────────────────────┘
```
