import type { GbnfJsonSchema } from 'node-llama-cpp';
import type { JobPosting, UserProfile } from '@kaarjoo/shared';
import type { HardFilterResult } from '../matching/hardFilters.js';
import type { SkillCoverageResult } from '../matching/skillCoverage.js';
import { defaultLlamaRuntime, type LocalLlamaRuntime } from './llamaRuntime.js';

/**
 * Normalizes whitespace and Persian/Arabic character variants (ي/ی, ك/ک, zero-width non-joiner, digits)
 * so verbatim evidence spans from LLM outputs can be strictly verified against raw source text.
 */
export function normalizeForEvidenceMatch(input: string): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return input
    .replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200b]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Verifies that an LLM-claimed `evidenceSpan` genuinely appears in the source document text.
 * Rejects hallucinated or fabricated claims that lack direct textual evidence.
 */
export function verifyEvidenceSpan(sourceText: string, evidenceSpan: string | undefined | null): boolean {
  if (!evidenceSpan || evidenceSpan.trim().length < 2) return false;
  const normSource = normalizeForEvidenceMatch(sourceText);
  const normSpan = normalizeForEvidenceMatch(evidenceSpan);
  if (!normSpan || normSpan.length < 2) return false;
  return normSource.includes(normSpan);
}

// -----------------------------------------------------------------------------
// 1. Profile Extraction Gaps (JSON-Schema Grammar + Evidence Verification)
// -----------------------------------------------------------------------------

export const PROFILE_GAPS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    fullName: {
      type: 'object',
      properties: { value: { type: 'string' }, evidenceSpan: { type: 'string' } },
      required: ['value', 'evidenceSpan'],
    },
    email: {
      type: 'object',
      properties: { value: { type: 'string' }, evidenceSpan: { type: 'string' } },
      required: ['value', 'evidenceSpan'],
    },
    phone: {
      type: 'object',
      properties: { value: { type: 'string' }, evidenceSpan: { type: 'string' } },
      required: ['value', 'evidenceSpan'],
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, evidenceSpan: { type: 'string' } },
        required: ['name', 'evidenceSpan'],
      },
    },
    experiences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          company: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          evidenceSpan: { type: 'string' },
        },
        required: ['title', 'company', 'evidenceSpan'],
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          evidenceSpan: { type: 'string' },
        },
        required: ['institution', 'degree', 'evidenceSpan'],
      },
    },
  },
} as const satisfies GbnfJsonSchema;

export interface ProfileGapsLlmOutput {
  fullName?: { value: string; evidenceSpan: string };
  email?: { value: string; evidenceSpan: string };
  phone?: { value: string; evidenceSpan: string };
  skills?: Array<{ name: string; evidenceSpan: string }>;
  experiences?: Array<{ title: string; company: string; startDate?: string; endDate?: string; evidenceSpan: string }>;
  education?: Array<{ institution: string; degree: string; evidenceSpan: string }>;
}

/**
 * Filters raw LLM gap-fill output so ONLY facts with verified `evidenceSpan` substrings in `rawText` survive.
 */
export function filterVerifiedProfileGaps(rawText: string, candidate: ProfileGapsLlmOutput): {
  verified: ProfileGapsLlmOutput;
  droppedCount: number;
} {
  let droppedCount = 0;
  const verified: ProfileGapsLlmOutput = {};

  if (candidate.fullName) {
    if (verifyEvidenceSpan(rawText, candidate.fullName.evidenceSpan)) verified.fullName = candidate.fullName;
    else droppedCount++;
  }
  if (candidate.email) {
    if (verifyEvidenceSpan(rawText, candidate.email.evidenceSpan)) verified.email = candidate.email;
    else droppedCount++;
  }
  if (candidate.phone) {
    if (verifyEvidenceSpan(rawText, candidate.phone.evidenceSpan)) verified.phone = candidate.phone;
    else droppedCount++;
  }
  if (Array.isArray(candidate.skills)) {
    verified.skills = [];
    for (const sk of candidate.skills) {
      if (verifyEvidenceSpan(rawText, sk.evidenceSpan)) verified.skills.push(sk);
      else droppedCount++;
    }
  }
  if (Array.isArray(candidate.experiences)) {
    verified.experiences = [];
    for (const exp of candidate.experiences) {
      if (verifyEvidenceSpan(rawText, exp.evidenceSpan)) verified.experiences.push(exp);
      else droppedCount++;
    }
  }
  if (Array.isArray(candidate.education)) {
    verified.education = [];
    for (const edu of candidate.education) {
      if (verifyEvidenceSpan(rawText, edu.evidenceSpan)) verified.education.push(edu);
      else droppedCount++;
    }
  }

  return { verified, droppedCount };
}

export async function extractProfileGapsWithLlm(
  rawText: string,
  ruleProfile: Partial<UserProfile>,
  runtime: LocalLlamaRuntime = defaultLlamaRuntime
): Promise<{ usedLlm: boolean; verifiedGaps: ProfileGapsLlmOutput; droppedCount: number; tokensPerSec?: number }> {
  if (!runtime.isInstructModelAvailable()) {
    return { usedLlm: false, verifiedGaps: {}, droppedCount: 0 };
  }

  const res = await runtime.generateStructured<ProfileGapsLlmOutput>({
    systemPrompt:
      'You extract missing candidate profile facts from resumes (English or Persian). Every extracted item MUST include an exact verbatim substring `evidenceSpan` copied from the resume text. Never invent facts.',
    userPrompt: `Already extracted by rules: ${JSON.stringify({
      fullName: ruleProfile.contact?.fullName,
      email: ruleProfile.contact?.email,
      skillsCount: ruleProfile.skills?.length || 0,
      expCount: ruleProfile.experiences?.length || 0,
      eduCount: ruleProfile.education?.length || 0,
    })}\n\nResume Text:\n${rawText.slice(0, 6000)}`,
    jsonSchema: PROFILE_GAPS_JSON_SCHEMA,
    maxTokens: 1024,
  });

  const { verified, droppedCount } = filterVerifiedProfileGaps(rawText, res.data);
  return {
    usedLlm: true,
    verifiedGaps: verified,
    droppedCount,
    tokensPerSec: res.tokensPerSec,
  };
}

// -----------------------------------------------------------------------------
// 2. Job Extraction Fallback (JSON-Schema Grammar)
// -----------------------------------------------------------------------------

export const JOB_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    company: { type: 'string' },
    location: { type: 'string' },
    remoteType: { type: 'string', enum: ['remote', 'hybrid', 'on-site'] },
    requirements: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'company', 'remoteType', 'requirements'],
} as const satisfies GbnfJsonSchema;

export async function extractJobPostingWithLlm(
  rawText: string,
  sourceUrl: string,
  runtime: LocalLlamaRuntime = defaultLlamaRuntime
): Promise<{
  usedLlm: boolean;
  data?: { title: string; company: string; location?: string; remoteType: 'remote' | 'hybrid' | 'on-site'; requirements: string[] };
}> {
  if (!runtime.isInstructModelAvailable()) {
    return { usedLlm: false };
  }

  const res = await runtime.generateStructured<{
    title: string;
    company: string;
    location?: string;
    remoteType: 'remote' | 'hybrid' | 'on-site';
    requirements: string[];
  }>({
    systemPrompt: 'Extract structured job posting fields verbatim from the provided careers page text.',
    userPrompt: `URL: ${sourceUrl}\n\nPage text:\n${rawText.slice(0, 5000)}`,
    jsonSchema: JOB_EXTRACTION_JSON_SCHEMA,
    maxTokens: 512,
  });

  return { usedLlm: true, data: res.data };
}

// -----------------------------------------------------------------------------
// 3. Job Re-ranking with Reasons (JSON-Schema Grammar)
// -----------------------------------------------------------------------------

export const RERANK_JSON_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number' },
    topReasons: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
    redFlags: { type: 'array', items: { type: 'string' } },
    whyNotHigher: { type: 'string' },
  },
  required: ['score', 'topReasons', 'gaps', 'redFlags', 'whyNotHigher'],
} as const satisfies GbnfJsonSchema;

export async function rerankJobWithLlm(
  profile: UserProfile,
  job: JobPosting,
  hardFilter: HardFilterResult,
  semantic: { overallSemanticScore: number },
  skillCoverage: SkillCoverageResult,
  runtime: LocalLlamaRuntime = defaultLlamaRuntime
): Promise<{
  usedLlm: boolean;
  result?: { score: number; topReasons: string[]; gaps: string[]; redFlags: string[]; whyNotHigher: string };
}> {
  if (!runtime.isInstructModelAvailable()) {
    return { usedLlm: false };
  }

  const res = await runtime.generateStructured<{
    score: number;
    topReasons: string[];
    gaps: string[];
    redFlags: string[];
    whyNotHigher: string;
  }>({
    systemPrompt:
      'You are a strict technical recruiter scoring a candidate against a job posting. Provide a calibrated score (0-100) and concise factual reasons based ONLY on the given profile and job.',
    userPrompt: JSON.stringify({
      candidateTitles: profile.targetTitles,
      candidateSkills: profile.skills.slice(0, 20).map((s) => s.name),
      recentExperience: profile.experiences.slice(0, 3).map((e) => `${e.title} at ${e.company}`),
      jobTitle: job.title,
      jobCompany: job.company,
      jobRequirements: job.requirements.slice(0, 15),
      hardFilterScore: hardFilter.score,
      semanticScore: semantic.overallSemanticScore,
      matchedSkills: skillCoverage.matchedSkills,
      missingSkills: skillCoverage.missingSkills,
    }),
    jsonSchema: RERANK_JSON_SCHEMA,
    maxTokens: 512,
  });

  return {
    usedLlm: true,
    result: {
      score: Math.max(0, Math.min(100, Math.round(res.data.score))),
      topReasons: res.data.topReasons.slice(0, 3),
      gaps: res.data.gaps.slice(0, 4),
      redFlags: [...hardFilter.redFlags, ...(res.data.redFlags || [])],
      whyNotHigher: res.data.whyNotHigher,
    },
  };
}

// -----------------------------------------------------------------------------
// 4. Cover Letter Generation (JSON-Schema Grammar + Grounded Facts)
// -----------------------------------------------------------------------------

export const COVER_LETTER_JSON_SCHEMA = {
  type: 'object',
  properties: {
    greeting: { type: 'string' },
    paragraphs: { type: 'array', items: { type: 'string' } },
    closing: { type: 'string' },
    citedProfileFacts: { type: 'array', items: { type: 'string' } },
  },
  required: ['greeting', 'paragraphs', 'closing', 'citedProfileFacts'],
} as const satisfies GbnfJsonSchema;

export async function generateCoverLetterWithLlm(
  profile: UserProfile,
  job: JobPosting,
  language: 'en' | 'fa',
  runtime: LocalLlamaRuntime = defaultLlamaRuntime
) {
  if (!runtime.isInstructModelAvailable()) {
    return null;
  }

  const profileSourceText = JSON.stringify(profile);
  const res = await runtime.generateStructured<{
    greeting: string;
    paragraphs: string[];
    closing: string;
    citedProfileFacts: string[];
  }>({
    systemPrompt: `Write a concise, truthful cover letter in ${language === 'fa' ? 'Persian' : 'English'} using ONLY verified facts from the candidate profile. Do not invent employers, degrees, metrics, or skills.`,
    userPrompt: JSON.stringify({
      candidateName: profile.contact.fullName,
      experiences: profile.experiences.slice(0, 3),
      skills: profile.skills.slice(0, 12).map((s) => s.name),
      jobTitle: job.title,
      company: job.company,
      jobRequirements: job.requirements.slice(0, 10),
    }),
    jsonSchema: COVER_LETTER_JSON_SCHEMA,
    maxTokens: 768,
  });

  const verifiedFacts = res.data.citedProfileFacts.filter((f) => verifyEvidenceSpan(profileSourceText, f));
  return {
    ...res.data,
    verifiedFacts,
  };
}

// -----------------------------------------------------------------------------
// 5. Screening Question Answers (JSON-Schema Grammar + Evidence Check)
// -----------------------------------------------------------------------------

export const SCREENING_ANSWER_JSON_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    evidenceSpan: { type: 'string' },
    confidence: { type: 'number' },
  },
  required: ['answer', 'evidenceSpan', 'confidence'],
} as const satisfies GbnfJsonSchema;

export async function generateScreeningAnswerWithLlm(
  question: string,
  profile: UserProfile,
  runtime: LocalLlamaRuntime = defaultLlamaRuntime
) {
  if (!runtime.isInstructModelAvailable()) {
    return null;
  }

  const profileSourceText = JSON.stringify(profile);
  const res = await runtime.generateStructured<{
    answer: string;
    evidenceSpan: string;
    confidence: number;
  }>({
    systemPrompt:
      'Answer the job application screening question concisely using ONLY verifiable facts in the candidate profile.',
    userPrompt: `Question: ${question}\n\nProfile: ${profileSourceText.slice(0, 4000)}`,
    jsonSchema: SCREENING_ANSWER_JSON_SCHEMA,
    maxTokens: 256,
  });

  const hasEvidence = verifyEvidenceSpan(profileSourceText, res.data.evidenceSpan);
  if (!hasEvidence) {
    return null; // Drop unverifiable answer and fall back to verified AnswerBank
  }
  return res.data;
}
