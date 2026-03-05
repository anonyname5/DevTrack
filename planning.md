# DevTrack - Full Project Planning

## Project Overview

DevTrack is a fullstack task management system built with:

- Frontend: React (Vite)
- Backend: .NET Web API
- Database: MySQL
- Deployment: Docker + VPS
- CI/CD: GitHub Actions

Goals:

- Build a production-ready fullstack app
- Implement real authentication
- Use proper database design
- Apply CI/CD best practices
- Deploy like a real-world backend engineer

## System Architecture

### Frontend

- React SPA
- Auth with JWT
- Axios for API calls
- Protected routes

### Backend

- .NET Web API
- Entity Framework Core
- JWT authentication
- RESTful endpoints

### Database

- MySQL
- Code-first migrations

### Deployment

- Backend -> Docker container on VPS
- Frontend -> static hosting (e.g. Vercel)
- CI/CD -> GitHub Actions

## Database Design

### Users

| Column       | Type     | Notes           |
|--------------|----------|-----------------|
| Id           | int      | PK              |
| Email        | string   | unique          |
| PasswordHash | string   | hashed password |
| CreatedAt    | datetime | default now     |

Relationship: One User -> Many Projects

### Projects

| Column    | Type     | Notes       |
|-----------|----------|-------------|
| Id        | int      | PK          |
| Name      | string   | required    |
| UserId    | int      | FK to Users |
| CreatedAt | datetime | default now |

Relationship: One Project -> Many Tasks

### Tasks

| Column      | Type     | Notes          |
|-------------|----------|----------------|
| Id          | int      | PK             |
| Title       | string   | required       |
| IsCompleted | bool     | default false  |
| ProjectId   | int      | FK to Projects |
| CreatedAt   | datetime | default now    |

## Authentication Plan

### Registration

- `POST /api/auth/register`
- Hash password (BCrypt)
- Store in DB

### Login

- `POST /api/auth/login`
- Validate password
- Generate JWT token
- Return token to client

### Protected Endpoints

- Require JWT in `Authorization` header
- Validate token middleware

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `PUT /api/projects/{id}`
- `DELETE /api/projects/{id}`

Rules:

- Only user's own projects are accessible

### Tasks

- `GET /api/projects/{projectId}/tasks`
- `POST /api/projects/{projectId}/tasks`
- `PUT /api/tasks/{id}`
- `DELETE /api/tasks/{id}`
- `PATCH /api/tasks/{id}/complete`

## Business Logic

### Project Progress

Progress is calculated as:

`completedTasks / totalTasks`

Returned as percentage in API response.

## Testing Strategy

### Unit Tests

- Password hashing
- Progress calculation logic

### Integration Tests

- Register endpoint
- Login endpoint
- Create project endpoint

CI must fail if:

- Tests fail
- Build fails

## Docker Plan (Backend)

### Multi-stage Dockerfile

Stage 1:

- Restore packages
- Build application

Stage 2:

- Copy compiled output
- Run production-ready container

Expose:

- `8080`

## CI/CD Plan

### CI (Continuous Integration)

On push:

- Restore packages
- Build project
- Run tests
- Fail if any error

On pull request:

- Run same validation

### CD (Continuous Deployment)

On push to main:

- Build Docker image
- Tag image with commit SHA
- Push to registry
- SSH into VPS
- Pull new image
- Restart container

## Environment Strategy

### Development

- Local MySQL
- `appsettings.Development.json`

### Staging

- Separate database
- Separate environment variables

### Production

- VPS-hosted MySQL
- Secrets stored in GitHub Secrets
- No secrets in repo

## Environment Variables

### Backend

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `ASPNETCORE_ENVIRONMENT`

### Frontend

- `VITE_API_BASE_URL`

## Security Plan

- Password hashing with BCrypt
- JWT expiration time
- HTTPS in production
- Do not expose database publicly
- Use firewall rules on VPS

## Project Structure (Backend)

```text
DevTrack.Api
|- Controllers
|- Models
|- DTOs
|- Services
|- Data
|- Migrations
`- Program.cs
```

## Development Roadmap

### Phase 1 - Backend Core

- Setup project
- Setup MySQL
- Create models
- Setup EF Core
- Migrations

### Phase 2 - Authentication

- Register
- Login
- JWT middleware
- Protect endpoints

### Phase 3 - CRUD

- Projects CRUD
- Tasks CRUD
- Progress calculation

### Phase 4 - Testing

- Add unit tests
- Add integration tests
- Setup CI pipeline

### Phase 5 - Docker

- Create production Dockerfile
- Test locally
- Optimize image

### Phase 6 - Deployment

- Rent VPS
- Manual deployment
- Add CD pipeline

## Final Goal

You should be able to:

- Build full backend from scratch
- Write tests confidently
- Containerize application
- Deploy to VPS
- Implement CI/CD
- Debug production issues
- Roll back using Docker tags

## Learning Outcome

After this project, you will understand:

- How backend systems go from code -> production
- Real-world authentication
- Environment management
- Database migration strategy
- CI/CD automation
- Production mindset