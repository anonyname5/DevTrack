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

## API Endpoints (Starter)

- `GET /api/health`
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

- Trigger on push to `main` (and manual dispatch)
- Build Docker image tagged with commit SHA
- Optionally push image to GHCR if `GHCR_PAT` secret is configured
- Includes deployment placeholder step for VPS rollout

### Required Secrets for Image Push

- `GHCR_PAT`: Personal access token with package write permissions
