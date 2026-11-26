import { EducationItem } from '@kaarjoo/shared';
import { normalizeDigits } from '../normalizer.js';

const DEGREE_PATTERNS = [
  { level: 'phd', regex: /(ph\.?d|دکترا?|دکتری)/i },
  { level: 'master', regex: /(master|m\.?s|m\.?a|m\.?sc|کارشناسی\s*ارشد|فوق\s*لیسانس)/i },
  { level: 'bachelor', regex: /(bachelor|b\.?s|b\.?a|b\.?sc|کارشناسی|لیسانس)/i },
  { level: 'associate', regex: /(associate|فوق\s*دیپلم|کاردانی)/i },
  { level: 'high_school', regex: /(high\s*school|دیپلم)/i },
];

const JALALI_RANGE_REGEX = /(13[7-9]\d|14[0-1]\d)\s*(?:تا|-|to)\s*(13[7-9]\d|14[0-1]\d|تاکنون|اکنون|حال|present|current)/i;
const GREGORIAN_RANGE_REGEX = /(19[7-9]\d|20[0-3]\d)\s*(?:to|-|–|—)\s*(19[7-9]\d|20[0-3]\d|present|current|now)/i;

export function extractEducation(sectionText: string): EducationItem[] {
  if (!sectionText.trim()) return [];

  const lines = sectionText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: EducationItem[] = [];

  let currentItem: Partial<EducationItem> | null = null;

  for (const line of lines) {
    const normalizedLine = normalizeDigits(line);

    // Detect degree
    let detectedDegree: string | undefined;
    for (const deg of DEGREE_PATTERNS) {
      if (deg.regex.test(line)) {
        detectedDegree = deg.level;
        break;
      }
    }

    // Detect dates
    const jalaliMatch = normalizedLine.match(JALALI_RANGE_REGEX);
    const gregMatch = normalizedLine.match(GREGORIAN_RANGE_REGEX);

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (jalaliMatch) {
      startDate = jalaliMatch[1];
      endDate = jalaliMatch[2];
    } else if (gregMatch) {
      startDate = gregMatch[1];
      endDate = gregMatch[2];
    }

    const hasDates = startDate !== undefined;
    const hasDegree = detectedDegree !== undefined;
    const hasInstitutionKeyword = /دانشگاه|university|college|institute|موسسه|مکتب/i.test(line);

    if (hasDegree || hasInstitutionKeyword) {
      // If we already had an item, save it
      if (currentItem && (currentItem.institution || currentItem.degree)) {
        items.push({
          id: `edu_${Date.now()}_${items.length}`,
          institution: currentItem.institution || '',
          degree: currentItem.degree || '',
          fieldOfStudy: currentItem.fieldOfStudy,
          startDate: currentItem.startDate,
          endDate: currentItem.endDate,
        });
      }

      // Extract institution
      let institution = '';
      const parts = line.split(/[-–—|]/).map((p) => p.trim());
      for (const part of parts) {
        if (/دانشگاه|university|college|institute|موسسه|مکتب/i.test(part)) {
          institution = part;
          break;
        }
      }

      // Extract field of study
      let fieldOfStudy: string | undefined;
      for (const part of parts) {
        if (part !== institution && !JALALI_RANGE_REGEX.test(part) && !GREGORIAN_RANGE_REGEX.test(part)) {
          fieldOfStudy = part;
          break;
        }
      }

      currentItem = {
        institution,
        degree: detectedDegree || '',
        fieldOfStudy,
        startDate,
        endDate,
      };
    } else if (hasDates && currentItem) {
      currentItem.startDate = startDate;
      currentItem.endDate = endDate;
    }
  }

  // Push final item
  if (currentItem && (currentItem.institution || currentItem.degree)) {
    items.push({
      id: `edu_${Date.now()}_${items.length}`,
      institution: currentItem.institution || '',
      degree: currentItem.degree || '',
      fieldOfStudy: currentItem.fieldOfStudy,
      startDate: currentItem.startDate,
      endDate: currentItem.endDate,
    });
  }

  return items;
}
