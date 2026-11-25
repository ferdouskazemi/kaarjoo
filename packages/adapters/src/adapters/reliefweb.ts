import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface ReliefWebJobRaw {
  id: string;
  fields: {
    title: string;
    body?: string;
    url?: string;
    source?: Array<{ name: string }>;
    country?: Array<{ name: string }>;
    date?: {
      created?: string;
      closing?: string;
    };
    type?: Array<{ name: string }>;
  };
}

export class ReliefWebAdapter implements SourceAdapter {
  public readonly id = 'reliefweb';
  public readonly name = 'ReliefWeb Humanitarian Jobs';
  public readonly homepage = 'https://reliefweb.int';
  public readonly mode = 'link-only';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'ReliefWeb provides a public, open, keyless humanitarian API (api.reliefweb.int) under CC-BY.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const limit = query.limit ?? 50;
    let url = `https://api.reliefweb.int/v1/jobs?appname=kaarjoo&limit=${limit}&profile=full`;

    if (query.keywords && query.keywords.length > 0) {
      url += `&query[value]=${encodeURIComponent(query.keywords.join(' '))}`;
    }

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<{ data?: ReliefWebJobRaw[] }>();
      const items = data.data || [];

      let count = 0;
      for (const item of items) {
        if (count >= limit) break;

        const f = item.fields;
        const title = f.title || '';
        const company = f.source?.[0]?.name || 'Humanitarian Organization';
        const locName = f.country?.map(c => c.name).join(', ') || 'Global';

        const isRemote = locName.toLowerCase().includes('remote') || title.toLowerCase().includes('remote') || locName.toLowerCase().includes('home-based');

        const stub: JobStub = {
          id: `rw_${item.id}`,
          sourceId: this.id,
          url: f.url || `https://reliefweb.int/job/${item.id}`,
          title,
          company,
          location: locName,
          remoteType: isRemote ? 'remote' : 'on-site',
          postedAt: f.date?.created,
          atsType: 'reliefweb',
          extra: {
            rawId: item.id,
            cachedBody: f.body,
            closingDate: f.date?.closing,
            jobType: f.type?.[0]?.name,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error('ReliefWebAdapter search error:', err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const cachedBody = stub.extra?.cachedBody as string | undefined;
    const descriptionMarkdown = cachedBody ? htmlToMarkdown(cachedBody) : stub.title;

    let employmentType: EmploymentType | undefined;
    const typeStr = ((stub.extra?.jobType as string) || '').toLowerCase();
    if (typeStr.includes('consultancy') || typeStr.includes('contract')) employmentType = 'contract';
    else if (typeStr.includes('intern')) employmentType = 'internship';
    else employmentType = 'full-time';

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
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'reliefweb',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
