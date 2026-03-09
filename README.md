# DevTrack

DevTrack is a CI/CD-focused fullstack learning project.
This repository currently contains the backend API starter, unit tests, Docker setup, and CI/CD workflow skeletons.

## Current Stack

- Backend: ASP.NET Core Web API (.NET 9)
- Testing: xUnit
- Containerization: Docker (multi-stage)
- CI/CD: GitHub Actions

## Run Locally

1. Restore and build:
   - `dotnet restore DevTrack.sln`
   - `dotnet build DevTrack.sln`
2. Run tests:
   - `dotnet test DevTrack.sln`
3. Start API:
   - `dotnet run --project src/DevTrack.Api`
4. Open Swagger UI (Development environment):
   - `https://localhost:7028/swagger` or `http://localhost:5072/swagger`

## Frontend (React + Vite)

The frontend app lives in `frontend/`.

1. Setup environment:
   - Copy `frontend/.env.example` to `frontend/.env`
   - Set `VITE_API_BASE_URL` to your API URL
2. Install dependencies:
   - `cd frontend`
   - `npm install`
3. Run frontend:
   - `npm run dev`

## Database Migration

- Initial migration is included in `src/DevTrack.Api/Data/Migrations`
- Apply migration:
  - `dotnet ef database update --project src/DevTrack.Api --startup-project src/DevTrack.Api`

## API Endpoints (Starter)

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/projects` (JWT protected)
- `POST /api/projects`
- `PUT /api/projects/{id}`
- `DELETE /api/projects/{id}`
- `GET /api/projects/{projectId}/tasks`
- `POST /api/projects/{projectId}/tasks`
- `PUT /api/tasks/{id}`
- `DELETE /api/tasks/{id}`
- `PATCH /api/tasks/{id}/complete`
- `POST /api/progress/calculate`

`/api/progress/calculate` request body:

```json
[
  { "isCompleted": true },
  { "isCompleted": false }
]
```

## CI Pipeline

Defined in `.github/workflows/ci.yml`:

- Restore
- Build
- Test

CI runs on every push and pull request.

## Frontend CI Pipeline

Defined in `.github/workflows/frontend-ci.yml`:

- Triggered on push and pull request when `frontend/**` changes
- Installs frontend dependencies with `npm ci`
- Runs `npm run lint`
- Runs `npm run build`

## CD Pipeline

Defined in `.github/workflows/cd.yml`:

- Trigger on push to `Dev` (staging simulation) and `Production`/`production` (production simulation)
- Build and push two GHCR images:
  - `devtrack-api`
  - `devtrack-frontend`
- Tag images with branch-aware prefixes (`stg-<sha>` / `prod-<sha>`) plus stable tags (`stg-latest` / `prod-latest`)
- Includes dry-run deploy script output
- Automatically deploys `Dev` builds to VPS over SSH using Docker Compose (MySQL + API + frontend + reverse-proxy)

### Required Repository Settings

- Ensure workflow permissions allow package write (`packages: write`)
- If your repository is private, verify package visibility/access in GHCR settings

### Required Secrets for VPS Deploy

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- Optional: `VPS_PORT` (defaults to `22`)
- Optional: `APP_PORT` (defaults to `80`)
- Optional: `MYSQL_ROOT_PASSWORD`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- Optional: `DB_SERVER_VERSION` (defaults to `8.0.36-mysql`)
- Optional: `CORS_ALLOWED_ORIGINS` (defaults to `http://<VPS_HOST>`)
- Optional: `FRONTEND_VITE_API_BASE_URL` (defaults to `/api` at frontend build time)
- Optional: `VPS_SSH_PASSPHRASE` (required if SSH key is passphrase-protected)

## Rollback Strategy (Staging)

Use immutable image tags (`stg-<sha>`) for safe rollbacks.

1. Identify previous known-good image tags for both:
   - `ghcr.io/<owner>/devtrack-api:stg-<sha>`
   - `ghcr.io/<owner>/devtrack-frontend:stg-<sha>`
2. Update `/opt/devtrack/docker-compose.staging.yml` image refs on VPS.
3. Redeploy:
   - `docker compose -f /opt/devtrack/docker-compose.staging.yml pull`
   - `docker compose -f /opt/devtrack/docker-compose.staging.yml up -d`
4. Verify:
   - `curl -f http://localhost/api/health`

## Backend Environment Variables

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SERVER_VERSION` (example: `8.0.36-mysql`)
- `JWT_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWT_EXPIRATION_MINUTES`
- `CORS_ALLOWED_ORIGINS` (comma-separated, example: `http://localhost:5173,http://127.0.0.1:5173`)

## Trigger CD After Secret Changes

If you update deployment-related secrets (for example `CORS_ALLOWED_ORIGINS`), trigger a new `Dev` CD run so the VPS container starts with the latest values.

Option B (commit-based trigger):

1. Make a tiny change in a backend/deploy-tracked file (such as this `README.md` or `.github/workflows/cd.yml`).
2. Commit to `Dev`.
3. Push to remote.

`cd.yml` now tracks backend and frontend deploy files, so frontend changes can trigger full stack deployment.

## Frontend CD (VPS + Nginx)

Defined in `.github/workflows/frontend-cd.yml`:

- Manual helper workflow only (`workflow_dispatch`)
- Frontend deployment is now handled by `.github/workflows/cd.yml` in the containerized stack

### Required Secrets for Frontend CD

- None (use the CD workflow secrets list above)
