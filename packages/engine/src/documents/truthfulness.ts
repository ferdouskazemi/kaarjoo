import type {
  TailoredResume,
  TruthfulnessCheckResult,
  UnsupportedClaim,
  UserProfile,
} from '@kaarjoo/shared';
import { calculateTotalExperienceYears } from '../matching/hardFilters.js';

function normalizeDigits(input: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  return input
    .replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)));
}

export class TruthfulnessGuard {
  /**
   * Builds verified ground truth facts from candidate profile.
   */
  public static buildGroundTruth(profile: UserProfile): {
    verifiedCompanies: Set<string>;
    verifiedTitles: Set<string>;
    verifiedDates: Set<string>;
    verifiedDegrees: Set<string>;
    verifiedInstitutions: Set<string>;
    verifiedSkills: Set<string>;
    verifiedYears: number;
    verifiedNumbers: Set<string>;
  } {
    const verifiedCompanies = new Set<string>();
    const verifiedTitles = new Set<string>();
    const verifiedDates = new Set<string>();
    const verifiedDegrees = new Set<string>();
    const verifiedInstitutions = new Set<string>();
    const verifiedSkills = new Set<string>();
    const verifiedNumbers = new Set<string>();

    for (const exp of profile.experiences || []) {
      if (exp.company) verifiedCompanies.add(exp.company.toLowerCase().trim());
      if (exp.title) verifiedTitles.add(exp.title.toLowerCase().trim());
      if (exp.startDate) verifiedDates.add(normalizeDigits(exp.startDate).toLowerCase().trim());
      if (exp.endDate) verifiedDates.add(normalizeDigits(exp.endDate).toLowerCase().trim());
      for (const sk of exp.skillsUsed || []) {
        verifiedSkills.add(sk.toLowerCase().trim());
      }
      // Extract numbers and percentages from original achievements and description
      const texts = [...(exp.achievements || []), exp.description || ''];
      for (const txt of texts) {
        const normTxt = normalizeDigits(txt);
        const nums = normTxt.match(/\b\d+(?:[\.,]\d+)?(?:%|k|m|b)?\b/gi) || [];
        for (const n of nums) verifiedNumbers.add(n.toLowerCase());
      }
    }

    if (profile.summary) {
      const normSum = normalizeDigits(profile.summary);
      const nums = normSum.match(/\b\d+(?:[\.,]\d+)?(?:%|k|m|b)?\b/gi) || [];
      for (const n of nums) verifiedNumbers.add(n.toLowerCase());
    }

    for (const edu of profile.education || []) {
      verifiedDegrees.add(edu.degree.toLowerCase().trim());
      verifiedInstitutions.add(edu.institution.toLowerCase().trim());
    }

    for (const s of profile.skills || []) {
      verifiedSkills.add(s.name.toLowerCase().trim());
    }

    for (const t of profile.targetTitles || []) {
      verifiedTitles.add(t.toLowerCase().trim());
    }

    const verifiedYears = calculateTotalExperienceYears(profile);

    return {
      verifiedCompanies,
      verifiedTitles,
      verifiedDates,
      verifiedDegrees,
      verifiedInstitutions,
      verifiedSkills,
      verifiedYears,
      verifiedNumbers,
    };
  }

  /**
   * Verifies tailored resume against profile ground truth.
   * Catches hallucinated employers, titles, dates, degrees, skills, inflated years, or exaggerated metrics.
   */
  public static verifyTailoredResume(
    profile: UserProfile,
    tailored: TailoredResume
  ): TruthfulnessCheckResult {
    const groundTruth = this.buildGroundTruth(profile);
    const verifiedClaims: string[] = [];
    const unsupportedClaims: UnsupportedClaim[] = [];

    // 1. Check Employers, Titles, and Dates in Experiences
    for (const exp of tailored.experiences) {
      const compLower = exp.company.toLowerCase().trim();
      if (!groundTruth.verifiedCompanies.has(compLower)) {
        unsupportedClaims.push({
          claim: exp.company,
          field: 'experience.company',
          severity: 'high',
          reason: `Hallucinated employer: "${exp.company}" is not present in your verified profile history.`,
        });
      } else {
        verifiedClaims.push(`Verified employer: ${exp.company}`);
      }

      const titleLower = exp.title.toLowerCase().trim();
      if (groundTruth.verifiedTitles.size > 0 && !groundTruth.verifiedTitles.has(titleLower)) {
        unsupportedClaims.push({
          claim: exp.title,
          field: 'experience.title',
          severity: 'high',
          reason: `Unverified role title: "${exp.title}" does not match your recorded profile roles.`,
        });
      }

      const normStart = normalizeDigits(exp.startDate || '').toLowerCase().trim();
      if (normStart && groundTruth.verifiedDates.size > 0 && !groundTruth.verifiedDates.has(normStart)) {
        unsupportedClaims.push({
          claim: `${exp.company} startDate=${exp.startDate}`,
          field: 'experience.startDate',
          severity: 'medium',
          reason: `Date tampering detected: start date "${exp.startDate}" differs from profile record.`,
        });
      }
    }

    // 2. Check Education & Degrees
    for (const edu of tailored.education) {
      const degLower = edu.degree.toLowerCase().trim();
      const instLower = edu.institution.toLowerCase().trim();

      if (!groundTruth.verifiedDegrees.has(degLower)) {
        unsupportedClaims.push({
          claim: edu.degree,
          field: 'education.degree',
          severity: 'high',
          reason: `Unsupported degree: "${edu.degree}" was not found in your verified education facts.`,
        });
      } else {
        verifiedClaims.push(`Verified degree: ${edu.degree}`);
      }

      if (!groundTruth.verifiedInstitutions.has(instLower)) {
        unsupportedClaims.push({
          claim: edu.institution,
          field: 'education.institution',
          severity: 'high',
          reason: `Unsupported institution: "${edu.institution}" is not in your profile history.`,
        });
      } else {
        verifiedClaims.push(`Verified institution: ${edu.institution}`);
      }
    }

    // 3. Check Skill Categories against verified skills
    for (const cat of tailored.skillCategories || []) {
      for (const sk of cat.skills || []) {
        if (!groundTruth.verifiedSkills.has(sk.toLowerCase().trim())) {
          unsupportedClaims.push({
            claim: sk,
            field: 'skills',
            severity: 'high',
            reason: `Hallucinated skill: "${sk}" is not present in your verified profile skills.`,
          });
        }
      }
    }

    // 4. Check for Experience Duration Inflation in Summary (English & Persian)
    const summaryNorm = normalizeDigits(tailored.summary).toLowerCase();
    const yearsEnMatch = summaryNorm.match(/(\d+)\+?\s*years?(?:\s*of)?\s*experience/i);
    const yearsFaMatch = summaryNorm.match(/(\d+)\+?\s*سال\s*(?:سابقه|تجربه)/i);
    const claimedYearsStr = yearsEnMatch?.[1] || yearsFaMatch?.[1];
    if (claimedYearsStr) {
      const claimedYears = parseInt(claimedYearsStr, 10);
      if (claimedYears > groundTruth.verifiedYears + 2) {
        unsupportedClaims.push({
          claim: `${claimedYears} years of experience`,
          field: 'summary',
          severity: 'high',
          reason: `Inflated experience duration: claimed ${claimedYears} years, but verified profile duration is ~${groundTruth.verifiedYears} years.`,
        });
      } else {
        verifiedClaims.push(`Verified experience duration claim: ~${claimedYears} years`);
      }
    }

    // 5. Check for Exaggerated Metrics / Percentages in Achievements (English & Persian digits)
    for (const exp of tailored.experiences) {
      for (const ach of exp.tailoredAchievements) {
        const achNorm = normalizeDigits(ach);
        const nums = achNorm.match(/\b\d+(?:[\.,]\d+)?(?:%|k|m|b)?\b/gi) || [];
        for (const num of nums) {
          const nLower = num.toLowerCase();
          const numericVal = parseFloat(nLower);
          const isSignificantMetric =
            nLower.endsWith('%') ||
            nLower.endsWith('k') ||
            nLower.endsWith('m') ||
            nLower.endsWith('b') ||
            numericVal >= 100;
          if (isSignificantMetric && !groundTruth.verifiedNumbers.has(nLower)) {
            unsupportedClaims.push({
              claim: `Metric "${num}" in "${ach.slice(0, 50)}..."`,
              field: 'experience.achievement',
              severity: 'medium',
              reason: `Unverified metric: quantitative figure "${num}" was not found in the original source resume.`,
            });
          }
        }
      }
    }

    let score = 100;
    for (const uc of unsupportedClaims) {
      if (uc.severity === 'high') score -= 30;
      else if (uc.severity === 'medium') score -= 15;
      else score -= 5;
    }

    score = Math.max(0, score);
    const isTruthful = unsupportedClaims.length === 0;

    return {
      isTruthful,
      score,
      verifiedClaims,
      unsupportedClaims,
    };
  }

  /**
   * Verifies freeform generated text (such as a cover letter or screening answer)
   * against profile ground truth for inflated years or fabricated metrics.
   */
  public static verifyTextClaims(profile: UserProfile, text: string): TruthfulnessCheckResult {
    const groundTruth = this.buildGroundTruth(profile);
    const normText = normalizeDigits(text).toLowerCase();
    const verifiedClaims: string[] = [];
    const unsupportedClaims: UnsupportedClaim[] = [];

    const yearsEnMatch = normText.match(/(\d+)\+?\s*[-\s]?years?(?:\s*of)?\s*(?:experience|\w+\s+experience)?/i);
    const yearsFaMatch = normText.match(/(\d+)\+?\s*سال\s*(?:سابقه|تجربه)/i);
    const claimedYearsStr = yearsEnMatch?.[1] || yearsFaMatch?.[1];
    if (claimedYearsStr) {
      const claimedYears = parseInt(claimedYearsStr, 10);
      if (claimedYears > groundTruth.verifiedYears + 2) {
        unsupportedClaims.push({
          claim: `${claimedYears} years of experience`,
          field: 'text.years',
          severity: 'high',
          reason: `Inflated experience duration: claimed ${claimedYears} years vs verified ${groundTruth.verifiedYears} years.`,
        });
      }
    }

    const nums = normText.match(/(?:\b\d+(?:[\.,]\d+)?%|\b\d+(?:[\.,]\d+)?(?:k|m|b)\b)/gi) || [];
    for (const num of nums) {
      const nLower = num.toLowerCase();
      if (!groundTruth.verifiedNumbers.has(nLower)) {
        unsupportedClaims.push({
          claim: `Unverified metric "${num}"`,
          field: 'text.metric',
          severity: 'medium',
          reason: `Quantitative claim "${num}" does not appear in verified profile achievements.`,
        });
      }
    }

    let score = 100;
    for (const uc of unsupportedClaims) {
      score -= uc.severity === 'high' ? 30 : 15;
    }
    score = Math.max(0, score);

    return {
      isTruthful: unsupportedClaims.length === 0,
      score,
      verifiedClaims,
      unsupportedClaims,
    };
  }
}
