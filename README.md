# Hevy Tracker

Hevy Tracker is a local-first personal training analytics project. It will import workout data from the [Hevy](https://www.hevyapp.com/) API, combine it with manually tracked health data, and make clear training trends available in a React dashboard and a local MCP server for ChatGPT analysis.

No data is deployed to a third-party application server.

## Planned capabilities

- Import and incrementally synchronize one Hevy Pro account.
- Track local daily weight, body measurements, steps, calorie intake, and calorie targets.
- Analyse volume, sets, reps, PRs, exercise progression, intensity proxy, and muscle-group distribution.
- Produce a computed weekly comparison report after sync.
- Browse charts in a Chakra UI React dashboard.
- Ask ChatGPT about the computed data through a local MCP server without exposing credentials.

TDEE, body-fat estimates, calorie-adherence scoring, and timeline forecasts are intentionally deferred until the core tracker is verified.

## Architecture

| Area             | Choice                                       |
| ---------------- | -------------------------------------------- |
| Monorepo         | pnpm workspaces                              |
| API              | NestJS REST API                              |
| Database         | PostgreSQL with Prisma                       |
| Local services   | Docker Compose runs PostgreSQL and the API   |
| Dashboard        | React, Vite, Chakra UI                       |
| Chat integration | Local MCP server backed by computed API data |

The frontend will run on the host during development. Secrets belong only in `.env`; neither the REST API nor MCP tools may return them.

## Local setup

1. Install Node.js 22+ and enable Corepack: `corepack enable`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and set a strong local PostgreSQL password. Add `HEVY_API_KEY` only when beginning the Hevy sync task.
3. Copy `apps/web/.env.example` to `apps/web/.env`. It defines `VITE_API_URL`, the dashboard's local API base URL.
4. Install workspace dependencies: `corepack pnpm install`.
5. Start the local services: `docker compose up --build`.
6. Start the dashboard in another terminal: `corepack pnpm --filter @hevy/web dev`.
7. Open `http://localhost:5173`.

Useful contributor commands:

```sh
pnpm test
pnpm build
pnpm --filter @hevy/api prisma:migrate
pnpm --filter @hevy/mcp dev
```
