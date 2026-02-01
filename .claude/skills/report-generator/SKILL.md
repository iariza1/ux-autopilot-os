---
description: Generate consolidated UX analysis markdown reports combining issue analysis, code mappings, and proposed solutions with code diffs.
---

# Report Generator

Generates comprehensive markdown reports for UX pipeline analysis results.

## Report Structure

1. **Executive Summary** — Issue counts by severity, estimated impacted users
2. **Critical/High Issues** — Full detail with code location, root cause, proposed diff
3. **Medium/Low Issues** — Summarized with key details
4. **Data Summary** — Top URLs by rage clicks, device breakdowns
5. **Next Steps** — Prioritized action items
6. **Metadata** — Timestamp, target repo, data range

## Per-Issue Detail

Each issue section includes:
- Issue ID, severity, type, metric value
- Affected URL and dimension
- Source code file path and line numbers
- Root cause analysis
- Proposed fix as unified diff
- Fix category, effort estimate, regression risk
- Expected outcome after fix

## Output

Markdown file written to `output/reports/ux-report-{timestamp}.md` via the `write_report` MCP tool.
