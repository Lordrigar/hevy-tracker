# Hevy Tracker delivery plan

## Product outcome

Build a local-only personal training analytics application. It imports a single Hevy Pro account, combines workout data with manually entered health data, visualizes deterministic progress metrics, and exposes those computed facts through a local MCP server for ChatGPT analysis.

## Architecture decisions

- **Monorepo:** pnpm workspaces with `apps/api`, `apps/web`, `apps/mcp`, and `packages/analytics`.
- **Backend:** NestJS REST API in Docker, with PostgreSQL and Prisma.
- **Frontend:** React/Vite, host-run for development, using Chakra UI.
- **MCP:** local stdio server initially; it calls the backend REST API and never accesses secrets or the database directly. Its embedded resource links to the local dashboard until an Apps SDK component bundle is added.
- **Data scope:** one local profile, metric units, `.env` secrets, no user authentication, no cloud deployment.
- **AI boundary:** calculations stay deterministic. ChatGPT receives structured facts and writes the coaching explanation; the application does not call a model API in v1.

## Delivery sequence

Tasks live in [`tasks/`](tasks/). Complete only one task at a time: implement it, run its automated checks, perform its manual verification, mark the task complete, then move to the next task.

1. [001 — Repository and local runtime](tasks/001-repository-runtime.md)
2. [002 — PostgreSQL schema and migrations](tasks/002-database-schema.md)
3. [003 — Health-entry API](tasks/003-health-api.md)
4. [004 — Health-entry Chakra UI](tasks/004-health-ui.md)
5. [005 — Hevy API client and initial sync](tasks/005-hevy-initial-sync.md)
6. [006 — Incremental sync and audit log](tasks/006-incremental-sync.md)
7. [007 — Training analytics library](tasks/007-training-analytics.md)
8. [008 — Dashboard visualisations](tasks/008-dashboard.md)
9. [009 — Weekly report workflow](tasks/009-weekly-report.md)
10. [010 — Local MCP server and dashboard resource](tasks/010-mcp-server.md)
11. [011 — Codex skills and workflows](tasks/011-agent-assets.md)
12. [012 — Test fixtures, end-to-end checks, and handoff](tasks/012-quality-handoff.md)

## Core interfaces

- `POST /api/health`, `GET /api/health`, `DELETE /api/health/:id` for daily health entries.
- `POST /api/hevy/sync`, `GET /api/hevy/status` for controlled local imports.
- `GET /api/dashboard/overview`, `GET /api/dashboard/exercise-trend`, and `GET /api/dashboard/weekly-report` for computed views.
- MCP tools mirror read-only analytics endpoints and expose a clearly named sync action only on explicit user request.

## V1 reporting

- Workout volume, total sets/reps, exercise progression, highest-load PRs, RPE average when available, and muscle-group volume.
- Current seven-day period compared to the immediately preceding equal-length period.
- Weight, waist, chest, bicep, steps, calorie intake, and calorie target history.
- TDEE, body-fat estimates, adherence scoring, and target timelines are deferred; schema fields may support a later task but no health inference is shown in v1.

## Completion criteria

- `docker compose up --build` starts PostgreSQL and the API from a clean checkout.
- The React dashboard supports persisted health entries, Hevy sync, and readable loading/error/empty states.
- Repeated syncs do not duplicate workouts; every sync creates an auditable status record and regenerates the weekly report after success.
- MCP responses contain computed facts, no credentials, and can be used by a local ChatGPT developer configuration.
- Every task’s manual check is recorded as passed before the next task begins.
