import { z } from 'zod';
import { ContactInfoSchema, EducationItemSchema } from './profile.js';

export const TailoredExperienceSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  originalAchievements: z.array(z.string()).default([]),
  tailoredAchievements: z.array(z.string()).default([]),
  emphasizedSkills: z.array(z.string()).default([]),
});
export type TailoredExperience = z.infer<typeof TailoredExperienceSchema>;

export const TemplateIdSchema = z.enum(['ats-clean', 'modern-minimal', 'compact-technical']);
export type TemplateId = z.infer<typeof TemplateIdSchema>;

export const TailoredResumeSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  jobId: z.string(),
  templateId: TemplateIdSchema.default('ats-clean'),
  language: z.enum(['en', 'fa']).default('en'),
  contact: ContactInfoSchema,
  summary: z.string(),
  experiences: z.array(TailoredExperienceSchema),
  skillCategories: z.array(
    z.object({
      category: z.string(),
      skills: z.array(z.string()),
    })
  ),
  education: z.array(EducationItemSchema),
  certifications: z.array(z.string()).default([]),
  tailoringNotes: z.array(z.string()).default([]),
  truthfulnessScore: z.number().min(0).max(100).default(100),
  verifiedFactsCount: z.number().default(0),
  unsupportedClaimsCount: z.number().default(0),
  createdAt: z.string(),
});
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

export const CoverLetterSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  jobId: z.string(),
  language: z.enum(['en', 'fa']).default('en'),
  recipientCompany: z.string(),
  roleTitle: z.string(),
  opening: z.string(),
  bodyParagraphs: z.array(z.string()),
  closing: z.string(),
  fullText: z.string(),
  referencedAchievements: z.array(z.string()),
  createdAt: z.string(),
});
export type CoverLetter = z.infer<typeof CoverLetterSchema>;

export const ScreeningQuestionCategorySchema = z.enum([
  'notice_period',
  'salary',
  'work_auth',
  'relocation',
  'experience_years',
  'technical',
  'eeo_demographic',
  'custom',
]);
export type ScreeningQuestionCategory = z.infer<typeof ScreeningQuestionCategorySchema>;

export const ScreeningAnswerSchema = z.object({
  id: z.string(),
  questionText: z.string(),
  category: ScreeningQuestionCategorySchema,
  answerText: z.string(),
  isApproved: z.boolean().default(true),
  lastUsedAt: z.string().optional(),
});
export type ScreeningAnswer = z.infer<typeof ScreeningAnswerSchema>;

export const UnsupportedClaimSchema = z.object({
  claim: z.string(),
  field: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  reason: z.string(),
});
export type UnsupportedClaim = z.infer<typeof UnsupportedClaimSchema>;

export const TruthfulnessCheckResultSchema = z.object({
  isTruthful: z.boolean(),
  score: z.number().min(0).max(100),
  verifiedClaims: z.array(z.string()),
  unsupportedClaims: z.array(UnsupportedClaimSchema),
  sanitizedText: z.string().optional(),
});
export type TruthfulnessCheckResult = z.infer<typeof TruthfulnessCheckResultSchema>;
