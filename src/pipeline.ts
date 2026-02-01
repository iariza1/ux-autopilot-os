import { query } from '@anthropic-ai/claude-agent-sdk';
import { agents } from './agents/agent-definitions.js';
import { ClarityClient } from './clients/clarity-client.js';
import { clarityToolsServer, setClarityDataCache } from './tools/clarity-tools.js';
import { reportToolsServer } from './tools/report-tools.js';
import { GITHUB_CONFIG } from './config/github.config.js';
import { REPORT_TEMPLATE_REFERENCE } from './templates/report-template.js';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { extractReportSummary, extractReportSummaryFromData, sendSlackNotification } from './clients/slack-notifier.js';

const CLARITY_PROJECT_ID = process.env.CLARITY_PROJECT_ID || 'unknown';

// Resolve path to claude executable
function findClaudePath(): string {
  try {
    return execSync('which claude', { encoding: 'utf-8' }).trim();
  } catch {
    // Check common locations
    const home = process.env.HOME || '';
    const candidates = [
      `${home}/.local/node-v22.13.1-darwin-x64/bin/claude`,
      `${home}/.local/bin/claude`,
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
    ];
    for (const p of candidates) {
      try {
        execSync(`test -x "${p}"`, { encoding: 'utf-8' });
        return p;
      } catch { /* continue */ }
    }
    throw new Error('Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code');
  }
}

function buildOrchestratorPrompt(): string {
  return `You are the UX Pipeline Orchestrator v3.1 (Investigation Mode). Your job is to coordinate a UX investigation pipeline that produces investigation prompts — NOT direct fixes.

## Context
- Clarity Project ID: ${CLARITY_PROJECT_ID}
- Target Repository: ${GITHUB_CONFIG.repo}
- Clone Directory: ${GITHUB_CONFIG.cloneDir}

## Pipeline Steps — Execute IN ORDER

### Step 1: Clone Target Repository
Clone the target repository for code analysis:
\`\`\`
git clone ${GITHUB_CONFIG.repoUrl} ${GITHUB_CONFIG.cloneDir} --depth 1
\`\`\`
If the directory already exists, run: \`cd ${GITHUB_CONFIG.cloneDir} && git pull\`

### Step 2: Extract Verified Issues (UX Detective v3)
Delegate to the \`ux-detective\` agent with this task:

"Analyze the Clarity analytics data to extract ONLY verified facts. Use the get_clarity_data tool to fetch ALL available dimensions: url, browser, device, dead_clicks, rage_clicks, scroll_depth.

Your output MUST include:
1. Executive Dashboard markdown section (aggregate metrics table)
2. A JSON code block with VerifiedIssue[] array

Each VerifiedIssue must have: id, url, pageNameInferred, metric, type, count, sessionsTotal, sessionsAffected, percentAffected, priority.

CRITICAL: Do NOT speculate about root causes. Only report what the data shows.

Filter out non-production URLs (lovableproject.com, lovable.app).
Clarity Project ID: ${CLARITY_PROJECT_ID}"

### Step 3: Investigate Code (Code Investigator)
Take the verified issues JSON from Step 2 and delegate to the \`code-investigator\` agent:

"Investigate the source code at ${GITHUB_CONFIG.cloneDir} for these verified UX issues:

{paste the VerifiedIssue[] JSON from Step 2}

For each issue, produce:
- knownFacts: what we can verify from Clarity data + code reading
- unknownFactors: what Clarity API cannot tell us
- possibleCauses: hypotheses with probability ratings (HIGH/MEDIUM/LOW)
- relevantFiles: source files to check with search terms

Output a JSON code block with InvestigationData[] array.

CRITICAL: Do NOT propose fixes. Generate hypotheses only."

### Step 4: Generate Investigation Prompts (Prompt Generator)
Take the verified issues AND investigation data from Steps 2-3 and delegate to the \`prompt-generator\` agent:

"Generate self-contained investigation prompts for each UX issue:

Verified Issues: {paste VerifiedIssue[] JSON}
Investigation Data: {paste InvestigationData[] JSON}

Each prompt must be copy-paste ready for any AI assistant (Claude, ChatGPT, Lovable).
Include: context, known/unknown factors, ranked causes, investigation tasks, and a decision checklist (BUG REAL / FALSE POSITIVE / UX IMPROVEMENT / NEEDS MORE DATA).

Output a JSON code block with InvestigationPrompt[] array."

### Step 5: Generate HTML Report
Use the \`write_report\` tool to save the HTML investigation report.

${REPORT_TEMPLATE_REFERENCE}

The HTML report is generated programmatically from the structured data. Assemble the complete report content and call the \`write_report\` tool with format "html" and suffix "daily".

### Final Output
After writing the report, output the path to the generated report file.

## Important Rules
1. Execute steps sequentially — each step depends on the previous
2. Pass complete JSON data between steps — don't summarize or truncate
3. If a sub-agent fails, note the failure and continue with remaining steps
4. This is INVESTIGATION mode — do NOT generate fixes, only investigation prompts
5. Include real file paths from the target repo in investigation data
6. The output format is HTML, not markdown`;
}

export async function runPipeline(): Promise<string> {
  // Step 1: Fetch Clarity data (or load from cache)
  let clarityData: any;

  // Check if cached data exists from today
  const today = new Date().toISOString().split('T')[0];
  const cachedPath = `${process.cwd()}/output/data/clarity-data-${today}.json`;

  try {
    const { readFileSync, existsSync } = await import('fs');
    if (existsSync(cachedPath)) {
      console.log(`Loading cached Clarity data from: ${cachedPath}`);
      clarityData = JSON.parse(readFileSync(cachedPath, 'utf-8'));
    }
  } catch {
    // Cache read failed, fetch fresh
  }

  if (!clarityData) {
    const clarityToken = process.env.CLARITY_API_TOKEN;
    if (!clarityToken) {
      throw new Error('CLARITY_API_TOKEN environment variable is not set');
    }
    const client = new ClarityClient(clarityToken);
    clarityData = await client.fetchAllKeyData();

    // Save to cache
    try {
      const { writeFileSync, mkdirSync } = await import('fs');
      mkdirSync(`${process.cwd()}/output/data`, { recursive: true });
      writeFileSync(cachedPath, JSON.stringify(clarityData, null, 2));
    } catch { /* non-critical */ }
  }

  // Cache data for MCP tools to serve to agents
  setClarityDataCache(clarityData);
  console.log(`Clarity data cached (${JSON.stringify(clarityData).length} bytes)`);

  // Step 2: Run the orchestrator
  const orchestratorPrompt = buildOrchestratorPrompt();
  let finalResult = '';

  // Resolve Claude Code CLI path
  const claudePath = findClaudePath();
  console.log(`Claude Code CLI: ${claudePath}`);
  console.log('\nStarting agent orchestration...\n');

  for await (const message of query({
    prompt: orchestratorPrompt,
    options: {
      pathToClaudeCodeExecutable: claudePath,
      allowedTools: [
        'Task',
        'Bash',
        'Read',
        'Grep',
        'Glob',
        'mcp__clarity-tools__get_clarity_data',
        'mcp__clarity-tools__classify_severity',
        'mcp__report-tools__write_report',
      ],
      agents,
      mcpServers: {
        'clarity-tools': clarityToolsServer,
        'report-tools': reportToolsServer,
      },
      permissionMode: 'bypassPermissions',
      cwd: process.cwd(),
      maxTurns: 50,
    },
  })) {
    // Log agent activity
    if (message.type === 'assistant') {
      const msg = message as any;
      for (const block of msg.message?.content ?? []) {
        if (block.type === 'tool_use' && block.name === 'Task') {
          const agentType = block.input?.subagent_type ?? block.input?.description ?? 'unknown';
          console.log(`  [Orchestrator] Delegating to agent: ${agentType}`);
        }
        if (block.type === 'tool_use' && block.name === 'Bash') {
          console.log(`  [Orchestrator] Running command: ${(block.input?.command ?? '').slice(0, 80)}...`);
        }
        if (block.type === 'tool_use' && block.name?.startsWith('mcp__')) {
          console.log(`  [Orchestrator] Using tool: ${block.name}`);
        }
      }
    }

    // Capture final result
    const msg = message as any;
    if (msg.type === 'result') {
      if (msg.subtype === 'success') {
        finalResult = msg.result ?? '';
        console.log('\n=== Pipeline Complete ===');
        const costUsd = msg.total_cost_usd;
        const durationMs = msg.duration_ms;
        const numTurns = msg.num_turns;
        if (costUsd !== undefined) {
          console.log(`Cost: $${costUsd.toFixed(4)}`);
        }
        if (numTurns !== undefined) {
          console.log(`Turns: ${numTurns}`);
        }
        if (durationMs !== undefined) {
          console.log(`Duration: ${(durationMs / 1000).toFixed(1)}s`);
        }

        // Send Slack notification
        // Try to find the report path from the final result text
        const reportPathMatch = finalResult.match(/output\/reports\/ux-investigation-[\w-]+\.html/)
          || finalResult.match(/output\/reports\/ux-report-[\w-]+\.md/);
        if (reportPathMatch) {
          try {
            const reportPath = `${process.cwd()}/${reportPathMatch[0]}`;
            const reportContent = readFileSync(reportPath, 'utf-8');
            const slackSummary = extractReportSummary(
              reportContent,
              reportPath,
              GITHUB_CONFIG.repo,
              clarityData?.apiCallsUsed ?? 6,
              numTurns ?? 0,
              costUsd !== undefined ? `$${costUsd.toFixed(4)}` : 'N/A',
              durationMs !== undefined ? durationMs / 1000 : 0
            );
            await sendSlackNotification(slackSummary);
          } catch (slackErr) {
            console.warn('  [Slack] Could not send notification:', slackErr instanceof Error ? slackErr.message : slackErr);
          }
        }
      } else {
        console.error('\n=== Pipeline Failed ===');
        console.error('Subtype:', msg.subtype);
        if (msg.result) console.error('Result:', msg.result);
      }
    }
  }

  return finalResult;
}
