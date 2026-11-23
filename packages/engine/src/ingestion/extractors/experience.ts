import * as chrono from 'chrono-node';
import { ExperienceItem } from '@kaarjoo/shared';
import { normalizeDigits } from '../normalizer.js';

const JALALI_RANGE_REGEX = /(13[7-9]\d|14[0-1]\d)\s*(?:تا|-|به\s*مدت|to)\s*(13[7-9]\d|14[0-1]\d|اکنون|حال|present|current)/i;
const GREGORIAN_RANGE_REGEX = /(19[7-9]\d|20[0-3]\d)(?:[-/.](?:0?[1-9]|1[0-2]))?\s*(?:to|-|until|through|–|—)\s*(19[7-9]\d|20[0-3]\d|present|current|now)(?:[-/.](?:0?[1-9]|1[0-2]))?/i;

export function extractExperiences(sectionText: string): ExperienceItem[] {
  if (!sectionText.trim()) return [];

  const lines = sectionText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const experiences: ExperienceItem[] = [];

  let currentItem: Partial<ExperienceItem> | null = null;
  let currentBullets: string[] = [];

  for (const line of lines) {
    const normalizedLine = normalizeDigits(line);

    // Check for Jalali or Gregorian date range in line
    const jalaliMatch = normalizedLine.match(JALALI_RANGE_REGEX);
    const gregMatch = normalizedLine.match(GREGORIAN_RANGE_REGEX);
    const parsedChronoDates = chrono.parse(line);

    const isDateLine = jalaliMatch !== null || gregMatch !== null || parsedChronoDates.length > 0;

    // Check if line looks like a bullet achievement
    const isBullet = /^[-*•·–—]\s*/.test(line) || /^\d+[.)]\s*/.test(line);

    if (isDateLine && !isBullet) {
      // Save previous if any
      if (currentItem && currentItem.title) {
        experiences.push({
          id: `exp_${Date.now()}_${experiences.length}`,
          title: currentItem.title || 'Role',
          company: currentItem.company || 'Organization',
          startDate: currentItem.startDate || '2020',
          endDate: currentItem.endDate,
          isCurrent: currentItem.isCurrent ?? false,
          achievements: currentBullets,
          skillsUsed: [],
        });
        currentBullets = [];
      }

      // Parse dates
      let startDate = '2020';
      let endDate: string | undefined;
      let isCurrent = false;

      if (jalaliMatch) {
        startDate = jalaliMatch[1];
        const endPart = jalaliMatch[2].toLowerCase();
        if (endPart.includes('اکنون') || endPart.includes('حال') || endPart.includes('present') || endPart.includes('current')) {
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
        } else if (line.toLowerCase().includes('present') || line.toLowerCase().includes('current')) {
          isCurrent = true;
        }
      }

      const titleCandidate = line
        .replace(JALALI_RANGE_REGEX, '')
        .replace(GREGORIAN_RANGE_REGEX, '')
        .replace(/[-–—|]/g, ' ')
        .trim();

      currentItem = {
        title: titleCandidate || 'Software Engineer',
        company: 'Company',
        startDate,
        endDate,
        isCurrent,
      };
    } else if (isBullet && currentItem) {
      const cleanBullet = line.replace(/^[-*•·–—\d.)]+\s*/, '').trim();
      if (cleanBullet) {
        currentBullets.push(cleanBullet);
      }
    } else if (currentItem && !currentItem.company && !isBullet) {
      currentItem.company = line;
    }
  }

  // Push final item
  if (currentItem && currentItem.title) {
    experiences.push({
      id: `exp_${Date.now()}_${experiences.length}`,
      title: currentItem.title || 'Role',
      company: currentItem.company || 'Organization',
      startDate: currentItem.startDate || '2020',
      endDate: currentItem.endDate,
      isCurrent: currentItem.isCurrent ?? false,
      achievements: currentBullets,
      skillsUsed: [],
    });
  }

  return experiences;
}
