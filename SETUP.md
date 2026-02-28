# NexusFlow Setup Guide

Welcome to NexusFlow! There are two ways to run this application: using a **Local Docker Environment** (recommended for active development) or connecting to a **Cloud Supabase Database** (easiest if you don't want to install Docker).

---

## Option 1: The Local Docker Environment (Recommended)
This approach spins up the entire Supabase ecosystem (PostgreSQL database, Auth, Storage) on your own machine. You don't need to manually configure complicated `docker-compose.yml` files.

### Prerequisites:
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running.
2. Install [Node.js](https://nodejs.org/) (for the frontend and `npx`).
3. Install the [.NET 9.0 SDK](https://dotnet.microsoft.com/download) (for the C# backend).

### First-Time Setup
If this is your very first time cloning the repository, you need to download the database containers and apply the schema:
1. Open PowerShell.
2. Navigate to the project root: `cd path/to/Scrum Trello`
3. Run the initialization script: `.\init-dev.ps1`
   *(This downloads Supabase CLI, restores C# packages, and builds your empty database tables automatically.)*

### Daily Development
Once setup is complete, you only need one command to start coding every day:
1. Make sure Docker Desktop is open.
2. Run `.\start-dev.ps1`

*(This script automatically verifies Supabase is running, starts the C# Backend on `localhost:5145`, and starts the React Frontend on `localhost:5173`.)*

---

## Option 2: Using a Cloud Supabase Database
If you do not want to run Docker on your machine, you can point the application to a cloud-hosted Supabase project.

### 1. Set up Cloud Supabase
1. Go to [Supabase.com](https://supabase.com/) and create a new project.
2. Go to **Project Settings -> Database** and copy the **Connection string (URI)**.
3. Go to **Project Settings -> API** and copy your **Project URL** and **anon public key**.

### 2. Configure the Backend (C#)
1. Open `backend/appsettings.json`.
2. Locate the `ConnectionStrings:DefaultConnection`.
3. Replace the `Host=127.0.0.1;...` string with the Connection URI you copied from Supabase. Make sure to include `Trust Server Certificate=true` if required by EF Core.

### 3. Configure the Frontend (React)
1. Open `frontend/src/api/storage.ts`.
2. Locate `const SUPABASE_URL` and `const SUPABASE_ANON_KEY`.
3. Replace the local `127.0.0.1:54321` values with the Project URL and anon key from your Cloud Supabase dashboard.

### 4. Build the Database Tables
Because you are using an empty cloud database, you need to build the tables:
1. Open a terminal in the `/backend` folder.
2. Run `dotnet ef database update`
   *(This reads your C# migrations and pushes all the tables up to your Cloud Supabase instance).*

### 5. Run the Application
You can now start the frontend and backend normally:
- Backend: Open terminal in `/backend` -> `dotnet run`
- Frontend: Open terminal in `/frontend` -> `npm install` -> `npm run dev`
