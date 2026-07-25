# 001 — Repository and local runtime

**Status:** partially scaffolded; do not mark complete until verified.

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

## Done when

All commands pass and the verification result is recorded in this file.
