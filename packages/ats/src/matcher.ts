import { FormField, FormFieldOption } from '@kaarjoo/shared';

/**
 * Normalizes text for robust comparison (lowercased, stripped punctuation, normalized whitespace).
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matches a target string against a list of options (select dropdown or radio group).
 * Never returns arbitrary text; only returns one of the valid available options.
 */
export function matchOption(
  options: FormFieldOption[],
  target: string,
  isEeo: boolean = false
): FormFieldOption | null {
  if (!options || options.length === 0) return null;

  // Filter out placeholder options like "Select an option", "Please select", "--", ""
  const validOptions = options.filter((opt) => {
    const norm = normalizeText(opt.label);
    return norm.length > 0 && norm !== 'select' && norm !== 'please select' && norm !== 'choose' && opt.value !== '';
  });

  if (validOptions.length === 0) {
    return options[0] || null;
  }

  // If EEO / demographic question, strictly seek decline / prefer not to say option
  if (isEeo) {
    const declinePatterns = [
      'decline',
      'prefer not to say',
      'prefer not to disclose',
      'prefer not to answer',
      'choose not to disclose',
      'do not wish',
      'not specified',
      'i decline',
      'no answer',
    ];
    for (const pattern of declinePatterns) {
      const found = validOptions.find((opt) => normalizeText(opt.label).includes(pattern));
      if (found) return found;
    }
  }

  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) return null;

  // 1. Exact match on normalized label
  for (const opt of validOptions) {
    if (normalizeText(opt.label) === normalizedTarget) {
      return opt;
    }
  }

  // 2. Exact match on value
  for (const opt of validOptions) {
    if (normalizeText(opt.value) === normalizedTarget) {
      return opt;
    }
  }

  // 3. Boolean / Yes-No matching
  const isTargetYes = /^(yes|y|true|بله|آره)$/i.test(normalizedTarget);
  const isTargetNo = /^(no|n|false|خیر|نه)$/i.test(normalizedTarget);

  if (isTargetYes) {
    const yesOpt = validOptions.find((opt) => /^(yes|y|true|بله)$/i.test(normalizeText(opt.label)));
    if (yesOpt) return yesOpt;
  }
  if (isTargetNo) {
    const noOpt = validOptions.find((opt) => /^(no|n|false|خیر)$/i.test(normalizeText(opt.label)));
    if (noOpt) return noOpt;
  }

  // 4. Substring containment
  for (const opt of validOptions) {
    const normLabel = normalizeText(opt.label);
    if (normLabel.includes(normalizedTarget) || normalizedTarget.includes(normLabel)) {
      return opt;
    }
  }

  // 5. Word overlap / Jaccard similarity
  const targetWords = new Set(normalizedTarget.split(' '));
  let bestScore = 0;
  let bestOpt: FormFieldOption | null = null;

  for (const opt of validOptions) {
    const labelWords = new Set(normalizeText(opt.label).split(' '));
    const intersection = [...targetWords].filter((w) => labelWords.has(w)).length;
    const union = new Set([...targetWords, ...labelWords]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    if (jaccard > bestScore && jaccard >= 0.3) {
      bestScore = jaccard;
      bestOpt = opt;
    }
  }

  return bestOpt;
}

/**
 * Identifies the canonical field name for a detected form field
 * using heuristics on label, name, id, placeholder, and aria labels.
 */
export function identifyCanonicalField(field: FormField): string | undefined {
  const combined = normalizeText(
    `${field.label} ${field.name} ${field.id} ${field.placeholder || ''}`
  );

  // File fields
  if (field.type === 'file') {
    if (/(resume|cv|curriculum)/i.test(combined)) return 'resume';
    if (/(cover.*letter|letter|motivation)/i.test(combined)) return 'cover_letter';
    return 'resume'; // default file upload on job boards is resume
  }

  // EEO Demographics
  if (/(gender|sex|identify your gender)/i.test(combined)) return 'eeo_gender';
  if (/(race|ethnicity|ethnic|hispanic|latino)/i.test(combined)) return 'eeo_race';
  if (/(veteran|military|protected veteran)/i.test(combined)) return 'eeo_veteran';
  if (/(disability|handicap|physical.*impairment)/i.test(combined)) return 'eeo_disability';

  // Contact details
  if (/(first.*name|given.*name|fname)/i.test(combined) && !/company|employer/i.test(combined)) {
    return 'first_name';
  }
  if (/(last.*name|family.*name|surname|lname)/i.test(combined)) {
    return 'last_name';
  }
  if (/(full.*name|^name$|your.*name|applicant.*name|candidate.*name)/i.test(combined) && !/company|school|manager/i.test(combined)) {
    return 'full_name';
  }
  if (/(email|e-mail)/i.test(combined)) {
    return 'email';
  }
  if (/(phone|mobile|telephone|cell|tel)/i.test(combined)) {
    return 'phone';
  }
  if (/(city|location|address|where are you located|current.*location|residence)/i.test(combined)) {
    return 'location';
  }

  // Web links
  if (/linkedin/i.test(combined)) return 'linkedin';
  if (/github/i.test(combined)) return 'github';
  if (/(portfolio|personal.*site|website|blog|url)/i.test(combined) && !/linkedin|github/i.test(combined)) {
    return 'portfolio';
  }

  // Company / Employment
  if (/(current.*company|current.*employer|organization|current.*org)/i.test(combined)) {
    return 'current_company';
  }

  // Screening questions
  if (/(authorized.*work|work.*authorization|legally.*authorized|right.*to.*work)/i.test(combined)) {
    return 'work_authorization';
  }
  if (/(visa.*sponsorship|require.*sponsorship|sponsorship.*now.*future)/i.test(combined)) {
    return 'visa_sponsorship';
  }
  if (/(notice.*period|how.*soon.*start|start.*date|availability)/i.test(combined)) {
    return 'notice_period';
  }
  if (/(salary|compensation|desired.*pay|expected.*salary|rate)/i.test(combined)) {
    return 'salary';
  }
  if (/(years.*experience|how.*many.*years)/i.test(combined)) {
    return 'years_of_experience';
  }

  // Cover letter text
  if (/(cover.*letter|comments|additional.*information|note.*to.*hiring)/i.test(combined)) {
    return 'cover_letter';
  }

  return undefined;
}
