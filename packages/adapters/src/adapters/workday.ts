import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface WorkdayPostingRaw {
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
}

interface WorkdayResponseRaw {
  total?: number;
  jobPostings?: WorkdayPostingRaw[];
}

interface WorkdayDetailRaw {
  jobPostingInfo?: {
    id?: string;
    title?: string;
    jobDescription?: string;
    location?: string;
    additionalLocations?: string[];
    timeType?: string;
    startDate?: string;
    externalUrl?: string;
  };
}

export class WorkdayAdapter implements SourceAdapter {
  public readonly id = 'workday';
  public readonly name = 'Workday Career Sites (Beta)';
  public readonly homepage = 'https://www.myworkdayjobs.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Workday Candidate Experience Service (CXS) powers public tenant career portals without authentication (marked beta).',
  };
  public readonly rateLimit = {
    requestsPerMinute: 30,
    concurrency: 1,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'workday';

  /**
   * companySlug can be in the form "tenant/board" or "tenant" (defaults to "careers")
   * e.g. "nvidia/NVIDIAExternalCareerSite" or "walmart"
   */
  private parseSlug(slug: string): { tenant: string; board: string } {
    if (slug.includes('/')) {
      const parts = slug.split('/');
      return { tenant: parts[0], board: parts[1] };
    }
    return { tenant: slug, board: `${slug}_careers` };
  }

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const rawSlug = query.company || ctx.companySlug;
    if (!rawSlug) {
      ctx.logger?.warn('WorkdayAdapter: companySlug is required for search');
      return;
    }

    const { tenant, board } = this.parseSlug(rawSlug);
    const limit = query.limit ?? 20;

    // CXS endpoints use POST JSON
    const url = `https://${encodeURIComponent(tenant)}.myworkdayjobs.com/wday/cxs/${encodeURIComponent(tenant)}/${encodeURIComponent(board)}/jobs`;

    try {
      const payload = {
        appliedFacets: {},
        limit,
        offset: 0,
        searchText: query.keywords?.[0] || '',
      };

      const res = await ctx.httpClient.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<WorkdayResponseRaw>();
      const postings = data.jobPostings || [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      for (const item of postings) {
        if (count >= limit) break;

        const title = item.title || '';
        const locName = item.locationsText || '';
        const isRemote =
          locName.toLowerCase().includes('remote') ||
          title.toLowerCase().includes('(remote)') ||
          title.toLowerCase().includes('[remote]');

        if (remoteOnly && !isRemote) continue;

        if (keywords.length > 0) {
          const match = keywords.some(k => title.toLowerCase().includes(k) || locName.toLowerCase().includes(k));
          if (!match) continue;
        }

        const remoteType: RemoteType = isRemote
          ? 'remote'
          : locName.toLowerCase().includes('hybrid')
            ? 'hybrid'
            : 'on-site';

        const applyUrl = `https://${encodeURIComponent(tenant)}.myworkdayjobs.com/en-US/${encodeURIComponent(board)}${item.externalPath}`;
        const rawId = item.externalPath.replace(/^\//, '');

        const stub: JobStub = {
          id: `wd_${tenant}_${rawId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company: tenant,
          location: locName || undefined,
          remoteType,
          postedAt: item.postedOn,
          atsType: 'workday',
          extra: {
            tenant,
            board,
            externalPath: item.externalPath,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`WorkdayAdapter search failed for ${rawSlug}:`, err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const tenant = (stub.extra?.tenant as string) || stub.company;
    const board = (stub.extra?.board as string) || `${tenant}_careers`;
    const externalPath = (stub.extra?.externalPath as string) || '';

    let descriptionMarkdown = '';
    let employmentType: EmploymentType | undefined;

    if (externalPath) {
      const detailUrl = `https://${encodeURIComponent(tenant)}.myworkdayjobs.com/wday/cxs/${encodeURIComponent(tenant)}/${encodeURIComponent(board)}${externalPath}`;
      try {
        const res = await ctx.httpClient.fetch(detailUrl, {
          rateLimitPerMinute: this.rateLimit.requestsPerMinute,
          concurrency: this.rateLimit.concurrency,
          signal: ctx.abortSignal,
        });
        const data = await res.json<WorkdayDetailRaw>();
        const info = data.jobPostingInfo;
        if (info?.jobDescription) {
          descriptionMarkdown = htmlToMarkdown(info.jobDescription);
        }
        const timeType = (info?.timeType || '').toLowerCase();
        if (timeType.includes('full')) employmentType = 'full-time';
        else if (timeType.includes('part')) employmentType = 'part-time';
      } catch (err) {
        ctx.logger?.warn(`WorkdayAdapter fetchDetail error for ${stub.id}:`, err);
        descriptionMarkdown = stub.title;
      }
    }

    const hashes = computeJobHashes({
      url: stub.url,
      company: stub.company,
      title: stub.title,
      location: stub.location,
      descriptionMarkdown,
    });

    return {
      id: stub.id,
      sourceId: this.id,
      sourceName: this.name,
      canonicalUrl: hashes.canonicalUrl,
      applyUrl: stub.url,
      title: stub.title,
      company: stub.company,
      location: stub.location,
      remoteType: stub.remoteType ?? 'on-site',
      employmentType,
      descriptionMarkdown: descriptionMarkdown || stub.title,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'workday',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
