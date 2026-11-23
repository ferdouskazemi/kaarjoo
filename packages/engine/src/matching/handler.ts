import {
  type JobPosting,
  type MatchResult,
  type UserPreferences,
  type UserProfile,
} from '@kaarjoo/shared';
import { rankJob, type MatchWeights, DEFAULT_MATCH_WEIGHTS } from './rerank.js';

export interface ScoredJobItem {
  job: JobPosting;
  match: MatchResult;
}

export class MatchingService {
  private userWeights = new Map<string, MatchWeights>(); // profileId -> MatchWeights
  private feedbackHistory = new Map<string, 'relevant' | 'irrelevant'>(); // jobId_profileId -> feedback

  public getWeights(profileId?: string): MatchWeights {
    if (profileId && this.userWeights.has(profileId)) {
      return this.userWeights.get(profileId)!;
    }
    return { ...DEFAULT_MATCH_WEIGHTS };
  }

  public setWeights(profileId: string, weights: MatchWeights): void {
    this.userWeights.set(profileId, weights);
  }

  public scoreJob(profile: UserProfile, job: JobPosting, preferences?: UserPreferences): MatchResult {
    const weights = this.getWeights(profile.id);
    const result = rankJob(profile, job, preferences, weights);

    // Attach recorded feedback if present
    const key = `${job.id}_${profile.id}`;
    if (this.feedbackHistory.has(key)) {
      result.userFeedback = this.feedbackHistory.get(key);
    }

    return result;
  }

  public rankAllJobs(
    profile: UserProfile,
    jobs: JobPosting[],
    preferences?: UserPreferences
  ): ScoredJobItem[] {
    const scored = jobs.map((job) => ({
      job,
      match: this.scoreJob(profile, job, preferences),
    }));

    // Sort descending by overall match score
    scored.sort((a, b) => b.match.overallScore - a.match.overallScore);
    return scored;
  }

  public recordFeedback(jobId: string, profileId: string, feedback: 'relevant' | 'irrelevant'): {
    success: boolean;
    feedback: string;
    adjustedWeights: MatchWeights;
  } {
    const key = `${jobId}_${profileId}`;
    this.feedbackHistory.set(key, feedback);

    // Adaptive per-user weight tuning:
    // If user marks match as good, boost semantic + skill coverage slightly.
    // If bad, boost hard filters stricter gating.
    const currentWeights = this.getWeights(profileId);
    if (feedback === 'relevant') {
      currentWeights.skillCoverage = Math.min(0.40, currentWeights.skillCoverage + 0.02);
      currentWeights.semantic = Math.min(0.35, currentWeights.semantic + 0.01);
    } else {
      currentWeights.hardFilter = Math.min(0.35, currentWeights.hardFilter + 0.03);
    }

    this.userWeights.set(profileId, currentWeights);

    return {
      success: true,
      feedback,
      adjustedWeights: currentWeights,
    };
  }
}

export const defaultMatchingService = new MatchingService();
