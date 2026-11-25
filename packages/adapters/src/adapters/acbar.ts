import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface AcbarJobParsed {
  id: string;
  title: string;
  organization: string;
  location: string;
  closingDate?: string;
  url: string;
  descriptionHtml?: string;
}

function parseAcbarHtml(html: string): AcbarJobParsed[] {
  const jobs: AcbarJobParsed[] = [];
  // Match ACBAR job table/list rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];
    if (!row.includes('/jobs/') && !row.includes('/job/')) continue;

    const linkMatch = row.match(/href=["'](\/job[s]?\/(\d+)[^"']*)["']/i);
    if (!linkMatch) continue;

    const relativeUrl = linkMatch[1];
    const id = linkMatch[2];
    const url = relativeUrl.startsWith('http') ? relativeUrl : `https://www.acbar.org${relativeUrl}`;

    // Extract text in td cells
    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(m =>
      m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    );

    const title = cells[0] || 'NGO Professional';
    const organization = cells[1] || 'Humanitarian NGO';
    const location = cells[2] || 'Afghanistan';
    const closingDate = cells[3] || undefined;

    jobs.push({
      id,
      title,
      organization,
      location,
      closingDate,
      url,
    });
  }

  return jobs;
}

export class AcbarAdapter implements SourceAdapter {
  public readonly id = 'acbar';
  public readonly name = 'ACBAR Afghanistan NGO Jobs';
  public readonly homepage = 'https://www.acbar.org';
  public readonly mode = 'link-only';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'ACBAR provides an open humanitarian portal (/jobs) for civil society and NGO vacancies in Afghanistan.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 30,
    concurrency: 1,
  };
  public readonly needsBrowser = false;

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const limit = query.limit ?? 50;
    const url = 'https://www.acbar.org/jobs';

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const html = await res.text();
      const items = parseAcbarHtml(html);

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];

      let count = 0;
      for (const item of items) {
        if (count >= limit) break;

        if (keywords.length > 0) {
          const match = keywords.some(
            k => item.title.toLowerCase().includes(k) || item.organization.toLowerCase().includes(k) || item.location.toLowerCase().includes(k)
          );
          if (!match) continue;
        }

        const stub: JobStub = {
          id: `acbar_${item.id}`,
          sourceId: this.id,
          url: item.url,
          title: item.title,
          company: item.organization,
          location: item.location,
          remoteType: 'on-site',
          postedAt: undefined,
          atsType: 'acbar',
          extra: {
            rawId: item.id,
            closingDate: item.closingDate,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error('AcbarAdapter search error:', err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    let descriptionMarkdown = `${stub.title} at ${stub.company} (${stub.location})`;
    try {
      const res = await ctx.httpClient.fetch(stub.url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });
      const html = await res.text();
      const descMatch = html.match(/<div[^>]*class=["'][^"']*(?:job-details|job-description|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (descMatch) {
        descriptionMarkdown = htmlToMarkdown(descMatch[1]);
      }
    } catch (err) {
      ctx.logger?.warn(`AcbarAdapter fetchDetail error for ${stub.id}:`, err);
    }

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
      remoteType: 'on-site',
      employmentType: 'full-time',
      descriptionMarkdown,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'acbar',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
