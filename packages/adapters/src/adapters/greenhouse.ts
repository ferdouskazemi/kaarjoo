import type { JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface GreenhouseJobRaw {
  id: number;
  title: string;
  updated_at?: string;
  absolute_url: string;
  location?: {
    name?: string;
  };
  content?: string;
  departments?: Array<{ name: string }>;
  offices?: Array<{ name: string; location?: string }>;
}

export class GreenhouseAdapter implements SourceAdapter {
  public readonly id = 'greenhouse';
  public readonly name = 'Greenhouse Job Board';
  public readonly homepage = 'https://boards.greenhouse.io';
  public readonly mode = 'auto-apply';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Greenhouse public boards API v1 is explicitly provided for public syndication and job listings.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'greenhouse';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('GreenhouseAdapter: companySlug is required for search');
      return;
    }

    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(companySlug)}/jobs?content=true`;
    
    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<{ jobs: GreenhouseJobRaw[] }>();
      if (!data?.jobs || !Array.isArray(data.jobs)) return;

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const job of data.jobs) {
        if (count >= limit) break;

        const title = job.title || '';
        const locName = job.location?.name || '';
        const isRemote =
          locName.toLowerCase().includes('remote') ||
          locName.toLowerCase().includes('anywhere') ||
          title.toLowerCase().includes('(remote)') ||
          title.toLowerCase().includes('[remote]');

        if (remoteOnly && !isRemote) continue;

        // Keyword filter if provided
        if (keywords.length > 0) {
          const match = keywords.some(k => title.toLowerCase().includes(k) || locName.toLowerCase().includes(k));
          if (!match) continue;
        }

        const remoteType: RemoteType = isRemote
          ? 'remote'
          : locName.toLowerCase().includes('hybrid')
            ? 'hybrid'
            : 'on-site';

        const stub: JobStub = {
          id: `gh_${companySlug}_${job.id}`,
          sourceId: this.id,
          url: job.absolute_url,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: job.updated_at,
          atsType: 'greenhouse',
          extra: {
            rawId: job.id,
            companySlug,
            cachedContent: job.content,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`GreenhouseAdapter search error for ${companySlug}:`, err);
      throw err;
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const companySlug = (stub.extra?.companySlug as string) || stub.company;
    const rawId = (stub.extra?.rawId as number) || stub.id.split('_').pop();
    let rawContent = stub.extra?.cachedContent as string | undefined;

    if (!rawContent) {
      const detailUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(companySlug)}/jobs/${rawId}`;
      const res = await ctx.httpClient.fetch(detailUrl, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        signal: ctx.abortSignal,
      });
      const data = await res.json<GreenhouseJobRaw>();
      rawContent = data.content || '';
    }

    // Decode HTML entities if needed and convert to markdown
    const decodedHtml = (rawContent || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const descriptionMarkdown = htmlToMarkdown(decodedHtml);

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
      employmentType: 'full-time',
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'greenhouse',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
