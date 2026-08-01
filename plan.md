# Hevy Tracker delivery plan

## Product outcome

Build a local-only personal training analytics application. It manually imports a single Hevy Pro account on the dashboard owner's request, treats Hevy as the source of truth for body measurements, combines those measurements with locally entered steps and calorie data, visualizes deterministic progress metrics, and exposes those computed facts through a local MCP server for user-requested ChatGPT analysis.

## Architecture decisions

- **Monorepo:** pnpm workspaces with `apps/api`, `apps/web`, `apps/mcp`, and `packages/analytics`.
- **Backend:** NestJS REST API in Docker, with PostgreSQL and Prisma.
- **Frontend:** React/Vite, host-run for development, using Chakra UI.
- **MCP:** local stdio server initially; it calls the backend REST API and never accesses secrets or the database directly. Its embedded resource links to the local dashboard until an Apps SDK component bundle is added.
- **Data scope:** one local profile, metric units, `.env` secrets, no user authentication, no cloud deployment.
- **Manual-trigger policy:** no schedulers, background jobs, polling, automatic syncs, or automatic model requests. Every external Hevy request and every ChatGPT/MCP analysis begins with a visible user action.
- **AI boundary:** calculations stay deterministic. The user manually requests structured facts through ChatGPT/MCP and receives the coaching explanation; the application does not call a model API or spend tokens in v1.

## Delivery sequence

Tasks live in [`tasks/`](tasks/). Complete only one task at a time: implement it, run its automated checks, perform its manual verification, mark the task complete, then move to the next task.

1. [001 — Repository and local runtime](tasks/001-repository-runtime.md)
2. [002 — PostgreSQL schema and migrations](tasks/002-database-schema.md)
3. [003 — Health-entry API](tasks/003-health-api.md)
4. [004 — Health-entry Chakra UI](tasks/004-health-ui.md)
5. [005 — Hevy API client and initial sync](tasks/005-hevy-initial-sync.md)
6. [006 — Incremental sync and audit log](tasks/006-incremental-sync.md)
7. [007 — Training analytics library](tasks/007-training-analytics.md)
8. [008a — Effective-load analytics and Hevy measurement ownership](tasks/008a-effective-load.md)
9. [008 — Dashboard visualisations](tasks/008-dashboard.md)
10. [009 — Weekly report workflow](tasks/009-weekly-report.md)
11. [010 — Local MCP server and dashboard resource](tasks/010-mcp-server.md)
12. [011 — Codex skills and workflows](tasks/011-agent-assets.md)
13. [012 — Test fixtures, end-to-end checks, and handoff](tasks/012-quality-handoff.md)

## Core interfaces

- `POST /api/health`, `GET /api/health`, `DELETE /api/health/:id` for local daily steps and calorie entries only. Body measurements are imported read-only from Hevy.
- `POST /api/hevy/sync`, `GET /api/hevy/status` for explicitly user-triggered local imports only.
- `GET /api/dashboard/overview`, `GET /api/dashboard/exercise-trend`, and `GET /api/dashboard/weekly-report` for computed views.
- MCP tools mirror read-only analytics endpoints and expose a clearly named sync action only on explicit user request. The dashboard exposes a separate manual action that prepares the current weekly facts for a ChatGPT conversation; it never calls a model itself.

## V1 reporting

- Workout volume, total sets/reps, exercise progression, highest-load PRs, RPE average when available, and muscle-group volume. Bodyweight exercise volume uses the most recent Hevy body weight on or before each workout plus any recorded external load.
- Current seven-day period compared to the immediately preceding equal-length period.
- Hevy-imported weight, waist, chest, bicep, and other available body-measurement history; locally entered steps, calorie intake, and calorie target history.
- TDEE, body-fat estimates, adherence scoring, and target timelines are deferred; schema fields may support a later task but no health inference is shown in v1.

## Completion criteria

- `docker compose up --build` starts PostgreSQL and the API from a clean checkout.
- The React dashboard supports Hevy-imported body measurements, persisted local steps/calorie entries, visible **Sync Hevy data** and **Prepare weekly analysis** actions, plus readable loading/error/empty states.
- Repeated user-triggered syncs do not duplicate workouts; each creates an auditable status record. A weekly report is generated or refreshed only when the user explicitly requests it.
- MCP responses contain computed facts, no credentials, and are invoked by the user from a local ChatGPT developer configuration.
- Every task’s manual check is recorded as passed before the next task begins.
