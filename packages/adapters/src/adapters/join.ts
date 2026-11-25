import type { EmploymentType, JobPosting, JobStub, RemoteType, SalaryRange, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface JoinJobRaw {
  id: string | number;
  title: string;
  slug?: string;
  location?: string;
  city?: string;
  country?: string;
  remote?: boolean;
  workplaceType?: string;
  employmentType?: string;
  description?: string;
  createdAt?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

export class JoinAdapter implements SourceAdapter {
  public readonly id = 'join';
  public readonly name = 'Join.com Job Board';
  public readonly homepage = 'https://join.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Join.com provides public REST endpoints for company job postings.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'join';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('JoinAdapter: companySlug is required for search');
      return;
    }

    const url = `https://join.com/api/companies/${encodeURIComponent(companySlug)}/jobs`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const json = await res.json<any>();
      const jobs: JoinJobRaw[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.jobs)
          ? json.jobs
          : [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const item of jobs) {
        if (count >= limit) break;

        const title = item.title || '';
        const locParts = [item.city, item.location, item.country].filter(Boolean);
        const locName = locParts.join(', ');

        const isRemote = Boolean(
          item.remote ||
          item.workplaceType?.toLowerCase() === 'remote' ||
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

        const applyUrl = `https://join.com/companies/${encodeURIComponent(companySlug)}/${item.slug || item.id}`;

        const stub: JobStub = {
          id: `join_${companySlug}_${item.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: item.createdAt,
          atsType: 'join',
          extra: {
            rawId: item.id,
            slug: item.slug,
            companySlug,
            employmentType: item.employmentType,
            cachedDescription: item.description,
            salary: item.salary,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`JoinAdapter search failed for ${companySlug}:`, err);
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

    let salary: SalaryRange | undefined;
    const rawSal = stub.extra?.salary as { min?: number; max?: number; currency?: string } | undefined;
    if (rawSal?.min || rawSal?.max) {
      salary = {
        min: rawSal.min,
        max: rawSal.max,
        currency: rawSal.currency || 'USD',
        period: 'year',
      };
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
      salary,
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'join',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
