/**
 * UX AutoPilot v3.1 — Investigation Mode Types
 *
 * Separates verified facts (from Clarity data) from hypotheses (from code analysis).
 * Designed to power investigation prompts, not direct fixes.
 */

// ─── Enums / Unions ──────────────────────────────────────────────

export type Probability = 'HIGH' | 'MEDIUM' | 'LOW';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export type InvestigationIssueType =
  | 'rage_click'
  | 'dead_click'
  | 'excessive_scroll'
  | 'quickback'
  | 'script_error'
  | 'error_click';

// ─── Stage 1: UX Detective Output ───────────────────────────────

/** Only Clarity-verified facts — no inferences about root causes */
export interface VerifiedIssue {
  id: string;                       // e.g., "UX-001"
  url: string;                      // full page URL from Clarity
  pageNameInferred: string;         // human-readable name derived from URL path
  metric: string;                   // e.g., "DeadClickCount", "RageClickCount"
  type: InvestigationIssueType;
  count: number;                    // metric value (subTotal from Clarity)
  sessionsTotal: number;            // total sessions for this URL
  sessionsAffected: number;         // sessions that exhibited the behavior
  percentAffected: number;          // sessionsWithMetricPercentage from Clarity
  priority: Priority;
}

// ─── Stage 2: Code Investigator Output ──────────────────────────

export interface PossibleCause {
  id: string;                       // e.g., "CAUSE-001"
  probability: Probability;
  title: string;                    // short title
  description: string;              // detailed explanation
  filesLikelyInvolved: string[];    // file paths in the target repo
}

export interface RelevantFile {
  path: string;
  reason: string;
  searchTerms?: string[];
}

export interface InvestigationData {
  issueId: string;
  knownFacts: string[];             // verified from Clarity data + code reading
  unknownFactors: string[];         // things Clarity API cannot tell us
  possibleCauses: PossibleCause[];
  relevantFiles: RelevantFile[];
}

// ─── Stage 3: Prompt Generator Output ───────────────────────────

export interface InvestigationPrompt {
  issueId: string;
  promptText: string;               // full self-contained prompt for copy-paste
  quickContext: {
    filesToCheck: string[];
    searchTerms: string[];
  };
}

// ─── Combined Issue Entry ───────────────────────────────────────

export interface InvestigationIssueEntry {
  verified: VerifiedIssue;
  investigation: InvestigationData;
  prompt: InvestigationPrompt;
}

// ─── Report Structure ───────────────────────────────────────────

export interface InvestigationMetadata {
  generatedAt: string;
  dataRange: string;
  targetRepo: string;
  pipelineVersion: string;
  clarityProjectId: string;
  clarityApiCalls: number;
  claudeApiCalls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number;
}

export interface InvestigationSummary {
  totalSessions: number;
  totalDeadClicks: number;
  totalRageClicks: number;
  totalPages: number;
  issuesByPriority: Record<Priority, number>;
}

export interface InvestigationReport {
  metadata: InvestigationMetadata;
  summary: InvestigationSummary;
  issues: InvestigationIssueEntry[];
}
