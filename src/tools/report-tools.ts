import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export const reportToolsServer = createSdkMcpServer({
  name: 'report-tools',
  version: '2.0.0',
  tools: [
    tool(
      'write_report',
      'Write a UX analysis report to the output/reports directory. ' +
        'Supports markdown (.md) and HTML (.html) formats. ' +
        'The filename will include the current date and time. ' +
        'Returns the full path to the generated report file.',
      {
        content: z.string().describe('The full content of the report (markdown or HTML)'),
        suffix: z
          .string()
          .optional()
          .describe('Optional suffix for the filename (e.g., "daily", "weekly", "adhoc")'),
        format: z
          .enum(['md', 'html'])
          .optional()
          .default('html')
          .describe('Report format: "md" for markdown, "html" for HTML (default: html)'),
      },
      async (args) => {
        const outputDir = join(process.cwd(), 'output', 'reports');
        mkdirSync(outputDir, { recursive: true });

        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        const suffix = args.suffix ? `-${args.suffix}` : '';
        const ext = args.format === 'md' ? '.md' : '.html';
        const prefix = args.format === 'md' ? 'ux-report' : 'ux-investigation';
        const filename = `${prefix}-${timestamp}${suffix}${ext}`;
        const filepath = join(outputDir, filename);

        writeFileSync(filepath, args.content, 'utf-8');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Report written successfully.\nPath: ${filepath}\nSize: ${Buffer.byteLength(args.content, 'utf-8')} bytes\nFormat: ${args.format || 'html'}`,
            },
          ],
        };
      }
    ),
  ],
});
