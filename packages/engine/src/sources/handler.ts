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
    const query: SearchQuery = {
      limit: 50,
      ...params.query,
    };
    const limit = query.limit;
    const results: JobStub[] = [];

    // If specific adapter requested
    if (params.adapterId) {
      const adapter = defaultAdapterRegistry.get(params.adapterId);
      if (adapter) {
        for await (const stub of adapter.search(query, {
          httpClient: defaultPoliteClient,
          companySlug: params.companySlug,
        })) {
          results.push(stub);
          if (results.length >= limit) break;
        }
      }
      return results;
    }

    // Default multi-source search: WeWorkRemotely RSS + top active seeded boards
    const wwrAdapter = defaultAdapterRegistry.get('weworkremotely');
    if (wwrAdapter) {
      try {
        for await (const stub of wwrAdapter.search(query, { httpClient: defaultPoliteClient })) {
          results.push(stub);
          if (results.length >= Math.floor(limit / 2)) break;
        }
      } catch {
        // Continue if one source fails
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
      } catch {
        // Polite: ignore single board failures
      }
    }

    return results;
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
