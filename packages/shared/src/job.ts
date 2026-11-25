import { z } from 'zod';

export const RemoteTypeSchema = z.enum(['remote', 'hybrid', 'on-site']);
export type RemoteType = z.infer<typeof RemoteTypeSchema>;

export const EmploymentTypeSchema = z.enum(['full-time', 'part-time', 'contract', 'internship', 'temporary']);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

export const SalaryRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string().default('USD'),
  period: z.enum(['hour', 'month', 'year']).default('year'),
});
export type SalaryRange = z.infer<typeof SalaryRangeSchema>;

export const AtsTypeSchema = z.enum([
  'greenhouse',
  'lever',
  'ashby',
  'workable',
  'smartrecruiters',
  'recruitee',
  'personio',
  'teamtailor',
  'bamboohr',
  'breezy',
  'jazzhr',
  'pinpoint',
  'rippling',
  'join',
  'workday',
  'remotive',
  'remoteok',
  'workingnomads',
  'himalayas',
  'reliefweb',
  'unjobs',
  'acbar',
  'jobsaf',
  'weworkremotely',
  'generic',
]);
export type AtsType = z.infer<typeof AtsTypeSchema>;

export const JobPostingSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceName: z.string(),
  canonicalUrl: z.string().url(),
  applyUrl: z.string().url(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  remoteType: RemoteTypeSchema.default('on-site'),
  employmentType: EmploymentTypeSchema.optional(),
  salary: SalaryRangeSchema.optional(),
  descriptionMarkdown: z.string(),
  requirements: z.array(z.string()).default([]),
  postedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  atsType: AtsTypeSchema.default('generic'),
  contentHash: z.string(),
  simHash: z.string().optional(),
  rawJsonLd: z.record(z.unknown()).optional(),
});
export type JobPosting = z.infer<typeof JobPostingSchema>;

export const JobStubSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  url: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  remoteType: RemoteTypeSchema.optional(),
  postedAt: z.string().optional(),
  atsType: AtsTypeSchema.default('generic'),
  extra: z.record(z.unknown()).optional(),
});
export type JobStub = z.infer<typeof JobStubSchema>;

export const SearchQuerySchema = z.object({
  keywords: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  remoteOnly: z.boolean().optional(),
  company: z.string().optional(),
  atsType: AtsTypeSchema.optional(),
  limit: z.number().optional().default(50),
  since: z.string().optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const AdapterModeSchema = z.enum(['auto-apply', 'assist', 'link-only']);
export type AdapterMode = z.infer<typeof AdapterModeSchema>;

export interface AdapterMetadata {
  id: string;
  name: string;
  homepage: string;
  mode: AdapterMode;
  termsReviewed: {
    date: string;
    notes: string;
  };
  rateLimit: {
    requestsPerMinute: number;
    concurrency: number;
  };
  needsBrowser: boolean;
  applyAdapter?: string;
}

export const CompanyBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  atsType: AtsTypeSchema,
  boardSlug: z.string(),
  boardUrl: z.string().url(),
  country: z.string().default('US'),
  headquarters: z.string().optional(),
  industry: z.string().optional(),
  active: z.boolean().default(true),
  lastSyncedAt: z.string().optional(),
  jobCount: z.number().default(0),
  logoUrl: z.string().optional(),
  sizeBucket: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  tags: z.array(z.string()).optional(),
  remotePolicy: z.enum(['remote-first', 'hybrid', 'on-site', 'flexible']).optional(),
  isFollowed: z.boolean().optional(),
});
export type CompanyBoard = z.infer<typeof CompanyBoardSchema>;

export const DirectoryManifestSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  companyCount: z.number(),
  sha256: z.string(),
  sources: z.array(z.string()),
  stats: z.object({
    byAts: z.record(z.number()),
    byCountry: z.record(z.number()),
    byIndustry: z.record(z.number()),
    remoteFirstCount: z.number(),
  }),
});
export type DirectoryManifest = z.infer<typeof DirectoryManifestSchema>;

export const SourceHealthStatusSchema = z.object({
  adapterId: z.string(),
  name: z.string(),
  status: z.enum(['healthy', 'degraded', 'failing']),
  lastCheckedAt: z.string(),
  latencyMs: z.number(),
  message: z.string().optional(),
});
export type SourceHealthStatus = z.infer<typeof SourceHealthStatusSchema>;

export const MatchResultSchema = z.object({
  jobId: z.string(),
  profileId: z.string(),
  overallScore: z.number().min(0).max(100),
  breakdown: z.object({
    hardFilterScore: z.number().min(0).max(100),
    semanticScore: z.number().min(0).max(100),
    skillCoverageScore: z.number().min(0).max(100),
    llmRerankScore: z.number().min(0).max(100),
  }),
  topReasons: z.array(z.string()),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  redFlags: z.array(z.string()).default([]),
  userFeedback: z.enum(['relevant', 'irrelevant']).optional(),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;
