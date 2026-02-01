// Microsoft Clarity Data Export API types

export type ClarityDimension =
  | 'Browser'
  | 'Device'
  | 'Country'
  | 'OS'
  | 'Source'
  | 'Medium'
  | 'Campaign'
  | 'Channel'
  | 'URL';

export type ClarityNumDays = 1 | 2 | 3;

export interface ClarityRequestParams {
  numOfDays: ClarityNumDays;
  dimension1?: ClarityDimension;
  dimension2?: ClarityDimension;
  dimension3?: ClarityDimension;
}

export interface ClarityMetricInfo {
  totalSessionCount?: string;
  totalBotSessionCount?: string;
  distantUserCount?: string;
  PagesPerSessionPercentage?: number;
  // Metric-specific values
  DeadClickCount?: number;
  RageClickCount?: number;
  ExcessiveScrollCount?: number;
  QuickbackClickCount?: number;
  ScriptErrorCount?: number;
  ErrorClickCount?: number;
  ScrollDepthPercentage?: number;
  EngagementTimeSeconds?: number;
  // Dimension values are added dynamically
  [key: string]: string | number | undefined;
}

export interface ClarityMetricResult {
  metricName: string;
  information: ClarityMetricInfo[];
}

export type ClarityApiResponse = ClarityMetricResult[];

export interface ClarityDataSet {
  byUrl: ClarityApiResponse;
  byDevice: ClarityApiResponse;
  byBrowser: ClarityApiResponse;
  // Extended metrics (v2) — each uses 1 API call with URL dimension
  deadClicksByUrl?: ClarityApiResponse;
  rageClicksByUrl?: ClarityApiResponse;
  quickbackByUrl?: ClarityApiResponse;
  excessiveScrollByUrl?: ClarityApiResponse;
  scrollDepthByBrowserCountry?: ClarityApiResponse;
  engagementByBrowserCountry?: ClarityApiResponse;
  fetchedAt: string;
  apiCallsUsed?: number;
}

// Pipeline types

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export type IssueType =
  | 'rage_click'
  | 'dead_click'
  | 'excessive_scroll'
  | 'quickback'
  | 'script_error'
  | 'error_click';

export interface UXIssue {
  id: string;
  severity: SeverityLevel;
  type: IssueType;
  metric: string;
  value: number;
  dimension: string;
  dimensionValue: string;
  description: string;
  url?: string;
}

export interface CodeMapping {
  issueId: string;
  filePath: string;
  componentName: string;
  lineRange: string;
  relevantCode: string;
  framework: string;
  cssSelectors: string[];
}

export interface SolutionProposal {
  issueId: string;
  rootCause: string;
  fixCategory: 'css-only' | 'logic-change' | 'component-restructure' | 'new-component';
  diff: string;
  effort: 'trivial' | 'moderate' | 'significant';
  regressionRisk: 'low' | 'medium' | 'high';
  notes: string;
}

export interface PipelineResult {
  timestamp: string;
  dataRange: string;
  targetRepo: string;
  issues: UXIssue[];
  codeMappings: CodeMapping[];
  solutions: SolutionProposal[];
  reportPath: string;
}
