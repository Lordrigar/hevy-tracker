# Hevy Tracker agent guide

- Use pnpm from the repository root. Do not commit `.env`, PostgreSQL volumes, or generated credentials.
- API changes must keep secrets out of REST and MCP responses. MCP tools return computed facts only.
- Run `pnpm test` before handoff. Use the `test-runner` skill for focused validation and `debug-logs` for sync/API failures.
- The intended local flow is Docker Compose for PostgreSQL/API and `pnpm --filter @hevy/web dev` for the UI.
- Preserve metric units internally (kg, cm) and make analytics deterministic; ChatGPT explains rather than fabricates calculations.
