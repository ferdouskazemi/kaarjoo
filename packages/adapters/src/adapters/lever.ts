import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface LeverPostingRaw {
  id: string;
  text: string;
  createdAt: number;
  hostedUrl: string;
  applyUrl: string;
  workplaceType?: string; // remote, hybrid, unspecified
  categories?: {
    commitment?: string;
    location?: string;
    team?: string;
    department?: string;
  };
  description?: string;
  descriptionPlain?: string;
  lists?: Array<{
    text: string;
    content: string;
  }>;
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    interval?: string;
  };
}

export class LeverAdapter implements SourceAdapter {
  public readonly id = 'lever';
  public readonly name = 'Lever Job Board';
  public readonly homepage = 'https://jobs.lever.co';
  public readonly mode = 'auto-apply';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Lever Postings API v0 is public and designed for embedding and careers pages without API keys.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'lever';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('LeverAdapter: companySlug is required for search');
      return;
    }

    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(companySlug)}?mode=json`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const postings = await res.json<LeverPostingRaw[]>();
      if (!Array.isArray(postings)) return;

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const posting of postings) {
        if (count >= limit) break;

        const title = posting.text || '';
        const locName = posting.categories?.location || '';
        const workplaceType = (posting.workplaceType || '').toLowerCase();

        const isRemote =
          workplaceType === 'remote' ||
          locName.toLowerCase().includes('remote') ||
          locName.toLowerCase().includes('anywhere') ||
          title.toLowerCase().includes('(remote)') ||
          title.toLowerCase().includes('[remote]');

        if (remoteOnly && !isRemote) continue;

        if (keywords.length > 0) {
          const match = keywords.some(k => title.toLowerCase().includes(k) || locName.toLowerCase().includes(k));
          if (!match) continue;
        }

        const remoteType: RemoteType = isRemote
          ? 'remote'
          : workplaceType === 'hybrid' || locName.toLowerCase().includes('hybrid')
            ? 'hybrid'
            : 'on-site';

        const stub: JobStub = {
          id: `lever_${companySlug}_${posting.id}`,
          sourceId: this.id,
          url: posting.hostedUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: posting.createdAt ? new Date(posting.createdAt).toISOString() : undefined,
          atsType: 'lever',
          extra: {
            rawId: posting.id,
            companySlug,
            applyUrl: posting.applyUrl,
            cachedPosting: posting,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`LeverAdapter search error for ${companySlug}:`, err);
      throw err;
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const companySlug = (stub.extra?.companySlug as string) || stub.company;
    const rawId = (stub.extra?.rawId as string) || stub.id.split('_').pop();
    let posting = stub.extra?.cachedPosting as LeverPostingRaw | undefined;

    if (!posting || !posting.description) {
      const detailUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(companySlug)}/${rawId}`;
      const res = await ctx.httpClient.fetch(detailUrl, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        signal: ctx.abortSignal,
      });
      posting = await res.json<LeverPostingRaw>();
    }

    let fullHtml = posting.description || '';
    if (posting.lists && Array.isArray(posting.lists)) {
      for (const section of posting.lists) {
        fullHtml += `<h3>${section.text}</h3><ul>${section.content}</ul>`;
      }
    }

    const descriptionMarkdown = htmlToMarkdown(fullHtml);

    let employmentType: EmploymentType | undefined;
    const commitment = (posting.categories?.commitment || '').toLowerCase();
    if (commitment.includes('full')) employmentType = 'full-time';
    else if (commitment.includes('part')) employmentType = 'part-time';
    else if (commitment.includes('contract')) employmentType = 'contract';
    else if (commitment.includes('intern')) employmentType = 'internship';

    const hashes = computeJobHashes({
      url: stub.url,
      company: stub.company,
      title: stub.title,
      location: stub.location,
      descriptionMarkdown,
    });

    const salary = posting.salaryRange
      ? {
          min: posting.salaryRange.min,
          max: posting.salaryRange.max,
          currency: posting.salaryRange.currency || 'USD',
          period: (posting.salaryRange.interval === 'per-hour-interval' ? 'hour' : 'year') as 'hour' | 'month' | 'year',
        }
      : undefined;

    return {
      id: stub.id,
      sourceId: this.id,
      sourceName: this.name,
      canonicalUrl: hashes.canonicalUrl,
      applyUrl: (stub.extra?.applyUrl as string) || stub.url,
      title: stub.title,
      company: stub.company,
      location: stub.location,
      remoteType: stub.remoteType ?? 'on-site',
      employmentType,
      salary,
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'lever',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
