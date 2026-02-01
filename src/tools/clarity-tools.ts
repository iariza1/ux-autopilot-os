import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { CLARITY_CONFIG } from '../config/clarity.config.js';
import type { ClarityDataSet, SeverityLevel } from '../types/clarity.types.js';

// Module-level cache for pre-fetched Clarity data
let clarityDataCache: ClarityDataSet | null = null;

/**
 * Store pre-fetched Clarity data so the MCP tools can serve it to agents.
 * Called by pipeline.ts after the initial API fetch.
 */
export function setClarityDataCache(data: ClarityDataSet): void {
  clarityDataCache = data;
}

export function getClarityDataCache(): ClarityDataSet | null {
  return clarityDataCache;
}

export const clarityToolsServer = createSdkMcpServer({
  name: 'clarity-tools',
  version: '2.0.0',
  tools: [
    tool(
      'get_clarity_data',
      'Retrieve pre-fetched Microsoft Clarity analytics data. Returns metrics broken down by ' +
        'the specified dimension. Available dimensions: url, device, browser, dead_clicks, ' +
        'rage_clicks, scroll_depth, all. ' +
        'Metrics include: Traffic, RageClickCount, DeadClickCount, ScrollDepth, EngagementTime, ' +
        'ExcessiveScroll, QuickbackClick, ScriptErrorCount, ErrorClickCount.',
      {
        dimension: z
          .enum(['url', 'device', 'browser', 'dead_clicks', 'rage_clicks', 'scroll_depth', 'all'])
          .describe(
            'Which dimension breakdown to retrieve: "url" for URL-level data (most actionable), ' +
              '"device" for Device/OS breakdown, "browser" for Browser/Country breakdown, ' +
              '"dead_clicks" for DeadClickCount by URL, "rage_clicks" for RageClickCount by URL, ' +
              '"scroll_depth" for ScrollDepth by Browser/Country, ' +
              'or "all" for the complete dataset'
          ),
      },
      async (args) => {
        if (!clarityDataCache) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: Clarity data has not been fetched yet. The pipeline must fetch data before agents can access it.',
              },
            ],
            isError: true,
          };
        }

        let data: unknown;
        switch (args.dimension) {
          case 'url':
            data = clarityDataCache.byUrl;
            break;
          case 'device':
            data = clarityDataCache.byDevice;
            break;
          case 'browser':
            data = clarityDataCache.byBrowser;
            break;
          case 'dead_clicks':
            data = clarityDataCache.deadClicksByUrl ?? clarityDataCache.byUrl;
            break;
          case 'rage_clicks':
            data = clarityDataCache.rageClicksByUrl ?? clarityDataCache.byUrl;
            break;
          case 'scroll_depth':
            data = clarityDataCache.scrollDepthByBrowserCountry ?? clarityDataCache.byBrowser;
            break;
          case 'all':
            data = clarityDataCache;
            break;
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
    ),

    tool(
      'classify_severity',
      'Classify the severity level of a UX issue based on metric values. Returns one of: ' +
        'critical (P0), high (P1), medium (P2), low (P3).',
      {
        rageClicks: z.number().describe('Number of rage clicks for this issue'),
        deadClicks: z.number().optional().describe('Number of dead clicks (optional)'),
        abandonmentIndicator: z
          .number()
          .optional()
          .describe(
            'Combined abandonment score from 0 to 1, derived from quickback clicks and excessive scroll metrics (optional)'
          ),
      },
      async (args) => {
        const thresholds = CLARITY_CONFIG.severityThresholds;
        let severity: SeverityLevel;
        let reason: string;

        if (args.rageClicks > thresholds.critical.rageClicks) {
          severity = 'critical';
          reason = `Rage clicks (${args.rageClicks}) exceed critical threshold (${thresholds.critical.rageClicks})`;
        } else if (
          args.rageClicks > thresholds.high.rageClicks ||
          (args.abandonmentIndicator !== undefined &&
            args.abandonmentIndicator > thresholds.high.abandonmentRate)
        ) {
          severity = 'high';
          reason =
            args.rageClicks > thresholds.high.rageClicks
              ? `Rage clicks (${args.rageClicks}) exceed high threshold (${thresholds.high.rageClicks})`
              : `Abandonment indicator (${args.abandonmentIndicator}) exceeds threshold (${thresholds.high.abandonmentRate})`;
        } else if (args.rageClicks > thresholds.medium.rageClicks) {
          severity = 'medium';
          reason = `Rage clicks (${args.rageClicks}) exceed medium threshold (${thresholds.medium.rageClicks})`;
        } else {
          severity = 'low';
          reason = `Rage clicks (${args.rageClicks}) below medium threshold`;
        }

        // Bump severity if multiple signals present
        if (
          severity !== 'critical' &&
          args.deadClicks !== undefined &&
          args.deadClicks > 10 &&
          args.rageClicks > 5
        ) {
          const levels: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
          const currentIdx = levels.indexOf(severity);
          if (currentIdx < levels.length - 1) {
            severity = levels[currentIdx + 1]!;
            reason += ` (elevated due to ${args.deadClicks} dead clicks combined with rage clicks)`;
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ severity, reason, thresholds }),
            },
          ],
        };
      }
    ),
  ],
});
