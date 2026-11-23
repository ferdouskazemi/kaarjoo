import { describe, it, expect } from 'vitest';
import { mergeProfiles } from '../merger.js';
import { UserProfile } from '@kaarjoo/shared';

describe('Multi-File Profile Merger & Conflict Detection', () => {
  const profileA: UserProfile = {
    id: 'prof_a',
    version: 1,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    contact: {
      fullName: 'فردوس کاظمی',
      email: 'ferdous@example.com',
      phone: '+93 79 123 4567',
    },
    experiences: [
      {
        id: 'exp_1',
        title: 'توسعه‌دهنده فول‌استک',
        company: 'داده‌پردازان آریا',
        startDate: '1399',
        isCurrent: true,
        achievements: ['توسعه میکروسرویس‌ها'],
        skillsUsed: ['Node.js'],
      },
    ],
    education: [
      {
        id: 'edu_1',
        institution: 'دانشگاه کابل',
        degree: 'bachelor',
        startDate: '1392',
        endDate: '1396',
      },
    ],
    skills: [
      { id: 'sk_1', name: 'React', escoId: 'esco_react' },
      { id: 'sk_2', name: 'TypeScript', escoId: 'esco_ts' },
    ],
    languages: [],
    certifications: [],
    targetTitles: ['مهندس ارشد نرم‌افزار'],
    workAuthorization: [],
  };

  const profileB: UserProfile = {
    id: 'prof_b',
    version: 1,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    contact: {
      fullName: 'فردوس کاظمی',
      email: 'ferdous@example.com',
      phone: '+98 912 345 6789', // conflicting phone
      linkedinUrl: 'https://www.linkedin.com/in/ferdous-kazemi',
    },
    experiences: [
      {
        id: 'exp_2',
        title: 'توسعه‌دهنده ارشد فول‌استک', // richer title
        company: 'داده‌پردازان آریا',
        startDate: '1399',
        isCurrent: true,
        achievements: ['توسعه میکروسرویس‌ها', 'بهبود کارایی دیتابیس تا ۳ برابر'],
        skillsUsed: ['PostgreSQL'],
      },
    ],
    education: [],
    skills: [
      { id: 'sk_3', name: 'Node.js', escoId: 'esco_node' },
      { id: 'sk_4', name: 'Docker', escoId: 'esco_docker' },
    ],
    languages: [],
    certifications: [],
    targetTitles: [],
    workAuthorization: [],
  };

  it('merges profiles, aggregates skills, deduplicates experiences, and flags conflicts', () => {
    const result = mergeProfiles([profileA, profileB], ['Resume 2024.pdf', 'LinkedIn.pdf']);

    expect(result.mergedProfile).toBeDefined();

    // 1. Phone conflict detection
    expect(result.conflicts.length).toBe(1);
    const phoneConflict = result.conflicts[0];
    expect(phoneConflict.fieldPath).toBe('contact.phone');
    expect(phoneConflict.options.length).toBe(2);
    expect(phoneConflict.options[0].value).toBe('+93 79 123 4567');
    expect(phoneConflict.options[0].source).toBe('Resume 2024.pdf');
    expect(phoneConflict.options[1].value).toBe('+98 912 345 6789');
    expect(phoneConflict.options[1].source).toBe('LinkedIn.pdf');

    // 2. Non-conflicting contact field adopted
    expect(result.mergedProfile.contact.linkedinUrl).toBe('https://www.linkedin.com/in/ferdous-kazemi');

    // 3. Experiences deduplicated & achievements unioned
    expect(result.mergedProfile.experiences.length).toBe(1);
    const exp = result.mergedProfile.experiences[0];
    expect(exp.title).toBe('توسعه‌دهنده ارشد فول‌استک'); // kept richer title
    expect(exp.achievements.length).toBe(2);

    // 4. Skills unioned
    expect(result.mergedProfile.skills.length).toBe(4);
    const skillNames = result.mergedProfile.skills.map((s) => s.name);
    expect(skillNames).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Node.js', 'Docker']));
  });
});
