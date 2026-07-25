# 010 — Local MCP server and dashboard resource

**Status:** not started.

## Deliverable

Expose read-only tools for overview, weekly report, health trends, and exercise progression plus an explicit sync tool. Add a ChatGPT-compatible UI resource that renders or links an overview safely.

## Automated checks

- MCP contract tests for schemas and error responses.
- Verify no response contains environment values or raw API keys.

## Manual verification

Configure the local MCP command in ChatGPT developer mode, call every tool, request a weekly explanation, and open the UI resource.

## Done when

The client can answer meaningful questions from computed data without direct database access.
