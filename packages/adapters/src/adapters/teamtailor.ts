import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface TeamtailorJobRaw {
  id: number | string;
  title: string;
  body?: string;
  location?: string;
  department?: string;
  apply_url?: string;
  published_at?: string;
  remote_status?: string;
  locations?: Array<{ name?: string }>;
}

export class TeamtailorAdapter implements SourceAdapter {
  public readonly id = 'teamtailor';
  public readonly name = 'Teamtailor Job Board';
  public readonly homepage = 'https://www.teamtailor.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Teamtailor career sites publish open job feeds (/jobs.json / feed) for public distribution.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'teamtailor';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('TeamtailorAdapter: companySlug is required for search');
      return;
    }

    const url = `https://${encodeURIComponent(companySlug)}.teamtailor.com/jobs.json`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      let items: TeamtailorJobRaw[] = [];
      try {
        const data = await res.json<any>();
        if (Array.isArray(data)) {
          items = data;
        } else if (Array.isArray(data?.jobs)) {
          items = data.jobs;
        }
      } catch {
        // Fallback or empty
        items = [];
      }

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const item of items) {
        if (count >= limit) break;

        const title = item.title || '';
        const locName = item.location || (item.locations && item.locations[0]?.name) || '';
        const remoteStatus = (item.remote_status || '').toLowerCase();
        const isRemote =
          remoteStatus === 'remote' ||
          remoteStatus === 'fully_remote' ||
          locName.toLowerCase().includes('remote') ||
          title.toLowerCase().includes('(remote)');

        if (remoteOnly && !isRemote) continue;

        if (keywords.length > 0) {
          const match = keywords.some(k => title.toLowerCase().includes(k) || locName.toLowerCase().includes(k));
          if (!match) continue;
        }

        const remoteType: RemoteType = isRemote
          ? 'remote'
          : remoteStatus === 'hybrid' || locName.toLowerCase().includes('hybrid')
            ? 'hybrid'
            : 'on-site';

        const applyUrl = item.apply_url || `https://${encodeURIComponent(companySlug)}.teamtailor.com/jobs/${item.id}`;

        const stub: JobStub = {
          id: `tt_${companySlug}_${item.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: item.published_at,
          atsType: 'teamtailor',
          extra: {
            rawId: item.id,
            companySlug,
            department: item.department,
            bodyHtml: item.body,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`TeamtailorAdapter search failed for ${companySlug}:`, err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const bodyHtml = (stub.extra?.bodyHtml as string) || '';
    const descriptionMarkdown = bodyHtml ? htmlToMarkdown(bodyHtml) : stub.title;

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
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'teamtailor',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
