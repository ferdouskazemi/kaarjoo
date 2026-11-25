import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface PinpointPostingRaw {
  id: number | string;
  title: string;
  description?: string;
  url?: string;
  department?: {
    name?: string;
  };
  locations?: Array<{
    name?: string;
    city?: string;
    country?: string;
  }>;
  is_remote?: boolean;
  employment_type?: string;
  created_at?: string;
}

export class PinpointAdapter implements SourceAdapter {
  public readonly id = 'pinpoint';
  public readonly name = 'Pinpoint Job Board';
  public readonly homepage = 'https://pinpointhq.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Pinpoint provides a public /postings.json endpoint on client career sites.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'pinpoint';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('PinpointAdapter: companySlug is required for search');
      return;
    }

    const url = `https://${encodeURIComponent(companySlug)}.pinpointhq.com/postings.json`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const json = await res.json<any>();
      const postings: PinpointPostingRaw[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const item of postings) {
        if (count >= limit) break;

        const title = item.title || '';
        const locParts = item.locations?.map(l => l.name || l.city).filter(Boolean) || [];
        const locName = locParts.join(', ');
        const isRemote = Boolean(item.is_remote || locName.toLowerCase().includes('remote') || title.toLowerCase().includes('(remote)'));

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

        const applyUrl = item.url || `https://${encodeURIComponent(companySlug)}.pinpointhq.com/postings/${item.id}`;

        const stub: JobStub = {
          id: `pin_${companySlug}_${item.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: item.created_at,
          atsType: 'pinpoint',
          extra: {
            rawId: item.id,
            companySlug,
            department: item.department?.name,
            employmentType: item.employment_type,
            cachedDescription: item.description,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`PinpointAdapter search failed for ${companySlug}:`, err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const cachedDesc = stub.extra?.cachedDescription as string | undefined;
    const descriptionMarkdown = cachedDesc ? htmlToMarkdown(cachedDesc) : stub.title;

    let employmentType: EmploymentType | undefined;
    const empTypeStr = ((stub.extra?.employmentType as string) || '').toLowerCase();
    if (empTypeStr.includes('full')) employmentType = 'full-time';
    else if (empTypeStr.includes('part')) employmentType = 'part-time';
    else if (empTypeStr.includes('contract')) employmentType = 'contract';
    else if (empTypeStr.includes('intern')) employmentType = 'internship';

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
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'pinpoint',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
