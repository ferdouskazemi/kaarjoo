import { UserProfile, FactProvenance } from '@kaarjoo/shared';
import { parseDocument, ParsedDocument } from './parsers/index.js';
import { detectSectionType, SectionType } from './sections.js';
import { extractContactInfo } from './extractors/contact.js';
import { extractExperiences } from './extractors/experience.js';
import { extractEducation } from './extractors/education.js';
import { extractSkills } from './extractors/skills.js';

export interface ExtractionResult {
  document: ParsedDocument;
  profile: UserProfile;
}

export async function processAndExtractProfile(filePath: string): Promise<ExtractionResult> {
  const document = await parseDocument(filePath);

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

  // 2. Extract facts with deterministic extractors
  const contact = extractContactInfo(document.pages.map((p) => ({ pageNumber: p.pageNumber, text: p.text }))) || {
    fullName: document.fileName.replace(/\.[^/.]+$/, ''),
    email: 'unspecified@example.com',
  };

  const expText = sectionTexts.experience.join('\n');
  const experiences = extractExperiences(expText);

  const eduText = sectionTexts.education.join('\n');
  const education = extractEducation(eduText);

  const skillsText = [...sectionTexts.skills, ...sectionTexts.experience].join('\n');
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
    targetTitles: experiences.length > 0 ? [experiences[0].title] : [],
    workAuthorization: [],
  };

  return {
    document,
    profile,
  };
}
