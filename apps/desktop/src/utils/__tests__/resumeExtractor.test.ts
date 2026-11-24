import { describe, it, expect } from 'vitest';
import { extractProfileFromText } from '../resumeExtractor.js';

describe('Client-side Resume Extractor', () => {
  it('extracts real candidate profile from text cleanly', () => {
    const rawResume = `
      John Doe
      Senior Full-Stack Engineer
      San Francisco, CA | john.doe@example.com | +1 415-555-0199 | linkedin.com/in/johndoe | github.com/johndoe

      Summary:
      Passionate engineer with 7+ years of experience designing scalable distributed web platforms and real-time systems.

      Experience:
      Staff Engineer | TechCorp Inc
      2021 - Present
      Led migration of monolithic services to Go microservices.
      Improved pipeline deployment speeds by 60%.

      Education:
      Bachelor of Science in Computer Science | Stanford University

      Skills:
      TypeScript, React, Node.js, Go, PostgreSQL, Docker, Kubernetes, AWS, Git
    `;

    const { profile, rawText } = extractProfileFromText(rawResume, 'john_doe_resume.pdf');

    expect(profile.contact.fullName).toBe('John Doe');
    expect(profile.contact.email).toBe('john.doe@example.com');
    expect(profile.contact.phone).toBe('+1 415-555-0199');
    expect(profile.contact.location).toBe('San Francisco');
    expect(profile.contact.linkedinUrl).toBe('https://linkedin.com/in/johndoe');

    expect(profile.experiences.length).toBeGreaterThanOrEqual(1);
    expect(profile.experiences[0].company).toBe('TechCorp Inc');

    expect(profile.education.length).toBeGreaterThanOrEqual(1);

    const skillNames = profile.skills.map((s) => s.name);
    expect(skillNames).toContain('TypeScript');
    expect(skillNames).toContain('React');
    expect(skillNames).toContain('Go');
    expect(skillNames).toContain('Docker');

    expect(rawText).toBe(rawResume);
  });
});
