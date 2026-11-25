import type { JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface UNjobItemParsed {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  organization?: string;
  location?: string;
}

function parseUNjobsRss(rss: string): UNjobItemParsed[] {
  const items: UNjobItemParsed[] = [];
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

    // Link e.g. https://unjobs.org/vacancies/123456789
    const idMatch = link.match(/vacancies\/([a-zA-Z0-9_-]+)/);
    const id = idMatch ? idMatch[1] : link.replace(/[^a-zA-Z0-9]/g, '_');

    // Title format often: "Position Name - Organization, Location"
    let org = 'United Nations / International Org';
    let loc = 'Global';
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      const sub = parts[parts.length - 1];
      if (sub.includes(',')) {
        const subParts = sub.split(',');
        org = subParts[0].trim();
        loc = subParts.slice(1).join(',').trim();
      } else {
        org = sub.trim();
      }
    }

    items.push({
      id,
      title,
      link,
      description: extract('description'),
      pubDate: extract('pubDate'),
      organization: org,
      location: loc,
    });
  }

  return items;
}

export class UNjobsAdapter implements SourceAdapter {
  public readonly id = 'unjobs';
  public readonly name = 'UNjobs International Vacancies';
  public readonly homepage = 'https://unjobs.org';
  public readonly mode = 'link-only';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'UNjobs publishes public RSS syndicated feeds for international public service vacancies.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 30,
    concurrency: 1,
  };
  public readonly needsBrowser = false;

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const limit = query.limit ?? 50;
    const url = 'https://unjobs.org/rss/latest.xml';

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const rssText = await res.text();
      const items = parseUNjobsRss(rssText);

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];

      let count = 0;
      for (const item of items) {
        if (count >= limit) break;

        const title = item.title || '';
        const company = item.organization || 'UN Agency';
        const locName = item.location || 'Global';

        if (keywords.length > 0) {
          const match = keywords.some(k => title.toLowerCase().includes(k) || company.toLowerCase().includes(k) || locName.toLowerCase().includes(k));
          if (!match) continue;
        }

        const isRemote = locName.toLowerCase().includes('remote') || title.toLowerCase().includes('remote') || locName.toLowerCase().includes('home');

        const stub: JobStub = {
          id: `un_${item.id}`,
          sourceId: this.id,
          url: item.link,
          title,
          company,
          location: locName,
          remoteType: isRemote ? 'remote' : 'on-site',
          postedAt: item.pubDate,
          atsType: 'unjobs',
          extra: {
            rawId: item.id,
            cachedDescription: item.description,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error('UNjobsAdapter search error:', err);
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
      remoteType: stub.remoteType ?? 'on-site',
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'unjobs',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
