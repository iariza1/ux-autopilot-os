# UX AutoPilot Pipeline v3.1

## Project Overview

Automated UX investigation pipeline that fetches Microsoft Clarity behavioral analytics data, investigates source code for potential causes, and generates self-contained investigation prompts. Produces HTML reports with copy-paste prompts for any AI assistant.

## Architecture

- **Runtime**: Direct Anthropic API calls (standalone) or Claude Agent SDK (programmatic subagents)
- **Data Source**: Microsoft Clarity REST API (Data Export API)
- **Target Repo**: `github.com/iariza1/toma-app-web-2` (cloned to `/tmp/toma-app-web-2`)
- **Output**: Self-contained HTML reports in `output/reports/`
- **Notifications**: Slack webhook (optional)

## Pipeline Flow (v3.1 — Investigation Mode)

```
Fetch Clarity Data (6 API calls)
        |
        v
  UX Detective v3 ── extracts verified facts only (no speculation)
        |
        v
  Code Investigator ── generates hypotheses with probability ratings
        |
        v
  Prompt Generator ── creates self-contained investigation prompts
        |
        v
  Assemble Report ── self-contained HTML with copy buttons
        |
        v
  Slack Notification ── summary to webhook
```

## Agents

| Agent | Role | Tools |
|-------|------|-------|
| `ux-detective` | Extracts verified facts from Clarity data (no root cause speculation) | Read, Grep, Glob, clarity-tools MCP |
| `code-investigator` | Generates hypotheses with HIGH/MEDIUM/LOW probability | Read, Grep, Glob, Bash |
| `prompt-generator` | Creates copy-paste investigation prompts for any AI | Read, Grep, Glob |

## Key Design Principles

- **Epistemic honesty**: Verified facts (from Clarity) separated from hypotheses (from code analysis)
- **Investigation, not fixes**: Generates prompts with decision checklists, not direct code fixes
- **Decision checklist**: BUG REAL / FALSE POSITIVE / UX IMPROVEMENT / NEEDS MORE DATA
- **Self-contained output**: HTML report works offline, includes copy-to-clipboard

## Severity Levels

| Level | Code | Criteria |
|-------|------|----------|
| Critical | P0 | >50 events OR >50% sessions affected with multiple signals |
| High | P1 | >20 events OR >30% sessions affected |
| Medium | P2 | >5 events OR >20% sessions affected |
| Low | P3 | rest (>0 events) |

Cross-reference rule: same URL with dead clicks + rage clicks bumps priority one level.

## Commands

```bash
npm run pipeline       # Run the full pipeline (standalone, direct API)
npm run pipeline:sdk   # Run via Claude Agent SDK
npm run fetch-clarity  # Fetch Clarity data only (saves to output/data/)
npm run build          # Compile TypeScript
```

## Configuration

| File | Purpose |
|------|---------|
| `.env` | API tokens, Slack webhook URL (never commit) |
| `src/config/clarity.config.ts` | Clarity API settings, severity thresholds |
| `src/config/github.config.ts` | Target repo URL and clone directory |
| `.mcp.json` | External MCP server declarations |

## Clarity API Constraints

- **10 calls/day** per project
- **1-3 day** lookback window only
- **Max 3 dimensions** per call
- **Max 1000 rows** per response
- Returns **aggregated metrics**, not individual session data
- Authentication: Bearer JWT token from Clarity Settings > Data Export

## Project Structure

- `src/standalone-pipeline.ts` — Main pipeline (direct Anthropic API, no SDK)
- `src/pipeline.ts` — Alternative orchestrator using Claude Agent SDK `query()`
- `src/agents/agent-definitions.ts` — Agent definitions (v3.1 prompts)
- `src/agents/prompts/` — System prompts for each agent
- `src/types/investigation.ts` — TypeScript types for investigation pipeline
- `src/templates/investigation-report.template.ts` — HTML report generator
- `src/templates/report-template.ts` — Report structure reference for SDK
- `src/tools/` — Custom MCP tools (clarity-tools, report-tools)
- `src/clients/clarity-client.ts` — Clarity REST API HTTP client
- `src/clients/slack-notifier.ts` — Slack webhook notifier
- `src/config/` — Configuration constants
