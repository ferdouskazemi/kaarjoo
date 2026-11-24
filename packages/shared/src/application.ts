import { z } from 'zod';
import { AtsTypeSchema } from './job.js';

export const ApplicationStatusSchema = z.enum([
  'saved',
  'draft',
  'queued',
  'filling',
  'needs_user',
  'needs_review',
  'submitting',
  'submitted',
  'applied',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
  'failed',
  'cancelled',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const KanbanColumnIdSchema = z.enum([
  'saved',
  'ready',
  'applied',
  'interview',
  'offer',
  'rejected',
]);
export type KanbanColumnId = z.infer<typeof KanbanColumnIdSchema>;

export const ApplicationModeSchema = z.enum(['review', 'auto']);
export type ApplicationMode = z.infer<typeof ApplicationModeSchema>;

export const StopReasonSchema = z.enum([
  'none',
  'captcha_detected',
  'login_wall',
  'verification_code',
  'unknown_required_field',
  'upload_failed',
  'unrecognized_page',
]);
export type StopReason = z.infer<typeof StopReasonSchema>;

export const FormFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'email',
  'tel',
  'url',
  'select',
  'radio',
  'checkbox',
  'file',
  'date',
  'number',
  'unknown',
]);
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;

export const FormFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type FormFieldOption = z.infer<typeof FormFieldOptionSchema>;

export const FormFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  type: FormFieldTypeSchema,
  selector: z.string(),
  required: z.boolean().default(false),
  options: z.array(FormFieldOptionSchema).optional(),
  placeholder: z.string().optional(),
  canonicalField: z.string().optional(),
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const FilledFieldValueSchema = z.object({
  fieldId: z.string(),
  fieldName: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.boolean()]),
  displayValue: z.string(),
  confidence: z.number().min(0).max(1),
  canonicalField: z.string().optional(),
  isRequired: z.boolean(),
});
export type FilledFieldValue = z.infer<typeof FilledFieldValueSchema>;

export const ReviewChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  status: z.enum(['ok', 'warning', 'missing']),
  category: z.enum(['contact', 'documents', 'screening', 'eeo', 'custom']),
  note: z.string().optional(),
});
export type ReviewChecklistItem = z.infer<typeof ReviewChecklistItemSchema>;

export const ApplicationTimelineEventSchema = z.object({
  id: z.string(),
  status: z.string(),
  timestamp: z.string(),
  title: z.string(),
  note: z.string().optional(),
});
export type ApplicationTimelineEvent = z.infer<typeof ApplicationTimelineEventSchema>;

export const ApplicationRecordSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  location: z.string().optional(),
  applyUrl: z.string(),
  atsType: AtsTypeSchema,
  mode: ApplicationModeSchema.default('review'),
  status: ApplicationStatusSchema.default('draft'),
  profileId: z.string(),
  tailoredResumePath: z.string().optional(),
  coverLetterText: z.string().optional(),
  matchScore: z.number().min(0).max(100).optional(),
  salaryText: z.string().optional(),
  notes: z.string().optional(),
  interviewDate: z.string().optional(),
  followUpDate: z.string().optional(),
  timeline: z.array(ApplicationTimelineEventSchema).default([]),
  jobSnapshot: z
    .object({
      title: z.string(),
      company: z.string(),
      location: z.string().optional(),
      descriptionMarkdown: z.string().optional(),
      requirements: z.array(z.string()).default([]),
    })
    .optional(),
  filledFields: z.array(FilledFieldValueSchema).default([]),
  reviewChecklist: z.array(ReviewChecklistItemSchema).default([]),
  screenshotBeforeSubmit: z.string().optional(),
  screenshotConfirmation: z.string().optional(),
  stopReason: StopReasonSchema.default('none'),
  stopMessage: z.string().optional(),
  submittedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApplicationRecord = z.infer<typeof ApplicationRecordSchema>;
