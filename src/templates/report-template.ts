/**
 * Report template reference v3.1 — Investigation Mode
 *
 * Describes the HTML report structure for the SDK orchestrator prompt.
 * The actual HTML generation is in investigation-report.template.ts.
 */
export const REPORT_TEMPLATE_REFERENCE = `
## Report Structure Reference (v3.1 — Investigation Mode)

The pipeline produces a self-contained HTML report (not markdown).
The HTML is generated programmatically from structured InvestigationReport data.

### Output: Investigation HTML Report

The report has these sections:

1. **Header** — "UX Investigation Report" badge, metadata (date, repo, version, Clarity ID)
2. **Stats Row** — 4 cards: Total Sessions, Dead Clicks, Pages Analyzed, Rage Clicks
3. **About Section** — Explainer about dead click detection limitations
4. **Investigation Cards** (one per issue, sorted by priority P0 first):
   - Issue metadata: ID, priority badge, type, URL, page name, sessions affected
   - "What We Know" — verified facts from Clarity data
   - "What We Don't Know" — Clarity API limitations
   - "Possible Causes" — hypotheses with probability badges (HIGH/MEDIUM/LOW)
   - "Investigation Prompt" — copyable prompt text with [COPY] button
   - "Files to Check" — relevant source files with search terms
5. **Recommended Workflow** — 3 steps: Copy prompt, Run in AI, Apply decision
6. **Pipeline Costs** — API calls, tokens, cost, duration
7. **Footer** — Disclaimer about investigation mode

### Data Flow

The orchestrator must produce THREE JSON arrays in sequence:

1. VerifiedIssue[] — from UX Detective v3 (only Clarity-verified facts)
2. InvestigationData[] — from Code Investigator (hypotheses + relevant files)
3. InvestigationPrompt[] — from Prompt Generator (self-contained prompts)

These are assembled into an InvestigationReport object and rendered to HTML.

### Key Differences from v2

- NO proposed fixes or diffs — generates investigation prompts instead
- NO Solution Architect agent — replaced by Prompt Generator
- Separates verified facts from hypotheses (epistemic honesty)
- Each issue gets a decision checklist: BUG REAL / FALSE POSITIVE / UX IMPROVEMENT / NEEDS MORE DATA
- Output format: .html (self-contained, dark theme) instead of .md
`;
