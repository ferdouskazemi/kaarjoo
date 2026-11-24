import { describe, it, expect } from 'vitest';
import { matchOption, identifyCanonicalField } from '../matcher.js';
import { FormField } from '@kaarjoo/shared';

describe('ATS Option and Canonical Field Matcher', () => {
  it('matches exact options in dropdowns', () => {
    const options = [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
    ];
    const match = matchOption(options, 'yes');
    expect(match?.value).toBe('yes');
  });

  it('handles boolean variations (بله / خیر / True / False)', () => {
    const options = [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' },
    ];
    expect(matchOption(options, 'بله')?.value).toBe('true');
    expect(matchOption(options, 'خیر')?.value).toBe('false');
  });

  it('strictly selects Decline / Prefer not to say for EEO demographic questions', () => {
    const genderOptions = [
      { label: 'Male', value: 'm' },
      { label: 'Female', value: 'f' },
      { label: 'Non-binary', value: 'nb' },
      { label: 'I decline to self-identify', value: 'decline' },
    ];
    const match = matchOption(genderOptions, 'anything', true);
    expect(match?.value).toBe('decline');
  });

  it('identifies canonical fields accurately', () => {
    const testCases: Array<{ field: Partial<FormField>; expected: string }> = [
      { field: { label: 'First Name *', name: 'first_name', id: 'fn', type: 'text', required: true, selector: '#fn' }, expected: 'first_name' },
      { field: { label: 'Family Name', name: 'last_name', id: 'ln', type: 'text', required: true, selector: '#ln' }, expected: 'last_name' },
      { field: { label: 'Email Address', name: 'email', id: 'email', type: 'email', required: true, selector: '#email' }, expected: 'email' },
      { field: { label: 'Phone Number', name: 'phone', id: 'tel', type: 'tel', required: true, selector: '#tel' }, expected: 'phone' },
      { field: { label: 'Resume / CV', name: 'resume', id: 'resume_file', type: 'file', required: true, selector: '#resume_file' }, expected: 'resume' },
      { field: { label: 'Cover Letter', name: 'cover_letter', id: 'cl', type: 'textarea', required: false, selector: '#cl' }, expected: 'cover_letter' },
      { field: { label: 'LinkedIn Profile', name: 'urls[LinkedIn]', id: 'li', type: 'url', required: false, selector: '#li' }, expected: 'linkedin' },
      { field: { label: 'GitHub Profile', name: 'urls[GitHub]', id: 'gh', type: 'url', required: false, selector: '#gh' }, expected: 'github' },
      { field: { label: 'Are you authorized to work in the US?', name: 'work_auth', id: 'wa', type: 'select', required: true, selector: '#wa' }, expected: 'work_authorization' },
    ];

    for (const tc of testCases) {
      const canonical = identifyCanonicalField(tc.field as FormField);
      expect(canonical).toBe(tc.expected);
    }
  });
});
