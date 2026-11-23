import type { TailoredResume } from '@kaarjoo/shared';

/**
 * Modern Minimal Template.
 * High-taste design for tech startups and leading engineering organizations.
 */
export function renderModernMinimalHtml(resume: TailoredResume): string {
  const isFa = resume.language === 'fa';
  const dir = isFa ? 'rtl' : 'ltr';
  const fontFamily = isFa
    ? "Vazirmatn, 'Segoe UI', Tahoma, Arial, sans-serif"
    : "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const contactParts: string[] = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    resume.contact.linkedinUrl ? 'LinkedIn' : undefined,
    resume.contact.githubUrl ? 'GitHub' : undefined,
  ].filter((p): p is string => Boolean(p));

  return `<!DOCTYPE html>
<html lang="${resume.language}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${resume.contact.fullName} - Résumé</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ${fontFamily};
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.5;
      font-size: 10pt;
      direction: ${dir};
      text-align: ${isFa ? 'right' : 'left'};
      padding: 24px;
      max-width: 820px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 16pt;
      padding-bottom: 10pt;
      border-bottom: 2pt solid #0284c7;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4pt;
    }
    h1 {
      font-size: 22pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.6px;
    }
    .role-subtitle {
      font-size: 11pt;
      color: #0284c7;
      font-weight: 600;
    }
    .contact-line {
      font-size: 9pt;
      color: #64748b;
      display: flex;
      gap: 12pt;
      flex-wrap: wrap;
    }
    section {
      margin-bottom: 14pt;
    }
    h2 {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0369a1;
      margin-bottom: 8pt;
      display: flex;
      align-items: center;
      gap: 6pt;
    }
    h2::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }
    .summary-text {
      font-size: 9.5pt;
      color: #334155;
      line-height: 1.6;
    }
    .experience-card {
      margin-bottom: 10pt;
      border-inline-start: 2pt solid #e2e8f0;
      padding-inline-start: 10pt;
    }
    .experience-card:hover {
      border-inline-start-color: #0284c7;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 3pt;
    }
    .job-title {
      font-weight: 700;
      font-size: 10.5pt;
      color: #0f172a;
    }
    .company-name {
      font-weight: 600;
      color: #0369a1;
    }
    .date-badge {
      font-size: 8.5pt;
      font-weight: 500;
      color: #64748b;
      background: #f1f5f9;
      padding: 1pt 6pt;
      border-radius: 4pt;
    }
    ul {
      margin-inline-start: 12pt;
      margin-top: 3pt;
    }
    li {
      margin-bottom: 2.5pt;
      font-size: 9.5pt;
      color: #334155;
    }
    .skill-category {
      margin-bottom: 5pt;
      display: flex;
      align-items: baseline;
      gap: 6pt;
    }
    .skill-label {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
      min-width: 110pt;
    }
    .skill-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4pt;
    }
    .skill-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      padding: 1pt 6pt;
      border-radius: 4pt;
      font-size: 8.5pt;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-top">
      <h1>${resume.contact.fullName}</h1>
    </div>
    <div class="contact-line">
      ${contactParts.map((c) => `<span>${c}</span>`).join(' • ')}
    </div>
  </header>

  ${
    resume.summary
      ? `<section id="summary">
    <h2>${isFa ? 'خلاصه سوابق' : 'Executive Summary'}</h2>
    <p class="summary-text">${resume.summary}</p>
  </section>`
      : ''
  }

  <section id="experience">
    <h2>${isFa ? 'تجربیات حرفه‌ای' : 'Experience'}</h2>
    ${resume.experiences
      .map(
        (exp) => `
      <div class="experience-card">
        <div class="item-header">
          <div>
            <span class="job-title">${exp.title}</span> — 
            <span class="company-name">${exp.company}</span>
          </div>
          <span class="date-badge">
            ${exp.startDate} – ${exp.isCurrent ? (isFa ? 'اکنون' : 'Present') : exp.endDate || ''}
          </span>
        </div>
        <ul>
          ${exp.tailoredAchievements.map((ach) => `<li>${ach}</li>`).join('')}
        </ul>
      </div>
    `
      )
      .join('')}
  </section>

  <section id="skills">
    <h2>${isFa ? 'مهارت‌ها و تخصص‌ها' : 'Core Competencies'}</h2>
    ${resume.skillCategories
      .map(
        (cat) => `
      <div class="skill-category">
        <span class="skill-label">${cat.category}:</span>
        <div class="skill-tags">
          ${cat.skills.map((s) => `<span class="skill-pill">${s}</span>`).join('')}
        </div>
      </div>
    `
      )
      .join('')}
  </section>

  ${
    resume.education && resume.education.length > 0
      ? `<section id="education">
    <h2>${isFa ? 'تحصیلات' : 'Education'}</h2>
    ${resume.education
      .map(
        (edu) => `
      <div class="experience-card">
        <div class="item-header">
          <div>
            <span class="job-title">${edu.degree}</span>
            ${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''} — 
            <span class="company-name">${edu.institution}</span>
          </div>
          <span class="date-badge">
            ${edu.startDate || ''} ${edu.endDate ? `– ${edu.endDate}` : ''}
          </span>
        </div>
      </div>
    `
      )
      .join('')}
  </section>`
      : ''
  }
</body>
</html>`;
}
