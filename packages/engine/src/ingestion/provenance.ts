import type {
  ExtractedFactProvenance,
  ExtractionMethod,
  ProfileIssue,
  UserProfile,
} from '@kaarjoo/shared';
import type { ParsedDocument } from './parsers/index.js';

function findEvidenceInDocument(
  document: ParsedDocument,
  sourceFileId: string,
  needle: string | null | undefined
): ExtractedFactProvenance['evidence'] {
  if (!needle || !needle.trim()) return null;
  const trimmed = needle.trim();
  const lowerNeedle = trimmed.toLowerCase();

  for (const page of document.pages) {
    const idx = page.text.toLowerCase().indexOf(lowerNeedle);
    if (idx >= 0) {
      return {
        sourceFileId,
        page: page.pageNumber,
        charStart: idx,
        charEnd: idx + trimmed.length,
        text: page.text.slice(idx, idx + trimmed.length),
      };
    }
  }

  // Fallback to rawText page 1
  const rawIdx = document.rawText.toLowerCase().indexOf(lowerNeedle);
  if (rawIdx >= 0) {
    return {
      sourceFileId,
      page: 1,
      charStart: rawIdx,
      charEnd: rawIdx + trimmed.length,
      text: document.rawText.slice(rawIdx, rawIdx + trimmed.length),
    };
  }

  return null;
}

function parseYearMonth(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = match[2] ? parseInt(match[2], 10) : 1;
  return year * 12 + (month - 1);
}

export function buildFieldProvenance(
  document: ParsedDocument,
  profile: UserProfile,
  sourceFileId: string,
  defaultMethod: ExtractionMethod
): Record<string, ExtractedFactProvenance> {
  const map: Record<string, ExtractedFactProvenance> = {};

  const recordFact = (path: string, value: string | null | undefined, confidence: number, method: ExtractionMethod = defaultMethod) => {
    if (!value || !value.trim()) return;
    const evidence = findEvidenceInDocument(document, sourceFileId, value);
    map[path] = {
      value: value.trim(),
      confidence: evidence ? confidence : Math.min(confidence, 0.5),
      evidence,
      method,
    };
  };

  recordFact('contact.fullName', profile.contact.fullName, 0.92);
  recordFact('contact.email', profile.contact.email, 0.98);
  recordFact('contact.phone', profile.contact.phone, 0.95);
  recordFact('contact.location', profile.contact.location, 0.85);
  if (profile.summary) {
    recordFact('summary', profile.summary.slice(0, 120), 0.85);
  }

  profile.experiences.forEach((exp, idx) => {
    recordFact(`experiences.${idx}.title`, exp.title, exp.provenance?.confidence ?? 0.88);
    recordFact(`experiences.${idx}.company`, exp.company, exp.provenance?.confidence ?? 0.88);
    if (exp.startDate) {
      recordFact(`experiences.${idx}.startDate`, exp.startDate, 0.85);
    }
  });

  profile.education.forEach((edu, idx) => {
    recordFact(`education.${idx}.institution`, edu.institution, 0.85);
    recordFact(`education.${idx}.degree`, edu.degree, 0.85);
  });

  profile.skills.forEach((skill, idx) => {
    recordFact(`skills.${idx}`, skill.name, 0.9);
  });

  return map;
}

export function computeProfileIssues(
  profile: UserProfile,
  options: { ocrConfidence?: number } = {}
): ProfileIssue[] {
  const issues: ProfileIssue[] = [];

  // Blockers
  if (!profile.contact.fullName?.trim()) {
    issues.push({
      severity: 'blocker',
      fieldPath: 'contact.fullName',
      messageKey: 'profile.issue.missingFullName',
      suggestedAction: 'Enter your full name as it appears on your résumé.',
    });
  }
  if (!profile.contact.email?.trim()) {
    issues.push({
      severity: 'blocker',
      fieldPath: 'contact.email',
      messageKey: 'profile.issue.missingEmail',
      suggestedAction: 'Provide a valid email address for employer contact.',
    });
  }
  if (!profile.contact.phone?.trim()) {
    issues.push({
      severity: 'blocker',
      fieldPath: 'contact.phone',
      messageKey: 'profile.issue.missingPhone',
      suggestedAction: 'Add a phone number including country code.',
    });
  }
  if (profile.experiences.length === 0 && profile.education.length === 0) {
    issues.push({
      severity: 'blocker',
      fieldPath: 'experiences',
      messageKey: 'profile.issue.noExperienceOrEducation',
      suggestedAction: 'Add at least one work experience or education entry.',
    });
  }

  // Warnings
  profile.experiences.forEach((exp, idx) => {
    if (!exp.company?.trim()) {
      issues.push({
        severity: 'warning',
        fieldPath: `experiences.${idx}.company`,
        messageKey: 'profile.issue.missingCompany',
        suggestedAction: 'Specify the company or organization name for this role.',
      });
    }
    if (!exp.startDate?.trim()) {
      issues.push({
        severity: 'warning',
        fieldPath: `experiences.${idx}.startDate`,
        messageKey: 'profile.issue.missingDates',
        suggestedAction: 'Add start and end dates for this experience.',
      });
    }
    const startVal = parseYearMonth(exp.startDate);
    const endVal = exp.isCurrent ? null : parseYearMonth(exp.endDate);
    if (startVal !== null && endVal !== null && startVal > endVal) {
      issues.push({
        severity: 'warning',
        fieldPath: `experiences.${idx}.startDate`,
        messageKey: 'profile.issue.impossibleDates',
        suggestedAction: 'Start date is after end date; please verify.',
      });
    }
  });

  if (!profile.summary?.trim()) {
    issues.push({
      severity: 'warning',
      fieldPath: 'summary',
      messageKey: 'profile.issue.emptySummary',
      suggestedAction: 'Add a brief professional summary or draft one from your experience.',
    });
  }

  if (profile.skills.length < 5) {
    issues.push({
      severity: 'warning',
      fieldPath: 'skills',
      messageKey: 'profile.issue.fewSkills',
      suggestedAction: 'Add at least 5 core skills to improve job matching.',
    });
  }

  if (options.ocrConfidence !== undefined && options.ocrConfidence < 0.6) {
    issues.push({
      severity: 'warning',
      fieldPath: 'document.ocr',
      messageKey: 'profile.issue.lowOcrConfidence',
      suggestedAction: 'OCR confidence was low; please double-check extracted text against the original résumé.',
    });
  }

  return issues;
}
