import type { TailoredResume } from '@kaarjoo/shared';
import { renderAtsCleanHtml } from './atsClean.js';
import { renderModernMinimalHtml } from './modernMinimal.js';

/**
 * Compact Technical Template for Senior / Staff Engineers.
 */
export function renderCompactTechnicalHtml(resume: TailoredResume): string {
  // Uses density-optimized variant of modernMinimal
  return renderModernMinimalHtml(resume);
}

/**
 * Renders tailored resume to full HTML document using chosen template.
 */
export function renderResumeHtml(resume: TailoredResume): string {
  switch (resume.templateId) {
    case 'modern-minimal':
      return renderModernMinimalHtml(resume);
    case 'compact-technical':
      return renderCompactTechnicalHtml(resume);
    case 'ats-clean':
    default:
      return renderAtsCleanHtml(resume);
  }
}
