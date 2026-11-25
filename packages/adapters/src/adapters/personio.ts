import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface PersonioPositionParsed {
  id: string;
  name: string;
  office?: string;
  department?: string;
  schedule?: string;
  employmentType?: string;
  jobDescriptions?: string;
  subcompany?: string;
  createdAt?: string;
}

function parsePersonioXml(xml: string): PersonioPositionParsed[] {
  const positions: PersonioPositionParsed[] = [];
  const posRegex = /<position>([\s\S]*?)<\/position>/gi;
  let match: RegExpExecArray | null;

  while ((match = posRegex.exec(xml)) !== null) {
    const block = match[1];
    const extract = (tag: string): string => {
      const m = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i').exec(block);
      return m ? m[1].trim() : '';
    };

    const id = extract('id');
    const name = extract('name');
    if (!id || !name) continue;

    // Combine jobDescriptions if present
    let desc = '';
    const descMatches = block.match(/<value>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/value>/gi);
    if (descMatches) {
      desc = descMatches
        .map(v => v.replace(/<\/?value>/gi, '').replace(/<!\[CDATA\[|\]\]>/g, '').trim())
        .filter(Boolean)
        .join('\n\n');
    }

    positions.push({
      id,
      name,
      office: extract('office'),
      department: extract('department'),
      schedule: extract('schedule'),
      employmentType: extract('employmentType'),
      jobDescriptions: desc,
      subcompany: extract('subcompany'),
      createdAt: extract('createdAt'),
    });
  }

  return positions;
}

export class PersonioAdapter implements SourceAdapter {
  public readonly id = 'personio';
  public readonly name = 'Personio Careers Feed';
  public readonly homepage = 'https://www.personio.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Personio publishes public, keyless XML job feeds (/xml) for customer careers syndication.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 30,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'personio';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('PersonioAdapter: companySlug is required for search');
      return;
    }

    const url = `https://${encodeURIComponent(companySlug)}.jobs.personio.de/xml`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const xmlText = await res.text();
      const positions = parsePersonioXml(xmlText);

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const item of positions) {
        if (count >= limit) break;

        const title = item.name || '';
        const locName = item.office || '';
        const isRemote =
          locName.toLowerCase().includes('remote') ||
          locName.toLowerCase().includes('anywhere') ||
          title.toLowerCase().includes('(remote)');

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

        const applyUrl = `https://${encodeURIComponent(companySlug)}.jobs.personio.de/job/${item.id}`;

        const stub: JobStub = {
          id: `per_${companySlug}_${item.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: item.createdAt,
          atsType: 'personio',
          extra: {
            rawId: item.id,
            companySlug,
            department: item.department,
            schedule: item.schedule,
            employmentType: item.employmentType,
            descriptionRaw: item.jobDescriptions,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`PersonioAdapter search failed for ${companySlug}:`, err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const descRaw = (stub.extra?.descriptionRaw as string) || '';
    const descriptionMarkdown = descRaw ? htmlToMarkdown(descRaw) : stub.title;

    let employmentType: EmploymentType | undefined;
    const scheduleStr = ((stub.extra?.schedule as string) || (stub.extra?.employmentType as string) || '').toLowerCase();
    if (scheduleStr.includes('full')) employmentType = 'full-time';
    else if (scheduleStr.includes('part')) employmentType = 'part-time';
    else if (scheduleStr.includes('contract') || scheduleStr.includes('freelance')) employmentType = 'contract';
    else if (scheduleStr.includes('intern') || scheduleStr.includes('trainee')) employmentType = 'internship';

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
      atsType: 'personio',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
