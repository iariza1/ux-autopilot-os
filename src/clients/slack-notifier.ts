/**
 * Slack webhook notifier — sends a summary of the UX report to Slack
 * after the pipeline completes.
 *
 * Uses Slack Block Kit for rich formatting.
 */

import type { InvestigationReport } from '../types/investigation.js';

/** Read at call time so dotenv has a chance to load first */
function getSlackWebhookUrl(): string {
  return process.env.SLACK_WEBHOOK_URL || '';
}

interface SlackReportSummary {
  reportPath: string;
  targetRepo: string;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalSessions: string;
  topPage: string;
  topPageIssue: string;
  clarityApiCalls: number;
  claudeApiCalls: number;
  estimatedCost: string;
  durationSeconds: number;
}

/**
 * Extract a rough summary from the generated report markdown.
 * Parses counts from the Executive Dashboard and issue headers.
 */
export function extractReportSummary(
  reportContent: string,
  reportPath: string,
  targetRepo: string,
  clarityApiCalls: number,
  claudeApiCalls: number,
  estimatedCost: string,
  durationSeconds: number
): SlackReportSummary {
  // Count issues by severity from emoji patterns or P0/P1/P2/P3 mentions
  const criticalCount = (reportContent.match(/\bP0\b/g) || []).length;
  const highCount = (reportContent.match(/\bP1\b/g) || []).length;
  const mediumCount = (reportContent.match(/\bP2\b/g) || []).length;
  const lowCount = (reportContent.match(/\bP3\b/g) || []).length;

  // Try to extract total sessions from Executive Dashboard
  const sessionsMatch = reportContent.match(/Total Sessions\s*\|\s*(\d+)/i);
  const totalSessions = sessionsMatch ? sessionsMatch[1] : 'N/A';

  // Try to extract first row of Top 10 Pages
  const topPageMatch = reportContent.match(/\|\s*1\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
  const topPage = topPageMatch ? topPageMatch[2]?.trim() || 'N/A' : 'N/A';
  const topPageIssue = topPageMatch ? topPageMatch[3]?.trim() || 'N/A' : 'N/A';

  return {
    reportPath,
    targetRepo,
    totalIssues: criticalCount + highCount + mediumCount + lowCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalSessions,
    topPage,
    topPageIssue,
    clarityApiCalls,
    claudeApiCalls,
    estimatedCost,
    durationSeconds,
  };
}

/**
 * Extract summary from a typed InvestigationReport (v3.1).
 * No regex parsing needed — reads structured data directly.
 */
export function extractReportSummaryFromData(
  report: InvestigationReport,
  reportPath: string,
  targetRepo: string,
  clarityApiCalls: number,
  claudeApiCalls: number,
  estimatedCost: string,
  durationSeconds: number
): SlackReportSummary {
  return {
    reportPath,
    targetRepo,
    totalIssues: report.issues.length,
    criticalCount: report.summary.issuesByPriority.P0 ?? 0,
    highCount: report.summary.issuesByPriority.P1 ?? 0,
    mediumCount: report.summary.issuesByPriority.P2 ?? 0,
    lowCount: report.summary.issuesByPriority.P3 ?? 0,
    totalSessions: String(report.summary.totalSessions),
    topPage: report.issues[0]?.verified.pageNameInferred || 'N/A',
    topPageIssue: report.issues[0]?.verified.type || 'N/A',
    clarityApiCalls,
    claudeApiCalls,
    estimatedCost,
    durationSeconds,
  };
}

/**
 * Send a Slack notification with the UX report summary.
 * Uses Slack Incoming Webhook with Block Kit formatting.
 */
export async function sendSlackNotification(summary: SlackReportSummary): Promise<boolean> {
  const webhookUrl = getSlackWebhookUrl();
  if (!webhookUrl) {
    console.log('  [Slack] SLACK_WEBHOOK_URL not set, skipping notification.');
    return false;
  }

  const severityLine =
    (summary.criticalCount > 0 ? `*${summary.criticalCount} Critical*  ` : '') +
    (summary.highCount > 0 ? `*${summary.highCount} High*  ` : '') +
    (summary.mediumCount > 0 ? `*${summary.mediumCount} Medium*  ` : '') +
    (summary.lowCount > 0 ? `*${summary.lowCount} Low*` : '') ||
    'No issues found';

  const payload = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'UX Investigation Report Ready',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Repository:*\n${summary.targetRepo}` },
          { type: 'mrkdwn', text: `*Total Sessions:*\n${summary.totalSessions}` },
          { type: 'mrkdwn', text: `*Issues Found:*\n${summary.totalIssues}` },
          { type: 'mrkdwn', text: `*Severity:*\n${severityLine}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Top Problem Page:*\n${summary.topPage}` },
          { type: 'mrkdwn', text: `*Issue Type:*\n${summary.topPageIssue}` },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Clarity API: ${summary.clarityApiCalls}/10 | Claude API: ${summary.claudeApiCalls} calls | Cost: ${summary.estimatedCost} | Duration: ${summary.durationSeconds.toFixed(1)}s`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Report saved to: \`${summary.reportPath}\``,
        },
      },
    ],
  };

  try {
    console.log('  [Slack] Sending notification...');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`  [Slack] Failed (${response.status}): ${body}`);
      return false;
    }

    console.log('  [Slack] Notification sent successfully.');
    return true;
  } catch (error) {
    console.error('  [Slack] Error sending notification:', error instanceof Error ? error.message : error);
    return false;
  }
}
