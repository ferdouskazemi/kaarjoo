import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractJobPostingJsonLd } from '../src/extractors/jsonld.js';
import { htmlToMarkdown } from '../src/extractors/markdown.js';

describe('Extractors', () => {
  describe('Schema.org JobPosting JSON-LD', () => {
    it('extracts all structured fields from HTML fixture', () => {
      const fixturePath = resolve(__dirname, 'fixtures/jobposting_jsonld.html');
      const html = readFileSync(fixturePath, 'utf-8');

      const extracted = extractJobPostingJsonLd(html);
      expect(extracted).not.toBeNull();
      expect(extracted?.title).toBe('Lead Site Reliability Engineer');
      expect(extracted?.company).toBe('CloudTech Solutions Inc');
      expect(extracted?.location).toContain('Austin');
      expect(extracted?.remoteType).toBe('remote');
      expect(extracted?.employmentType).toBe('full-time');
      expect(extracted?.salary?.min).toBe(175000);
      expect(extracted?.salary?.max).toBe(215000);
      expect(extracted?.salary?.currency).toBe('USD');
      expect(extracted?.descriptionMarkdown).toContain('Lead SRE');
      expect(extracted?.descriptionMarkdown).toContain('Kubernetes & Terraform');
    });
  });

  describe('HTML to Markdown', () => {
    it('cleans script tags and converts structure to clean Markdown', () => {
      const html = `
        <div class="job">
          <h2>Senior Engineer</h2>
          <script>alert("bad")</script>
          <p>We are looking for someone with:</p>
          <ul>
            <li>Strong <strong>TypeScript</strong> skills</li>
            <li>PostgreSQL experience</li>
          </ul>
        </div>
      `;
      const md = htmlToMarkdown(html);
      expect(md).toContain('## Senior Engineer');
      expect(md).not.toContain('<script>');
      expect(md).not.toContain('alert');
      expect(md).toContain('Strong **TypeScript** skills');
    });
  });
});
