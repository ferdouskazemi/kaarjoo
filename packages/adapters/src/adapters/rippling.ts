import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface RipplingJobRaw {
  uuid: string;
  name: string;
  url?: string;
  department?: {
    name?: string;
  };
  workLocation?: {
    locationName?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  workplaceType?: string;
  description?: string;
  employmentType?: string;
  created?: string;
}

export class RipplingAdapter implements SourceAdapter {
  public readonly id = 'rippling';
  public readonly name = 'Rippling ATS';
  public readonly homepage = 'https://www.rippling.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Rippling publishes an open, keyless platform ATS board API for public career listings.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'rippling';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('RipplingAdapter: companySlug is required for search');
      return;
    }

    const url = `https://api.rippling.com/platform/api/ats/v1/board/${encodeURIComponent(companySlug)}/jobs`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<RipplingJobRaw[]>();
      const jobs = Array.isArray(data) ? data : [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const item of jobs) {
        if (count >= limit) break;

        const title = item.name || '';
        const locParts = [
          item.workLocation?.locationName,
          item.workLocation?.city,
          item.workLocation?.state,
          item.workLocation?.country,
        ].filter(Boolean);
        const locName = locParts.join(', ');

        const wpType = (item.workplaceType || '').toUpperCase();
        const isRemote =
          wpType === 'REMOTE' ||
          locName.toLowerCase().includes('remote') ||
          title.toLowerCase().includes('(remote)');

        if (remoteOnly && !isRemote) continue;

        if (keywords.length > 0) {
          const match = keywords.some(k => title.toLowerCase().includes(k) || locName.toLowerCase().includes(k));
          if (!match) continue;
        }

        const remoteType: RemoteType = isRemote
          ? 'remote'
          : wpType === 'HYBRID' || locName.toLowerCase().includes('hybrid')
            ? 'hybrid'
            : 'on-site';

        const applyUrl = item.url || `https://ats.rippling.com/${encodeURIComponent(companySlug)}/jobs/${item.uuid}`;

        const stub: JobStub = {
          id: `rip_${companySlug}_${item.uuid}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: item.created,
          atsType: 'rippling',
          extra: {
            rawId: item.uuid,
            companySlug,
            department: item.department?.name,
            employmentType: item.employmentType,
            cachedDescription: item.description,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`RipplingAdapter search failed for ${companySlug}:`, err);
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
      atsType: 'rippling',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
