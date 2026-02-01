---
description: Analyze Microsoft Clarity analytics data to identify UX issues like rage clicks, dead clicks, excessive scrolling, quickback clicks, and script errors. Classify issues by severity level.
---

# Clarity Analyzer

Processes Microsoft Clarity behavioral analytics data to extract actionable UX insights.

## Input

JSON data from the Clarity Data Export API containing metrics:
- RageClickCount, DeadClickCount, ExcessiveScroll, QuickbackClick
- ScrollDepth, EngagementTime, ScriptErrorCount, ErrorClickCount, Traffic

Broken down by dimensions: URL, Device, OS, Browser, Country.

## Severity Classification

| Level | Code | Threshold |
|-------|------|-----------|
| Critical | P0 | >50 rage clicks/day on same element |
| High | P1 | >20 rage clicks OR >30% abandonment rate |
| Medium | P2 | 10-20 rage clicks OR confusion patterns |
| Low | P3 | <10 rage clicks, minor issues |

## Cross-Reference Rules

Elevate severity when multiple signals converge:
- High rage + high dead clicks on same URL = bump severity
- Excessive scroll + quickback = navigation/content problem
- Script errors + rage clicks = broken functionality

## Output

Structured JSON array of UX issues with: id, severity, type, metric, value, URL, description.
