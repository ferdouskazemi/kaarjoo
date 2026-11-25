import type { EmploymentType, JobPosting, JobStub, RemoteType, SalaryRange, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface HimalayasJobRaw {
  id: string | number;
  title: string;
  companyName?: string;
  applicationLink?: string;
  excerpt?: string;
  description?: string;
  pubDate?: string;
  categories?: string[];
  minSalary?: number;
  maxSalary?: number;
  salaryCurrency?: string;
  locationRestriction?: string;
}

export class HimalayasAdapter implements SourceAdapter {
  public readonly id = 'himalayas';
  public readonly name = 'Himalayas Remote Jobs';
  public readonly homepage = 'https://himalayas.app';
  public readonly mode = 'link-only';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Himalayas provides a public, keyless JSON API (/jobs/api) for remote jobs syndication.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 30,
    concurrency: 1,
  };
  public readonly needsBrowser = false;

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const limit = query.limit ?? 50;
    const url = `https://himalayas.app/jobs/api?limit=${limit}`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<{ jobs?: HimalayasJobRaw[] }>();
      const jobs = data.jobs || [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];

      let count = 0;
      for (const item of jobs) {
        if (count >= limit) break;

        const title = item.title || '';
        const company = item.companyName || 'Unknown';
        const locName = item.locationRestriction || 'Worldwide Remote';

        if (keywords.length > 0) {
          const match = keywords.some(k => title.toLowerCase().includes(k) || company.toLowerCase().includes(k));
          if (!match) continue;
        }

        const applyUrl = item.applicationLink || `https://himalayas.app/companies/${encodeURIComponent(company)}/jobs/${item.id}`;

        const stub: JobStub = {
          id: `hml_${item.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company,
          location: locName,
          remoteType: 'remote',
          postedAt: item.pubDate,
          atsType: 'himalayas',
          extra: {
            rawId: item.id,
            cachedDescription: item.description || item.excerpt,
            minSalary: item.minSalary,
            maxSalary: item.maxSalary,
            currency: item.salaryCurrency,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error('HimalayasAdapter search error:', err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const cachedDesc = stub.extra?.cachedDescription as string | undefined;
    const descriptionMarkdown = cachedDesc ? htmlToMarkdown(cachedDesc) : stub.title;

    let salary: SalaryRange | undefined;
    const min = stub.extra?.minSalary as number | undefined;
    const max = stub.extra?.maxSalary as number | undefined;
    if (min || max) {
      salary = {
        min,
        max,
        currency: (stub.extra?.currency as string) || 'USD',
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
      remoteType: 'remote',
      salary,
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'himalayas',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
