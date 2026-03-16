# DevTrack Evolution Plan: Team Project Delivery Platform

This plan outlines the roadmap to evolve DevTrack from a personal learning project into a full-featured B2B SaaS-style project management platform.

## Product Vision

Transform `DevTrack` into a collaborative workspace where teams can manage projects, track execution, and coordinate delivery. The goal is to mimic the complexity of real-world tools like Linear, Jira, or Trello to provide advanced DevOps learning opportunities.

## Roadmap Phases

### Phase 1: Multi-Tenant Foundation (Teams & Organizations)
**Goal:** Move from "personal app" to "team workspace".
*   [ ] **Database Schema:**
    *   Create `Organizations` table.
    *   Create `OrganizationMembers` table (UserId, OrgId, Role).
    *   Create `Invitations` table (Email, Token, OrgId, Expiry).
    *   Migrate `Projects` to belong to `OrganizationId` instead of `UserId`.
*   [ ] **Backend API:**
    *   Endpoints for creating/updating Organizations.
    *   Endpoints for inviting members via email.
    *   Middleware to enforce Org-level permissions (Role-Based Access Control).
*   [ ] **Frontend:**
    *   Onboarding flow: "Create Workspace" or "Join Workspace".
    *   Organization settings page (Manage members).
    *   Top-level Org switcher (if supporting multiple orgs per user).

### Phase 2: Advanced Project Management (The "Real App" Features)
**Goal:** Make the task tracking capable of handling complex work.
*   [ ] **Richer Task Model:**
    *   Add `Description` (Markdown/Rich Text).
    *   Add `Priority` (Low, Medium, High, Urgent).
    *   Add `DueDate` & `StartDate`.
    *   Add `Assignee` (Link to OrgMember).
    *   Add `Labels/Tags`.
*   [ ] **Board & Statuses:**
    *   Implement dynamic `TaskStatuses` (Backlog, Todo, In Progress, Review, Done) instead of boolean `IsCompleted`.
    *   **Kanban Board:** Drag-and-drop UI for moving tasks between columns.

### Phase 3: Collaboration & Social
**Goal:** Enable communication inside the platform.
*   [ ] **Comments System:**
    *   `Comments` table linked to Tasks.
    *   API for adding/editing/deleting comments.
    *   Frontend comment thread in Task Detail view.
*   [ ] **Activity Feed:**
    *   `ActivityLogs` table (Who did what, when).
    *   "Audit trail" visible on Task and Project pages ("Alice moved task to Done").

### Phase 4: Productivity & Search
**Goal:** Help users manage large volumes of work.
*   [ ] **Global Search:**
    *   Full-text search across Tasks and Projects.
    *   Command palette (Cmd+K) interface.
*   [ ] **Dashboards:**
    *   "My Tasks" view (Tasks assigned to me across all projects).
    *   Burndown charts or velocity metrics.
*   [ ] **Notifications:**
    *   In-app notification inbox.
    *   Email notifications for assignments and mentions.

### Phase 5: DevOps & Infrastructure Hardening
**Goal:** Practice advanced operations and scaling patterns.
*   [ ] **Background Jobs:**
    *   Integrate **Redis** and **Hangfire** (or similar) for background processing.
    *   Use workers for sending emails and processing heavy reports.
*   [ ] **File Storage:**
    *   Implement file attachments for tasks.
    *   Integrate **MinIO** (self-hosted S3 compatible) via Docker Compose for storage.
*   [ ] **Observability:**
    *   Add **OpenTelemetry** to .NET backend.
    *   Visualize metrics (Prometheus/Grafana) or logs (ELK/Loki).

---

## Immediate Next Steps (Phase 1 Detail)

1.  **Refactor Data Model:**
    *   Define `Organization` entity.
    *   Update `ApplicationUser` to support many-to-many relationship with Orgs.
2.  **Migration Strategy:**
    *   Create a default Organization for existing users.
    *   Move existing Projects to that default Org.
3.  **API Updates:**
    *   Update `IProjectService` to filter by `OrgId`.
    *   Add `OrganizationController`.
