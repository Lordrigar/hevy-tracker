# Hevy Tracker agent guide

- Use pnpm from the repository root. Do not commit `.env`, PostgreSQL volumes, or generated credentials.
- API changes must keep secrets out of REST and MCP responses. MCP tools return computed facts only.
- Run `pnpm test` before handoff. Use the `test-runner` skill for focused validation and `debug-logs` for sync/API failures.
- Use `pnpm format` after changing source files; do not hand-format around Prettier. ESLint and `pnpm format:check` are mandatory through the quality gate.
- The intended local flow is Docker Compose for PostgreSQL/API and `pnpm --filter @hevy/web dev` for the UI.
- Preserve metric units internally (kg, cm) and make analytics deterministic; ChatGPT explains rather than fabricates calculations.
- Never add a scheduler, polling loop, cron job, queue worker, automatic Hevy request, or automatic ChatGPT/model request. The user must explicitly trigger **Sync Hevy data** and **Prepare weekly analysis** from the dashboard or manually invoke an MCP tool.

## Delivery protocol

1. Read [plan.md](plan.md), then work only on the active task in [tasks/](tasks/).
2. Do not implement multiple tasks in one change. Finish the task’s automated checks and manual verification first.
3. After every task, run the complete local quality gate below: build, type check, lint, architecture lint, security lint, and all unit and integration tests.
4. Do not hand a task to the project manager until every required check passes. Report the exact commands and outcomes with the handoff.
5. Every handoff must include a concise manual test script: prerequisite setup, exact REST endpoints and example request data to query, plus the dashboard route/view and expected result to inspect.
6. The project manager performs manual verification. Record its result in the task file before beginning the next task.
7. Keep application changes unstaged until their corresponding task has passed manual verification.
8. When a task adds or changes a REST endpoint, update `docs/hevy-tracker.postman_collection.json` in the same task with safe sample data and Postman tests. Validate the collection JSON before handoff.

## Mandatory local quality gate

Run these commands after every completed task. Add or maintain the corresponding scripts as the workspace is scaffolded; a missing command is a failed gate, not a reason to skip it.

```sh
pnpm build
pnpm typecheck
pnpm lint
pnpm lint:architecture
pnpm lint:security
pnpm test:unit
pnpm test:integration
pnpm test
```

Run database migration checks only for a task that introduces or changes Prisma schema/migrations.

## Handoff format

When a task is ready for manual verification, provide the project manager:

1. The completed task and a short description of its behavior.
2. The quality-gate commands run and their pass results.
3. Setup prerequisites, including any required `.env` values or seeded fixture.
4. Exact API calls to make (method, path, request body where applicable) and the expected response.
5. Exact UI route/view, action to take, and expected visual result.

Do not claim a ticket is finished until the project manager confirms those manual checks.

## Final demonstration

From a fresh local checkout, confirm that PostgreSQL and the API start, health data persists, Hevy sync does not duplicate workouts, dashboard charts and weekly reports render, and MCP tools return deterministic facts without secrets.
