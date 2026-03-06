# CI/CD Learning Progress Tracker

Use this file to track your progress as you implement each phase.

## Phase 1 - Backend Core

- [x] Create .NET solution and Web API
- [x] Add base domain models (`User`, `Project`, `TaskItem`)
- [x] Add EF Core + MySQL
- [x] Add first migration

## Phase 2 - Authentication

- [x] Register endpoint with password hashing
- [x] Login endpoint with JWT token generation
- [x] JWT validation middleware and protected endpoints

## Phase 3 - CRUD and Business Logic

- [x] Projects CRUD (full)
- [x] Tasks CRUD
- [x] Project progress calculation service

## Phase 4 - Testing and CI

- [x] Unit tests for progress logic
- [x] Integration tests for auth + project endpoints
- [x] GitHub Actions CI workflow (restore/build/test)

## Phase 5 - Docker

- [x] Multi-stage Dockerfile for API
- [x] Local container run verification
- [x] Registry push workflow (GitHub Actions + GHCR)

## Phase 6 - Deployment and CD

- [x] VPS provisioning
- [x] Manual deployment
- [x] Automated CD pipeline (build + GHCR push + staging SSH deploy)
- [x] Validate Dev auto-deploy run in GitHub Actions
- [ ] Rollback strategy with image tags
