import type { JobPosting, UserPreferences, UserProfile } from '@kaarjoo/shared';

export interface HardFilterResult {
  passed: boolean;
  score: number; // 0-100
  reasons: string[];
  redFlags: string[];
  passedFilters: string[];
}

/**
 * Calculates total years of experience from profile experiences.
 */
export function calculateTotalExperienceYears(profile: UserProfile): number {
  if (!profile.experiences || profile.experiences.length === 0) return 0;

  let totalMonths = 0;
  for (const exp of profile.experiences) {
    try {
      const start = exp.startDate ? new Date(exp.startDate).getTime() : Date.now();
      const end = exp.endDate ? new Date(exp.endDate).getTime() : Date.now();
      const months = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.4375)));
      totalMonths += months;
    } catch {
      totalMonths += 12; // Default fallback: 1 year per experience item
    }
  }

  return Math.round((totalMonths / 12) * 10) / 10;
}

/**
 * Estimates required seniority years from job title and description.
 */
export function estimateJobSeniorityYears(title: string, description: string): {
  level: string;
  minYears: number;
} {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('vp') || text.includes('vice president') || text.includes('head of')) {
    return { level: 'director', minYears: 10 };
  }
  if (text.includes('director') || text.includes('principal') || text.includes('fellow')) {
    return { level: 'principal', minYears: 8 };
  }
  if (text.includes('staff') || text.includes('lead') || text.includes('architect')) {
    return { level: 'staff', minYears: 7 };
  }
  if (text.includes('senior') || text.includes('sr.') || text.includes('sr ')) {
    return { level: 'senior', minYears: 5 };
  }
  if (text.includes('junior') || text.includes('jr.') || text.includes('intern') || text.includes('entry level')) {
    return { level: 'junior', minYears: 0 };
  }

  // Look for explicit "X+ years" regex
  const match = text.match(/(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/i);
  if (match && match[1]) {
    const yrs = parseInt(match[1], 10);
    return { level: yrs >= 7 ? 'staff' : yrs >= 5 ? 'senior' : yrs >= 2 ? 'mid' : 'junior', minYears: yrs };
  }

  return { level: 'mid', minYears: 2 };
}

/**
 * Runs deterministic hard filters on a job posting against user profile and preferences.
 */
export function evaluateHardFilters(
  profile: UserProfile,
  job: JobPosting,
  preferences?: UserPreferences
): HardFilterResult {
  const prefs = preferences || profile.preferences;
  const reasons: string[] = [];
  const redFlags: string[] = [];
  const passedFilters: string[] = [];
  let score = 100;

  // 1. Check Expiration
  if (job.expiresAt) {
    try {
      const expiry = new Date(job.expiresAt).getTime();
      if (!isNaN(expiry) && expiry < Date.now()) {
        redFlags.push('Job posting has expired');
        return {
          passed: false,
          score: 0,
          reasons: ['Job is no longer accepting applications'],
          redFlags,
          passedFilters: [],
        };
      }
    } catch {
      // Ignore date parse errors
    }
  }

  // 2. Excluded Companies
  if (prefs?.excludedCompanies && prefs.excludedCompanies.length > 0) {
    const jobComp = job.company.toLowerCase();
    const isExcluded = prefs.excludedCompanies.some(
      (c) => c.toLowerCase() === jobComp || jobComp.includes(c.toLowerCase())
    );
    if (isExcluded) {
      redFlags.push(`Company "${job.company}" is on your exclusion list`);
      return {
        passed: false,
        score: 0,
        reasons: ['Company is excluded by user settings'],
        redFlags,
        passedFilters: [],
      };
    }
  }
  passedFilters.push('Excluded companies check');

  // 3. Remote / Workplace Check
  const allowedRemoteTypes = prefs?.remoteTypes || ['remote', 'hybrid'];
  if (!allowedRemoteTypes.includes(job.remoteType)) {
    if (job.remoteType === 'on-site' && !allowedRemoteTypes.includes('on-site')) {
      redFlags.push(`Requires on-site attendance in ${job.location || 'office'}`);
      score -= 40;
    }
  } else {
    passedFilters.push('Workplace / Remote type matches preferences');
  }

  // 4. Visa Sponsorship & US Security Clearance Restrictions
  const descLower = job.descriptionMarkdown.toLowerCase();
  const requiresClearance =
    descLower.includes('security clearance') ||
    descLower.includes('secret clearance') ||
    descLower.includes('ts/sci');

  if (requiresClearance) {
    redFlags.push('Requires active government security clearance');
    score -= 50;
  }

  const noSponsorship =
    descLower.includes('no sponsorship') ||
    descLower.includes('unable to sponsor') ||
    descLower.includes('must be a us citizen') ||
    descLower.includes('u.s. citizen or permanent resident');

  if (noSponsorship && prefs?.visaSponsorshipRequired) {
    redFlags.push('Employer explicitly does not provide visa sponsorship');
    score -= 60;
  }

  // 5. Seniority Bounds Check
  const candidateYears = calculateTotalExperienceYears(profile);
  const jobSeniority = estimateJobSeniorityYears(job.title, job.descriptionMarkdown);

  if (jobSeniority.minYears > candidateYears + 3) {
    redFlags.push(
      `Job requires ~${jobSeniority.minYears}+ years experience (${jobSeniority.level}), while profile has ~${candidateYears} years`
    );
    score -= 30;
  } else {
    passedFilters.push(`Experience level matches (~${candidateYears} years vs ~${jobSeniority.minYears} required)`);
  }

  // 6. Salary Floor Check
  if (prefs?.minSalary && job.salary?.max) {
    if (job.salary.max < prefs.minSalary) {
      redFlags.push(
        `Stated salary maximum (${job.salary.max} ${job.salary.currency}) is below your desired floor (${prefs.minSalary} ${prefs.salaryCurrency})`
      );
      score -= 30;
    } else {
      passedFilters.push('Compensation meets salary requirements');
    }
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const passed = finalScore >= 50;

  if (passed) {
    reasons.push('Passed core eligibility, remote, and company filters');
  } else {
    reasons.push('Failed one or more mandatory criteria');
  }

  return {
    passed,
    score: finalScore,
    reasons,
    redFlags,
    passedFilters,
  };
}
