# 001 — Repository and local runtime

**Status:** completed — 2026-07-25.

## Deliverable

Create the pnpm workspace, NestJS API, React/Vite Chakra UI shell, Docker Compose API/PostgreSQL services, `.env.example`, and local setup documentation.

The baseline must contain no scheduler, cron process, queue worker, polling loop, or automatic external network request.

## Automated checks

- `corepack pnpm install`
- `pnpm --filter @hevy/api build`
- `pnpm --filter @hevy/web build`

## Manual verification

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. Run `corepack pnpm --filter @hevy/web dev`.
4. Open `http://localhost:5173`; confirm the Chakra UI shell loads and reports API connection state.
5. Confirm no sync or analysis request occurs merely by loading the page.
6. Import `docs/hevy-tracker.postman_collection.json` in Postman and run **Foundation / API health check**.

## Done when

All commands pass and the verification result is recorded in this file.

## Verification record

- Automated quality gate passed: build, type check, lint, architecture lint, security lint, unit tests, integration tests, and complete test suite.
- Docker Compose started PostgreSQL (healthy) and the API successfully.
- `GET /api/health` returned `{"status":"ok","service":"hevy-tracker-api"}`.
- The Chakra UI foundation loaded at `http://127.0.0.1:5173` with a connected API status and no automatic Hevy or ChatGPT request.
- The Postman **Foundation / API health check** collection request was manually confirmed by the project manager.
