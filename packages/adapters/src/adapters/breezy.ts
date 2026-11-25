import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface BreezyJobRaw {
  id: string;
  name: string;
  friendly_id?: string;
  url?: string;
  type?: {
    id?: string;
    name?: string;
  };
  location?: {
    name?: string;
    is_remote?: boolean;
    country?: {
      name?: string;
    };
  };
  department?: string;
  description?: string;
  creation_date?: string;
  updated_date?: string;
}

export class BreezyAdapter implements SourceAdapter {
  public readonly id = 'breezy';
  public readonly name = 'Breezy HR Job Board';
  public readonly homepage = 'https://breezy.hr';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Breezy HR provides a public, unauthenticated /json endpoint on all careers sites.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'breezy';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('BreezyAdapter: companySlug is required for search');
      return;
    }

    const url = `https://${encodeURIComponent(companySlug)}.breezy.hr/json`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<BreezyJobRaw[]>();
      const jobs = Array.isArray(data) ? data : [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const item of jobs) {
        if (count >= limit) break;

        const title = item.name || '';
        const locName = item.location?.name || '';
        const isRemote = Boolean(item.location?.is_remote || locName.toLowerCase().includes('remote') || title.toLowerCase().includes('(remote)'));

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

        const applyUrl = item.url || `https://${encodeURIComponent(companySlug)}.breezy.hr/p/${item.friendly_id || item.id}`;

        const stub: JobStub = {
          id: `brz_${companySlug}_${item.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: item.updated_date || item.creation_date,
          atsType: 'breezy',
          extra: {
            rawId: item.id,
            companySlug,
            department: item.department,
            employmentTypeName: item.type?.name,
            cachedDescription: item.description,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`BreezyAdapter search failed for ${companySlug}:`, err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const cachedDesc = stub.extra?.cachedDescription as string | undefined;
    const descriptionMarkdown = cachedDesc ? htmlToMarkdown(cachedDesc) : stub.title;

    let employmentType: EmploymentType | undefined;
    const typeStr = ((stub.extra?.employmentTypeName as string) || '').toLowerCase();
    if (typeStr.includes('full')) employmentType = 'full-time';
    else if (typeStr.includes('part')) employmentType = 'part-time';
    else if (typeStr.includes('contract')) employmentType = 'contract';
    else if (typeStr.includes('intern')) employmentType = 'internship';

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
      atsType: 'breezy',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
