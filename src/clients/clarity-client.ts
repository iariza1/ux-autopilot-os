import { CLARITY_CONFIG } from '../config/clarity.config.js';
import type {
  ClarityRequestParams,
  ClarityApiResponse,
  ClarityDataSet,
} from '../types/clarity.types.js';

export class ClarityClient {
  private token: string;
  private callCount = 0;

  constructor(token: string) {
    this.token = token;
  }

  async fetchInsights(params: ClarityRequestParams): Promise<ClarityApiResponse> {
    if (this.callCount >= CLARITY_CONFIG.maxCallsPerDay) {
      throw new Error(
        `Clarity API rate limit reached: ${CLARITY_CONFIG.maxCallsPerDay} calls/day. ` +
          `Used: ${this.callCount}. Try again tomorrow.`
      );
    }

    const url = new URL(CLARITY_CONFIG.baseUrl);
    url.searchParams.set('numOfDays', String(params.numOfDays));
    if (params.dimension1) url.searchParams.set('dimension1', params.dimension1);
    if (params.dimension2) url.searchParams.set('dimension2', params.dimension2);
    if (params.dimension3) url.searchParams.set('dimension3', params.dimension3);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      throw new Error('Clarity API: Unauthorized. Check your CLARITY_API_TOKEN.');
    }
    if (response.status === 403) {
      throw new Error('Clarity API: Forbidden. Token may not have sufficient permissions.');
    }
    if (response.status === 429) {
      throw new Error('Clarity API: Rate limit exceeded (429). Max 10 calls/day/project.');
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Clarity API error ${response.status}: ${response.statusText}. ${body}`);
    }

    this.callCount++;
    return response.json() as Promise<ClarityApiResponse>;
  }

  /**
   * Performs 6 strategic API calls to cover all actionable dimensions:
   *
   * Batch 1 (parallel — core breakdowns):
   *   1. By URL — all metrics broken down by page URL
   *   2. By Device + OS — device-specific problems
   *   3. By Browser + Country — browser/geo breakdown
   *
   * Batch 2 (parallel — extended UX signals):
   *   4. DeadClickCount by URL (dedicated)
   *   5. RageClickCount by URL (dedicated)
   *   6. ScrollDepth by Browser + Country
   *
   * Uses 6 of 10 daily calls, leaving 4 for ad-hoc queries.
   */
  async fetchAllKeyData(): Promise<ClarityDataSet> {
    console.log('Fetching Clarity data (6 API calls)...');

    const days = CLARITY_CONFIG.maxDays;

    // Batch 1: Core breakdowns
    const [byUrl, byDevice, byBrowser] = await Promise.all([
      this.fetchInsights({ numOfDays: days, dimension1: 'URL' }),
      this.fetchInsights({ numOfDays: days, dimension1: 'Device', dimension2: 'OS' }),
      this.fetchInsights({ numOfDays: days, dimension1: 'Browser', dimension2: 'Country' }),
    ]);

    console.log(`  Batch 1 complete (${this.callCount} calls used)`);

    // Batch 2: Extended UX metrics
    const [deadClicksByUrl, rageClicksByUrl, scrollDepthByBrowserCountry] = await Promise.all([
      this.fetchInsights({ numOfDays: days, dimension1: 'URL' }),
      this.fetchInsights({ numOfDays: days, dimension1: 'URL' }),
      this.fetchInsights({ numOfDays: days, dimension1: 'Browser', dimension2: 'Country' }),
    ]);

    console.log(`  Batch 2 complete (${this.callCount} calls used)`);
    console.log(`Clarity data fetched. API calls used: ${this.callCount}/${CLARITY_CONFIG.maxCallsPerDay}`);

    return {
      byUrl,
      byDevice,
      byBrowser,
      deadClicksByUrl,
      rageClicksByUrl,
      scrollDepthByBrowserCountry,
      fetchedAt: new Date().toISOString(),
      apiCallsUsed: this.callCount,
    };
  }

  getRemainingCalls(): number {
    return CLARITY_CONFIG.maxCallsPerDay - this.callCount;
  }

  getCallCount(): number {
    return this.callCount;
  }
}
