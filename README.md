# Phú An Elevator — Web Application

Public website and admin dashboard for CÔNG TY CỔ PHẦN THANG MÁY PHÚ AN. Both share one business backend (modular monolith).

## Stack
- **Frontend:** Next.js (App Router) + TypeScript — `frontend/`
- **Backend:** ASP.NET Core Web API (.NET 9) — `backend/`
- **Database:** Supabase PostgreSQL via EF Core + Npgsql
- **Auth:** ASP.NET Core Identity (`IdentityUser<Guid>`) with cookie authentication
- **Schema changes:** EF Core migrations only (never `EnsureCreated()`)

## Layout
```
backend/
  PhuAn.Elevator.sln
  src/PhuAn.Api              # HTTP entry point (references Application, Infrastructure)
  src/PhuAn.Application      # use cases (references Domain)
  src/PhuAn.Domain           # entities and domain rules
  src/PhuAn.Infrastructure   # EF Core DbContext, Identity stores (references Application, Domain)
  tests/PhuAn.Tests          # xUnit tests
frontend/                    # Next.js app
```

## Prerequisites
- .NET SDK 9.0+
- Node.js 20.9+ (LTS) and npm

## Backend
```bash
cd backend
dotnet build
dotnet test
dotnet run --project src/PhuAn.Api --launch-profile http
# health check: http://localhost:5044/api/health
```
The API starts without a database. To configure one later, keep the connection string out of git:
```bash
dotnet user-secrets init --project src/PhuAn.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<your connection string>" --project src/PhuAn.Api
```
See `backend/.env.example` for the variable names.

## Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000
npm run build
```

## Not yet implemented
Business features, Identity migrations, seed/admin accounts, and company content are intentionally out of scope for this foundation.