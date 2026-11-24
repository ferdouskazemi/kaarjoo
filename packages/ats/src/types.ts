import { Page } from 'playwright-core';
import {
  AtsType,
  ApplicationStatus,
  StopReason,
  FormField,
  FilledFieldValue,
  ReviewChecklistItem,
  UserProfile,
} from '@kaarjoo/shared';

export interface FormFillerContext {
  profile: UserProfile;
  tailoredResumePath?: string;
  coverLetterPath?: string;
  coverLetterText?: string;
  answers?: Record<string, string>;
  mode?: 'review' | 'auto';
  autoSubmitMinConfidence?: number;
}

export interface FillResult {
  success: boolean;
  status: ApplicationStatus;
  stopReason: StopReason;
  stopMessage?: string;
  filledFields: FilledFieldValue[];
  reviewChecklist: ReviewChecklistItem[];
  screenshotBeforeSubmit?: string;
  screenshotConfirmation?: string;
  missingRequiredFields: string[];
  submissionConfirmationText?: string;
}

export interface AtsFiller {
  name: string;
  atsType: AtsType;
  canHandle(url: string, html?: string): boolean;
  detectFields(page: Page): Promise<FormField[]>;
  fillForm(page: Page, context: FormFillerContext): Promise<FillResult>;
  submitForm(page: Page): Promise<{ success: boolean; confirmationText?: string; screenshotConfirmation?: string }>;
}

export interface CaptchaCheckResult {
  detected: boolean;
  type?: 'recaptcha' | 'hcaptcha' | 'turnstile' | 'arkose' | 'generic';
  selector?: string;
}
