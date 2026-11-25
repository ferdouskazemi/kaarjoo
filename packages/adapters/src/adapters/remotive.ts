import type { EmploymentType, JobPosting, JobStub, RemoteType, SalaryRange, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface RemotiveJobRaw {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

export class RemotiveAdapter implements SourceAdapter {
  public readonly id = 'remotive';
  public readonly name = 'Remotive Remote Jobs';
  public readonly homepage = 'https://remotive.com';
  public readonly mode = 'link-only';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Remotive provides a free, unauthenticated public API (/api/remote-jobs) for syndicating remote opportunities.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 30,
    concurrency: 1,
  };
  public readonly needsBrowser = false;

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const limit = query.limit ?? 50;
    let url = 'https://remotive.com/api/remote-jobs?limit=50';
    if (query.keywords && query.keywords.length > 0) {
      url += `&search=${encodeURIComponent(query.keywords.join(' '))}`;
    }

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<{ jobs?: RemotiveJobRaw[] }>();
      const jobs = data.jobs || [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];

      let count = 0;
      for (const item of jobs) {
        if (count >= limit) break;

        const title = item.title || '';
        const company = item.company_name || 'Unknown';
        const locName = item.candidate_required_location || 'Worldwide Remote';

        if (keywords.length > 0) {
          const match = keywords.some(k => title.toLowerCase().includes(k) || company.toLowerCase().includes(k));
          if (!match) continue;
        }

        const stub: JobStub = {
          id: `remotive_${item.id}`,
          sourceId: this.id,
          url: item.url,
          title,
          company,
          location: locName,
          remoteType: 'remote',
          postedAt: item.publication_date,
          atsType: 'remotive',
          extra: {
            rawId: item.id,
            jobType: item.job_type,
            salaryText: item.salary,
            cachedDescription: item.description,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error('RemotiveAdapter search error:', err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const cachedDesc = stub.extra?.cachedDescription as string | undefined;
    const descriptionMarkdown = cachedDesc ? htmlToMarkdown(cachedDesc) : stub.title;

    let employmentType: EmploymentType | undefined;
    const rawType = ((stub.extra?.jobType as string) || '').toLowerCase();
    if (rawType.includes('full')) employmentType = 'full-time';
    else if (rawType.includes('part')) employmentType = 'part-time';
    else if (rawType.includes('contract')) employmentType = 'contract';
    else if (rawType.includes('intern')) employmentType = 'internship';

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
      employmentType,
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'remotive',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
