import type { EmploymentType, JobPosting, JobStub, RemoteType, SalaryRange, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface SmartRecruitersPostingRaw {
  id: string;
  name: string;
  uuid?: string;
  releasedDate?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    remote?: boolean;
  };
  department?: {
    label?: string;
  };
  typeOfEmployment?: {
    label?: string;
  };
  refNumber?: string;
}

interface SmartRecruitersDetailRaw {
  id: string;
  name: string;
  releasedDate?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    remote?: boolean;
  };
  typeOfEmployment?: {
    label?: string;
  };
  jobAd?: {
    sections?: {
      companyDescription?: { title?: string; text?: string };
      jobDescription?: { title?: string; text?: string };
      qualifications?: { title?: string; text?: string };
      additionalInformation?: { title?: string; text?: string };
    };
  };
  compensation?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

export class SmartRecruitersAdapter implements SourceAdapter {
  public readonly id = 'smartrecruiters';
  public readonly name = 'SmartRecruiters Job Board';
  public readonly homepage = 'https://www.smartrecruiters.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'SmartRecruiters provides a public, keyless Posting API v1 for public careers syndication.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'smartrecruiters';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('SmartRecruitersAdapter: companySlug is required for search');
      return;
    }

    const limit = query.limit ?? 50;
    const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companySlug)}/postings?limit=${limit}`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<{ content?: SmartRecruitersPostingRaw[] }>();
      const postings = data.content || [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      for (const item of postings) {
        if (count >= limit) break;

        const title = item.name || '';
        const locParts = [item.location?.city, item.location?.region, item.location?.country].filter(Boolean);
        const locName = locParts.join(', ');
        const isRemote = Boolean(item.location?.remote || locName.toLowerCase().includes('remote') || title.toLowerCase().includes('remote'));

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

        const applyUrl = `https://jobs.smartrecruiters.com/${encodeURIComponent(companySlug)}/${item.id}`;

        const stub: JobStub = {
          id: `sr_${companySlug}_${item.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: item.releasedDate,
          atsType: 'smartrecruiters',
          extra: {
            rawId: item.id,
            companySlug,
            department: item.department?.label,
            employmentType: item.typeOfEmployment?.label,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`SmartRecruitersAdapter search failed for ${companySlug}:`, err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const rawId = (stub.extra?.rawId as string) || stub.id.replace(`sr_${stub.company}_`, '');
    const companySlug = (stub.extra?.companySlug as string) || stub.company;

    const detailUrl = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companySlug)}/postings/${encodeURIComponent(rawId)}`;

    let descriptionMarkdown = '';
    let requirements: string[] = [];
    let salary: SalaryRange | undefined;
    let employmentType: EmploymentType | undefined;

    try {
      const res = await ctx.httpClient.fetch(detailUrl, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<SmartRecruitersDetailRaw>();
      const sections = data.jobAd?.sections;

      const htmlParts: string[] = [];
      if (sections?.companyDescription?.text) {
        htmlParts.push(`### About Company\n${sections.companyDescription.text}`);
      }
      if (sections?.jobDescription?.text) {
        htmlParts.push(`### Job Description\n${sections.jobDescription.text}`);
      }
      if (sections?.qualifications?.text) {
        htmlParts.push(`### Qualifications\n${sections.qualifications.text}`);
      }
      if (sections?.additionalInformation?.text) {
        htmlParts.push(`### Additional Information\n${sections.additionalInformation.text}`);
      }

      descriptionMarkdown = htmlParts.map(p => htmlToMarkdown(p)).join('\n\n');

      if (sections?.qualifications?.text) {
        requirements = sections.qualifications.text
          .replace(/<[^>]+>/g, '\n')
          .split('\n')
          .map(s => s.trim().replace(/^[-*•]\s*/, ''))
          .filter(s => s.length > 5 && s.length < 200);
      }

      if (data.compensation?.min || data.compensation?.max) {
        salary = {
          min: data.compensation.min,
          max: data.compensation.max,
          currency: data.compensation.currency || 'USD',
          period: 'year',
        };
      }

      const empLabel = (data.typeOfEmployment?.label || (stub.extra?.employmentType as string) || '').toLowerCase();
      if (empLabel.includes('full')) employmentType = 'full-time';
      else if (empLabel.includes('part')) employmentType = 'part-time';
      else if (empLabel.includes('contract')) employmentType = 'contract';
      else if (empLabel.includes('intern')) employmentType = 'internship';
    } catch (err) {
      ctx.logger?.warn(`SmartRecruitersAdapter fetchDetail fallback for ${stub.id}:`, err);
      descriptionMarkdown = stub.title;
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
      remoteType: stub.remoteType ?? 'on-site',
      employmentType,
      salary,
      descriptionMarkdown: descriptionMarkdown || stub.title,
      requirements,
      postedAt: stub.postedAt,
      atsType: 'smartrecruiters',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
