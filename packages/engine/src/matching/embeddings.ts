import type { JobPosting, UserProfile } from '@kaarjoo/shared';
import { defaultLlamaRuntime, type LocalLlamaRuntime } from '../ai/llamaRuntime.js';
import { defaultEmbeddingCache, type SqliteEmbeddingCache } from './embeddingCache.js';

/**
 * Calculates cosine similarity between two dense or sparse vectors.
 */
export function cosineSimilarity(vecA: number[] | Float32Array, vecB: number[] | Float32Array): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * In-memory local TF-IDF & N-Gram semantic embedder.
 * Runs 100% locally with zero external network or model download dependencies.
 */
export class LocalSemanticEmbedder {
  private vocabulary = new Map<string, number>();
  private idf = new Map<string, number>();
  private docCount = 0;

  /**
   * Tokenizes and stems text into unigrams and bigrams.
   */
  public tokenize(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    const tokens: string[] = [...words];
    for (let i = 0; i < words.length - 1; i++) {
      tokens.push(`${words[i]}_${words[i + 1]}`);
    }
    return tokens;
  }

  /**
   * Builds feature vector for a text string using term frequencies.
   */
  public vectorize(text: string, weights?: Map<string, number>): Map<string, number> {
    const tokens = this.tokenize(text);
    const vector = new Map<string, number>();

    for (const token of tokens) {
      const weightMultiplier = weights?.get(token) ?? 1.0;
      vector.set(token, (vector.get(token) || 0) + weightMultiplier);
    }

    return vector;
  }

  /**
   * Computes cosine similarity between two token frequency maps.
   */
  public calculateSparseSimilarity(mapA: Map<string, number>, mapB: Map<string, number>): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const [token, valA] of mapA.entries()) {
      normA += valA * valA;
      const valB = mapB.get(token);
      if (valB !== undefined) {
        dotProduct += valA * valB;
      }
    }

    for (const valB of mapB.values()) {
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculates overall semantic match score between a candidate profile and a job posting.
   * Returns a score from 0 to 100 with detailed component breakdown.
   */
  public computeSemanticMatch(
    profile: UserProfile,
    job: JobPosting
  ): {
    overallSemanticScore: number;
    titleSimilarity: number;
    contentSimilarity: number;
  } {
    // 1. Title matching (Candidate target titles & recent titles vs Job title)
    const candidateTitles = [
      ...(profile.targetTitles || []),
      ...(profile.experiences?.slice(0, 3).map((e) => e.title) || []),
    ].join(' ');

    const vecCandidateTitle = this.vectorize(candidateTitles);
    const vecJobTitle = this.vectorize(job.title);
    const titleSim = this.calculateSparseSimilarity(vecCandidateTitle, vecJobTitle);

    // 2. Content & Achievements matching
    const profileContent = [
      ...(profile.targetTitles || []),
      profile.summary || '',
      ...(profile.experiences?.flatMap((e) => [
        e.title,
        e.description || '',
        ...e.achievements,
        ...(e.skillsUsed || []),
      ]) || []),
      ...(profile.skills?.map((s) => s.name) || []),
    ].join(' ');

    const jobContent = [job.title, ...(job.requirements || []), job.descriptionMarkdown].join(' ');

    const vecProfileContent = this.vectorize(profileContent);
    const vecJobContent = this.vectorize(jobContent);
    const contentSim = this.calculateSparseSimilarity(vecProfileContent, vecJobContent);

    // Blend: title similarity (45%) + full content similarity (55%)
    const rawBlend = titleSim * 0.45 + contentSim * 0.55;

    // Scale gracefully to a 0-100 percentage
    const scaledScore = Math.min(100, Math.round(Math.pow(rawBlend, 0.55) * 125));

    return {
      overallSemanticScore: Math.max(0, scaledScore),
      titleSimilarity: Math.round(titleSim * 100),
      contentSimilarity: Math.round(contentSim * 100),
    };
  }

  /**
   * Computes semantic match using real local neural embeddings (BGE-M3 via node-llama-cpp)
   * with SQLite vector caching, transparently falling back to TF-IDF when no embedding model is installed.
   */
  public async computeSemanticMatchAsync(
    profile: UserProfile,
    job: JobPosting,
    runtime: LocalLlamaRuntime = defaultLlamaRuntime,
    cache: SqliteEmbeddingCache = defaultEmbeddingCache
  ): Promise<{
    overallSemanticScore: number;
    titleSimilarity: number;
    contentSimilarity: number;
    mode: 'neural' | 'tfidf-fallback';
  }> {
    if (!runtime.isEmbeddingModelAvailable()) {
      const fallback = this.computeSemanticMatch(profile, job);
      return { ...fallback, mode: 'tfidf-fallback' };
    }

    const modelId = 'bge-m3-q8';
    const candidateTitles = [
      ...(profile.targetTitles || []),
      ...(profile.experiences?.slice(0, 3).map((e) => e.title) || []),
    ]
      .join(' ')
      .trim() || 'Software Engineer';

    const profileContent = [
      ...(profile.targetTitles || []),
      profile.summary || '',
      ...(profile.experiences?.flatMap((e) => [
        e.title,
        e.description || '',
        ...e.achievements,
        ...(e.skillsUsed || []),
      ]) || []),
      ...(profile.skills?.map((s) => s.name) || []),
    ]
      .join(' ')
      .slice(0, 4000);

    const jobContent = [job.title, ...(job.requirements || []), job.descriptionMarkdown].join(' ').slice(0, 4000);

    const getCachedOrEmbed = async (text: string): Promise<Float32Array> => {
      const cached = cache.get(modelId, text);
      if (cached) return cached;
      const res = await runtime.embedText(text);
      cache.set(modelId, text, res.vector);
      return res.vector;
    };

    try {
      const [vecCandTitle, vecJobTitle, vecProfileContent, vecJobContent] = await Promise.all([
        getCachedOrEmbed(candidateTitles),
        getCachedOrEmbed(job.title),
        getCachedOrEmbed(profileContent),
        getCachedOrEmbed(jobContent),
      ]);

      const titleSim = Math.max(0, cosineSimilarity(vecCandTitle, vecJobTitle));
      const contentSim = Math.max(0, cosineSimilarity(vecProfileContent, vecJobContent));
      const rawBlend = titleSim * 0.45 + contentSim * 0.55;
      const scaledScore = Math.min(100, Math.round(rawBlend * 115));

      return {
        overallSemanticScore: Math.max(0, scaledScore),
        titleSimilarity: Math.round(titleSim * 100),
        contentSimilarity: Math.round(contentSim * 100),
        mode: 'neural',
      };
    } catch {
      const fallback = this.computeSemanticMatch(profile, job);
      return { ...fallback, mode: 'tfidf-fallback' };
    }
  }
}

export const defaultSemanticEmbedder = new LocalSemanticEmbedder();
