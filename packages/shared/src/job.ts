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
  atsType: z.enum(['greenhouse', 'lever', 'ashby', 'workable', 'generic']).default('generic'),
  contentHash: z.string(),
  simHash: z.string().optional(),
  rawJsonLd: z.record(z.unknown()).optional(),
});
export type JobPosting = z.infer<typeof JobPostingSchema>;

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
