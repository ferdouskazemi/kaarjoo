import type { EmploymentType, JobPosting, JobStub, RemoteType, SearchQuery } from '@kaarjoo/shared';
import { computeJobHashes } from '../dedup/index.js';
import { htmlToMarkdown } from '../extractors/markdown.js';
import type { AdapterContext, SourceAdapter } from '../types.js';

interface RecruiteeOfferRaw {
  id: number;
  slug?: string;
  title: string;
  status?: string;
  remote?: boolean;
  location?: string;
  city?: string;
  country?: string;
  department?: string;
  description?: string;
  requirements?: string;
  careers_url?: string;
  created_at?: string;
  published_at?: string;
  employment_type_code?: string;
}

export class RecruiteeAdapter implements SourceAdapter {
  public readonly id = 'recruitee';
  public readonly name = 'Recruitee Job Board';
  public readonly homepage = 'https://recruitee.com';
  public readonly mode = 'assist';
  public readonly termsReviewed = {
    date: '2026-01-01',
    notes: 'Recruitee careers site provides an open, keyless /api/offers endpoint for public listings.',
  };
  public readonly rateLimit = {
    requestsPerMinute: 60,
    concurrency: 2,
  };
  public readonly needsBrowser = false;
  public readonly applyAdapter = 'recruitee';

  public async *search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub> {
    const companySlug = query.company || ctx.companySlug;
    if (!companySlug) {
      ctx.logger?.warn('RecruiteeAdapter: companySlug is required for search');
      return;
    }

    const url = `https://${encodeURIComponent(companySlug)}.recruitee.com/api/offers`;

    try {
      const res = await ctx.httpClient.fetch(url, {
        rateLimitPerMinute: this.rateLimit.requestsPerMinute,
        concurrency: this.rateLimit.concurrency,
        signal: ctx.abortSignal,
      });

      const data = await res.json<{ offers?: RecruiteeOfferRaw[] }>();
      const offers = data.offers || [];

      const keywords = query.keywords?.map(k => k.toLowerCase()) || [];
      const remoteOnly = query.remoteOnly ?? false;

      let count = 0;
      const limit = query.limit ?? 50;

      for (const item of offers) {
        if (count >= limit) break;
        if (item.status && item.status !== 'published') continue;

        const title = item.title || '';
        const locParts = [item.city, item.location, item.country].filter(Boolean);
        const locName = locParts.join(', ');
        const isRemote = Boolean(item.remote || locName.toLowerCase().includes('remote') || title.toLowerCase().includes('remote'));

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

        const applyUrl = item.careers_url || `https://${encodeURIComponent(companySlug)}.recruitee.com/o/${item.slug || item.id}`;

        const stub: JobStub = {
          id: `rec_${companySlug}_${item.id}`,
          sourceId: this.id,
          url: applyUrl,
          title,
          company: companySlug,
          location: locName || undefined,
          remoteType,
          postedAt: item.published_at || item.created_at,
          atsType: 'recruitee',
          extra: {
            rawId: item.id,
            slug: item.slug,
            companySlug,
            descriptionHtml: item.description,
            requirementsHtml: item.requirements,
            employmentTypeCode: item.employment_type_code,
          },
        };

        count++;
        yield stub;
      }
    } catch (err) {
      ctx.logger?.error(`RecruiteeAdapter search failed for ${companySlug}:`, err);
    }
  }

  public async fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting> {
    const descRaw = (stub.extra?.descriptionHtml as string) || '';
    const reqRaw = (stub.extra?.requirementsHtml as string) || '';

    let descriptionMarkdown = '';
    if (descRaw || reqRaw) {
      const combined = `${descRaw}\n\n${reqRaw ? `<h3>Requirements</h3>\n${reqRaw}` : ''}`;
      descriptionMarkdown = htmlToMarkdown(combined);
    } else {
      // Fetch offer detail if not already cached
      const slug = (stub.extra?.slug as string) || stub.id.replace(`rec_${stub.company}_`, '');
      const companySlug = (stub.extra?.companySlug as string) || stub.company;
      const detailUrl = `https://${encodeURIComponent(companySlug)}.recruitee.com/api/offers/${encodeURIComponent(slug)}`;
      try {
        const res = await ctx.httpClient.fetch(detailUrl, {
          rateLimitPerMinute: this.rateLimit.requestsPerMinute,
          concurrency: this.rateLimit.concurrency,
          signal: ctx.abortSignal,
        });
        const data = await res.json<{ offer?: RecruiteeOfferRaw }>();
        const offer = data.offer;
        if (offer) {
          const combined = `${offer.description || ''}\n\n${offer.requirements ? `<h3>Requirements</h3>\n${offer.requirements}` : ''}`;
          descriptionMarkdown = htmlToMarkdown(combined);
        }
      } catch (err) {
        ctx.logger?.warn(`RecruiteeAdapter detail fetch error for ${stub.id}:`, err);
        descriptionMarkdown = stub.title;
      }
    }

    let employmentType: EmploymentType | undefined;
    const empCode = ((stub.extra?.employmentTypeCode as string) || '').toLowerCase();
    if (empCode.includes('full')) employmentType = 'full-time';
    else if (empCode.includes('part')) employmentType = 'part-time';
    else if (empCode.includes('contract')) employmentType = 'contract';
    else if (empCode.includes('intern')) employmentType = 'internship';

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
      descriptionMarkdown: descriptionMarkdown || stub.title,
      requirements: [],
      postedAt: stub.postedAt,
      atsType: 'recruitee',
      contentHash: hashes.urlHash,
      simHash: hashes.simHash,
    };
  }
}
