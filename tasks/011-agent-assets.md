# 011 — Codex skills and workflows

**Status:** not started.

## Deliverable

Create reusable `test-runner` and `debug-logs` skills, the repository `AGENTS.md`, and documented manual sync/review workflows. Place skills in a writable project directory and document the local `.codex/skills` installation/link step if needed. The workflows must make the manual trigger and cost boundary explicit.

## Automated checks

- Validate skill frontmatter and required files.
- Verify documented commands exist in package scripts.

## Manual verification

Follow the test skill for one changed package and use the debug skill against an intentionally missing Hevy key; verify the report is useful and redacted. Confirm the workflow never schedules syncs or automatically invokes ChatGPT.

## Done when

Another agent can follow the assets without project-specific verbal context.
