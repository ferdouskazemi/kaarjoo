import type { ProfileIssue, UserProfile } from '@kaarjoo/shared';
import { parseDocument, type ParsedDocument } from './parsers/index.js';
import { detectSectionType, type SectionType } from './sections.js';
import { extractContactInfo } from './extractors/contact.js';
import { extractExperiences } from './extractors/experience.js';
import { extractEducation } from './extractors/education.js';
import { extractSkills } from './extractors/skills.js';
import { buildFieldProvenance, computeProfileIssues } from './provenance.js';
import { extractProfileGapsWithLlm } from '../ai/prompts.js';
import type { LocalLlamaRuntime } from '../ai/llamaRuntime.js';

export type ProfileProgressStage = 'reading' | 'ocr' | 'sections' | 'facts' | 'llm';

export interface ProfileProgressEvent {
  stage: ProfileProgressStage;
  page?: number;
  totalPages?: number;
}

export interface ExtractionResult {
  document: ParsedDocument;
  profile: UserProfile;
  issues: ProfileIssue[];
  extractionMode: 'rule+llm' | 'rule-only';
  droppedUnverifiedCount: number;
  tokensPerSec?: number;
}

export interface ExtractProfileOptions {
  useLlm?: boolean;
  runtime?: LocalLlamaRuntime;
  sourceFileId?: string;
  onProgress?: (event: ProfileProgressEvent) => void;
}

/**
 * Extracts a structured UserProfile from raw document text using deterministic rules,
 * optionally augmented by a local LLM gap-filler constrained by JSON-schema grammar & evidence verification.
 */
export async function extractProfileFromParsedDocument(
  document: ParsedDocument,
  options: ExtractProfileOptions = {}
): Promise<ExtractionResult> {
  if (document.isScanned) {
    options.onProgress?.({ stage: 'ocr', page: 1, totalPages: document.pageCount });
  }
  options.onProgress?.({ stage: 'sections' });
  // 1. Segment raw text into sections
  const lines = document.rawText.split(/\r?\n/);
  const sectionTexts: Record<SectionType, string[]> = {
    contact: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    projects: [],
    unknown: [],
  };

  let currentSection: SectionType = 'contact';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const detected = detectSectionType(trimmed);
    if (detected !== 'unknown') {
      currentSection = detected;
      continue;
    }

    sectionTexts[currentSection].push(trimmed);
  }

  options.onProgress?.({ stage: 'facts' });
  // 2. Extract facts with deterministic rule-based extractors
  const contact = extractContactInfo(document.pages.map((p) => ({ pageNumber: p.pageNumber, text: p.text }))) || {};

  const expText = sectionTexts.experience.join('\n');
  const experiences = extractExperiences(expText);

  const eduText = sectionTexts.education.join('\n');
  const education = extractEducation(eduText);

  const skillsText = [
    ...sectionTexts.skills,
    ...sectionTexts.experience,
    ...sectionTexts.contact,
    ...sectionTexts.summary,
    ...sectionTexts.unknown,
  ].join('\n');
  const skills = extractSkills(skillsText);

  const summary = sectionTexts.summary.join(' ') || undefined;

  const profile: UserProfile = {
    id: `profile_${Date.now()}`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contact,
    summary,
    experiences,
    education,
    skills,
    languages: [],
    certifications: [],
    targetTitles: experiences.length > 0 && experiences[0].title ? [experiences[0].title] : [],
    workAuthorization: [],
  };

  let extractionMode: 'rule+llm' | 'rule-only' = 'rule-only';
  let droppedUnverifiedCount = 0;
  let tokensPerSec: number | undefined;

  // 3. Optional Local LLM gap-fill (only verified evidence spans survive!)
  if (options.useLlm !== false) {
    options.onProgress?.({ stage: 'llm' });
    try {
      const llmRes = await extractProfileGapsWithLlm(document.rawText, profile, options.runtime);
      if (llmRes.usedLlm) {
        extractionMode = 'rule+llm';
        droppedUnverifiedCount = llmRes.droppedCount;
        tokensPerSec = llmRes.tokensPerSec;

        const gaps = llmRes.verifiedGaps;
        if (gaps.fullName && !profile.contact.fullName) {
          profile.contact.fullName = gaps.fullName.value;
        }
        if (gaps.email && !profile.contact.email) {
          profile.contact.email = gaps.email.value;
        }
        if (gaps.phone && !profile.contact.phone) {
          profile.contact.phone = gaps.phone.value;
        }
        if (gaps.skills) {
          const existingSkillNames = new Set(profile.skills.map((s) => s.name.toLowerCase()));
          for (const sk of gaps.skills) {
            if (!existingSkillNames.has(sk.name.toLowerCase())) {
              existingSkillNames.add(sk.name.toLowerCase());
              profile.skills.push({
                id: `skill_llm_${profile.skills.length + 1}`,
                name: sk.name,
                provenance: {
                  status: 'needs_review',
                  confidence: 0.9,
                  sourceFileId: document.fileName,
                  page: 1,
                  textSpan: sk.evidenceSpan,
                },
              });
            }
          }
        }
        if (gaps.experiences && profile.experiences.length === 0) {
          for (const exp of gaps.experiences) {
            profile.experiences.push({
              id: `exp_llm_${profile.experiences.length + 1}`,
              title: exp.title,
              company: exp.company,
              startDate: exp.startDate || null,
              endDate: exp.endDate,
              isCurrent: !exp.endDate || /present|current|اکنون/i.test(exp.endDate),
              achievements: [],
              skillsUsed: [],
            });
          }
        }
        if (gaps.education && profile.education.length === 0) {
          for (const edu of gaps.education) {
            profile.education.push({
              id: `edu_llm_${profile.education.length + 1}`,
              institution: edu.institution,
              degree: edu.degree,
            });
          }
        }
      }
    } catch {
      // Safe fallback to rule-only extraction if LLM fails or is unloaded
    }
  }

  const sourceFileId = options.sourceFileId || document.fileName;
  const method = document.isScanned ? 'ocr' : 'rule';
  profile.fieldProvenance = buildFieldProvenance(document, profile, sourceFileId, method);
  const issues = computeProfileIssues(profile, { ocrConfidence: document.ocrConfidence });
  profile.issues = issues;

  return {
    document,
    profile,
    issues,
    extractionMode,
    droppedUnverifiedCount,
    tokensPerSec,
  };
}

export async function processAndExtractProfile(
  filePath: string,
  options: ExtractProfileOptions = {}
): Promise<ExtractionResult> {
  options.onProgress?.({ stage: 'reading' });
  const document = await parseDocument(filePath);
  return extractProfileFromParsedDocument(document, options);
}
