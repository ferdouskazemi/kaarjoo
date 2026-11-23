/**
 * Bilingual section heading dictionaries and segmentation patterns.
 */

export type SectionType =
  | 'contact'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'certifications'
  | 'projects'
  | 'unknown';

export interface SectionDefinition {
  type: SectionType;
  persianPatterns: RegExp[];
  englishPatterns: RegExp[];
}

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    type: 'contact',
    persianPatterns: [
      /اطلاعات\s*تماس/i,
      /راه[‌\s]*های\s*ارتباطی/i,
      /تماس\s*با\s*من/i,
      /مشخصات\s*فردی/i,
    ],
    englishPatterns: [
      /^contact(\s*info(rmation)?)?$/i,
      /^personal\s*(info|details)$/i,
      /^get\s*in\s*touch$/i,
    ],
  },
  {
    type: 'summary',
    persianPatterns: [
      /درباره[‌\s]*من/i,
      /خلاصه\s*(سوابق|حرفه[‌\s]*ای|رزومه)?/i,
      /پروفایل\s*(حرفه[‌\s]*ای)?/i,
      /معرفی/i,
    ],
    englishPatterns: [
      /^(professional\s*)?summary$/i,
      /^(career\s*)?objective$/i,
      /^about\s*me$/i,
      /^profile$/i,
      /^overview$/i,
    ],
  },
  {
    type: 'experience',
    persianPatterns: [
      /سوابق\s*(شغلی|کاری|حرفه[‌\s]*ای)/i,
      /تجرب(ه|یات)\s*(کاری|شغلی)?/i,
      /سابقه\s*کار/i,
      /پیشینه\s*شغلی/i,
    ],
    englishPatterns: [
      /^(work|professional|employment)\s*experience$/i,
      /^experience$/i,
      /^work\s*history$/i,
      /^employment\s*history$/i,
    ],
  },
  {
    type: 'education',
    persianPatterns: [
      /تحصیلات/i,
      /سوابق\s*تحصیلی/i,
      /آموزش/i,
      /مدارک\s*تحصیلی/i,
    ],
    englishPatterns: [
      /^education(al\s*background)?$/i,
      /^academic\s*(background|history|credentials)$/i,
    ],
  },
  {
    type: 'skills',
    persianPatterns: [
      /مهارت[‌\s]*ها/i,
      /توانمندی[‌\s]*ها/i,
      /مهارت[‌\s]*های\s*فنی/i,
      /تخصص[‌\s]*ها/i,
    ],
    englishPatterns: [
      /^skills(\s*(&|and)\s*expertise)?$/i,
      /^technical\s*skills$/i,
      /^core\s*competencies$/i,
      /^technologies$/i,
    ],
  },
  {
    type: 'languages',
    persianPatterns: [
      /زبان[‌\s]*ها/i,
      /تسلط\s*به\s*زبان/i,
      /زبان[‌\s]*های\s*خارجی/i,
    ],
    englishPatterns: [
      /^languages$/i,
      /^language\s*proficiency$/i,
    ],
  },
  {
    type: 'certifications',
    persianPatterns: [
      /گواهینامه[‌\s]*ها/i,
      /دوره[‌\s]*ها/i,
      /مدارک\s*(بین[‌\s]*المللی)?/i,
      /افتخارات\s*و\s*جوایز/i,
    ],
    englishPatterns: [
      /^certifications?(\s*(&|and)\s*licenses)?$/i,
      /^certificates?$/i,
      /^courses$/i,
      /^awards(\s*(&|and)\s*honors)?$/i,
    ],
  },
  {
    type: 'projects',
    persianPatterns: [
      /پروژه[‌\s]*ها/i,
      /نمونه\s*کارها/i,
      /سوابق\s*پروژه/i,
    ],
    englishPatterns: [
      /^projects$/i,
      /^key\s*projects$/i,
      /^portfolio$/i,
    ],
  },
];

export function detectSectionType(heading: string): SectionType {
  const trimmed = heading.trim();
  for (const def of SECTION_DEFINITIONS) {
    for (const pattern of def.persianPatterns) {
      if (pattern.test(trimmed)) return def.type;
    }
    for (const pattern of def.englishPatterns) {
      if (pattern.test(trimmed)) return def.type;
    }
  }
  return 'unknown';
}
