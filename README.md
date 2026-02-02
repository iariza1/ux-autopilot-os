<p align="center">
  <h1 align="center">🤖 UX AutoPilot</h1>
  <p align="center">
    <strong>AI agents that find UX bugs before your users complain.</strong>
  </p>
  <p align="center">
    Connects Microsoft Clarity behavioral data → reads your source code → generates investigation prompts for any AI assistant.
  </p>
  <p align="center">
    <a href="https://bit.ly/3OiHWmo">📬 Join the Waitlist</a> · 
    <a href="#how-it-works">How It Works</a> · 
    <a href="#quick-start">Quick Start</a> · 
    <a href="https://github.com/iariza1/ux-autopilot-os/issues">Report Bug</a>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
    <img src="https://img.shields.io/badge/node-18%2B-green.svg" alt="Node" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue.svg" alt="TypeScript" />
    <img src="https://img.shields.io/badge/AI-Claude%20Sonnet-orange.svg" alt="Claude" />
  </p>
</p>

---

### The Problem

You have users. Some are rage-clicking. Some hit dead ends. Some leave and never come back. **Clarity shows you the numbers, but not the why.**

### The Solution

UX AutoPilot runs 3 AI agents in a pipeline:

1. 🔍 **UX Detective** — extracts verified facts from Clarity (no guessing)
2. 🧬 **Code Investigator** — reads your actual source code and generates hypotheses
3. 📋 **Prompt Generator** — creates copy-paste prompts you can drop into Claude, ChatGPT, Cursor, or Lovable

The output is a self-contained HTML report with everything you need to investigate and fix UX issues.

> **No opinions. No hallucinated fixes. Just verified data + ranked hypotheses + a decision checklist.**

---

### 📬 Want the hosted version?

We're building a hosted platform so you don't have to self-host. One click, daily reports, zero setup.

**→ [Join the waitlist](https://bit.ly/3OiHWmo)** to get early access + updates on what we're building.

---

### ⭐ If this is useful, star the repo

It helps others find it and tells us people care. Takes 1 second.

---

## How It Works

```
                         Microsoft Clarity
                              |
                         Fetch Data (6 API calls)
                              |
                              v
                    +--------------------+
                    | UX Detective v3    |
                    | Extracts verified  |
                    | facts ONLY         |
                    +--------------------+
                              |
                     VerifiedIssue[] JSON
                              |
                              v
                    +--------------------+
                    | Code Investigator  |     +------------------+
                    | Reads source code  | <-- | Your Repository  |
                    | Generates hypotheses|    | (cloned to /tmp) |
                    +--------------------+     +------------------+
                              |
                   InvestigationData[] JSON
                              |
                              v
                    +--------------------+
                    | Prompt Generator   |
                    | Creates copy-paste |
                    | investigation      |
                    | prompts            |
                    +--------------------+
                              |
                  InvestigationPrompt[] JSON
                              |
                              v
                    +--------------------+
                    | HTML Report        |     +-------+
                    | Self-contained     | --> | Slack |
                    | with copy buttons  |     +-------+
                    +--------------------+
                              |
                              v
                output/reports/ux-investigation-2026-02-01.html
```

Each agent in the pipeline has a strict boundary:

| Agent | What it does | What it does NOT do |
|-------|-------------|---------------------|
| **UX Detective v3** | Reports verified numbers from Clarity | Does not speculate about causes |
| **Code Investigator** | Generates hypotheses with probability | Does not propose fixes |
| **Prompt Generator** | Creates investigation prompts | Does not decide if it's a bug |

This separation enforces **epistemic honesty** — verified facts stay separate from hypotheses, and the final decision is always made by the developer.

---

## Output Example

The pipeline produces a self-contained HTML file (~50KB) that looks like this:

**Header**: Pipeline metadata, date, repo, version
**Stats Row**: 4 cards showing Total Sessions, Dead Clicks, Pages Analyzed, Rage Clicks
**Investigation Cards** (one per issue):
- Priority badge (P0-P3) with color coding
- What We Know (verified Clarity facts)
- What We Don't Know (Clarity API limitations)
- Possible Causes with probability badges (HIGH / MEDIUM / LOW)
- Copy-paste Investigation Prompt with a COPY button
- Files to Check with search terms

**Decision Checklist** in each prompt:
```
[ ] BUG REAL         - Element looks clickable but doesn't work
[ ] FALSE POSITIVE   - Clicks on padding, decoration, or timing
[ ] UX IMPROVEMENT   - Works but could be clearer
[ ] NEEDS MORE DATA  - Can't determine without more information
```

---

## Quick Start

```bash
# 1. Clone this repository
git clone https://github.com/iariza1/ux-autopilot-os.git
cd ux-autopilot-os

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys (see Configuration section)

# 4. Fetch Clarity data
npm run fetch-clarity

# 5. Run the pipeline
npm run pipeline

# 6. Open the report
open output/reports/ux-investigation-*.html
```

> 💡 **Need help setting up?** [Join the waitlist](https://bit.ly/3OiHWmo) — we're building a hosted version where you skip all of this.

---

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **npm** | 8+ | Package manager |
| **Anthropic API Key** | - | Powers the 3 AI agents (Claude Sonnet) |
| **Microsoft Clarity Token** | - | Fetches behavioral analytics data |
| **GitHub Token** (optional) | - | Clones private repos |
| **Slack Webhook** (optional) | - | Sends notifications after each run |

---

## Installation

```bash
# Clone
git clone https://github.com/iariza1/ux-autopilot-os.git
cd ux-autopilot-os

# Install dependencies
npm install

# Verify TypeScript compiles clean
npx tsc --noEmit
```

### Dependencies

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/claude-agent-sdk` | Agent orchestration (SDK pipeline mode) |
| `dotenv` | Environment variable loading |
| `zod` | Schema validation for MCP tools |
| `tsx` | TypeScript execution without pre-compilation |
| `typescript` | Type checking |

---

## Configuration

### 1. Create your `.env` file

```bash
cp .env.example .env
```

### 2. Fill in the required values

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...          # From console.anthropic.com
CLARITY_API_TOKEN=eyJ...               # From Clarity > Settings > Data Export

# Optional but recommended
GITHUB_TOKEN=ghp_...                   # For cloning private repos
CLARITY_PROJECT_ID=your-project-id     # Your Clarity project URL/ID
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...

# Target repository (defaults to your-org/your-repo)
TARGET_REPO=your-org/your-repo
```

### How to get each token

#### Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys
3. Create a new key
4. Copy the `sk-ant-...` value

#### Microsoft Clarity API Token
1. Go to [clarity.microsoft.com](https://clarity.microsoft.com)
2. Open your project
3. Go to **Settings** > **Data Export**
4. Copy the **API Token** (JWT format starting with `eyJ...`)

#### GitHub Token (optional)
1. Go to GitHub > Settings > Developer Settings > Personal Access Tokens
2. Create a token with `repo` scope (for private repos)
3. Copy the `ghp_...` or `github_pat_...` value

#### Slack Webhook (optional)
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create an app or use an existing one
3. Enable **Incoming Webhooks**
4. Add a webhook to a channel
5. Copy the `https://hooks.slack.com/services/...` URL

### 3. Configure your target repository

Edit `src/config/github.config.ts` if you want to change the defaults:

```typescript
export const GITHUB_CONFIG = {
  repo: process.env.TARGET_REPO || 'your-org/your-repo',
  get repoUrl() {
    return `https://github.com/${this.repo}.git`;
  },
  cloneDir: '/tmp/your-repo',
  defaultBranch: 'main',
};
```

### 4. Configure page name mapping (optional)

Edit the UX Detective prompt at `src/agents/prompts/ux-detective-v3.prompt.ts` to add your URL-to-page-name mappings:

```
### Step 5: Map Page Names
- /dashboard -> "Dashboard"
- /settings -> "Settings Page"
- /users/{id} -> "User Profile"
- Any other -> derive from the last path segment
```

---

## Usage

### Available Commands

```bash
# Run the full investigation pipeline (recommended)
npm run pipeline

# Fetch Clarity data only (saves to output/data/)
npm run fetch-clarity

# Run via Claude Agent SDK (alternative orchestration mode)
npm run pipeline:sdk

# Compile TypeScript (check for errors)
npm run build

# Type check without emitting
npx tsc --noEmit
```

### Typical Workflow

```bash
# Step 1: Fetch fresh Clarity data (uses 6 of 10 daily API calls)
npm run fetch-clarity

# Step 2: Run the investigation pipeline
npm run pipeline

# Step 3: Open the HTML report in your browser
open output/reports/ux-investigation-*.html

# Step 4: Copy an investigation prompt from the report

# Step 5: Paste the prompt into Claude Code, ChatGPT, Lovable, or Cursor

# Step 6: The AI investigates and tells you:
#   - BUG REAL: Here's the fix
#   - FALSE POSITIVE: Here's why it's not a bug
#   - UX IMPROVEMENT: Works but could be clearer
#   - NEEDS MORE DATA: Check Clarity session recordings
```

---

## Pipeline Modes

UX AutoPilot has two execution modes:

### Standalone Mode (Recommended)

```bash
npm run pipeline
```

Uses direct Anthropic API calls via `fetch`. No SDK dependency needed at runtime. Makes exactly **3 API calls** to Claude Sonnet (one per agent).

**Pros**: Simpler, faster, more predictable costs
**File**: `src/standalone-pipeline.ts`

### SDK Mode

```bash
npm run pipeline:sdk
```

Uses the Claude Agent SDK with `query()` API. The orchestrator delegates to sub-agents via the SDK's Task tool.

**Pros**: More flexible, agents can use MCP tools dynamically
**Cons**: More API calls, higher cost, requires Claude Code CLI installed
**File**: `src/pipeline.ts` (orchestrator), `src/index.ts` (entry point)

---

## Architecture

```
src/
  index.ts                          # Entry point (SDK mode)
  pipeline.ts                       # SDK orchestrator
  standalone-pipeline.ts            # Standalone pipeline (direct API)

  agents/
    agent-definitions.ts            # Agent configs (names, tools, prompts)
    prompts/
      ux-detective-v3.prompt.ts     # UX Detective v3.1 system prompt
      code-investigator.prompt.ts   # Code Investigator system prompt
      prompt-generator.prompt.ts    # Prompt Generator system prompt

  clients/
    clarity-client.ts               # Microsoft Clarity REST API client
    slack-notifier.ts               # Slack webhook sender

  config/
    clarity.config.ts               # Clarity API settings, severity thresholds
    github.config.ts                # Target repo URL and clone path

  templates/
    investigation-report.template.ts  # HTML report generator (inline CSS+JS)
    report-template.ts                # Report structure reference for SDK

  tools/
    clarity-tools.ts                # MCP tools: get_clarity_data, classify_severity
    report-tools.ts                 # MCP tool: write_report

  types/
    investigation.ts                # Core types: VerifiedIssue, InvestigationData, etc.
    clarity.types.ts                # Clarity API request/response types

  scripts/
    fetch-clarity-data.ts           # Standalone data fetcher

output/
  data/                             # Cached Clarity JSON data
    clarity-data-2026-01-30.json
  reports/                          # Generated HTML reports
    ux-investigation-2026-02-01.html
```

---

## Agents

### Agent 1: UX Detective v3

**Role**: Extract only verified facts from Clarity data. No speculation.

**Input**: Raw Clarity API data (JSON)
**Output**: `VerifiedIssue[]` (structured JSON)

What it does:
- Filters production URLs (excludes preview/staging)
- Normalizes URLs (strips query params, replaces UUIDs with `{id}`)
- Maps URL paths to human-readable page names
- Counts dead clicks, rage clicks, quickback clicks, excessive scroll
- Assigns priorities (P0-P3) based on thresholds
- Cross-references signals (dead + rage on same URL bumps priority)

What it explicitly does NOT do:
- Speculate about which element was clicked
- Hypothesize about root causes
- Suggest fixes

### Agent 2: Code Investigator

**Role**: Read the source code and generate hypotheses about why issues occur.

**Input**: `VerifiedIssue[]` + repository context (package.json, file tree, route files)
**Output**: `InvestigationData[]` (structured JSON)

What it does:
- Detects the framework (Next.js, React, Vue, Angular)
- Maps URLs to rendering components
- Finds elements with hover effects but no onClick handlers
- Identifies visual affordance mismatches
- Rates hypotheses as HIGH, MEDIUM, or LOW probability
- Documents what Clarity cannot tell us (unknown factors)

What it explicitly does NOT do:
- Propose fixes
- Assume a dead click is a bug

### Agent 3: Prompt Generator

**Role**: Create self-contained investigation prompts ready for copy-paste.

**Input**: `VerifiedIssue[]` + `InvestigationData[]`
**Output**: `InvestigationPrompt[]` (structured JSON)

Each prompt includes:
- Context (what Clarity detected)
- Known facts and unknown factors
- Ranked possible causes (HIGH to LOW)
- Specific investigation tasks
- Decision checklist (4 options)
- Files to check with search terms

The prompts work in ANY AI assistant — they're self-contained and need no additional context.

---

## Clarity API

### Rate Limits

| Constraint | Value |
|-----------|-------|
| Calls per day | 10 per project |
| Lookback window | 1-3 days |
| Max dimensions per call | 3 |
| Max rows per response | 1,000 |
| Data type | Aggregated metrics (not individual sessions) |

### API Calls Strategy

The pipeline uses **6 of 10 daily calls**, leaving 4 for ad-hoc queries:

| # | Call | Dimensions | Purpose |
|---|------|-----------|---------|
| 1 | Core traffic | URL | All metrics by page URL |
| 2 | Device breakdown | Device + OS | Device-specific issues |
| 3 | Browser breakdown | Browser + Country | Browser/geo patterns |
| 4 | Dead clicks | URL (DeadClickCount) | Dedicated dead click data |
| 5 | Rage clicks | URL (RageClickCount) | Dedicated rage click data |
| 6 | Scroll depth | Browser + Country | Scroll behavior patterns |

Calls 1-3 run in parallel. Calls 4-6 run in parallel after batch 1 completes.

### Data Caching

Clarity data is saved to `output/data/clarity-data-{date}.json` after fetching. If a same-day file exists, the pipeline loads from cache instead of making new API calls. This means you can run `npm run pipeline` multiple times without burning API calls.

---

## HTML Report Structure

The output is a single, self-contained HTML file with inline CSS and JavaScript. No external dependencies. Works offline.

### Sections

1. **Header** — "UX Investigation Report" with metadata (date, repo, version, Clarity project)
2. **Stats Row** — 4 summary cards: Total Sessions, Dead Clicks, Pages Analyzed, Rage Clicks
3. **About Section** — Explains dead click detection limitations for context
4. **Investigation Cards** — One card per issue (ordered by priority P0 first):
   - Priority badge with color (red/orange/yellow/green)
   - Issue type and affected URL
   - **What We Know** — bullet list of verified Clarity facts
   - **What We Don't Know** — bullet list of Clarity API limitations
   - **Possible Causes** — hypotheses with probability badges
   - **Investigation Prompt** — full prompt text with COPY button
   - **Files to Check** — relevant source files and search terms
5. **Recommended Workflow** — 3 steps: Copy, Investigate, Decide
6. **Pipeline Costs** — API calls, tokens, estimated cost, duration
7. **Footer** — Disclaimer about investigation mode

### Theme

Dark theme with a modern card-based layout. Responsive design.

---

## Slack Integration

When `SLACK_WEBHOOK_URL` is set in `.env`, the pipeline sends a Slack notification after each run.

### Notification includes:
- Repository name
- Total sessions analyzed
- Issues found (count)
- Severity breakdown (Critical, High, Medium, Low)
- Top problem page
- Pipeline costs (API calls, estimated cost, duration)
- Path to the generated report

### Slack Block Kit format

The notification uses Slack's Block Kit for rich formatting with sections, fields, and dividers.

---

## Scheduling (Cron)

Use the included `run-pipeline.sh` wrapper for automated scheduling:

```bash
# Make it executable
chmod +x run-pipeline.sh

# Add to crontab (daily at 9 AM)
crontab -e
```

Add this line:
```
0 9 * * * /path/to/ux-autopilot-os/run-pipeline.sh >> /var/log/ux-pipeline.log 2>&1
```

The shell script:
- Sets the correct working directory
- Loads `.env` variables
- Validates Node.js 18+
- Installs dependencies if needed
- Runs the pipeline
- Cleans up the temporary repo clone
- Returns proper exit codes

---

## Types Reference

### VerifiedIssue (from UX Detective)

```typescript
interface VerifiedIssue {
  id: string;                    // "UX-001"
  url: string;                   // "https://my.app.com/documents"
  pageNameInferred: string;      // "Documents List"
  metric: string;                // "DeadClickCount"
  type: InvestigationIssueType;  // "dead_click" | "rage_click" | ...
  count: number;                 // 6
  sessionsTotal: number;         // 18
  sessionsAffected: number;      // 6
  percentAffected: number;       // 33.33
  priority: Priority;            // "P0" | "P1" | "P2" | "P3"
}
```

### InvestigationData (from Code Investigator)

```typescript
interface InvestigationData {
  issueId: string;
  knownFacts: string[];          // ["6 dead clicks on /documents", ...]
  unknownFactors: string[];      // ["Exact element clicked", ...]
  possibleCauses: PossibleCause[];
  relevantFiles: RelevantFile[];
}

interface PossibleCause {
  id: string;                    // "CAUSE-001"
  probability: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  filesLikelyInvolved: string[];
}
```

### InvestigationPrompt (from Prompt Generator)

```typescript
interface InvestigationPrompt {
  issueId: string;
  promptText: string;            // Full copy-paste ready prompt
  quickContext: {
    filesToCheck: string[];
    searchTerms: string[];
  };
}
```

### InvestigationReport (top-level)

```typescript
interface InvestigationReport {
  metadata: InvestigationMetadata;
  summary: InvestigationSummary;
  issues: InvestigationIssueEntry[];
}

interface InvestigationIssueEntry {
  verified: VerifiedIssue;
  investigation: InvestigationData;
  prompt: InvestigationPrompt;
}
```

---

## Severity Levels

| Level | Code | Criteria | Color |
|-------|------|----------|-------|
| Critical | P0 | >50 events OR >50% sessions affected with multiple signals | Red |
| High | P1 | >20 events OR >30% sessions affected | Orange |
| Medium | P2 | >5 events OR >20% sessions affected | Yellow |
| Low | P3 | >0 events (everything else) | Green |

**Cross-reference rule**: If the same URL has both dead clicks AND rage clicks, the priority is bumped up one level.

---

## Customization

### Change the target repository

Set `TARGET_REPO` in `.env`:
```env
TARGET_REPO=your-org/your-repo
```

Or edit `src/config/github.config.ts` for the clone directory:
```typescript
cloneDir: '/tmp/your-repo-name',
```

### Add page name mappings

Edit `src/agents/prompts/ux-detective-v3.prompt.ts`, Step 5:
```
- /your-page -> "Your Page Name"
- /your-page/{id} -> "Your Page Detail"
```

### Change severity thresholds

Edit `src/config/clarity.config.ts`:
```typescript
severityThresholds: {
  critical: { rageClicks: 50 },
  high: { rageClicks: 20, abandonmentRate: 0.3 },
  medium: { rageClicks: 10 },
  low: { rageClicks: 0 },
},
```

### Change the AI model

Edit `src/standalone-pipeline.ts`:
```typescript
const MODEL = 'claude-sonnet-4-20250514';  // Change to any Anthropic model
const MAX_TOKENS = 16000;                   // Adjust max output tokens
```

### Customize the HTML report

Edit `src/templates/investigation-report.template.ts`:
- `getStyles()` — CSS (dark theme, colors, layout)
- `getScript()` — JavaScript (copy button behavior)
- `renderIssueCard()` — Individual issue card layout
- `renderHeader()` — Report header

### Change the investigation prompt language

The prompts are generated in Spanish by default (matching the original project). To change, edit `src/agents/prompts/prompt-generator.prompt.ts` and update the template language.

---

## Costs

### Per pipeline run (Standalone mode)

| Resource | Usage | Cost |
|----------|-------|------|
| Claude Sonnet API calls | 3 | ~$0.40-0.50 |
| Input tokens | ~90,000 | $0.27 |
| Output tokens | ~10,000 | $0.15 |
| Clarity API calls | 6 of 10 daily | Free |
| **Total per run** | | **~$0.40-0.50** |

### Pricing reference (Claude Sonnet)

- Input: $3.00 per million tokens
- Output: $15.00 per million tokens

### SDK mode costs

SDK mode makes more API calls (orchestrator + sub-agents) and typically costs 2-5x more than standalone mode.

---

## Troubleshooting

### "No Clarity data found"

```
Error: No Clarity data found. Run "npm run fetch-clarity" first to download data.
```

Run `npm run fetch-clarity` before running the pipeline. The pipeline needs pre-fetched data in `output/data/`.

### "Rate limited" during pipeline

```
[Code Investigator] Rate limited. Waiting 60s before retry 1/3...
```

This is normal. The pipeline automatically retries with backoff. The Anthropic API has per-minute rate limits. The pipeline waits and retries up to 3 times.

### "SLACK_WEBHOOK_URL not set"

```
[Slack] SLACK_WEBHOOK_URL not set, skipping notification.
```

This is informational, not an error. Set `SLACK_WEBHOOK_URL` in `.env` to enable Slack notifications, or ignore this message.

### "Code Investigator generated 0 investigation entries"

The Code Investigator's JSON response sometimes doesn't match the expected format. The pipeline has fallbacks — investigation prompts are still generated. To make parsing more robust, the `parseJsonFromResponse` function looks for JSON inside markdown code blocks.

### "Anthropic API error (401)"

Check that your `ANTHROPIC_API_KEY` in `.env` is valid and has credits remaining. Get a key at [console.anthropic.com](https://console.anthropic.com).

### "Clarity API: Unauthorized"

Your `CLARITY_API_TOKEN` may have expired. Clarity tokens are JWTs with expiration dates. Go to Clarity > Settings > Data Export to generate a new token.

### TypeScript compilation errors

```bash
npx tsc --noEmit
```

If this fails, ensure you have all dependencies installed (`npm install`) and are using Node.js 18+.

---

## Contributing

Found a bug? Want to add a feature? PRs are welcome.

1. Fork the repo
2. Create your branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push and open a PR

---

## License

MIT

---

<p align="center">
  Built with Claude Sonnet, Microsoft Clarity, and TypeScript.
  <br />
  <br />
  <a href="https://bit.ly/3OiHWmo"><strong>📬 Join the waitlist for the hosted platform →</strong></a>
</p>
