import type { EmploymentType, JobPosting, JobStub, RemoteType, SalaryRange, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface RemoteOkJobRaw {
  id?: string | number;
  position?: string;
  company?: string;
  location?: string;
  tags?: string[];
  url?: string;
  apply_url?: string;
  date?: string;
  description?: string;
  salary_min?: number;
  salary_max?: number;
}

export class RemoteOKAdapter implements SourceAdapter {
  public readonly id = 'remoteok';
  public readonly name = 'Remote OK';
  public readonly homepage = 'https://remoteok.com';
  public readonly mode = 'link-only';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Remote OK provides a public unauthenticated JSON feed (/api) for personal and ecosystem job distribution.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 20,
    concurrency: 1,
  };
  public readonly needsBrowser = false;

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const limit = query.limit ?? 50;
    const url = 'https://remoteok.com/api';

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<RemoteOkJobRaw[]>();
      // First item is legal / metadata notice
      const jobs = Array.isArray(data) ? data.filter(d => d.id && d.position) : [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];

      let count = 0;
      for (const item of jobs) {
        if (count >= limit) break;

        const title = item.position || '';
        const company = item.company || 'Unknown';
        const locName = item.location || 'Worldwide Remote';

        if (keywords.length > 0) {
          const match = keywords.some(
            k => title.toLowerCase().includes(k) || company.toLowerCase().includes(k) || item.tags?.some(t => t.toLowerCase().includes(k))
          );
          if (!match) continue;
        }

        const applyUrl = item.apply_url || item.url || `https://remoteok.com/remote-jobs/${item.id}`;

        const stub: JobStub = {
          id: `rok_${item.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company,
          location: locName,
          remoteType: 'remote',
          postedAt: item.date,
          atsType: 'remoteok',
          extra: {
            rawId: item.id,
            cachedDescription: item.description,
            salaryMin: item.salary_min,
            salaryMax: item.salary_max,
            tags: item.tags,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error('RemoteOKAdapter search error:', err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const cachedDesc = stub.extra?.cachedDescription as string | undefined;
    const descriptionMarkdown = cachedDesc ? htmlToMarkdown(cachedDesc) : stub.title;

    let salary: SalaryRange | undefined;
    const min = stub.extra?.salaryMin as number | undefined;
    const max = stub.extra?.salaryMax as number | undefined;
    if (min || max) {
      salary = {
        min,
        max,
        currency: 'USD',
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
      atsType: 'remoteok',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
