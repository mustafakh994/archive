# AGENTS.md

## Cursor Cloud specific instructions

### Architecture
This is a forms management / document archive system with two main services:
- **Backend API** (`aspforms/`): ASP.NET Core 8.0 Web API with EF Core + PostgreSQL
- **Frontend** (`forms_front/`): Next.js 15 (React 18, TypeScript) with Prisma + PostgreSQL

### Prerequisites
- .NET 8.0 SDK (install via `dotnet-install.sh --channel 8.0`)
- Node.js 22+ (pre-installed via nvm)
- Docker (needed for PostgreSQL)

### Database
PostgreSQL 15 is required. Run via Docker:
```
docker run -d --name forms-management-db \
  -e POSTGRES_DB=FormsManagementDb \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD='YourStrong!Passw0rd' \
  -p 5432:5432 postgres:15-alpine
```
The backend uses EF Core migrations (auto-applied on startup). The frontend uses a **separate** database (`forms_front_db`) for Prisma. Create it with:
```
docker exec forms-management-db psql -U postgres -c "CREATE DATABASE forms_front_db;"
```
Then push the Prisma schema:
```
cd forms_front && DATABASE_URL="postgresql://postgres:YourStrong!Passw0rd@localhost:5432/forms_front_db" npx prisma db push
```

### Configuration files (not committed)
- `aspforms/appsettings.json`: Copy from `aspforms/appsettings.example.json`, set `ConnectionStrings.DefaultConnection` to `Host=localhost;Database=FormsManagementDb;Username=postgres;Password=YourStrong!Passw0rd`
- `forms_front/.env.local`: Needs `DATABASE_URL` and `NEXT_PUBLIC_API_URL=http://localhost:5002/api`

### Running services
- **Backend**: `cd aspforms && ASPNETCORE_ENVIRONMENT=Development dotnet run --urls "http://localhost:5002"`
- **Frontend**: `cd forms_front && npm run dev` (runs on port 3000)

### Seed credentials
On first start, the backend seeds two users:
- **SuperAdmin**: `superadmin@hamaprov.net` / `PAssW0RD2o024!`
- **DeptAdmin**: `deptadmin@hamaprov.net` / `PAssW0RD2o024!`

### Testing
- **Backend tests**: `cd aspforms && dotnet test` (xUnit, 3 tests)
- **Frontend lint**: `cd forms_front && npx next lint`
- **Frontend tests**: `cd forms_front && npx vitest run` (15 test files; may OOM on low-memory VMs — run individual test files with `npx vitest run <path>` as workaround)

### Gotchas
- The frontend's `next.config.js` defaults `NEXT_PUBLIC_API_URL` to the production URL (`https://api.forms.hamaprov.net/api`). Always set it to `http://localhost:5002/api` in `.env.local` for local development.
- The frontend `.eslintrc.json` must exist for `next lint` to work non-interactively. If missing, create it with `{"extends": "next/core-web-vitals"}`.
- The Prisma schema is separate from the EF Core schema — they must use different databases to avoid table conflicts.
- Backend's `Program.cs` auto-runs migrations and seeds data on startup, so no manual `dotnet ef database update` is needed.
- Docker in this Cloud Agent VM requires `fuse-overlayfs` storage driver and `iptables-legacy`. See the Docker setup instructions in the cloud agent system prompt.
