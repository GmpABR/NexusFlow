# NexusFlow — Real-Time Agile Collaboration

A premium, real-time Kanban board application built for modern agile teams.

## Tech Stack

| Layer     | Technology                                              |
| --------- | ------------------------------------------------------- |
| Backend   | C# / .NET 9, ASP.NET Core Web API, EF Core, SignalR     |
| Database  | PostgreSQL (Code-First migrations)                       |
| Auth      | JWT (JSON Web Tokens) + BCrypt password hashing          |
| Frontend  | React 19, TypeScript, Vite                               |
| UI        | Mantine 7 (dark theme)                                   |
| DnD       | @hello-pangea/dnd                                        |
| Real-Time | Microsoft SignalR (server + JS client)                   |

---

## Getting Started

### Prerequisites
- .NET 9 SDK
- Node.js 18+
- PostgreSQL running on `localhost:5432`

### 1. Setup Database

Create a PostgreSQL database called `nexusflow` (or update the connection string).

### 2. Configure Backend

Edit `backend/appsettings.json`:
- Set `ConnectionStrings:DefaultConnection` to your PostgreSQL credentials
- Change `JwtSettings:SecretKey` to a strong random string (≥ 32 chars)

Apply database migrations:
```bash
cd backend
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### 3. Run Backend

```bash
cd backend
dotnet run
```

The API starts at `http://localhost:5145` by default.

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

The app starts at `http://localhost:5173`.

---

## Project Structure

```
NexusFlow/
├── backend/
│   ├── Controllers/        # API endpoints
│   ├── Data/               # EF Core DbContext
│   ├── DTOs/               # Data transfer objects
│   ├── Hubs/               # SignalR BoardHub
│   ├── Models/             # Entity models
│   ├── Services/           # Business logic layer
│   ├── Program.cs          # App configuration
│   └── appsettings.json    # Connection string & JWT config
│
└── frontend/
    └── src/
        ├── api/            # Axios + API functions
        ├── components/     # TaskCard, BoardColumn
        ├── hooks/          # useSignalR
        ├── pages/          # Login, Register, Boards, Board
        ├── App.tsx         # Router
        └── main.tsx        # Mantine provider entry
```
