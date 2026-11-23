import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { extractJobPostingJsonLd } from '../extractors/jsonld.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface AshbyJobRaw {
  id: string;
  title: string;
  department?: string;
  location?: string;
  isRemote?: boolean;
  employmentType?: string;
  publishedAt?: string;
  jobUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensation?: {
    compensationTierSummary?: string;
  };
}

export class AshbyAdapter implements SourceAdapter {
  public readonly id = 'ashby';
  public readonly name = 'Ashby Job Board';
  public readonly homepage = 'https://jobs.ashbyhq.com';
  public readonly mode = 'auto-apply';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Ashby public job board API is designed for public listing without authentication.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'ashby';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('AshbyAdapter: companySlug is required for search');
      return;
    }

    const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(companySlug)}`;

    try {
      const res = await ctx.httpClient.fetch(apiUrl, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<{ jobs?: AshbyJobRaw[] }>();
      const jobs = data.jobs || [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const job of jobs) {
        if (count >= limit) break;

        const title = job.title || '';
        const locName = job.location || '';
        const isRemote = job.isRemote || locName.toLowerCase().includes('remote') || title.toLowerCase().includes('remote');

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

        const jobUrl = job.jobUrl || `https://jobs.ashbyhq.com/${companySlug}/${job.id}`;

        const stub: JobStub = {
          id: `ashby_${companySlug}_${job.id}`,
          sourceId: this.id,
          url: jobUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: job.publishedAt,
          atsType: 'ashby',
          extra: {
            rawId: job.id,
            companySlug,
            employmentType: job.employmentType,
            descriptionHtml: job.descriptionHtml,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`AshbyAdapter search error for ${companySlug}:`, err);
      throw err;
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const companySlug = (stub.extra?.companySlug as string) || stub.company;
    const rawId = (stub.extra?.rawId as string) || stub.id.split('_').pop();
    let descriptionHtml = stub.extra?.descriptionHtml as string | undefined;

    if (!descriptionHtml) {
      // Try detail endpoint first
      try {
        const detailUrl = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(companySlug)}/job/${rawId}`;
        const res = await ctx.httpClient.fetch(detailUrl, {
          rateLimitPerMinute: this.rateLimit.requestsPerMinute,
          signal: ctx.abortSignal,
        });
        const data = await res.json<AshbyJobRaw>();
        descriptionHtml = data.descriptionHtml;
      } catch {
        // Fallback to fetching HTML page and extracting JSON-LD
        const res = await ctx.httpClient.fetch(stub.url, {
          rateLimitPerMinute: this.rateLimit.requestsPerMinute,
          signal: ctx.abortSignal,
        });
        const html = await res.text();
        const extracted = extractJobPostingJsonLd(html);
        if (extracted?.descriptionMarkdown) {
          return {
            id: stub.id,
            sourceId: this.id,
            sourceName: this.name,
            canonicalUrl: stub.url,
            applyUrl: stub.url,
            title: extracted.title || stub.title,
            company: extracted.company || stub.company,
            location: extracted.location || stub.location,
            remoteType: extracted.remoteType || stub.remoteType || 'on-site',
            employmentType: extracted.employmentType,
            salary: extracted.salary,
            descriptionMarkdown: extracted.descriptionMarkdown,
            requirements: [],
            postedAt: extracted.postedAt || stub.postedAt,
            atsType: 'ashby',
            contentHash: stub.id,
            simHash: undefined,
          };
        }
      }
    }

    const descriptionMarkdown = htmlToMarkdown(descriptionHtml || '');

    const hashes = computeJobHashes({
      url: stub.url,
      company: stub.company,
      title: stub.title,
      location: stub.location,
      descriptionMarkdown,
    });

    let employmentType: EmploymentType | undefined;
    const rawEmp = ((stub.extra?.employmentType as string) || '').toLowerCase();
    if (rawEmp.includes('full')) employmentType = 'full-time';
    else if (rawEmp.includes('part')) employmentType = 'part-time';
    else if (rawEmp.includes('contract')) employmentType = 'contract';
    else if (rawEmp.includes('intern')) employmentType = 'internship';

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
      atsType: 'ashby',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
