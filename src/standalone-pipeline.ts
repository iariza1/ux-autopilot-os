/**
 * Standalone UX Pipeline v3.1 — Investigation Mode
 * No SDK, no MCP. Uses direct Anthropic API calls via fetch and fs.
 *
 * Produces investigation prompts (not direct fixes).
 * Output: self-contained HTML report.
 *
 * Usage: npx tsx src/standalone-pipeline.ts
 */

import dotenv from 'dotenv';
dotenv.config({ override: true });

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { GITHUB_CONFIG } from './config/github.config.js';
import { extractReportSummaryFromData, sendSlackNotification } from './clients/slack-notifier.js';
import { generateInvestigationHTML } from './templates/investigation-report.template.js';
import { UX_DETECTIVE_V3_PROMPT } from './agents/prompts/ux-detective-v3.prompt.js';
import { CODE_INVESTIGATOR_PROMPT } from './agents/prompts/code-investigator.prompt.js';
import { PROMPT_GENERATOR_PROMPT } from './agents/prompts/prompt-generator.prompt.js';

import type {
  VerifiedIssue,
  InvestigationData,
  InvestigationPrompt,
  InvestigationReport,
  InvestigationIssueEntry,
  Priority,
} from './types/investigation.js';

// ─── Config ───────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const CLARITY_PROJECT_ID = process.env.CLARITY_PROJECT_ID || 'unknown';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 16000;

// ─── Token Tracking ──────────────────────────────────────────────
interface TokenUsage {
  label: string;
  inputTokens: number;
  outputTokens: number;
}

const tokenTracker: TokenUsage[] = [];
let claudeApiCalls = 0;

function getTotalTokens(): { input: number; output: number } {
  return tokenTracker.reduce(
    (acc, t) => ({ input: acc.input + t.inputTokens, output: acc.output + t.outputTokens }),
    { input: 0, output: 0 }
  );
}

function estimateCost(): number {
  const totals = getTotalTokens();
  // Sonnet pricing: $3/M input, $15/M output
  return (totals.input * 3 + totals.output * 15) / 1_000_000;
}

// ─── Anthropic API Helper ─────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaude(
  systemPrompt: string,
  messages: Message[],
  label: string,
  maxRetries = 3
): Promise<string> {
  console.log(`\n  [${label}] Calling Claude API...`);
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      }),
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
      const waitSec = Math.max(retryAfter, 60);
      console.log(`  [${label}] Rate limited. Waiting ${waitSec}s before retry ${attempt + 1}/${maxRetries}...`);
      await new Promise(r => setTimeout(r, waitSec * 1000));
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json() as any;
    const text = data.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const inputTokens = data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;

    // Track tokens
    claudeApiCalls++;
    tokenTracker.push({ label, inputTokens, outputTokens });

    console.log(`  [${label}] Done in ${elapsed}s (${inputTokens} in / ${outputTokens} out tokens)`);

    return text;
  }

  throw new Error(`[${label}] Failed after ${maxRetries} retries due to rate limiting.`);
}

// ─── JSON Parsing Helper ─────────────────────────────────────────
function parseJsonFromResponse<T>(response: string, fallback: T): T {
  const match = response.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (!match) return fallback;
  try {
    return JSON.parse(match[1]);
  } catch {
    return fallback;
  }
}

// ─── Step 1: Load Clarity Data ────────────────────────────────────
function loadClarityData(): any {
  const today = new Date().toISOString().split('T')[0];
  const dataDir = join(process.cwd(), 'output', 'data');

  // Try today's file first, then find the most recent one
  const todayFile = join(dataDir, `clarity-data-${today}.json`);
  if (existsSync(todayFile)) {
    console.log(`Loading Clarity data: ${todayFile}`);
    return JSON.parse(readFileSync(todayFile, 'utf-8'));
  }

  // Find the most recent file
  const files = execSync(`ls -t "${dataDir}"/clarity-data-*.json 2>/dev/null || true`, {
    encoding: 'utf-8',
  }).trim().split('\n').filter(Boolean);

  if (files.length === 0) {
    throw new Error(
      'No Clarity data found. Run "npm run fetch-clarity" first to download data.'
    );
  }

  console.log(`Loading most recent Clarity data: ${files[0]}`);
  return JSON.parse(readFileSync(files[0], 'utf-8'));
}

// ─── Step 2: Clone Target Repo ────────────────────────────────────
function ensureRepoCloned(): boolean {
  if (existsSync(GITHUB_CONFIG.cloneDir)) {
    console.log(`Target repo already cloned at ${GITHUB_CONFIG.cloneDir}`);
    return true;
  }
  console.log(`Cloning ${GITHUB_CONFIG.repo} to ${GITHUB_CONFIG.cloneDir}...`);
  try {
    const ghToken = process.env.GITHUB_TOKEN;
    const cloneUrl = ghToken
      ? `https://${ghToken}@github.com/${GITHUB_CONFIG.repo}.git`
      : `https://github.com/${GITHUB_CONFIG.repo}.git`;
    execSync(
      `git clone ${cloneUrl} ${GITHUB_CONFIG.cloneDir} --depth 1`,
      { stdio: 'inherit' }
    );
    return true;
  } catch (err) {
    console.warn(`Could not clone repo: ${err instanceof Error ? err.message : err}`);
    console.warn('  Pipeline will continue without code mapping.');
    return false;
  }
}

// ─── Step 3: Read Repo Context ────────────────────────────────────
function getRepoContext(): string {
  const repoDir = GITHUB_CONFIG.cloneDir;

  // Read package.json to detect framework
  let packageJson = '';
  const pkgPath = join(repoDir, 'package.json');
  if (existsSync(pkgPath)) {
    packageJson = readFileSync(pkgPath, 'utf-8');
  }

  // Get file tree (limited depth)
  let fileTree = '';
  try {
    fileTree = execSync(
      `cd "${repoDir}" && find . -type f -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" -o -name "*.vue" -o -name "*.svelte" -o -name "*.css" -o -name "*.scss" | grep -v node_modules | grep -v .next | grep -v dist | sort`,
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    ).trim();
  } catch {
    fileTree = '(could not list files)';
  }

  return `## Target Repository: ${GITHUB_CONFIG.repo}

### package.json
\`\`\`json
${packageJson.substring(0, 3000)}
\`\`\`

### Source Files
\`\`\`
${fileTree.substring(0, 5000)}
\`\`\``;
}

// ─── Read Route/Page Files for Code Investigator ──────────────────
function getRouteFilesContent(): string {
  const repoDir = GITHUB_CONFIG.cloneDir;
  let routeFiles = '';
  try {
    const routePaths = execSync(
      `cd "${repoDir}" && find . -type f \\( -path "*/pages/*" -o -path "*/app/*" -o -path "*/views/*" -o -path "*/routes/*" \\) \\( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.vue" \\) | grep -v node_modules | grep -v .next`,
      { encoding: 'utf-8' }
    ).trim().split('\n').filter(Boolean).slice(0, 20);

    for (const filePath of routePaths) {
      const fullPath = join(repoDir, filePath);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, 'utf-8');
        if (content.length < 10000) {
          routeFiles += `\n### ${filePath}\n\`\`\`tsx\n${content}\n\`\`\`\n`;
        } else {
          routeFiles += `\n### ${filePath} (first 200 lines)\n\`\`\`tsx\n${content.split('\n').slice(0, 200).join('\n')}\n\`\`\`\n`;
        }
      }
    }
  } catch {
    routeFiles = '(could not read route files)';
  }
  return routeFiles;
}

// ─── Agent 1: UX Detective v3 ─────────────────────────────────────
async function detectVerifiedIssues(clarityData: any): Promise<{ raw: string; issues: VerifiedIssue[] }> {
  console.log('\n--- Agent 1: UX Detective v3 (Verified Facts Only) ---');

  const dataStr = JSON.stringify(clarityData, null, 2);
  const truncatedData = dataStr.length > 100000 ? dataStr.substring(0, 100000) + '\n... (truncated)' : dataStr;

  const raw = await callClaude(UX_DETECTIVE_V3_PROMPT, [
    {
      role: 'user',
      content: `Analyze this Microsoft Clarity data and extract verified UX issues.\n\nClarity Project ID: ${CLARITY_PROJECT_ID}\n\n${truncatedData}`,
    },
  ], 'UX Detective v3');

  const issues = parseJsonFromResponse<VerifiedIssue[]>(raw, []);
  console.log(`  [UX Detective v3] Extracted ${issues.length} verified issues`);

  return { raw, issues };
}

// ─── Agent 2: Code Investigator ───────────────────────────────────
async function investigateCode(
  issues: VerifiedIssue[],
  repoContext: string,
  routeFiles: string
): Promise<InvestigationData[]> {
  console.log('\n--- Agent 2: Code Investigator (Hypotheses) ---');

  const raw = await callClaude(CODE_INVESTIGATOR_PROMPT, [
    {
      role: 'user',
      content: `## Verified UX Issues\n\n\`\`\`json\n${JSON.stringify(issues, null, 2)}\n\`\`\`\n\n## Repository Structure\n\n${repoContext}\n\n## Route/Page Source Files\n\n${routeFiles.substring(0, 80000)}`,
    },
  ], 'Code Investigator');

  const investigations = parseJsonFromResponse<InvestigationData[]>(raw, []);
  console.log(`  [Code Investigator] Generated ${investigations.length} investigation entries`);

  return investigations;
}

// ─── Agent 3: Prompt Generator ────────────────────────────────────
async function generateInvestigationPrompts(
  issues: VerifiedIssue[],
  investigations: InvestigationData[]
): Promise<InvestigationPrompt[]> {
  console.log('\n--- Agent 3: Prompt Generator (Investigation Prompts) ---');

  const raw = await callClaude(PROMPT_GENERATOR_PROMPT, [
    {
      role: 'user',
      content: `## Verified Issues\n\n\`\`\`json\n${JSON.stringify(issues, null, 2)}\n\`\`\`\n\n## Investigation Data\n\n\`\`\`json\n${JSON.stringify(investigations, null, 2)}\n\`\`\``,
    },
  ], 'Prompt Generator');

  const prompts = parseJsonFromResponse<InvestigationPrompt[]>(raw, []);
  console.log(`  [Prompt Generator] Generated ${prompts.length} investigation prompts`);

  return prompts;
}

// ─── Assemble Report ──────────────────────────────────────────────
function assembleReport(
  issues: VerifiedIssue[],
  investigations: InvestigationData[],
  prompts: InvestigationPrompt[],
  clarityApiCalls: number,
  durationMs: number,
  executiveDashboardRaw: string
): InvestigationReport {
  // Match issues → investigations → prompts by issueId
  const investigationMap = new Map(investigations.map(inv => [inv.issueId, inv]));
  const promptMap = new Map(prompts.map(p => [p.issueId, p]));

  const entries: InvestigationIssueEntry[] = issues.map(issue => {
    const investigation = investigationMap.get(issue.id) ?? {
      issueId: issue.id,
      knownFacts: [`${issue.count} ${issue.type} detected on ${issue.url}`],
      unknownFactors: ['Investigation data not available for this issue'],
      possibleCauses: [],
      relevantFiles: [],
    };

    const prompt = promptMap.get(issue.id) ?? {
      issueId: issue.id,
      promptText: `Investigate the ${issue.type} on ${issue.url}.\n\nNo automated prompt was generated for this issue. Please investigate manually.`,
      quickContext: { filesToCheck: [], searchTerms: [] },
    };

    return { verified: issue, investigation, prompt };
  });

  const totals = getTotalTokens();
  const cost = estimateCost();

  // Count priorities
  const issuesByPriority: Record<Priority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const issue of issues) {
    issuesByPriority[issue.priority] = (issuesByPriority[issue.priority] ?? 0) + 1;
  }

  // Extract total sessions from executive dashboard raw text
  const sessionsMatch = executiveDashboardRaw.match(/Total Sessions\s*\|\s*(\d[\d,]*)/i);
  const totalSessions = sessionsMatch ? parseInt(sessionsMatch[1].replace(/,/g, ''), 10) : 0;

  // Sum dead clicks and rage clicks from issues
  const totalDeadClicks = issues
    .filter(i => i.type === 'dead_click')
    .reduce((sum, i) => sum + i.count, 0);
  const totalRageClicks = issues
    .filter(i => i.type === 'rage_click')
    .reduce((sum, i) => sum + i.count, 0);

  // Count unique pages
  const uniquePages = new Set(issues.map(i => i.url)).size;

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      dataRange: 'Last 1 day',
      targetRepo: GITHUB_CONFIG.repo,
      pipelineVersion: '3.1.0',
      clarityProjectId: CLARITY_PROJECT_ID,
      clarityApiCalls,
      claudeApiCalls,
      inputTokens: totals.input,
      outputTokens: totals.output,
      estimatedCost: cost,
      durationMs,
    },
    summary: {
      totalSessions,
      totalDeadClicks,
      totalRageClicks,
      totalPages: uniquePages,
      issuesByPriority,
    },
    issues: entries,
  };
}

// ─── Write HTML Report ────────────────────────────────────────────
function writeHtmlReport(report: InvestigationReport): string {
  console.log('\n--- Writing HTML Report ---');

  const html = generateInvestigationHTML(report);

  const outputDir = join(process.cwd(), 'output', 'reports');
  mkdirSync(outputDir, { recursive: true });

  const date = report.metadata.generatedAt.split('T')[0];
  const filename = `ux-investigation-${date}.html`;
  const filepath = join(outputDir, filename);
  writeFileSync(filepath, html, 'utf-8');

  console.log(`Report saved: ${filepath} (${Buffer.byteLength(html)} bytes)`);
  return filepath;
}

// ─── Main Pipeline ────────────────────────────────────────────────
async function main() {
  console.log('=== UX AutoPilot Pipeline v3.1 (Standalone — Investigation Mode) ===');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Target: ${GITHUB_CONFIG.repo}`);
  console.log(`Clarity Project: ${CLARITY_PROJECT_ID}`);

  const pipelineStart = Date.now();

  if (!ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in .env');
    process.exit(1);
  }

  try {
    // 1. Load Clarity data
    const clarityData = loadClarityData();
    const clarityApiCalls = clarityData.apiCallsUsed ?? 6;

    // 2. Clone target repo (optional — pipeline continues without it)
    const repoAvailable = ensureRepoCloned();

    // 3. Get repo context (if available)
    const repoContext = repoAvailable
      ? getRepoContext()
      : `## Target Repository: ${GITHUB_CONFIG.repo}\n\n_Repository not available locally. Code mapping will be based on URL patterns only._`;
    const routeFiles = repoAvailable ? getRouteFilesContent() : '(no repo available)';

    // 4. Agent 1: UX Detective v3 — extract verified issues
    const { raw: detectiveRaw, issues: verifiedIssues } = await detectVerifiedIssues(clarityData);

    if (verifiedIssues.length === 0) {
      console.warn('\n  Warning: No verified issues extracted. The report will be empty.');
    }

    // 5. Agent 2: Code Investigator — generate hypotheses
    const investigations = await investigateCode(verifiedIssues, repoContext, routeFiles);

    // 6. Agent 3: Prompt Generator — create investigation prompts
    const prompts = await generateInvestigationPrompts(verifiedIssues, investigations);

    // 7. Assemble report object
    const durationMs = Date.now() - pipelineStart;
    const report = assembleReport(
      verifiedIssues,
      investigations,
      prompts,
      clarityApiCalls,
      durationMs,
      detectiveRaw
    );

    // 8. Write HTML report
    const reportPath = writeHtmlReport(report);

    const totals = getTotalTokens();
    const cost = estimateCost();

    console.log(`\n=== Pipeline Complete ===`);
    console.log(`Report: ${reportPath}`);
    console.log(`Issues Found: ${verifiedIssues.length}`);
    console.log(`Claude API Calls: ${claudeApiCalls}`);
    console.log(`Total Tokens: ${totals.input.toLocaleString()} in / ${totals.output.toLocaleString()} out`);
    console.log(`Estimated Cost: $${cost.toFixed(4)}`);
    console.log(`Duration: ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`Finished: ${new Date().toISOString()}`);

    // 9. Send Slack notification
    const slackSummary = extractReportSummaryFromData(
      report,
      reportPath,
      GITHUB_CONFIG.repo,
      clarityApiCalls,
      claudeApiCalls,
      `$${cost.toFixed(4)}`,
      durationMs / 1000
    );
    await sendSlackNotification(slackSummary);
  } catch (error) {
    console.error('\nPipeline failed:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
