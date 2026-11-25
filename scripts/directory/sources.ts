import type { AtsType } from '@kaarjoo/shared';

export interface RawCandidate {
  slug: string;
  name?: string;
  domain?: string;
  atsType: AtsType;
  country?: string;
  industry?: string;
  headquarters?: string;
  sizeBucket?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  tags?: string[];
  remotePolicy?: 'remote-first' | 'hybrid' | 'on-site' | 'flexible';
}

export const ATS_CDX_PATTERNS: Array<{ atsType: AtsType; hostPattern: string; sampleSlugs: string[] }> = [
  {
    atsType: 'greenhouse',
    hostPattern: 'boards.greenhouse.io/*',
    sampleSlugs: ['stripe', 'datadog', 'gitlab', 'automattic', 'airbnb', 'doordash', 'github', 'reddit', 'dropbox', 'pinterest'],
  },
  {
    atsType: 'lever',
    hostPattern: 'jobs.lever.co/*',
    sampleSlugs: ['figma', 'spotify', 'netflix', 'atlassian', 'canva', 'brex', 'plaid', 'affirm', 'postman', 'twitch'],
  },
  {
    atsType: 'ashby',
    hostPattern: 'jobs.ashbyhq.com/*',
    sampleSlugs: ['openai', 'notion', 'linear', 'ramp', 'replit', 'cursor', 'perplexity', 'anthropic', 'modal', 'supabase'],
  },
  {
    atsType: 'workable',
    hostPattern: 'apply.workable.com/*',
    sampleSlugs: ['supercell', 'transferwise', 'bolt', 'delivery-hero', 'gorillas', 'taxfix', 'getyourguide', 'omio'],
  },
  {
    atsType: 'smartrecruiters',
    hostPattern: 'jobs.smartrecruiters.com/*',
    sampleSlugs: ['visa', 'ikea', 'bosch', 'linkedin', 'square', 'invision', 'skechers', 'colliers'],
  },
  {
    atsType: 'recruitee',
    hostPattern: '*.recruitee.com',
    sampleSlugs: ['bunq', 'hotjar', 'channable', 'transloadit', 'blendle', 'wetransfer', 'picnic'],
  },
  {
    atsType: 'personio',
    hostPattern: '*.jobs.personio.de',
    sampleSlugs: ['flix', 'n26', 'trade-republic', 'celonis', 'tier', 'sennder', 'adjust', 'staffbase'],
  },
  {
    atsType: 'teamtailor',
    hostPattern: '*.teamtailor.com',
    sampleSlugs: ['klarna', 'kry', 'polestar', 'storytel', 'sinch', 'epidemicsound', 'na-kd'],
  },
  {
    atsType: 'bamboohr',
    hostPattern: '*.bamboohr.com/careers',
    sampleSlugs: ['zapier', 'postmates', 'wistia', 'jane', 'soundstripe', 'fullstory', 'helpscout'],
  },
  {
    atsType: 'breezy',
    hostPattern: '*.breezy.hr',
    sampleSlugs: ['basecamp', 'buffer', 'doist', 'ghost', 'duckduckgo', 'tuxedo', 'harvest'],
  },
  {
    atsType: 'jazzhr',
    hostPattern: '*.applytojob.com',
    sampleSlugs: ['sparkfun', 'makerbot', 'thinkful', 'launchdarkly', 'ironclad', 'segment'],
  },
  {
    atsType: 'pinpoint',
    hostPattern: '*.pinpointhq.com',
    sampleSlugs: ['orbit', 'tide', 'gohenry', 'primark', 'trustpilot', 'holidu'],
  },
  {
    atsType: 'rippling',
    hostPattern: 'ats.rippling.com/*',
    sampleSlugs: ['ramp', 'deel', 'brex', 'gusto', 'vanta', 'mercury', 'remote', 'lattice'],
  },
  {
    atsType: 'join',
    hostPattern: 'join.com/companies/*',
    sampleSlugs: ['personio', 'enpal', 'komoot', 'urban-sports-club', 'babbel', 'hellofresh'],
  },
  {
    atsType: 'workday',
    hostPattern: '*.myworkdayjobs.com/*',
    sampleSlugs: ['nvidia/NVIDIAExternalCareerSite', 'walmart/Walmart_Careers', 'target/Target_Careers', 'salesforce/Salesforce_Careers'],
  },
];

export const INDUSTRIES = [
  'Artificial Intelligence / Machine Learning',
  'Cloud Infrastructure & DevOps',
  'Financial Technology & Banking',
  'Design & Creative Software',
  'E-Commerce & Digital Marketplace',
  'Healthcare & Biotechnology',
  'Cybersecurity & Identity',
  'Data Infrastructure & Analytics',
  'Productivity & Collaboration Software',
  'Telecommunications & Networking',
  'Education Technology',
  'Enterprise SaaS & Workflow Automation',
  'Media, Streaming & Entertainment',
  'Logistics & Supply Chain Tech',
  'Gaming & Interactive Entertainment',
  'Energy & Climate Technology',
];

export const COUNTRIES: Record<string, { name: string; cities: string[] }> = {
  US: { name: 'United States', cities: ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA', 'Denver, CO'] },
  DE: { name: 'Germany', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'] },
  GB: { name: 'United Kingdom', cities: ['London', 'Manchester', 'Cambridge', 'Edinburgh', 'Bristol'] },
  NL: { name: 'Netherlands', cities: ['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven'] },
  SE: { name: 'Sweden', cities: ['Stockholm', 'Gothenburg', 'Malmo'] },
  FR: { name: 'France', cities: ['Paris', 'Lyon', 'Toulouse', 'Nantes'] },
  CA: { name: 'Canada', cities: ['Toronto, ON', 'Vancouver, BC', 'Montreal, QC', 'Ottawa, ON'] },
  CH: { name: 'Switzerland', cities: ['Zurich', 'Geneva', 'Lausanne', 'Basel'] },
  IE: { name: 'Ireland', cities: ['Dublin', 'Cork', 'Galway'] },
  AF: { name: 'Afghanistan', cities: ['Kabul', 'Herat', 'Mazar-i-Sharif', 'Jalalabad', 'Kandahar'] },
};
