import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface WorkingNomadsHit {
  _source: {
    id: number | string;
    title: string;
    company_name?: string;
    description?: string;
    url?: string;
    pub_date?: string;
    location_base?: string;
    category_name?: string;
  };
}

export class WorkingNomadsAdapter implements SourceAdapter {
  public readonly id = 'workingnomads';
  public readonly name = 'Working Nomads';
  public readonly homepage = 'https://www.workingnomads.com';
  public readonly mode = 'link-only';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Working Nomads provides a public search API for remote job discovery.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 30,
    concurrency: 1,
  };
  public readonly needsBrowser = false;

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const limit = query.limit ?? 50;
    const url = `https://www.workingnomads.com/jobsapi/job/_search?sort=pub_date:desc&size=${limit}`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<{ hits?: { hits?: WorkingNomadsHit[] } }>();
      const hits = data?.hits?.hits || [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];

      let count = 0;
      for (const item of hits) {
        if (count >= limit) break;

        const s = item._source;
        const title = s.title || '';
        const company = s.company_name || 'Unknown';
        const locName = s.location_base || 'Worldwide Remote';

        if (keywords.length > 0) {
          const match = keywords.some(k => title.toLowerCase().includes(k) || company.toLowerCase().includes(k));
          if (!match) continue;
        }

        const applyUrl = s.url || `https://www.workingnomads.com/jobs?job=${s.id}`;

        const stub: JobStub = {
          id: `wn_${s.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company,
          location: locName,
          remoteType: 'remote',
          postedAt: s.pub_date,
          atsType: 'workingnomads',
          extra: {
            rawId: s.id,
            category: s.category_name,
            cachedDescription: s.description,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error('WorkingNomadsAdapter search error:', err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const cachedDesc = stub.extra?.cachedDescription as string | undefined;
    const descriptionMarkdown = cachedDesc ? htmlToMarkdown(cachedDesc) : stub.title;

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
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'workingnomads',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
