import { z, type JobPosting, type MatchResult, type UserPreferences, type UserProfile } from '@kaarjoo/shared';
import { rerankJobWithLlm } from '../ai/prompts.js';
import { defaultLlamaRuntime, type LocalLlamaRuntime } from '../ai/llamaRuntime.js';
import { evaluateHardFilters, type HardFilterResult } from './hardFilters.js';
import { defaultSemanticEmbedder } from './embeddings.js';
import { evaluateSkillCoverage, type SkillCoverageResult } from './skillCoverage.js';

export const RerankResultSchema = z.object({
  score: z.number().min(0).max(100),
  topReasons: z.array(z.string()).min(1).max(3),
  gaps: z.array(z.string()),
  redFlags: z.array(z.string()),
  whyNotHigher: z.string().optional(),
});
export type RerankResult = z.infer<typeof RerankResultSchema>;

export interface MatchWeights {
  hardFilter: number;
  semantic: number;
  skillCoverage: number;
  rerank: number;
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  hardFilter: 0.20,
  semantic: 0.30,
  skillCoverage: 0.30,
  rerank: 0.20,
};

/**
 * Deterministic rule-based fallback re-ranker used when no local GGUF instruct model is downloaded.
 */
export function evaluateRerank(
  profile: UserProfile,
  job: JobPosting,
  hardFilter: HardFilterResult,
  semantic: { overallSemanticScore: number; titleSimilarity: number; contentSimilarity: number },
  skillCoverage: SkillCoverageResult
): RerankResult {
  const topReasons: string[] = [];
  const gaps: string[] = [];
  const redFlags: string[] = [...hardFilter.redFlags];

  // 1. Synthesize primary match reason based on title and core domain
  if (semantic.titleSimilarity >= 60) {
    topReasons.push(`Strong title and domain alignment with your background as "${profile.targetTitles[0] || 'Senior Engineer'}"`);
  } else if (profile.experiences && profile.experiences.length > 0) {
    topReasons.push(`Relevant professional experience as "${profile.experiences[0].title}" at ${profile.experiences[0].company}`);
  }

  // 2. Synthesize skill coverage reason
  if (skillCoverage.matchedSkills.length >= 3) {
    const keySkills = skillCoverage.matchedSkills.slice(0, 3).join(', ');
    topReasons.push(`Covers key technical requirements: ${keySkills}`);
  } else if (skillCoverage.matchedSkills.length > 0) {
    topReasons.push(`Directly verified skills: ${skillCoverage.matchedSkills.join(', ')}`);
  }

  // 3. Synthesize transferable skills reason
  if (skillCoverage.transferableSkills.length > 0) {
    const t = skillCoverage.transferableSkills[0];
    topReasons.push(`Transferable expertise in ${t.category}: your ${t.candidateSkill} applies directly to ${t.jobSkill}`);
  } else if (job.remoteType === 'remote') {
    topReasons.push('100% remote opportunity compatible with your distributed work setup');
  }

  // Fallback reason if less than 2
  while (topReasons.length < 2) {
    topReasons.push('Proven record of shipping software in production environments');
  }

  // Gaps from missing skills
  for (const missing of skillCoverage.missingSkills.slice(0, 4)) {
    gaps.push(`Missing explicit mention of ${missing} in resume`);
  }

  // Compute re-rank score
  let baseScore = Math.round(
    hardFilter.score * 0.2 +
    semantic.overallSemanticScore * 0.4 +
    skillCoverage.score * 0.4
  );

  if (redFlags.length > 0) {
    baseScore = Math.max(20, baseScore - redFlags.length * 15);
  }

  const score = Math.max(0, Math.min(100, baseScore));

  // "Why not higher?" explanation
  let whyNotHigher = 'This is an exceptional match across all dimensions.';
  if (score < 90) {
    if (gaps.length > 0) {
      whyNotHigher = `To achieve a higher score (90%+), consider tailoring your resume to emphasize experience with: ${skillCoverage.missingSkills.slice(0, 2).join(', ')}.`;
    } else if (semantic.titleSimilarity < 70) {
      whyNotHigher = `The job title differs slightly from your target title. Highlighting projects specifically focused on "${job.title}" can boost relevancy.`;
    }
  }

  return {
    score,
    topReasons: topReasons.slice(0, 3),
    gaps,
    redFlags,
    whyNotHigher,
  };
}

/**
 * Computes full calibrated match between profile and job posting.
 */
export function rankJob(
  profile: UserProfile,
  job: JobPosting,
  preferences?: UserPreferences,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): MatchResult {
  const hardFilter = evaluateHardFilters(profile, job, preferences);
  const semantic = defaultSemanticEmbedder.computeSemanticMatch(profile, job);
  const skillCoverage = evaluateSkillCoverage(profile, job);
  const rerank = evaluateRerank(profile, job, hardFilter, semantic, skillCoverage);

  let overallScore = 0;
  if (!hardFilter.passed) {
    // Penalize gated failures heavily
    overallScore = Math.min(45, Math.round(hardFilter.score * 0.4));
  } else {
    overallScore = Math.round(
      hardFilter.score * weights.hardFilter +
      semantic.overallSemanticScore * weights.semantic +
      skillCoverage.score * weights.skillCoverage +
      rerank.score * weights.rerank
    );
  }

  overallScore = Math.max(0, Math.min(100, overallScore));

  return {
    jobId: job.id,
    profileId: profile.id,
    overallScore,
    breakdown: {
      hardFilterScore: hardFilter.score,
      semanticScore: semantic.overallSemanticScore,
      skillCoverageScore: skillCoverage.score,
      llmRerankScore: rerank.score,
    },
    topReasons: rerank.topReasons,
    matchedSkills: skillCoverage.matchedSkills,
    missingSkills: skillCoverage.missingSkills,
    redFlags: hardFilter.redFlags,
  };
}

/**
 * Full hybrid match pipeline: uses cached BGE-M3 neural embeddings + JSON-schema grammar LLM re-ranker
 * when local models are installed, falling back transparently to TF-IDF + rules when no model is loaded.
 */
export async function rankJobAsync(
  profile: UserProfile,
  job: JobPosting,
  preferences?: UserPreferences,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
  runtime: LocalLlamaRuntime = defaultLlamaRuntime
): Promise<MatchResult & { scoringMode: 'local-ai' | 'rule-fallback'; embeddingMode: 'neural' | 'tfidf-fallback' }> {
  const hardFilter = evaluateHardFilters(profile, job, preferences);
  const semantic = await defaultSemanticEmbedder.computeSemanticMatchAsync(profile, job, runtime);
  const skillCoverage = evaluateSkillCoverage(profile, job);

  let rerank = evaluateRerank(profile, job, hardFilter, semantic, skillCoverage);
  let scoringMode: 'local-ai' | 'rule-fallback' = 'rule-fallback';

  if (runtime.isInstructModelAvailable()) {
    try {
      const llmRes = await rerankJobWithLlm(profile, job, hardFilter, semantic, skillCoverage, runtime);
      if (llmRes.usedLlm && llmRes.result) {
        rerank = llmRes.result;
        scoringMode = 'local-ai';
      }
    } catch {
      // Fallback safely to rule-based re-ranker
    }
  }

  let overallScore = 0;
  if (!hardFilter.passed) {
    overallScore = Math.min(45, Math.round(hardFilter.score * 0.4));
  } else {
    overallScore = Math.round(
      hardFilter.score * weights.hardFilter +
        semantic.overallSemanticScore * weights.semantic +
        skillCoverage.score * weights.skillCoverage +
        rerank.score * weights.rerank
    );
  }

  overallScore = Math.max(0, Math.min(100, overallScore));

  return {
    jobId: job.id,
    profileId: profile.id,
    overallScore,
    breakdown: {
      hardFilterScore: hardFilter.score,
      semanticScore: semantic.overallSemanticScore,
      skillCoverageScore: skillCoverage.score,
      llmRerankScore: rerank.score,
    },
    topReasons: rerank.topReasons,
    matchedSkills: skillCoverage.matchedSkills,
    missingSkills: skillCoverage.missingSkills,
    redFlags: rerank.redFlags,
    scoringMode,
    embeddingMode: semantic.mode,
  };
}
