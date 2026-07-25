# 002 — PostgreSQL schema and migrations

**Status:** completed — 2026-07-25.

## Deliverable

Finalize Prisma models and a committed initial migration for health entries, workouts, exercises, sets, sync state/logs, and weekly reports. Add indexes for workout dates and health-entry dates.

Store sync and analysis request timestamps for audit visibility, but do not add scheduling or queued-job tables.

## Automated checks

- Apply migrations against the Compose PostgreSQL service.
- Run `pnpm --filter @hevy/api prisma:generate` and API typecheck.

## Manual verification

Inspect the local database with Prisma Studio or `psql`; confirm the expected tables, date uniqueness for health entries, and foreign-key cascade from workout to exercise to set.

## Done when

The migration is reproducible from an empty PostgreSQL volume.

## Verification record

- Prisma generated successfully and migration `20260725125552_initial_schema` was applied to the local Compose PostgreSQL service.
- The full quality gate passed, including one health-controller unit test and two PostgreSQL integration tests covering tables and cascade deletion.
- The rebuilt API returned `{"status":"ok","service":"hevy-tracker-api","database":"connected"}` from `GET /api/health`.
- The project manager confirmed the updated Postman health check and inspected the schema, unique health-entry date constraint, and cascade foreign keys.
