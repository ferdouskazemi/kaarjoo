import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from 'docx';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { TailoredResume } from '@kaarjoo/shared';

export interface DocxExportOptions {
  outputPath?: string;
}

/**
 * Exports a TailoredResume to an ATS-safe Microsoft Word (.docx) document.
 */
export async function exportResumeToDocx(
  resume: TailoredResume,
  options: DocxExportOptions = {}
): Promise<Buffer> {
  const isFa = resume.language === 'fa';
  const alignment = isFa ? AlignmentType.RIGHT : AlignmentType.LEFT;

  const paragraphs: Paragraph[] = [];

  // 1. Candidate Full Name (Header)
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: resume.contact.fullName || '',
          bold: true,
          size: 36, // 18pt
          font: isFa ? 'Vazirmatn' : 'Calibri',
          color: '111111',
        }),
      ],
    })
  );

  // 2. Contact Information
  const contactText = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    resume.contact.linkedinUrl ? 'LinkedIn' : undefined,
    resume.contact.githubUrl ? 'GitHub' : undefined,
  ]
    .filter(Boolean)
    .join('  |  ');

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: contactText,
          size: 20, // 10pt
          color: '555555',
          font: isFa ? 'Vazirmatn' : 'Calibri',
        }),
      ],
    })
  );

  // 3. Professional Summary
  if (resume.summary) {
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: isFa ? 'خلاصه سوابق' : 'PROFESSIONAL SUMMARY',
            bold: true,
            size: 24, // 12pt
            color: '222222',
            font: isFa ? 'Vazirmatn' : 'Calibri',
          }),
        ],
      }),
      new Paragraph({
        alignment,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: resume.summary,
            size: 21,
            color: '333333',
            font: isFa ? 'Vazirmatn' : 'Calibri',
          }),
        ],
      })
    );
  }

  // 4. Professional Experience
  if (resume.experiences && resume.experiences.length > 0) {
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: isFa ? 'سوابق شغلی' : 'PROFESSIONAL EXPERIENCE',
            bold: true,
            size: 24,
            color: '222222',
            font: isFa ? 'Vazirmatn' : 'Calibri',
          }),
        ],
      })
    );

    for (const exp of resume.experiences) {
      // Role & Company Header
      paragraphs.push(
        new Paragraph({
          alignment,
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: 22,
              font: isFa ? 'Vazirmatn' : 'Calibri',
            }),
            new TextRun({
              text: ` — ${exp.company}`,
              bold: true,
              color: '333333',
              size: 22,
              font: isFa ? 'Vazirmatn' : 'Calibri',
            }),
            new TextRun({
              text: `  (${exp.startDate} – ${exp.isCurrent ? (isFa ? 'اکنون' : 'Present') : exp.endDate || ''}${exp.location ? `, ${exp.location}` : ''})`,
              italics: true,
              size: 19,
              color: '666666',
              font: isFa ? 'Vazirmatn' : 'Calibri',
            }),
          ],
        })
      );

      // Bullet points
      for (const bullet of exp.tailoredAchievements) {
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            alignment,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: bullet,
                size: 20,
                color: '333333',
                font: isFa ? 'Vazirmatn' : 'Calibri',
              }),
            ],
          })
        );
      }
    }
  }

  // 5. Technical Skills
  if (resume.skillCategories && resume.skillCategories.length > 0) {
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: isFa ? 'مهارت‌های تخصصی' : 'TECHNICAL SKILLS',
            bold: true,
            size: 24,
            color: '222222',
            font: isFa ? 'Vazirmatn' : 'Calibri',
          }),
        ],
      })
    );

    for (const cat of resume.skillCategories) {
      paragraphs.push(
        new Paragraph({
          alignment,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${cat.category}: `,
              bold: true,
              size: 20,
              font: isFa ? 'Vazirmatn' : 'Calibri',
            }),
            new TextRun({
              text: cat.skills.join(', '),
              size: 20,
              color: '444444',
              font: isFa ? 'Vazirmatn' : 'Calibri',
            }),
          ],
        })
      );
    }
  }

  // 6. Education
  if (resume.education && resume.education.length > 0) {
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: isFa ? 'تحصیلات' : 'EDUCATION',
            bold: true,
            size: 24,
            color: '222222',
            font: isFa ? 'Vazirmatn' : 'Calibri',
          }),
        ],
      })
    );

    for (const edu of resume.education) {
      paragraphs.push(
        new Paragraph({
          alignment,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`,
              bold: true,
              size: 20,
              font: isFa ? 'Vazirmatn' : 'Calibri',
            }),
            new TextRun({
              text: ` — ${edu.institution} (${edu.startDate || ''} – ${edu.endDate || ''})`,
              size: 20,
              color: '555555',
              font: isFa ? 'Vazirmatn' : 'Calibri',
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080, // ~0.75 in
              right: 1080,
              bottom: 1080,
              left: 1080,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  if (options.outputPath) {
    await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.writeFile(options.outputPath, buffer);
  }

  return buffer;
}
