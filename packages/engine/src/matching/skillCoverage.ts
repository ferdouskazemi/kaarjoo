import type { JobPosting, UserProfile } from '@kaarjoo/shared';
import {
  CANONICAL_SKILLS_TAXONOMY,
  type CanonicalSkill,
} from '../ingestion/extractors/skills.js';

// Expanded canonical taxonomy with modern tech skills
export const EXTENDED_SKILLS_TAXONOMY: CanonicalSkill[] = [
  ...CANONICAL_SKILLS_TAXONOMY,
  { escoId: 'esco_vue', canonicalName: 'Vue.js', category: 'Frontend Frameworks', aliases: ['vue', 'vue.js', 'vuejs'] },
  { escoId: 'esco_nextjs', canonicalName: 'Next.js', category: 'Frontend Frameworks', aliases: ['next.js', 'nextjs', 'next'] },
  { escoId: 'esco_angular', canonicalName: 'Angular', category: 'Frontend Frameworks', aliases: ['angular', 'angularjs'] },
  { escoId: 'esco_tailwind', canonicalName: 'Tailwind CSS', category: 'Frontend Frameworks', aliases: ['tailwind', 'tailwindcss'] },
  { escoId: 'esco_java', canonicalName: 'Java', category: 'Programming Languages', aliases: ['java', 'جاوا'] },
  { escoId: 'esco_ruby', canonicalName: 'Ruby on Rails', category: 'Backend Frameworks', aliases: ['ruby', 'rails', 'ruby on rails'] },
  { escoId: 'esco_graphql', canonicalName: 'GraphQL', category: 'Distributed Systems', aliases: ['graphql'] },
  { escoId: 'esco_grpc', canonicalName: 'gRPC', category: 'Distributed Systems', aliases: ['grpc'] },
  { escoId: 'esco_mysql', canonicalName: 'MySQL', category: 'Databases', aliases: ['mysql'] },
  { escoId: 'esco_mongodb', canonicalName: 'MongoDB', category: 'Databases', aliases: ['mongodb', 'mongo'] },
  { escoId: 'esco_aws', canonicalName: 'AWS', category: 'Cloud Platforms', aliases: ['aws', 'amazon web services'] },
  { escoId: 'esco_gcp', canonicalName: 'GCP', category: 'Cloud Platforms', aliases: ['gcp', 'google cloud', 'google cloud platform'] },
  { escoId: 'esco_azure', canonicalName: 'Azure', category: 'Cloud Platforms', aliases: ['azure', 'microsoft azure'] },
  { escoId: 'esco_terraform', canonicalName: 'Terraform', category: 'DevOps & Tools', aliases: ['terraform'] },
  { escoId: 'esco_cicd', canonicalName: 'CI/CD', category: 'DevOps & Tools', aliases: ['ci/cd', 'ci cd', 'continuous integration', 'github actions'] },
  { escoId: 'esco_linux', canonicalName: 'Linux', category: 'DevOps & Tools', aliases: ['linux', 'لینوکس'] },
  { escoId: 'esco_distrib', canonicalName: 'Distributed Systems', category: 'Distributed Systems', aliases: ['distributed systems', 'سیستم‌های توزیع‌شده'] },
  { escoId: 'esco_designsys', canonicalName: 'Design Systems', category: 'Design & UI/UX', aliases: ['design system', 'design systems', 'سیستم طراحی'] },
  { escoId: 'esco_figma', canonicalName: 'Figma', category: 'Design & UI/UX', aliases: ['figma', 'فیگما'] },
  { escoId: 'esco_ml', canonicalName: 'Machine Learning', category: 'AI & Machine Learning', aliases: ['machine learning', 'ml', 'یادگیری ماشین'] },
  { escoId: 'esco_deeplearn', canonicalName: 'Deep Learning', category: 'AI & Machine Learning', aliases: ['deep learning', 'یادگیری عمیق'] },
  { escoId: 'esco_llm', canonicalName: 'LLMs', category: 'AI & Machine Learning', aliases: ['llm', 'llms', 'large language models'] },
];

export interface SkillCoverageResult {
  score: number; // 0-100
  matchedSkills: string[];
  transferableSkills: Array<{ jobSkill: string; candidateSkill: string; category: string }>;
  missingSkills: string[];
  totalRequiredCount: number;
}

/**
 * Extracts canonical skills mentioned in text.
 */
export function extractSkillsFromText(text: string): CanonicalSkill[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched: CanonicalSkill[] = [];
  const seenIds = new Set<string>();

  for (const skill of EXTENDED_SKILLS_TAXONOMY) {
    for (const alias of skill.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9_\u0600-\u06FF])${escaped}(?:$|[^a-zA-Z0-9_\u0600-\u06FF])`, 'i');
      if (regex.test(lower) || lower.includes(alias)) {
        if (!seenIds.has(skill.escoId)) {
          seenIds.add(skill.escoId);
          matched.push(skill);
        }
        break;
      }
    }
  }

  return matched;
}

/**
 * Evaluates skill coverage between user profile and job posting.
 */
export function evaluateSkillCoverage(profile: UserProfile, job: JobPosting): SkillCoverageResult {
  // 1. Collect all candidate skills
  const candidateSkillsMap = new Map<string, CanonicalSkill>(); // escoId -> Skill

  // From structured skills array
  for (const s of profile.skills || []) {
    const matched = EXTENDED_SKILLS_TAXONOMY.find(
      (t) => t.escoId === s.escoId || t.canonicalName.toLowerCase() === s.name.toLowerCase()
    );
    if (matched) {
      candidateSkillsMap.set(matched.escoId, matched);
    } else {
      // Auto-extract from raw skill name
      const found = extractSkillsFromText(s.name);
      for (const f of found) candidateSkillsMap.set(f.escoId, f);
    }
  }

  // Also extract from experience achievements and summary
  const expText = [
    profile.summary || '',
    ...(profile.experiences?.flatMap((e) => [...e.achievements, ...(e.skillsUsed || [])]) || []),
  ].join(' ');

  const additionalSkills = extractSkillsFromText(expText);
  for (const s of additionalSkills) {
    candidateSkillsMap.set(s.escoId, s);
  }

  // 2. Extract job required skills
  const jobText = [job.title, ...(job.requirements || []), job.descriptionMarkdown].join(' ');
  const jobSkills = extractSkillsFromText(jobText);

  // If no specific tech skills detected in job, return neutral baseline
  if (jobSkills.length === 0) {
    return {
      score: 75,
      matchedSkills: [],
      transferableSkills: [],
      missingSkills: [],
      totalRequiredCount: 0,
    };
  }

  const matchedSkills: string[] = [];
  const transferableSkills: Array<{ jobSkill: string; candidateSkill: string; category: string }> = [];
  const missingSkills: string[] = [];

  // Group candidate skills by category for transferable checks
  const candidateByCategory = new Map<string, CanonicalSkill[]>();
  for (const s of candidateSkillsMap.values()) {
    const list = candidateByCategory.get(s.category) || [];
    list.push(s);
    candidateByCategory.set(s.category, list);
  }

  for (const jobSkill of jobSkills) {
    if (candidateSkillsMap.has(jobSkill.escoId)) {
      matchedSkills.push(jobSkill.canonicalName);
    } else {
      // Check transferable skills in same category
      const sameCategoryCandidateSkills = candidateByCategory.get(jobSkill.category) || [];
      if (sameCategoryCandidateSkills.length > 0) {
        const primaryTransfer = sameCategoryCandidateSkills[0];
        transferableSkills.push({
          jobSkill: jobSkill.canonicalName,
          candidateSkill: primaryTransfer.canonicalName,
          category: jobSkill.category,
        });
      } else {
        missingSkills.push(jobSkill.canonicalName);
      }
    }
  }

  // Coverage formula: (matched + 0.5 * transferable) / totalRequired
  const totalRequired = jobSkills.length;
  const weightedMatches = matchedSkills.length + transferableSkills.length * 0.5;
  const coverageRatio = totalRequired > 0 ? weightedMatches / totalRequired : 1.0;

  const score = Math.min(100, Math.round(coverageRatio * 100));

  return {
    score,
    matchedSkills,
    transferableSkills,
    missingSkills,
    totalRequiredCount: totalRequired,
  };
}
