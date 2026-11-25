import type { JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface JazzItemParsed {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  category?: string;
  location?: string;
}

function parseJazzRss(rss: string): JazzItemParsed[] {
  const items: JazzItemParsed[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(rss)) !== null) {
    const block = match[1];
    const extract = (tag: string): string => {
      const m = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i').exec(block);
      return m ? m[1].trim() : '';
    };

    const title = extract('title');
    const link = extract('link');
    if (!title || !link) continue;

    // Extract id from link e.g. /apply/xyz123/...
    const idMatch = link.match(/\/apply\/([a-zA-Z0-9_-]+)/);
    const id = idMatch ? idMatch[1] : link.replace(/[^a-zA-Z0-9]/g, '_');

    // Extract location if present in description or city tags
    const city = extract('city') || extract('location');

    items.push({
      id,
      title,
      link,
      description: extract('description'),
      pubDate: extract('pubDate'),
      category: extract('category'),
      location: city,
    });
  }

  return items;
}

export class JazzHRAdapter implements SourceAdapter {
  public readonly id = 'jazzhr';
  public readonly name = 'JazzHR Job Board';
  public readonly homepage = 'https://www.jazzhr.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'JazzHR career sites publish open RSS feeds (/feed) for public job board syndication.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'jazzhr';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('JazzHRAdapter: companySlug is required for search');
      return;
    }

    const url = `https://${encodeURIComponent(companySlug)}.applytojob.com/feed`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const rssText = await res.text();
      const items = parseJazzRss(rssText);

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const item of items) {
        if (count >= limit) break;

        const title = item.title || '';
        const locName = item.location || '';
        const isRemote =
          locName.toLowerCase().includes('remote') ||
          title.toLowerCase().includes('(remote)') ||
          title.toLowerCase().includes('[remote]');

        if (remoteOnly && !isRemote) continue;

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
          id: `jazz_${companySlug}_${item.id}`,
          sourceId: this.id,
          url: item.link,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: item.pubDate,
          atsType: 'jazzhr',
          extra: {
            rawId: item.id,
            companySlug,
            category: item.category,
            descriptionRaw: item.description,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`JazzHRAdapter search failed for ${companySlug}:`, err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const descRaw = (stub.extra?.descriptionRaw as string) || '';
    const descriptionMarkdown = descRaw ? htmlToMarkdown(descRaw) : stub.title;

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
      atsType: 'jazzhr',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
