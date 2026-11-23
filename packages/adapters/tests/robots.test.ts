import { describe, expect, it } from 'vitest';
import { RobotsChecker } from '../src/network/robots.js';

describe('Robots.txt Parser & Checker', () => {
  const robotsTxt = `
# Polite crawler test robots.txt
User-agent: Googlebot
Disallow: /admin/

User-agent: *
Disallow: /private/
Disallow: /apply/direct/
Allow: /apply/direct/public/
Allow: /jobs/
Disallow: /api/internal/
`;

  it('correctly parses rules for wildcard user-agent', () => {
    const checker = new RobotsChecker();
    const rules = checker.parse(robotsTxt, 'Kaarjoo');

    expect(rules.length).toBeGreaterThan(0);
    // Path /jobs/ should be allowed
    expect(checker.isAllowed('/jobs/frontend-engineer', rules)).toBe(true);
    // Path /private/ should be disallowed
    expect(checker.isAllowed('/private/cv.pdf', rules)).toBe(false);
    // Specific allow override: /apply/direct/public/ vs /apply/direct/
    expect(checker.isAllowed('/apply/direct/public/123', rules)).toBe(true);
    expect(checker.isAllowed('/apply/direct/hidden/123', rules)).toBe(false);
  });

  it('allows all paths if Disallow is empty', () => {
    const emptyDisallow = `
User-agent: *
Disallow:
`;
    const checker = new RobotsChecker();
    const rules = checker.parse(emptyDisallow);
    expect(checker.isAllowed('/any/path', rules)).toBe(true);
  });
});
