import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { ContactInfo } from '@kaarjoo/shared';
import { normalizeDigits } from '../normalizer.js';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const LINKEDIN_REGEX = /https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i;
const GITHUB_REGEX = /https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+/i;

export interface RawTextPage {
  pageNumber: number;
  text: string;
}

export function extractContactInfo(pages: RawTextPage[]): ContactInfo | null {
  if (!pages.length) return null;

  const fullDocumentText = pages.map((p) => p.text).join('\n');
  const normalizedText = normalizeDigits(fullDocumentText);

  // 1. Extract Email
  const emailMatches = normalizedText.match(EMAIL_REGEX);
  const email = emailMatches ? emailMatches[0].toLowerCase() : '';

  if (!email) {
    // A valid profile requires at least an email or name
  }

  // 2. Extract Phone Number
  // Match potential phone number strings (digits with optional spaces, dashes, parentheses, plus)
  const phoneCandidates = normalizedText.match(/(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g) || [];
  let detectedPhone: string | undefined;

  for (const candidate of phoneCandidates) {
    const cleaned = candidate.trim();
    if (cleaned.length < 8) continue;
    
    // Try parsing with country defaults
    const countries: Array<'AF' | 'IR' | 'US' | 'GB'> = ['AF', 'IR', 'US', 'GB'];
    for (const country of countries) {
      try {
        const parsed = parsePhoneNumberFromString(cleaned, country);
        if (parsed && parsed.isValid()) {
          detectedPhone = parsed.formatInternational();
          break;
        }
      } catch {
        // ignore
      }
    }
    if (detectedPhone) break;
  }

  // 3. Extract Profile URLs
  const linkedinMatch = fullDocumentText.match(LINKEDIN_REGEX);
  const linkedinUrl = linkedinMatch ? linkedinMatch[0] : undefined;

  const githubMatch = fullDocumentText.match(GITHUB_REGEX);
  const githubUrl = githubMatch ? githubMatch[0] : undefined;

  // 4. Candidate Full Name from first page top lines
  const firstPageLines = pages[0].text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !EMAIL_REGEX.test(l) && !l.includes('http'));

  const candidateName = firstPageLines[0] || 'Unknown';

  return {
    fullName: candidateName,
    email: email || 'unknown@example.com',
    phone: detectedPhone,
    linkedinUrl,
    githubUrl,
  };
}
