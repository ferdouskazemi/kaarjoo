import * as chrono from 'chrono-node';
import { ExperienceItem } from '@kaarjoo/shared';
import { normalizeDigits } from '../normalizer.js';

const JALALI_RANGE_REGEX =
  /(13[7-9]\d|14[0-1]\d)\s*(?:تا|-|به\s*مدت|to)\s*(13[7-9]\d|14[0-1]\d|اکنون|حال|present|current)/i;
const GREGORIAN_RANGE_REGEX =
  /(19[7-9]\d|20[0-3]\d)(?:[-/.](?:0?[1-9]|1[0-2]))?\s*(?:to|-|until|through|–|—)\s*(19[7-9]\d|20[0-3]\d|present|current|now)(?:[-/.](?:0?[1-9]|1[0-2]))?/i;

const ROLE_HINT_REGEX =
  /\b(developer|engineer|designer|architect|manager|lead|director|analyst|consultant|specialist|intern|coordinator|administrator|programmer|scientist|frontend|front-end|backend|back-end|full-stack|fullstack|devops|qa|tester|مطور|مهندس|توسعه‌دهنده|طراح|مدیر)\b/i;

function parseDateSpan(line: string, normalizedLine: string) {
  const jalaliMatch = normalizedLine.match(JALALI_RANGE_REGEX);
  const gregMatch = normalizedLine.match(GREGORIAN_RANGE_REGEX);
  const parsedChronoDates = chrono.parse(line);
  const isDateLine = jalaliMatch !== null || gregMatch !== null || parsedChronoDates.length > 0;

  let startDate: string | undefined;
  let endDate: string | undefined;
  let isCurrent = false;

  if (jalaliMatch) {
    startDate = jalaliMatch[1];
    const endPart = jalaliMatch[2].toLowerCase();
    if (
      endPart.includes('اکنون') ||
      endPart.includes('حال') ||
      endPart.includes('present') ||
      endPart.includes('current')
    ) {
      isCurrent = true;
    } else {
      endDate = endPart;
    }
  } else if (gregMatch) {
    startDate = gregMatch[1];
    const endPart = gregMatch[2].toLowerCase();
    if (endPart.includes('present') || endPart.includes('current') || endPart.includes('now')) {
      isCurrent = true;
    } else {
      endDate = endPart;
    }
  } else if (parsedChronoDates.length > 0) {
    const first = parsedChronoDates[0];
    startDate = first.start.date().toISOString().slice(0, 7);
    if (first.end) {
      endDate = first.end.date().toISOString().slice(0, 7);
    } else if (/\b(present|current|now)\b/i.test(line)) {
      isCurrent = true;
    }
  }

  return { isDateLine, startDate, endDate, isCurrent };
}

function stripDates(line: string): string {
  return line
    .replace(/\([^)]*(?:19|20|13|14)\d{2}[^)]*\)/g, '')
    .replace(JALALI_RANGE_REGEX, '')
    .replace(GREGORIAN_RANGE_REGEX, '')
    .replace(/^[-–—|•·,\s]+|[-–—|•·,\s]+$/g, '')
    .trim();
}

function splitInlineTitleAndCompany(text: string): { title?: string; company?: string; location?: string } {
  // Handle "Title at Company" or "Title | Company" or "Title — Company"
  const atMatch = text.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (atMatch) {
    return { title: atMatch[1].trim(), company: atMatch[2].trim() };
  }
  const sepMatch = text.match(/^(.+?)\s*[|—–]\s*(.+)$/);
  if (sepMatch) {
    const left = sepMatch[1].trim();
    const right = sepMatch[2].trim();
    if (ROLE_HINT_REGEX.test(right) && !ROLE_HINT_REGEX.test(left)) {
      return { company: left, title: right };
    }
    return { title: left, company: right };
  }
  return { title: text || undefined };
}

export function extractExperiences(sectionText: string): ExperienceItem[] {
  if (!sectionText.trim()) return [];

  const lines = sectionText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const experiences: ExperienceItem[] = [];

  let currentItem: Partial<ExperienceItem> | null = null;
  let currentBullets: string[] = [];
  let pendingHeaderLine: string | null = null;

  const flushCurrent = () => {
    if (currentItem && (currentItem.title || currentItem.company)) {
      experiences.push({
        id: `exp_${Date.now()}_${experiences.length}`,
        title: currentItem.title ?? null,
        company: currentItem.company ?? null,
        location: currentItem.location ?? null,
        startDate: currentItem.startDate ?? null,
        endDate: currentItem.endDate ?? null,
        isCurrent: currentItem.isCurrent ?? false,
        achievements: currentBullets,
        skillsUsed: [],
      });
    }
    currentItem = null;
    currentBullets = [];
    pendingHeaderLine = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = normalizeDigits(line);
    const isBullet = /^[-*•·–—]\s*/.test(line) || /^\d+[.)]\s*/.test(line);
    const { isDateLine, startDate, endDate, isCurrent } = parseDateSpan(line, normalizedLine);

    if (isDateLine && !isBullet) {
      const cleaned = stripDates(line) || pendingHeaderLine || '';
      pendingHeaderLine = null;

      // Two-line company-first header:
      // e.g. "INOLITIX, CA, United States • 2022 – Present"
      // followed by "Part-time Front-End Developer • UI & UX WordPress Designer (Aug 2022 – Current)"
      if (
        currentItem &&
        currentItem.company &&
        !currentItem.title &&
        cleaned &&
        ROLE_HINT_REGEX.test(cleaned)
      ) {
        currentItem.title = cleaned;
        currentItem.startDate = startDate ?? currentItem.startDate;
        currentItem.endDate = endDate ?? currentItem.endDate;
        currentItem.isCurrent = isCurrent || currentItem.isCurrent;
        continue;
      }

      flushCurrent();

      const looksLikeCompanyLocationHeader =
        Boolean(cleaned) &&
        cleaned.includes(',') &&
        !ROLE_HINT_REGEX.test(cleaned);

      if (looksLikeCompanyLocationHeader) {
        const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
        currentItem = {
          company: parts[0],
          location: parts.slice(1).join(', ') || undefined,
          startDate,
          endDate,
          isCurrent,
        };
      } else {
        const split = splitInlineTitleAndCompany(cleaned);
        currentItem = {
          title: split.title,
          company: split.company,
          location: split.location,
          startDate,
          endDate,
          isCurrent,
        };
      }
    } else if (isBullet && currentItem) {
      const cleanBullet = line.replace(/^[-*•·–—\d.)]+\s*/, '').trim();
      if (cleanBullet) {
        currentBullets.push(cleanBullet);
      }
    } else if (currentItem && !currentItem.title && !isBullet) {
      currentItem.title = line;
    } else if (currentItem && !currentItem.company && !isBullet) {
      currentItem.company = line;
    } else if (!currentItem && !isBullet) {
      pendingHeaderLine = line;
    }
  }

  flushCurrent();
  return experiences;
}
