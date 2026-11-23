import { load } from 'cheerio';
import type { JobPosting, JobStub, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

export class WeWorkRemotelyAdapter implements SourceAdapter {
  public readonly id = 'weworkremotely';
  public readonly name = 'We Work Remotely';
  public readonly homepage = 'https://weworkremotely.com';
  public readonly mode = 'link-only';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Public RSS feed provided for job syndication.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 30,
    concurrency: 1,
  };
  public readonly needsBrowser = false;

  private readonly feeds = [
    'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
    'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
  ];

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
    let count = 0;
    const limit = query.limit ?? 50;

    for (const feedUrl of this.feeds) {
      if (count >= limit) break;

      try {
        const res = await ctx.httpClient.fetch(feedUrl, {
          rateLimitPerMinute: this.rateLimit.requestsPerMinute,
          signal: ctx.abortSignal,
        });

        const xml = await res.text();
        const $ = load(xml, { xmlMode: true });

        const items = $('item');

        for (let i = 0; i < items.length; i++) {
          if (count >= limit) break;
          const el = items.eq(i);

          const rawTitle = el.find('title').text().trim();
          const link = el.find('link').text().trim();
          const pubDate = el.find('pubDate').text().trim();
          const description = el.find('description').text().trim();
          const region = el.find('region').text().trim();

          // Title format is usually "CompanyName: Job Title"
          let company = 'Unknown';
          let title = rawTitle;
          if (rawTitle.includes(':')) {
            const parts = rawTitle.split(':');
            company = parts[0].trim();
            title = parts.slice(1).join(':').trim();
          }

          if (keywords.length > 0) {
            const match = keywords.some(k => title.toLowerCase().includes(k) || company.toLowerCase().includes(k));
            if (!match) continue;
          }

          const stub: JobStub = {
            id: `wwr_${encodeURIComponent(link)}`,
            sourceId: this.id,
            url: link,
            title,
            company,
            location: region || 'Worldwide Remote',
            remoteType: 'remote',
            postedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
            atsType: 'generic',
            extra: {
              rawDescription: description,
              region,
            },
          };

          count++;
          yield stub;
        }
      } catch (err) {
        ctx.logger?.error(`WeWorkRemotely feed error for ${feedUrl}:`, err);
      }
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    let rawDescription = stub.extra?.rawDescription as string | undefined;

    if (!rawDescription) {
      const res = await ctx.httpClient.fetch(stub.url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        signal: ctx.abortSignal,
      });
      const html = await res.text();
      const $ = load(html);
      rawDescription = $('.listing-container').html() || $('article').html() || '';
    }

    const descriptionMarkdown = htmlToMarkdown(rawDescription || '');

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
      employmentType: 'full-time',
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'generic',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
