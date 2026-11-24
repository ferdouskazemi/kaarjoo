import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { UserProfile } from '@kaarjoo/shared';
import { detectFieldsFromHtml } from '../detector.js';
import { mapFields } from '../mapper.js';

describe('ATS Profile and Answer Mapper', () => {
  const fixturesDir = path.resolve(__dirname, '../../fixtures');

  const mockProfile: UserProfile = {
    id: 'usr_test_123',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contact: {
      fullName: 'Ahmad Karimi',
      email: 'ahmad.karimi@example.com',
      phone: '+1 555-0199',
      location: 'San Francisco, CA',
      linkedinUrl: 'https://linkedin.com/in/ahmadkarimi',
      githubUrl: 'https://github.com/ahmadkarimi',
      portfolioUrl: 'https://ahmadkarimi.dev',
    },
    experiences: [
      {
        id: 'exp_1',
        title: 'Senior Software Engineer',
        company: 'Stripe',
        startDate: '2022-01',
        isCurrent: true,
        achievements: [],
        skillsUsed: ['TypeScript', 'Node.js'],
      },
    ],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    targetTitles: ['Senior Software Engineer'],
    workAuthorization: ['US'],
  };

  it('maps profile into Greenhouse fields with EEO decline and screening answers', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'greenhouse_mock.html'), 'utf-8');
    const fields = detectFieldsFromHtml(html);

    const mapping = mapFields(fields, {
      profile: mockProfile,
      tailoredResumePath: path.join(fixturesDir, 'test_resume.pdf'),
      coverLetterText: 'I am excited to apply for this engineering role at your company.',
      answers: {
        work_auth: 'Yes',
      },
    });

    expect(mapping.missingRequiredFields.length).toBe(0);

    const firstField = mapping.filledFields.find((f) => f.canonicalField === 'first_name');
    expect(firstField?.value).toBe('Ahmad');

    const lastField = mapping.filledFields.find((f) => f.canonicalField === 'last_name');
    expect(lastField?.value).toBe('Karimi');

    const emailField = mapping.filledFields.find((f) => f.canonicalField === 'email');
    expect(emailField?.value).toBe('ahmad.karimi@example.com');

    const eeoField = mapping.filledFields.find((f) => f.canonicalField === 'eeo_gender');
    expect(eeoField?.displayValue).toContain('decline');

    expect(mapping.reviewChecklist.length).toBeGreaterThanOrEqual(8);
  });

  it('flags missing required fields if candidate info is absent', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'greenhouse_mock.html'), 'utf-8');
    const fields = detectFieldsFromHtml(html);

    const incompleteProfile: UserProfile = {
      ...mockProfile,
      contact: {
        fullName: 'Unknown',
        email: 'test@example.com',
        // missing phone number
      },
    };

    const mapping = mapFields(fields, {
      profile: incompleteProfile,
    });

    expect(mapping.missingRequiredFields).toContain('Phone');
    const phoneChecklist = mapping.reviewChecklist.find((i) => i.id === 'phone');
    expect(phoneChecklist?.status).toBe('missing');
  });
});
