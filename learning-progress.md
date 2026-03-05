# CI/CD Learning Progress Tracker

Use this file to track your progress as you implement each phase.

## Phase 1 - Backend Core

- [x] Create .NET solution and Web API
- [x] Add base domain models (`User`, `Project`, `TaskItem`)
- [ ] Add EF Core + MySQL
- [ ] Add first migration

## Phase 2 - Authentication

- [ ] Register endpoint with password hashing
- [ ] Login endpoint with JWT token generation
- [ ] JWT validation middleware and protected endpoints

## Phase 3 - CRUD and Business Logic

- [ ] Projects CRUD
- [ ] Tasks CRUD
- [x] Project progress calculation service

## Phase 4 - Testing and CI

- [x] Unit tests for progress logic
- [ ] Integration tests for auth + project endpoints
- [x] GitHub Actions CI workflow (restore/build/test)

## Phase 5 - Docker

- [x] Multi-stage Dockerfile for API
- [ ] Local container run verification
- [ ] Registry push workflow

## Phase 6 - Deployment and CD

- [ ] VPS provisioning
- [ ] Manual deployment
- [ ] Automated CD pipeline (build/push/pull/restart)
- [ ] Rollback strategy with image tags
