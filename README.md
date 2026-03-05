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

## CD Pipeline (Skeleton)

Defined in `.github/workflows/cd.yml`:

- Trigger on push to `Dev` (staging simulation) and `Production`/`production` (production simulation)
- Build Docker image tagged with branch-aware prefixes (`stg-<sha>` or `prod-<sha>`)
- Optionally push image to GHCR if `GHCR_PAT` secret is configured
- Includes deployment placeholder step for VPS rollout

### Required Secrets for Image Push

- `GHCR_PAT`: Personal access token with package write permissions

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
