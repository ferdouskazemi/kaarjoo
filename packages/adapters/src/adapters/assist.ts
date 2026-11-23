import type { JobPosting, JobStub, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { extractJobPostingJsonLd } from '../extractors/jsonld.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

export class AssistJobAdapter implements SourceAdapter {
  public readonly id = 'assist';
  public readonly name = 'Manual Assist (LinkedIn / Indeed / Glassdoor)';
  public readonly homepage = 'https://linkedin.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Assist mode only. User browses manually in browser. No automated crawling, login, or form submission.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 1,
  };
  public readonly needsBrowser = true;

  // Search is not permitted on assist-only sites; user opens pages manually
  public async *search(_query: SearchQuery, _ctx: AdapterContext): AsyncIterable<JobStub> {
    // Assist mode does not crawl or search listings automatically
    return;
  }

  /**
   * Parses an explicitly imported job page HTML or URL.
   */
  public async parseFromHtml(rawHtml: string, pageUrl: string): Promise<JobPosting> {
    const jsonLd = extractJobPostingJsonLd(rawHtml);

    const title = jsonLd?.title || 'Imported Job Opportunity';
    const company = jsonLd?.company || 'Company';
    const descriptionMarkdown = jsonLd?.descriptionMarkdown || htmlToMarkdown(rawHtml);

    const hashes = computeJobHashes({
      url: pageUrl,
      company,
      title,
      location: jsonLd?.location,
      descriptionMarkdown,
    });

    return {
      id: `assist_${hashes.urlHash.slice(0, 16)}`,
      sourceId: this.id,
      sourceName: this.name,
      canonicalUrl: hashes.canonicalUrl,
      applyUrl: pageUrl,
      title,
      company,
      location: jsonLd?.location,
      remoteType: jsonLd?.remoteType || 'on-site',
      employmentType: jsonLd?.employmentType,
      salary: jsonLd?.salary,
      descriptionMarkdown,
      requirements: [],
      postedAt: jsonLd?.postedAt,
      atsType: 'generic',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const res = await ctx.httpClient.fetch(stub.url, {
      rateLimitPerMinute: this.rateLimit.requestsPerMinute,
      signal: ctx.abortSignal,
    });
    const html = await res.text();
    return this.parseFromHtml(html, stub.url);
  }
}
