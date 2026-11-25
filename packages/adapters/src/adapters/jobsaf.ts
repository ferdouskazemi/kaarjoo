import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface JobsAfItemParsed {
  id: string;
  title: string;
  link: string;
  company: string;
  location: string;
  description?: string;
  pubDate?: string;
}

function parseJobsAfRss(rss: string): JobsAfItemParsed[] {
  const items: JobsAfItemParsed[] = [];
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

    // Id from URL e.g. /jobs/12345-job-title or id tag
    const idMatch = link.match(/\/jobs\/(\d+)/) || link.match(/\/job\/([a-zA-Z0-9_-]+)/);
    const id = idMatch ? idMatch[1] : link.replace(/[^a-zA-Z0-9]/g, '_');

    let company = extract('author') || extract('creator') || 'Afghanistan Employer';
    let location = 'Afghanistan';

    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      company = parts[parts.length - 1].trim();
    }

    items.push({
      id,
      title,
      link,
      company,
      location,
      description: extract('description'),
      pubDate: extract('pubDate'),
    });
  }

  return items;
}

export class JobsAfAdapter implements SourceAdapter {
  public readonly id = 'jobsaf';
  public readonly name = 'Jobs.af Afghan Job Portal';
  public readonly homepage = 'https://www.jobs.af';
  public readonly mode = 'link-only';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Jobs.af provides public vacancy listings for national professionals in Afghanistan.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 30,
    concurrency: 1,
  };
  public readonly needsBrowser = false;

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const limit = query.limit ?? 50;
    const url = 'https://www.jobs.af/jobs.rss';

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const text = await res.text();
      const items = parseJobsAfRss(text);

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];

      let count = 0;
      for (const item of items) {
        if (count >= limit) break;

        if (keywords.length > 0) {
          const match = keywords.some(
            k => item.title.toLowerCase().includes(k) || item.company.toLowerCase().includes(k) || item.location.toLowerCase().includes(k)
          );
          if (!match) continue;
        }

        const isRemote = item.location.toLowerCase().includes('remote') || item.title.toLowerCase().includes('remote');

        const stub: JobStub = {
          id: `jaf_${item.id}`,
          sourceId: this.id,
          url: item.link,
          title: item.title,
          company: item.company,
          location: item.location,
          remoteType: isRemote ? 'remote' : 'on-site',
          postedAt: item.pubDate,
          atsType: 'jobsaf',
          extra: {
            rawId: item.id,
            cachedDescription: item.description,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error('JobsAfAdapter search error:', err);
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
      employmentType: 'full-time',
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'jobsaf',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
