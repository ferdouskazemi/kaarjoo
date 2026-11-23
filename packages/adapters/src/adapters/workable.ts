import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface WorkableJobSummary {
  id?: number;
  title: string;
  shortcode: string;
  code?: string;
  department?: string;
  city?: string;
  country?: string;
  telecommuting?: boolean;
  published?: string;
}

interface WorkableJobDetail {
  title: string;
  description: string;
  requirements?: string;
  benefits?: string;
  employment_type?: string;
  telecommuting?: boolean;
  city?: string;
  country?: string;
}

export class WorkableAdapter implements SourceAdapter {
  public readonly id = 'workable';
  public readonly name = 'Workable Job Board';
  public readonly homepage = 'https://apply.workable.com';
  public readonly mode = 'auto-apply';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Workable Widget API v1 is public and provided for embeddable careers pages.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'workable';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('WorkableAdapter: companySlug is required for search');
      return;
    }

    const apiUrl = `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(companySlug)}`;

    try {
      const res = await ctx.httpClient.fetch(apiUrl, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<{ total?: number; results?: WorkableJobSummary[] }>();
      const jobs = data.results || [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const job of jobs) {
        if (count >= limit) break;

        const title = job.title || '';
        const locParts = [job.city, job.country].filter(Boolean);
        const locName = locParts.join(', ');
        const isRemote = !!job.telecommuting || locName.toLowerCase().includes('remote') || title.toLowerCase().includes('remote');

        if (remoteOnly && !isRemote) continue;

        if (keywords.length > 0) {
          const match = keywords.some(k => title.toLowerCase().includes(k) || locName.toLowerCase().includes(k));
          if (!match) continue;
        }

        const remoteType: RemoteType = isRemote ? 'remote' : 'on-site';
        const jobUrl = `https://apply.workable.com/${companySlug}/j/${job.shortcode}`;

        const stub: JobStub = {
          id: `workable_${companySlug}_${job.shortcode}`,
          sourceId: this.id,
          url: jobUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: job.published,
          atsType: 'workable',
          extra: {
            shortcode: job.shortcode,
            companySlug,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`WorkableAdapter search error for ${companySlug}:`, err);
      throw err;
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const companySlug = (stub.extra?.companySlug as string) || stub.company;
    const shortcode = (stub.extra?.shortcode as string) || stub.id.split('_').pop();

    const detailUrl = `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(companySlug)}/jobs/${shortcode}`;
    const res = await ctx.httpClient.fetch(detailUrl, {
      rateLimitPerMinute: this.rateLimit.requestsPerMinute,
      signal: ctx.abortSignal,
    });
    const detail = await res.json<WorkableJobDetail>();

    let fullHtml = detail.description || '';
    if (detail.requirements) {
      fullHtml += `<h3>Requirements</h3>${detail.requirements}`;
    }
    if (detail.benefits) {
      fullHtml += `<h3>Benefits</h3>${detail.benefits}`;
    }

    const descriptionMarkdown = htmlToMarkdown(fullHtml);

    let employmentType: EmploymentType | undefined;
    const rawEmp = (detail.employment_type || '').toLowerCase();
    if (rawEmp.includes('full')) employmentType = 'full-time';
    else if (rawEmp.includes('part')) employmentType = 'part-time';
    else if (rawEmp.includes('contract')) employmentType = 'contract';
    else if (rawEmp.includes('intern')) employmentType = 'internship';

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
      remoteType: detail.telecommuting ? 'remote' : (stub.remoteType ?? 'on-site'),
      employmentType,
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'workable',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
