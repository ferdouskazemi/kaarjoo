import type { TailoredResume } from '@kaarjoo/shared';
import { escapeAttr, escapeHtml } from './escapeHtml.js';

/**
 * Standard ATS-safe Single Column Template.
 * Follows strict ATS parsing best practices:
 * - 100% single column linear hierarchy
 * - Standard section headings (Experience, Education, Skills)
 * - Zero multi-column tables, graphics, or text frames
 * - Standard margins (0.5 - 0.75 in)
 * - Full bilingual RTL (Persian) and LTR (English) support
 */
export function renderAtsCleanHtml(resume: TailoredResume): string {
  const isFa = resume.language === 'fa';
  const dir = isFa ? 'rtl' : 'ltr';
  const fontFamily = isFa
    ? "Vazirmatn, 'Segoe UI', Tahoma, Arial, sans-serif"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const contactParts: string[] = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    resume.contact.linkedinUrl ? 'LinkedIn' : undefined,
    resume.contact.githubUrl ? 'GitHub' : undefined,
  ].filter((p): p is string => Boolean(p));

  const langAttr = escapeAttr(resume.language);
  const fullName = escapeHtml(resume.contact.fullName);
  const summaryHtml = resume.summary ? escapeHtml(resume.summary) : '';
  const experiencesHtml = resume.experiences
    .map(
      (exp) => `
      <div class="experience-item">
        <div class="item-header">
          <div>
            <span class="job-title">${escapeHtml(exp.title)}</span> — 
            <span class="company-name">${escapeHtml(exp.company)}</span>
          </div>
          <div class="date-location">
            ${escapeHtml(exp.startDate)} – ${exp.isCurrent ? (isFa ? 'اکنون' : 'Present') : escapeHtml(exp.endDate || '')}
            ${exp.location ? ` | ${escapeHtml(exp.location)}` : ''}
          </div>
        </div>
        <ul>
          ${exp.tailoredAchievements.map((ach) => `<li>${escapeHtml(ach)}</li>`).join('')}
        </ul>
      </div>
    `
    )
    .join('');
  const skillsHtml = resume.skillCategories
    .map(
      (cat) => `
      <div class="skill-category">
        <span class="skill-label">${escapeHtml(cat.category)}:</span>
        <span class="skill-list">${cat.skills.map((s) => escapeHtml(s)).join(', ')}</span>
      </div>
    `
    )
    .join('');
  const educationItemsHtml = (resume.education ?? [])
    .map(
      (edu) => `
      <div class="experience-item">
        <div class="item-header">
          <div>
            <span class="job-title">${escapeHtml(edu.degree)}</span>
            ${edu.fieldOfStudy ? ` in ${escapeHtml(edu.fieldOfStudy)}` : ''} — 
            <span class="company-name">${escapeHtml(edu.institution)}</span>
          </div>
          <div class="date-location">
            ${escapeHtml(edu.startDate || '')} ${edu.endDate ? `– ${escapeHtml(edu.endDate)}` : ''}
          </div>
        </div>
      </div>
    `
    )
    .join('');
  const educationHtml =
    educationItemsHtml
      ? `<section id="education">
    <h2>${isFa ? 'تحصیلات' : 'Education'}</h2>
    ${educationItemsHtml}
  </section>`
      : '';

  return `<!DOCTYPE html>
<html lang="${langAttr}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${fullName} - Résumé</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ${fontFamily};
      color: #1a1a1a;
      background-color: #ffffff;
      line-height: 1.45;
      font-size: 10.5pt;
      direction: ${dir};
      text-align: ${isFa ? 'right' : 'left'};
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1.5pt solid #222222;
      padding-bottom: 8pt;
      margin-bottom: 12pt;
      text-align: center;
    }
    h1 {
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #111111;
      margin-bottom: 4pt;
    }
    .contact-line {
      font-size: 9.5pt;
      color: #444444;
      display: flex;
      justify-content: center;
      gap: 10pt;
      flex-wrap: wrap;
    }
    section {
      margin-bottom: 12pt;
    }
    h2 {
      font-size: 12pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #111111;
      border-bottom: 1pt solid #cccccc;
      padding-bottom: 2pt;
      margin-bottom: 6pt;
    }
    .summary-text {
      font-size: 10pt;
      color: #2b2b2b;
      margin-bottom: 4pt;
      text-align: justify;
    }
    .experience-item {
      margin-bottom: 8pt;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2pt;
    }
    .job-title {
      font-weight: 700;
      font-size: 10.5pt;
      color: #111111;
    }
    .company-name {
      font-weight: 600;
      color: #333333;
    }
    .date-location {
      font-size: 9pt;
      color: #555555;
      font-style: italic;
    }
    ul {
      margin-inline-start: 16pt;
      margin-top: 2pt;
    }
    li {
      margin-bottom: 2pt;
      font-size: 10pt;
      color: #222222;
    }
    .skill-category {
      margin-bottom: 3pt;
      font-size: 10pt;
    }
    .skill-label {
      font-weight: 700;
      color: #111111;
    }
    .skill-list {
      color: #333333;
    }
  </style>
</head>
<body>
  <header>
    <h1>${fullName}</h1>
    <div class="contact-line">
      ${contactParts.map((c) => `<span>${escapeHtml(c)}</span>`).join(' • ')}
    </div>
  </header>

  ${
    summaryHtml
      ? `<section id="summary">
    <h2>${isFa ? 'خلاصه حرفه‌ای' : 'Professional Summary'}</h2>
    <p class="summary-text">${summaryHtml}</p>
  </section>`
      : ''
  }

  <section id="experience">
    <h2>${isFa ? 'سوابق شغلی' : 'Professional Experience'}</h2>
    ${experiencesHtml}
  </section>

  <section id="skills">
    <h2>${isFa ? 'مهارت‌های تخصصی' : 'Technical Skills'}</h2>
    ${skillsHtml}
  </section>

  ${educationHtml}
</body>
</html>`;
}
