export type RoleFamily =
  | 'engineering'
  | 'design'
  | 'data'
  | 'product'
  | 'finance'
  | 'health'
  | 'sales'
  | 'operations'
  | 'education'
  | 'ngo_programme'
  | 'hr'
  | 'legal'
  | 'marketing'
  | 'other';

const FAMILY_RULES: Array<{ family: RoleFamily; pattern: RegExp }> = [
  {
    family: 'health',
    pattern:
      /\b(registered nurse|nurse|nursing|physician|doctor|medical|clinical|pharmacist|therapist|surgeon|healthcare|dentist|midwife)\b/i,
  },
  {
    family: 'finance',
    pattern:
      /\b(accountant|accounting|bookkeeper|auditor|financial analyst|finance|controller|treasurer|payroll|tax specialist|cpa|cfo)\b/i,
  },
  {
    family: 'sales',
    pattern:
      /\b(sales development|sdr|bdr|account executive|sales manager|sales representative|business development|inside sales|revenue)\b/i,
  },
  {
    family: 'education',
    pattern:
      /\b(teacher|lecturer|professor|instructor|tutor|curriculum|academic|principal|dean|educator)\b/i,
  },
  {
    family: 'ngo_programme',
    pattern:
      /\b(programme officer|program officer|program coordinator|programme coordinator|ngo|humanitarian|grant manager|m&e officer|monitoring and evaluation|field coordinator)\b/i,
  },
  {
    family: 'legal',
    pattern: /\b(lawyer|attorney|legal counsel|paralegal|compliance officer|solicitor)\b/i,
  },
  {
    family: 'hr',
    pattern: /\b(recruiter|talent acquisition|human resources|hr manager|people partner|people ops)\b/i,
  },
  {
    family: 'marketing',
    pattern: /\b(marketing|seo|sem|growth marketer|content strategist|brand manager|copywriter|social media)\b/i,
  },
  {
    family: 'design',
    pattern: /\b(designer|ui\/ux|ux|ui designer|product design|graphic design|visual design|figma)\b/i,
  },
  {
    family: 'data',
    pattern: /\b(data scientist|data analyst|data engineer|machine learning|ml engineer|ai engineer|analytics|bi analyst)\b/i,
  },
  {
    family: 'product',
    pattern: /\b(product manager|product owner|technical product|scrum master|agile coach)\b/i,
  },
  {
    family: 'operations',
    pattern: /\b(operations manager|supply chain|logistics|procurement|warehouse|fleet|facilities)\b/i,
  },
  {
    family: 'engineering',
    pattern:
      /\b(software|frontend|front-end|backend|back-end|full[- ]?stack|developer|engineer|devops|sre|qa|test automation|architect|programmer|mobile|ios|android|web)\b/i,
  },
];

export function classifyRoleFamily(title: string): RoleFamily {
  if (!title) return 'other';
  for (const rule of FAMILY_RULES) {
    if (rule.pattern.test(title)) {
      return rule.family;
    }
  }
  return 'other';
}

export function isRoleFamilyCompatible(
  targetTitles: string[] | undefined,
  jobTitle: string
): { compatible: boolean; profileFamilies: RoleFamily[]; jobFamily: RoleFamily } {
  const jobFamily = classifyRoleFamily(jobTitle);
  const profileFamilies = Array.from(
    new Set(
      (targetTitles || [])
        .map((t) => classifyRoleFamily(t))
        .filter((f) => f !== 'other')
    )
  );

  if (profileFamilies.length === 0 || jobFamily === 'other') {
    return { compatible: true, profileFamilies, jobFamily };
  }

  return {
    compatible: profileFamilies.includes(jobFamily),
    profileFamilies,
    jobFamily,
  };
}
