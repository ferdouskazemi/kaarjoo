import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface BambooJobRaw {
  id: string | number;
  jobOpeningName: string;
  departmentLabel?: string;
  location?: {
    city?: string;
    state?: string;
  };
  locationType?: string;
  isRemote?: boolean;
  employmentType?: string;
  description?: string;
}

export class BambooHRAdapter implements SourceAdapter {
  public readonly id = 'bamboohr';
  public readonly name = 'BambooHR Job Board';
  public readonly homepage = 'https://www.bamboohr.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'BambooHR public career site provides an unauthenticated /careers/list JSON endpoint for job listings.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'bamboohr';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('BambooHRAdapter: companySlug is required for search');
      return;
    }

    const url = `https://${encodeURIComponent(companySlug)}.bamboohr.com/careers/list`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<{ result?: BambooJobRaw[] }>();
      const jobs = data.result || [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const item of jobs) {
        if (count >= limit) break;

        const title = item.jobOpeningName || '';
        const locParts = [item.location?.city, item.location?.state].filter(Boolean);
        const locName = locParts.join(', ');
        const isRemote = Boolean(
          item.isRemote ||
          item.locationType?.toLowerCase() === 'remote' ||
          locName.toLowerCase().includes('remote') ||
          title.toLowerCase().includes('(remote)')
        );

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

        const applyUrl = `https://${encodeURIComponent(companySlug)}.bamboohr.com/careers/${item.id}`;

        const stub: JobStub = {
          id: `bhr_${companySlug}_${item.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          atsType: 'bamboohr',
          extra: {
            rawId: item.id,
            companySlug,
            department: item.departmentLabel,
            employmentType: item.employmentType,
            cachedDescription: item.description,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`BambooHRAdapter search failed for ${companySlug}:`, err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    let descriptionMarkdown = '';
    const cachedDesc = stub.extra?.cachedDescription as string | undefined;

    if (cachedDesc) {
      descriptionMarkdown = htmlToMarkdown(cachedDesc);
    } else {
      const rawId = (stub.extra?.rawId as string) || stub.id.replace(`bhr_${stub.company}_`, '');
      const companySlug = (stub.extra?.companySlug as string) || stub.company;
      const detailUrl = `https://${encodeURIComponent(companySlug)}.bamboohr.com/careers/${rawId}/detail`;

      try {
        const res = await ctx.httpClient.fetch(detailUrl, {
          rateLimitPerMinute: this.rateLimit.requestsPerMinute,
          concurrency: this.rateLimit.concurrency,
          signal: ctx.abortSignal,
        });
        const data = await res.json<{ result?: { description?: string; jobOpeningName?: string } }>();
        if (data.result?.description) {
          descriptionMarkdown = htmlToMarkdown(data.result.description);
        }
      } catch (err) {
        ctx.logger?.warn(`BambooHRAdapter fetchDetail fallback for ${stub.id}:`, err);
        descriptionMarkdown = stub.title;
      }
    }

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
      descriptionMarkdown: descriptionMarkdown || stub.title,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'bamboohr',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
