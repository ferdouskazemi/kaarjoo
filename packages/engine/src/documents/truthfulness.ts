import type {
  TailoredResume,
  TruthfulnessCheckResult,
  UnsupportedClaim,
  UserProfile,
} from '@kaarjoo/shared';
import { calculateTotalExperienceYears } from '../matching/hardFilters.js';

export class TruthfulnessGuard {
  /**
   * Builds verified ground truth facts from candidate profile.
   */
  public static buildGroundTruth(profile: UserProfile): {
    verifiedCompanies: Set<string>;
    verifiedDegrees: Set<string>;
    verifiedInstitutions: Set<string>;
    verifiedSkills: Set<string>;
    verifiedYears: number;
    verifiedNumbers: Set<string>;
  } {
    const verifiedCompanies = new Set<string>();
    const verifiedDegrees = new Set<string>();
    const verifiedInstitutions = new Set<string>();
    const verifiedSkills = new Set<string>();
    const verifiedNumbers = new Set<string>();

    for (const exp of profile.experiences || []) {
      verifiedCompanies.add(exp.company.toLowerCase().trim());
      // Extract numbers from original achievements
      for (const ach of exp.achievements || []) {
        const nums = ach.match(/\b\d+(?:[\.,]\d+)?%?(?:k|m|b)?\b/gi) || [];
        for (const n of nums) verifiedNumbers.add(n.toLowerCase());
      }
    }

    for (const edu of profile.education || []) {
      verifiedDegrees.add(edu.degree.toLowerCase().trim());
      verifiedInstitutions.add(edu.institution.toLowerCase().trim());
    }

    for (const s of profile.skills || []) {
      verifiedSkills.add(s.name.toLowerCase().trim());
    }

    const verifiedYears = calculateTotalExperienceYears(profile);

    return {
      verifiedCompanies,
      verifiedDegrees,
      verifiedInstitutions,
      verifiedSkills,
      verifiedYears,
      verifiedNumbers,
    };
  }

  /**
   * Verifies tailored resume against profile ground truth.
   * Catches hallucinated employers, degrees, inflated years of experience, or exaggerated metrics.
   */
  public static verifyTailoredResume(
    profile: UserProfile,
    tailored: TailoredResume
  ): TruthfulnessCheckResult {
    const groundTruth = this.buildGroundTruth(profile);
    const verifiedClaims: string[] = [];
    const unsupportedClaims: UnsupportedClaim[] = [];

    // 1. Check Employers in Experiences
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

    // 3. Check for Experience Duration Inflation in Summary
    const summaryLower = tailored.summary.toLowerCase();
    const yearsMatch = summaryLower.match(/(\d+)\+?\s*years?(?:\s*of)?\s*experience/i);
    if (yearsMatch && yearsMatch[1]) {
      const claimedYears = parseInt(yearsMatch[1], 10);
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

    // 4. Check for Exaggerated Metrics in Achievements
    for (const exp of tailored.experiences) {
      for (const ach of exp.tailoredAchievements) {
        const nums = ach.match(/\b\d+(?:[\.,]\d+)?(?:k|m|b)?\b/gi) || [];
        for (const num of nums) {
          // If a large metric (e.g. 100k, 50m) was not in original profile achievements, flag it
          const nLower = num.toLowerCase();
          if ((nLower.endsWith('k') || nLower.endsWith('m') || parseInt(nLower, 10) >= 1000) && !groundTruth.verifiedNumbers.has(nLower)) {
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

    // Calculate Truthfulness Score
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
}
