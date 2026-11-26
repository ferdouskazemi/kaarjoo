import {
  FormField,
  FormFieldOption,
  FilledFieldValue,
  ReviewChecklistItem,
  ExperienceItem,
} from '@kaarjoo/shared';
import { FormFillerContext } from './types.js';
import { matchOption } from './matcher.js';

export interface MappedFieldInfo {
  value: string | boolean;
  option?: FormFieldOption;
  confidence: number;
  source: 'profile' | 'answer_bank' | 'preferences' | 'eeo_default' | 'user';
  category: 'contact' | 'documents' | 'screening' | 'eeo' | 'custom';
}

export interface FieldMappingResult {
  mappedValues: Map<string, MappedFieldInfo>;
  filledFields: FilledFieldValue[];
  reviewChecklist: ReviewChecklistItem[];
  missingRequiredFields: string[];
}

function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findAnswerBankMatch(label: string, answers: Record<string, string>): { value: string; confidence: number } | null {
  const normLabel = normalizeQuestion(label);
  if (!normLabel) return null;

  // 1. Exact normalized match
  for (const [qKey, aVal] of Object.entries(answers)) {
    if (!aVal) continue;
    if (normalizeQuestion(qKey) === normLabel) {
      return { value: aVal, confidence: 0.98 };
    }
  }

  // 2. Fuzzy token overlap on normalized question text
  const labelTokens = new Set(normLabel.split(' ').filter((t) => t.length > 1));
  if (labelTokens.size === 0) return null;

  let bestScore = 0;
  let bestVal: string | null = null;
  for (const [qKey, aVal] of Object.entries(answers)) {
    if (!aVal) continue;
    const normKey = normalizeQuestion(qKey);
    if (normLabel.includes(normKey) || normKey.includes(normLabel)) {
      return { value: aVal, confidence: 0.88 };
    }
    const keyTokens = new Set(normKey.split(' ').filter((t) => t.length > 1));
    if (keyTokens.size === 0) continue;
    let overlap = 0;
    for (const t of labelTokens) {
      if (keyTokens.has(t)) overlap++;
    }
    const union = new Set([...labelTokens, ...keyTokens]).size;
    const jaccard = union > 0 ? overlap / union : 0;
    if (jaccard > bestScore && jaccard >= 0.45) {
      bestScore = jaccard;
      bestVal = aVal;
    }
  }

  return bestVal ? { value: bestVal, confidence: Math.min(0.85, 0.6 + bestScore * 0.25) } : null;
}

/**
 * Maps detected form fields to applicant profile data, screening answers, and EEO defaults.
 */
export function mapFields(fields: FormField[], context: FormFillerContext): FieldMappingResult {
  const { profile, tailoredResumePath, coverLetterText, answers = {} } = context;
  const mappedValues = new Map<string, MappedFieldInfo>();
  const filledFields: FilledFieldValue[] = [];
  const reviewChecklist: ReviewChecklistItem[] = [];
  const missingRequiredFields: string[] = [];

  const fullName = profile.contact.fullName || '';
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '';
  const email = profile.contact.email || '';
  const phone = profile.contact.phone || '';
  const location = profile.contact.location || '';
  const linkedin = profile.contact.linkedinUrl || '';
  const github = profile.contact.githubUrl || '';
  const portfolio = profile.contact.portfolioUrl || '';

  // Current company from most recent experience
  const currentExp = profile.experiences.find((e: ExperienceItem) => e.isCurrent) || profile.experiences[0];
  const currentCompany = currentExp?.company || '';

  for (const field of fields) {
    let value: string | boolean | undefined;
    let selectedOption: FormFieldOption | undefined;
    let confidence = 0.95;
    let category: 'contact' | 'documents' | 'screening' | 'eeo' | 'custom' = 'custom';
    let source: MappedFieldInfo['source'] = 'profile';

    switch (field.canonicalField) {
      case 'first_name':
        value = firstName;
        category = 'contact';
        break;
      case 'last_name':
        value = lastName;
        category = 'contact';
        break;
      case 'full_name':
        value = fullName;
        category = 'contact';
        break;
      case 'email':
        value = email;
        category = 'contact';
        break;
      case 'phone':
        value = phone;
        category = 'contact';
        break;
      case 'location':
        value = location;
        category = 'contact';
        break;
      case 'linkedin':
        value = linkedin;
        category = 'contact';
        break;
      case 'github':
        value = github;
        category = 'contact';
        break;
      case 'portfolio':
        value = portfolio;
        category = 'contact';
        break;
      case 'resume':
        value = tailoredResumePath || undefined;
        category = 'documents';
        source = 'profile';
        break;
      case 'cover_letter':
        value = coverLetterText || answers['cover_letter'] || undefined;
        category = 'documents';
        source = coverLetterText ? 'profile' : 'answer_bank';
        break;
      case 'current_company':
        value = currentCompany || undefined;
        category = 'contact';
        break;
      case 'work_authorization':
        value = answers['work_auth'] || answers['work_authorization'] || undefined;
        category = 'screening';
        source = 'preferences';
        break;
      case 'visa_sponsorship':
        value = answers['visa_sponsorship'] || undefined;
        category = 'screening';
        source = 'preferences';
        break;
      case 'notice_period':
        value = answers['notice_period'] || undefined;
        category = 'screening';
        source = 'answer_bank';
        break;
      case 'salary':
        value = answers['salary'] || undefined;
        category = 'screening';
        source = 'preferences';
        break;
      case 'years_of_experience':
        value = answers['experience_years'] || undefined;
        category = 'screening';
        source = 'answer_bank';
        break;
      case 'eeo_gender':
      case 'eeo_race':
      case 'eeo_veteran':
      case 'eeo_disability':
        category = 'eeo';
        source = 'eeo_default';
        confidence = 1.0;
        if (field.options && field.options.length > 0) {
          const matched = matchOption(field.options, 'decline', true);
          if (matched) {
            selectedOption = matched;
            value = matched.value;
          }
        }
        break;
      default: {
        const match = findAnswerBankMatch(field.label, answers);
        if (match) {
          value = match.value;
          confidence = match.confidence;
          category = 'screening';
          source = 'answer_bank';
        }
        break;
      }
    }

    // Handle select dropdowns with available options
    if (field.type === 'select' && field.options && field.options.length > 0 && !selectedOption) {
      if (value !== undefined) {
        const matched = matchOption(field.options, String(value), category === 'eeo');
        if (matched) {
          selectedOption = matched;
          value = matched.value;
        } else {
          confidence = 0.5;
        }
      }
    }

    if (value !== undefined && value !== '') {
      mappedValues.set(field.selector, {
        value,
        option: selectedOption,
        confidence,
        source,
        category,
      });

      const displayVal = selectedOption ? selectedOption.label : String(value);

      filledFields.push({
        fieldId: field.id,
        fieldName: field.name,
        label: field.label,
        value,
        displayValue: displayVal,
        confidence,
        canonicalField: field.canonicalField,
        isRequired: field.required,
      });

      reviewChecklist.push({
        id: field.id,
        label: field.label,
        value: displayVal,
        status: confidence >= 0.8 ? 'ok' : 'warning',
        category,
        selector: field.selector,
        intendedValue: displayVal,
        source,
        required: field.required,
        note: confidence < 0.8 ? 'Low confidence match - please verify' : undefined,
      });
    } else if (field.required) {
      missingRequiredFields.push(field.label);

      reviewChecklist.push({
        id: field.id,
        label: field.label,
        value: '',
        status: 'empty_required',
        category,
        selector: field.selector,
        source: 'unknown',
        required: true,
        note: 'Required by employer',
      });
    }
  }

  return {
    mappedValues,
    filledFields,
    reviewChecklist,
    missingRequiredFields,
  };
}
