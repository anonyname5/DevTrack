# DevTrack

DevTrack is a CI/CD-focused fullstack learning project.
This repository currently contains the backend API starter, unit tests, Docker setup, and CI workflow.

## Current Stack

- Backend: ASP.NET Core Web API (.NET 9)
- Testing: xUnit
- Containerization: Docker (multi-stage)
- CI: GitHub Actions

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
