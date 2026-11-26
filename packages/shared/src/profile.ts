import { z } from 'zod';
import { RemoteTypeSchema } from './job.js';

export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const FactProvenanceSchema = z.object({
  sourceFileId: z.string(),
  page: z.number().int().min(1),
  textSpan: z.string(),
  bbox: BoundingBoxSchema.optional(),
  confidence: z.number().min(0).max(1),
  status: z.enum(['accepted', 'needs_review', 'user_edited']).default('accepted'),
});
export type FactProvenance = z.infer<typeof FactProvenanceSchema>;

export const ContactInfoSchema = z.object({
  fullName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional(),
  githubUrl: z.string().url().nullable().optional(),
  portfolioUrl: z.string().url().nullable().optional(),
  provenance: FactProvenanceSchema.nullable().optional(),
});
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const ExperienceItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(), // ISO YYYY-MM or YYYY
  endDate: z.string().nullable().optional(), // undefined = current
  isCurrent: z.boolean().default(false),
  description: z.string().nullable().optional(),
  achievements: z.array(z.string()).default([]),
  skillsUsed: z.array(z.string()).default([]),
  provenance: FactProvenanceSchema.nullable().optional(),
});
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;

export const EducationItemSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  grade: z.string().optional(),
  provenance: FactProvenanceSchema.optional(),
});
export type EducationItem = z.infer<typeof EducationItemSchema>;

export const SkillItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  escoId: z.string().optional(),
  category: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  provenance: FactProvenanceSchema.optional(),
});
export type SkillItem = z.infer<typeof SkillItemSchema>;

export const LanguageItemSchema = z.object({
  id: z.string(),
  language: z.string(),
  proficiency: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native']),
  provenance: FactProvenanceSchema.optional(),
});
export type LanguageItem = z.infer<typeof LanguageItemSchema>;

export const SeniorityLevelSchema = z.enum([
  'intern',
  'junior',
  'mid',
  'senior',
  'lead',
  'staff',
  'principal',
  'manager',
  'director',
]);
export type SeniorityLevel = z.infer<typeof SeniorityLevelSchema>;

export const UserPreferencesSchema = z.object({
  targetTitles: z.array(z.string()).default([]),
  seniorityLevels: z.array(SeniorityLevelSchema).default(['senior', 'lead', 'staff']),
  locations: z.array(z.string()).default([]),
  remoteTypes: z.array(RemoteTypeSchema).default(['remote']),
  workAuthorizationCountries: z.array(z.string()).default(['US', 'EU', 'Worldwide']),
  visaSponsorshipRequired: z.boolean().default(false),
  minSalary: z.number().optional(),
  salaryCurrency: z.string().default('USD'),
  excludedCompanies: z.array(z.string()).default([]),
  excludedKeywords: z.array(z.string()).default([]),
  maxApplicationsPerDay: z.number().default(10),
  autoApplyScoreThreshold: z.number().default(85),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  version: z.number().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  contact: ContactInfoSchema,
  summary: z.string().optional(),
  experiences: z.array(ExperienceItemSchema).default([]),
  education: z.array(EducationItemSchema).default([]),
  skills: z.array(SkillItemSchema).default([]),
  languages: z.array(LanguageItemSchema).default([]),
  certifications: z.array(z.string()).default([]),
  targetTitles: z.array(z.string()).default([]),
  workAuthorization: z.array(z.string()).default([]),
  preferences: UserPreferencesSchema.optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
