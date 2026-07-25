# 010 — Local MCP server and dashboard resource

**Status:** not started.

## Deliverable

Expose read-only tools for overview, weekly report, health trends, and exercise progression plus explicit sync and weekly-analysis-preparation tools. Add a ChatGPT-compatible UI resource that renders or links an overview safely. Never call tools, ChatGPT, or a model API from a background process.

## Automated checks

- MCP contract tests for schemas and error responses.
- Verify no response contains environment values or raw API keys.

## Manual verification

Configure the local MCP command in ChatGPT developer mode, use the dashboard's **Prepare weekly analysis** action, manually call the relevant MCP tool, request a weekly explanation, and open the UI resource. Confirm no conversation or token-consuming request starts before that explicit action.

## Done when

The client can answer meaningful questions from computed data without direct database access.
