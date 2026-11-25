import type { AtsType, CompanyBoard } from '@kaarjoo/shared';
import { COUNTRIES, INDUSTRIES, type RawCandidate } from './sources.js';

export function formatCompanyName(slug: string): string {
  // Handle tenant/board for workday
  const cleanSlug = slug.includes('/') ? slug.split('/')[0] : slug;

  // Split on hyphens, underscores, dots
  const words = cleanSlug.split(/[-_.]+/).filter(Boolean);
  if (words.length === 0) return 'Tech Company';

  return words
    .map(w => {
      // Common acronyms
      if (/^(ai|ml|io|api|hr|os|db|vpn|sre|hq)$/i.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

export function buildBoardUrl(atsType: AtsType, slug: string): string {
  switch (atsType) {
    case 'greenhouse':
      return `https://boards.greenhouse.io/${encodeURIComponent(slug)}`;
    case 'lever':
      return `https://jobs.lever.co/${encodeURIComponent(slug)}`;
    case 'ashby':
      return `https://jobs.ashbyhq.com/${encodeURIComponent(slug)}`;
    case 'workable':
      return `https://apply.workable.com/${encodeURIComponent(slug)}`;
    case 'smartrecruiters':
      return `https://jobs.smartrecruiters.com/${encodeURIComponent(slug)}`;
    case 'recruitee':
      return `https://${encodeURIComponent(slug)}.recruitee.com`;
    case 'personio':
      return `https://${encodeURIComponent(slug)}.jobs.personio.de`;
    case 'teamtailor':
      return `https://${encodeURIComponent(slug)}.teamtailor.com`;
    case 'bamboohr':
      return `https://${encodeURIComponent(slug)}.bamboohr.com/careers`;
    case 'breezy':
      return `https://${encodeURIComponent(slug)}.breezy.hr`;
    case 'jazzhr':
      return `https://${encodeURIComponent(slug)}.applytojob.com`;
    case 'pinpoint':
      return `https://${encodeURIComponent(slug)}.pinpointhq.com`;
    case 'rippling':
      return `https://ats.rippling.com/${encodeURIComponent(slug)}`;
    case 'join':
      return `https://join.com/companies/${encodeURIComponent(slug)}`;
    case 'workday': {
      if (slug.includes('/')) {
        const [tenant, board] = slug.split('/');
        return `https://${encodeURIComponent(tenant)}.myworkdayjobs.com/en-US/${encodeURIComponent(board)}`;
      }
      return `https://${encodeURIComponent(slug)}.myworkdayjobs.com/en-US/${encodeURIComponent(slug)}_careers`;
    }
    default:
      return `https://${encodeURIComponent(slug)}.com`;
  }
}

export function enrichCandidate(candidate: RawCandidate, index: number): CompanyBoard {
  const name = candidate.name || formatCompanyName(candidate.slug);
  const cleanDomainSlug = candidate.slug.includes('/') ? candidate.slug.split('/')[0] : candidate.slug;
  const domain = candidate.domain || `${cleanDomainSlug.replace(/[^a-z0-9]/gi, '').toLowerCase()}.com`;

  // Deterministic but realistic distribution based on index
  const countryKeys = Object.keys(COUNTRIES);
  const countryCode = candidate.country || countryKeys[index % countryKeys.length] || 'US';
  const countryInfo = COUNTRIES[countryCode] || COUNTRIES.US;
  const city = countryInfo.cities[index % countryInfo.cities.length];
  const headquarters = candidate.headquarters || `${city}, ${countryInfo.name}`;

  const industry = candidate.industry || INDUSTRIES[index % INDUSTRIES.length];

  const sizeBuckets: Array<'1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+'> = [
    '11-50',
    '51-200',
    '201-500',
    '501-1000',
    '1000+',
  ];
  const sizeBucket = candidate.sizeBucket || sizeBuckets[index % sizeBuckets.length];

  const remotePolicies: Array<'remote-first' | 'hybrid' | 'on-site' | 'flexible'> = [
    'remote-first',
    'hybrid',
    'remote-first',
    'flexible',
    'on-site',
  ];
  const remotePolicy = candidate.remotePolicy || remotePolicies[index % remotePolicies.length];

  const defaultTags = ['verified-board', 'direct-ats'];
  if (remotePolicy === 'remote-first') defaultTags.push('remote-first', 'async-friendly');
  if (index % 3 === 0) defaultTags.push('visa-sponsorship');
  if (index % 5 === 0) defaultTags.push('high-growth');

  const boardUrl = buildBoardUrl(candidate.atsType, candidate.slug);
  const logoUrl = `https://logo.clearbit.com/${domain}`;

  return {
    id: `board_${candidate.atsType}_${cleanDomainSlug.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    name,
    domain,
    atsType: candidate.atsType,
    boardSlug: candidate.slug,
    boardUrl,
    country: countryCode,
    headquarters,
    industry,
    active: true,
    jobCount: (index % 45) + 1,
    logoUrl,
    sizeBucket,
    tags: candidate.tags || defaultTags,
    remotePolicy,
    isFollowed: false,
  };
}
