import {
  type CompanyBoard,
  type JobPosting,
  type JobStub,
  type SearchQuery,
  type SourceHealthStatus,
} from '@kaarjoo/shared';
import {
  defaultAdapterRegistry,
  defaultPoliteClient,
  detectAtsFromUrl,
  SEEDED_COMPANY_BOARDS,
  type DetectedAtsInfo,
  AssistJobAdapter,
} from '@kaarjoo/adapters';

export interface SourceSearchStatus {
  id: string;
  status: 'ok' | 'failed';
  error?: string;
}

export interface SearchJobsWithStatusResult {
  jobs: JobStub[];
  sources: SourceSearchStatus[];
}

export class JobSourcesManager {
  private customBoards: CompanyBoard[] = [];

  public getCompanyBoards(): CompanyBoard[] {
    return [...SEEDED_COMPANY_BOARDS, ...this.customBoards];
  }

  public addCompanyBoard(board: CompanyBoard): void {
    const exists = this.customBoards.some(b => b.id === board.id || b.boardSlug === board.boardSlug);
    if (!exists) {
      this.customBoards.push(board);
    }
  }

  public async detectAts(url: string): Promise<DetectedAtsInfo | null> {
    return detectAtsFromUrl(url, defaultPoliteClient);
  }

  public async checkHealth(): Promise<SourceHealthStatus[]> {
    return defaultAdapterRegistry.checkHealth(defaultPoliteClient);
  }

  public async searchJobs(params: {
    query?: Partial<SearchQuery>;
    adapterId?: string;
    companySlug?: string;
  }): Promise<JobStub[]> {
    const res = await this.searchJobsWithStatus(params);
    return res.jobs;
  }

  public async searchJobsWithStatus(params: {
    query?: Partial<SearchQuery>;
    adapterId?: string;
    companySlug?: string;
  }): Promise<SearchJobsWithStatusResult> {
    const query: SearchQuery = {
      limit: 50,
      ...params.query,
    };
    const limit = query.limit;
    const results: JobStub[] = [];
    const sources: SourceSearchStatus[] = [];

    // If specific adapter requested
    if (params.adapterId) {
      const adapter = defaultAdapterRegistry.get(params.adapterId);
      if (adapter) {
        try {
          for await (const stub of adapter.search(query, {
            httpClient: defaultPoliteClient,
            companySlug: params.companySlug,
          })) {
            results.push(stub);
            if (results.length >= limit) break;
          }
          sources.push({ id: params.adapterId, status: 'ok' });
        } catch (err) {
          sources.push({
            id: params.adapterId,
            status: 'failed',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      return { jobs: results, sources };
    }

    // P1-7: Include Afghanistan local adapters (ACBAR + Jobs.af) when location targets Afghanistan/Kabul
    const wantsAfghanistan = (query.locations || []).some((loc) =>
      /\b(afghanistan|kabul)\b/i.test(loc)
    );
    if (wantsAfghanistan) {
      for (const localId of ['acbar', 'jobs_af']) {
        const localAdapter = defaultAdapterRegistry.get(localId);
        if (!localAdapter) continue;
        try {
          for await (const stub of localAdapter.search(query, { httpClient: defaultPoliteClient })) {
            results.push(stub);
            if (results.length >= limit) break;
          }
          sources.push({ id: localId, status: 'ok' });
        } catch (err) {
          sources.push({
            id: localId,
            status: 'failed',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Default multi-source search: WeWorkRemotely RSS + top active seeded boards
    const wwrAdapter = defaultAdapterRegistry.get('weworkremotely');
    if (wwrAdapter) {
      try {
        for await (const stub of wwrAdapter.search(query, { httpClient: defaultPoliteClient })) {
          results.push(stub);
          if (results.length >= Math.floor(limit / 2)) break;
        }
        sources.push({ id: 'weworkremotely', status: 'ok' });
      } catch (err) {
        sources.push({
          id: 'weworkremotely',
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Search across top US/EU tech companies
    const activeBoards = this.getCompanyBoards().filter(b => b.active);
    for (const board of activeBoards) {
      if (results.length >= limit) break;
      const adapter = defaultAdapterRegistry.get(board.atsType);
      if (!adapter) continue;

      try {
        for await (const stub of adapter.search(
          { ...query, company: board.boardSlug, limit: 5 },
          {
            httpClient: defaultPoliteClient,
            companySlug: board.boardSlug,
          }
        )) {
          // Enrich stub with friendly company name
          stub.company = board.name;
          results.push(stub);
          if (results.length >= limit) break;
        }
        sources.push({ id: `${board.atsType}:${board.boardSlug}`, status: 'ok' });
      } catch (err) {
        sources.push({
          id: `${board.atsType}:${board.boardSlug}`,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { jobs: results, sources };
  }

  public async fetchDetail(stub: JobStub): Promise<JobPosting> {
    const adapter = defaultAdapterRegistry.get(stub.atsType) || defaultAdapterRegistry.get(stub.sourceId);
    if (!adapter) {
      throw new Error(`No adapter found for job ${stub.id} (source: ${stub.sourceId}, ats: ${stub.atsType})`);
    }

    return adapter.fetchDetail(stub, {
      httpClient: defaultPoliteClient,
      companySlug: (stub.extra?.companySlug as string) || stub.company,
    });
  }

  public async importFromHtml(params: { html: string; url: string }): Promise<JobPosting> {
    const assist = new AssistJobAdapter();
    return assist.parseFromHtml(params.html, params.url);
  }
}

export const defaultJobSourcesManager = new JobSourcesManager();
