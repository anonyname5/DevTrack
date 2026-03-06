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

## CD Pipeline

Defined in `.github/workflows/cd.yml`:

- Trigger on push to `Dev` (staging simulation) and `Production`/`production` (production simulation)
- Build Docker image tagged with branch-aware prefixes (`stg-<sha>` or `prod-<sha>`)
- Push image to GHCR using `GITHUB_TOKEN` (no custom PAT required)
- Publish stable environment tags (`stg-latest` / `prod-latest`) in addition to SHA tags
- Includes dry-run deploy script output
- Automatically deploys `Dev` builds to VPS over SSH when deploy secrets are configured

### Required Repository Settings

- Ensure workflow permissions allow package write (`packages: write`)
- If your repository is private, verify package visibility/access in GHCR settings

### Required Secrets for VPS Deploy

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- Optional: `VPS_PORT` (defaults to `22`)
- Optional: `APP_CONTAINER_NAME` (defaults to `devtrack-api-staging`)
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- Optional: `DB_SERVER_VERSION` (defaults to `8.0.36-mysql`)
- Optional: `DOCKER_NETWORK` (defaults to `devtrack-net`)
- Optional: `VPS_SSH_PASSPHRASE` (required if SSH key is passphrase-protected)

## Rollback Strategy (Staging)

Use immutable image tags (`stg-<sha>`) for safe rollbacks.

### Capture currently running image

Run on VPS before each manual intervention:

```bash
docker inspect devtrack-api-staging --format '{{.Config.Image}}'
```

Save the returned image tag (example: `ghcr.io/anonyname5/devtrack-api:stg-211dae0`).

### Rollback steps

1. Pull the previous known-good tag:
   - `docker pull ghcr.io/anonyname5/devtrack-api:stg-<previous-sha>`
2. Replace the container with that image:
   - `docker stop devtrack-api-staging || true`
   - `docker rm devtrack-api-staging || true`
   - `docker run -d --name devtrack-api-staging -p 8080:8080 -e ASPNETCORE_ENVIRONMENT=Production ghcr.io/anonyname5/devtrack-api:stg-<previous-sha>`
3. Verify service health:
   - `curl -f http://localhost:8080/api/health`

### Rollback checklist

- Identify failed deployment tag from GitHub Actions logs.
- Confirm a previous stable `stg-<sha>` tag exists in GHCR.
- Redeploy using rollback steps above.
- Confirm health endpoint and basic API smoke test.
- Record rollback reason and recovered tag in deployment notes.

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
