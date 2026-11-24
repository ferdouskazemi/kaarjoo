import {
  FormField,
  FormFieldOption,
  FilledFieldValue,
  ReviewChecklistItem,
  ExperienceItem,
} from '@kaarjoo/shared';
import { FormFillerContext } from './types.js';
import { matchOption } from './matcher.js';

export interface FieldMappingResult {
  mappedValues: Map<string, { value: string | boolean; option?: FormFieldOption; confidence: number }>;
  filledFields: FilledFieldValue[];
  reviewChecklist: ReviewChecklistItem[];
  missingRequiredFields: string[];
}

/**
 * Maps detected form fields to applicant profile data, screening answers, and EEO defaults.
 */
export function mapFields(fields: FormField[], context: FormFillerContext): FieldMappingResult {
  const { profile, tailoredResumePath, coverLetterText, answers = {} } = context;
  const mappedValues = new Map<string, { value: string | boolean; option?: FormFieldOption; confidence: number }>();
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
        value = tailoredResumePath || 'resume.pdf';
        category = 'documents';
        break;
      case 'cover_letter':
        value = coverLetterText || answers['cover_letter'] || '';
        category = 'documents';
        break;
      case 'current_company':
        value = currentCompany;
        category = 'contact';
        break;
      case 'work_authorization':
        value = answers['work_auth'] || answers['work_authorization'] || 'Authorized';
        category = 'screening';
        break;
      case 'visa_sponsorship':
        value = answers['visa_sponsorship'] || 'No';
        category = 'screening';
        break;
      case 'notice_period':
        value = answers['notice_period'] || '2 weeks';
        category = 'screening';
        break;
      case 'salary':
        value = answers['salary'] || 'Negotiable';
        category = 'screening';
        break;
      case 'years_of_experience':
        value = answers['experience_years'] || '5+';
        category = 'screening';
        break;
      case 'eeo_gender':
      case 'eeo_race':
      case 'eeo_veteran':
      case 'eeo_disability':
        category = 'eeo';
        confidence = 1.0;
        if (field.options && field.options.length > 0) {
          const matched = matchOption(field.options, 'decline', true);
          if (matched) {
            selectedOption = matched;
            value = matched.value;
          }
        }
        if (!value) {
          value = 'I decline to self-identify';
        }
        break;
      default:
        // Check screening answer bank for partial text match
        for (const [qKey, aVal] of Object.entries(answers)) {
          if (field.label.toLowerCase().includes(qKey.toLowerCase()) || qKey.toLowerCase().includes(field.label.toLowerCase())) {
            value = aVal;
            confidence = 0.85;
            category = 'screening';
            break;
          }
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
        note: confidence < 0.8 ? 'Low confidence match - please verify' : undefined,
      });
    } else if (field.required) {
      missingRequiredFields.push(field.label);

      reviewChecklist.push({
        id: field.id,
        label: field.label,
        value: 'Missing required field',
        status: 'missing',
        category,
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
