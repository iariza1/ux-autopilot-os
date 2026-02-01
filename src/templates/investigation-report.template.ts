/**
 * UX AutoPilot v3.1 — Investigation Report HTML Template
 *
 * Generates a self-contained HTML file with inline CSS and JS.
 * No external dependencies — the HTML file works standalone.
 */

import type {
  InvestigationReport,
  InvestigationIssueEntry,
  InvestigationMetadata,
  InvestigationSummary,
  PossibleCause,
  Priority,
  Probability,
} from '../types/investigation.js';

// ─── Main Export ─────────────────────────────────────────────────

export function generateInvestigationHTML(report: InvestigationReport): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UX Investigation Report - ${report.metadata.generatedAt.split('T')[0]}</title>
  <style>${getStyles()}</style>
</head>
<body>
  ${renderHeader(report.metadata)}
  ${renderStatsRow(report.summary)}
  ${renderAboutSection()}
  <div class="issues-container">
    ${report.issues.map((issue, i) => renderIssueCard(issue, i + 1)).join('\n')}
  </div>
  ${renderWorkflow()}
  ${renderCostSection(report.metadata)}
  ${renderFooter(report.metadata)}
  <script>${getScript()}</script>
</body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function priorityColor(p: Priority): string {
  const colors: Record<Priority, string> = {
    P0: '#ef4444',
    P1: '#f97316',
    P2: '#eab308',
    P3: '#22c55e',
  };
  return colors[p];
}

function probabilityBadge(prob: Probability): string {
  const colors: Record<Probability, string> = {
    HIGH: '#ef4444',
    MEDIUM: '#f97316',
    LOW: '#6b7280',
  };
  return `<span class="prob-badge" style="background:${colors[prob]}">${prob}</span>`;
}

function priorityEmoji(p: Priority): string {
  const emojis: Record<Priority, string> = { P0: '&#x1F534;', P1: '&#x1F7E0;', P2: '&#x1F7E1;', P3: '&#x1F7E2;' };
  return emojis[p];
}

// ─── Section Renderers ──────────────────────────────────────────

function renderHeader(meta: InvestigationMetadata): string {
  return `
  <header class="report-header">
    <div class="header-top">
      <h1>&#x1F50D; UX Investigation Report</h1>
      <span class="badge">v${meta.pipelineVersion} Investigation Mode</span>
    </div>
    <div class="header-meta">
      <span>&#x1F4C5; ${meta.generatedAt.split('T')[0]}</span>
      <span>&#x1F4CA; ${meta.dataRange}</span>
      <span>&#x1F4E6; ${escapeHtml(meta.targetRepo)}</span>
      <span>&#x1F3AF; Clarity: ${escapeHtml(meta.clarityProjectId)}</span>
    </div>
  </header>`;
}

function renderStatsRow(summary: InvestigationSummary): string {
  const cards = [
    { label: 'Sessions Analyzed', value: summary.totalSessions.toLocaleString(), icon: '&#x1F465;' },
    { label: 'Dead Clicks', value: summary.totalDeadClicks.toLocaleString(), icon: '&#x1F6AB;' },
    { label: 'Pages to Investigate', value: summary.totalPages.toLocaleString(), icon: '&#x1F4C4;' },
    { label: 'Rage Clicks', value: summary.totalRageClicks.toLocaleString(), icon: '&#x1F4A2;' },
  ];
  return `
  <div class="stats-row">
    ${cards.map(c => `
      <div class="stat-card">
        <div class="stat-icon">${c.icon}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${c.label}</div>
      </div>
    `).join('')}
  </div>`;
}

function renderAboutSection(): string {
  return `
  <section class="about-section">
    <h2>&#x2139;&#xFE0F; About Dead Click Detection</h2>
    <div class="about-grid">
      <div class="about-card">
        <h3>What Clarity Reports</h3>
        <p>A "dead click" is registered when a user clicks an element and <strong>no DOM change</strong> is detected within a short window. This is a heuristic, not a definitive bug detector.</p>
      </div>
      <div class="about-card">
        <h3>Common False Positives</h3>
        <ul>
          <li>Clicks on padding/margin near interactive elements</li>
          <li>Clicks during page loading before React hydrates</li>
          <li>Clicks on decorative elements that look interactive</li>
          <li>Re-clicks on already-selected filters/tabs</li>
        </ul>
      </div>
      <div class="about-card">
        <h3>This Report Provides</h3>
        <p>Investigation prompts you can copy into <strong>Claude, ChatGPT, or Lovable</strong> to investigate each issue. The AI will help you determine if it's a real bug, false positive, or UX improvement opportunity.</p>
      </div>
    </div>
  </section>`;
}

function renderIssueCard(entry: InvestigationIssueEntry, index: number): string {
  const v = entry.verified;
  const inv = entry.investigation;
  const prompt = entry.prompt;

  return `
  <div class="investigation-card" id="issue-${v.id}">
    <div class="card-header" style="border-left: 4px solid ${priorityColor(v.priority)}">
      <div class="card-title">
        <span class="card-number">#${index}</span>
        <span class="priority-badge" style="background:${priorityColor(v.priority)}">${v.priority}</span>
        <span>${priorityEmoji(v.priority)} ${escapeHtml(v.type.replace('_', ' '))} on ${escapeHtml(v.pageNameInferred)}</span>
      </div>
      <div class="card-subtitle">
        <code>${escapeHtml(v.url)}</code>
        <span class="metric-pill">${v.count} ${escapeHtml(v.metric)}</span>
        <span class="metric-pill">${v.sessionsAffected}/${v.sessionsTotal} sessions (${v.percentAffected.toFixed(0)}%)</span>
      </div>
    </div>

    <div class="known-unknown">
      <div class="known-col">
        <h4>&#x2705; WHAT WE KNOW</h4>
        <ul>
          ${inv.knownFacts.map(f => `<li>${escapeHtml(f)}</li>`).join('\n          ')}
        </ul>
      </div>
      <div class="unknown-col">
        <h4>&#x2753; WHAT WE DON'T KNOW</h4>
        <ul>
          ${inv.unknownFactors.map(f => `<li>${escapeHtml(f)}</li>`).join('\n          ')}
        </ul>
      </div>
    </div>

    <div class="causes-section">
      <h4>POSSIBLE CAUSES</h4>
      ${inv.possibleCauses.map(renderCause).join('\n')}
    </div>

    <div class="investigation-prompt">
      <div class="prompt-header">
        <h4>&#x1F916; INVESTIGATION PROMPT</h4>
        <button class="copy-btn" id="copy-btn-${v.id}" onclick="copyPrompt('${v.id}')">COPY</button>
      </div>
      <pre class="prompt-box" id="prompt-${v.id}">${escapeHtml(prompt.promptText)}</pre>
    </div>

    <div class="quick-context">
      <div class="context-group">
        <span class="context-label">Files to check:</span>
        ${prompt.quickContext.filesToCheck.map(f => `<code class="file-pill">${escapeHtml(f)}</code>`).join(' ')}
      </div>
      <div class="context-group">
        <span class="context-label">Search terms:</span>
        ${prompt.quickContext.searchTerms.map(t => `<code class="search-pill">${escapeHtml(t)}</code>`).join(' ')}
      </div>
    </div>
  </div>`;
}

function renderCause(cause: PossibleCause): string {
  return `
      <div class="cause-item">
        ${probabilityBadge(cause.probability)}
        <div class="cause-content">
          <strong>${escapeHtml(cause.title)}</strong>
          <p>${escapeHtml(cause.description)}</p>
        </div>
      </div>`;
}

function renderWorkflow(): string {
  return `
  <section class="workflow-section">
    <h2>&#x1F4CB; Recommended Workflow</h2>
    <div class="workflow-steps">
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>Copy Investigation Prompt</h3>
          <p>Click the <strong>COPY</strong> button on any issue card above. Paste the prompt into Claude Code, ChatGPT, Lovable, or your preferred AI assistant.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>Classify Each Issue</h3>
          <p>The AI will help you determine: <strong>Bug Real</strong> (needs fix), <strong>False Positive</strong> (ignore), <strong>UX Improvement</strong> (optional enhancement), or <strong>Needs More Data</strong> (check session recordings).</p>
        </div>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3>Fix Real Bugs Only</h3>
          <p>Apply fixes for confirmed bugs. Re-run the pipeline in 24-48 hours to verify the fix reduced the metric.</p>
        </div>
      </div>
    </div>
  </section>`;
}

function renderCostSection(meta: InvestigationMetadata): string {
  return `
  <section class="cost-section">
    <h2>&#x1F4B0; Pipeline Costs</h2>
    <table class="cost-table">
      <tr><td>Clarity API Calls</td><td>${meta.clarityApiCalls} of 10</td></tr>
      <tr><td>Claude API Calls</td><td>${meta.claudeApiCalls}</td></tr>
      <tr><td>Input Tokens</td><td>${meta.inputTokens.toLocaleString()}</td></tr>
      <tr><td>Output Tokens</td><td>${meta.outputTokens.toLocaleString()}</td></tr>
      <tr><td>Estimated Cost</td><td>$${meta.estimatedCost.toFixed(4)}</td></tr>
      <tr><td>Duration</td><td>${(meta.durationMs / 1000).toFixed(1)}s</td></tr>
    </table>
  </section>`;
}

function renderFooter(meta: InvestigationMetadata): string {
  return `
  <footer class="report-footer">
    <p class="disclaimer">&#x26A0;&#xFE0F; This report contains <strong>investigation prompts</strong>, not confirmed bugs. Each issue requires manual verification before implementing any fix. Clarity data shows behavioral patterns, not definitive bugs.</p>
    <p class="generated">Generated by UX AutoPilot v${meta.pipelineVersion} &mdash; ${meta.generatedAt}</p>
  </footer>`;
}

// ─── CSS ─────────────────────────────────────────────────────────

function getStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Header */
    .report-header { margin-bottom: 2rem; }
    .header-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
    .header-top h1 { font-size: 1.8rem; color: #f8fafc; }
    .badge {
      background: #3b82f6;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .header-meta { display: flex; gap: 1.5rem; color: #94a3b8; font-size: 0.875rem; flex-wrap: wrap; }

    /* Stats Row */
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card {
      background: #1e293b;
      border-radius: 0.75rem;
      padding: 1.25rem;
      text-align: center;
      border: 1px solid #334155;
    }
    .stat-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #f8fafc; }
    .stat-label { font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem; }

    /* About Section */
    .about-section {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .about-section h2 { font-size: 1.2rem; margin-bottom: 1rem; color: #f8fafc; }
    .about-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
    .about-card { background: #0f172a; border-radius: 0.5rem; padding: 1rem; }
    .about-card h3 { font-size: 0.9rem; color: #3b82f6; margin-bottom: 0.5rem; }
    .about-card p, .about-card li { font-size: 0.85rem; color: #cbd5e1; }
    .about-card ul { padding-left: 1.25rem; }
    .about-card li { margin-bottom: 0.25rem; }

    /* Investigation Cards */
    .issues-container { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; }
    .investigation-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .card-header {
      padding: 1.25rem;
      background: #1a2332;
    }
    .card-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.1rem; font-weight: 600; flex-wrap: wrap; }
    .card-number { color: #64748b; font-weight: 400; }
    .priority-badge {
      color: white;
      padding: 0.15rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .card-subtitle { display: flex; gap: 0.75rem; margin-top: 0.5rem; align-items: center; flex-wrap: wrap; }
    .card-subtitle code { font-size: 0.8rem; color: #94a3b8; }
    .metric-pill {
      background: #334155;
      color: #cbd5e1;
      padding: 0.15rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    /* Known / Unknown Grid */
    .known-unknown { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid #334155; }
    .known-col, .unknown-col { padding: 1.25rem; }
    .known-col { border-right: 1px solid #334155; }
    .known-col h4, .unknown-col h4 { font-size: 0.8rem; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
    .known-col h4 { color: #22c55e; }
    .unknown-col h4 { color: #f97316; }
    .known-col ul, .unknown-col ul { list-style: none; }
    .known-col li, .unknown-col li { font-size: 0.85rem; color: #cbd5e1; padding: 0.25rem 0; padding-left: 1rem; position: relative; }
    .known-col li::before { content: "\\2022"; position: absolute; left: 0; color: #22c55e; }
    .unknown-col li::before { content: "\\2022"; position: absolute; left: 0; color: #f97316; }

    /* Causes Section */
    .causes-section { padding: 1.25rem; border-top: 1px solid #334155; }
    .causes-section h4 { font-size: 0.8rem; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 0.75rem; }
    .cause-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem 0; }
    .prob-badge {
      color: white;
      padding: 0.1rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.7rem;
      font-weight: 700;
      white-space: nowrap;
      min-width: 60px;
      text-align: center;
    }
    .cause-content strong { font-size: 0.9rem; color: #e2e8f0; }
    .cause-content p { font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem; }

    /* Investigation Prompt */
    .investigation-prompt { padding: 1.25rem; border-top: 1px solid #334155; }
    .prompt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .prompt-header h4 { font-size: 0.8rem; letter-spacing: 0.05em; color: #94a3b8; }
    .copy-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.4rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.05em;
      transition: background 0.2s;
    }
    .copy-btn:hover { background: #2563eb; }
    .prompt-box {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 1rem;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.8rem;
      color: #cbd5e1;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 400px;
      overflow-y: auto;
      line-height: 1.5;
    }

    /* Quick Context */
    .quick-context { padding: 1rem 1.25rem; border-top: 1px solid #334155; background: #1a2332; }
    .context-group { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
    .context-group:last-child { margin-bottom: 0; }
    .context-label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; white-space: nowrap; }
    .file-pill, .search-pill {
      font-family: 'SF Mono', monospace;
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 0.25rem;
    }
    .file-pill { background: #1e3a5f; color: #93c5fd; }
    .search-pill { background: #3f3f1e; color: #fde68a; }

    /* Workflow Section */
    .workflow-section {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .workflow-section h2 { font-size: 1.2rem; margin-bottom: 1.25rem; color: #f8fafc; }
    .workflow-steps { display: flex; flex-direction: column; gap: 1rem; }
    .step { display: flex; gap: 1rem; align-items: flex-start; }
    .step-number {
      background: #3b82f6;
      color: white;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
    }
    .step-content h3 { font-size: 1rem; color: #f8fafc; margin-bottom: 0.25rem; }
    .step-content p { font-size: 0.85rem; color: #94a3b8; }

    /* Cost Section */
    .cost-section {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .cost-section h2 { font-size: 1.2rem; margin-bottom: 1rem; color: #f8fafc; }
    .cost-table { width: 100%; border-collapse: collapse; }
    .cost-table td { padding: 0.5rem 0; font-size: 0.875rem; border-bottom: 1px solid #334155; }
    .cost-table td:first-child { color: #94a3b8; }
    .cost-table td:last-child { text-align: right; color: #e2e8f0; font-weight: 500; }

    /* Footer */
    .report-footer { text-align: center; padding: 2rem 0; color: #64748b; }
    .disclaimer {
      background: #1e293b;
      border: 1px solid #f97316;
      border-radius: 0.5rem;
      padding: 1rem;
      font-size: 0.85rem;
      color: #cbd5e1;
      margin-bottom: 1rem;
    }
    .generated { font-size: 0.75rem; }

    /* Responsive */
    @media (max-width: 768px) {
      body { padding: 1rem; }
      .known-unknown { grid-template-columns: 1fr; }
      .known-col { border-right: none; border-bottom: 1px solid #334155; }
      .header-top h1 { font-size: 1.4rem; }
    }
  `;
}

// ─── JavaScript ──────────────────────────────────────────────────

function getScript(): string {
  return `
    function copyPrompt(issueId) {
      var el = document.getElementById('prompt-' + issueId);
      if (!el) return;
      var text = el.textContent || el.innerText;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          showCopied(issueId);
        }).catch(function() {
          fallbackCopy(text, issueId);
        });
      } else {
        fallbackCopy(text, issueId);
      }
    }

    function fallbackCopy(text, issueId) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showCopied(issueId); }
      catch(e) { alert('Copy failed. Please select the text manually.'); }
      document.body.removeChild(ta);
    }

    function showCopied(issueId) {
      var btn = document.getElementById('copy-btn-' + issueId);
      if (!btn) return;
      btn.textContent = 'Copied!';
      btn.style.background = '#22c55e';
      setTimeout(function() {
        btn.textContent = 'COPY';
        btn.style.background = '#3b82f6';
      }, 2000);
    }
  `;
}
