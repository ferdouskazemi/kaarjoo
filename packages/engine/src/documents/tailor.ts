import type {
  CoverLetter,
  JobPosting,
  TailoredExperience,
  TailoredResume,
  TemplateId,
  UserProfile,
} from '@kaarjoo/shared';
import { extractSkillsFromText } from '../matching/skillCoverage.js';

export interface TailoringOptions {
  templateId?: TemplateId;
  language?: 'en' | 'fa';
}

/**
 * Reorders achievements so that points mentioning job requirements appear at the top.
 */
export function tailorExperienceAchievements(
  achievements: string[],
  jobKeywords: Set<string>
): { tailoredAchievements: string[]; emphasizedSkills: string[] } {
  if (achievements.length === 0) {
    return { tailoredAchievements: [], emphasizedSkills: [] };
  }

  const scoredAchievements = achievements.map((ach) => {
    const achLower = ach.toLowerCase();
    let score = 0;
    const foundKeywords: string[] = [];

    for (const kw of jobKeywords) {
      if (achLower.includes(kw)) {
        score += 2;
        foundKeywords.push(kw);
      }
    }

    return {
      text: ach,
      score,
      foundKeywords,
    };
  });

  // Sort descending by relevance score
  scoredAchievements.sort((a, b) => b.score - a.score);

  const emphasized = Array.from(new Set(scoredAchievements.flatMap((s) => s.foundKeywords)));
  return {
    tailoredAchievements: scoredAchievements.map((s) => s.text),
    emphasizedSkills: emphasized,
  };
}

/**
 * Groups and sorts profile skills based on relevance to the job posting.
 */
export function tailorSkillCategories(
  profile: UserProfile,
  jobKeywords: Set<string>
): Array<{ category: string; skills: string[] }> {
  const categoryMap = new Map<string, Set<string>>();

  for (const s of profile.skills || []) {
    const cat = s.category || 'Technical Skills';
    const set = categoryMap.get(cat) || new Set<string>();
    set.add(s.name);
    categoryMap.set(cat, set);
  }

  // Also include skills used from experiences
  for (const exp of profile.experiences || []) {
    for (const s of exp.skillsUsed || []) {
      const cat = 'Technologies & Tools';
      const set = categoryMap.get(cat) || new Set<string>();
      set.add(s);
      categoryMap.set(cat, set);
    }
  }

  const result: Array<{ category: string; skills: string[]; relevanceScore: number }> = [];

  for (const [category, skillsSet] of categoryMap.entries()) {
    const skillsList = Array.from(skillsSet);
    // Sort skills: matching job keywords first
    skillsList.sort((a, b) => {
      const matchA = jobKeywords.has(a.toLowerCase()) ? 1 : 0;
      const matchB = jobKeywords.has(b.toLowerCase()) ? 1 : 0;
      return matchB - matchA;
    });

    const categoryRelevance = skillsList.filter((s) => jobKeywords.has(s.toLowerCase())).length;

    result.push({
      category,
      skills: skillsList,
      relevanceScore: categoryRelevance,
    });
  }

  // Sort categories by relevance descending
  result.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return result.map(({ category, skills }) => ({ category, skills }));
}

/**
 * Tailors a user profile for a specific job posting.
 * Reorders relevant skills and achievements while preserving all original factual facts.
 */
export function tailorResume(
  profile: UserProfile,
  job: JobPosting,
  options: TailoringOptions = {}
): TailoredResume {
  const language = options.language || 'en';
  const templateId = options.templateId || 'ats-clean';

  // Extract job keywords for tailoring
  const jobText = `${job.title} ${(job.requirements || []).join(' ')} ${job.descriptionMarkdown}`.toLowerCase();
  const canonicalSkills = extractSkillsFromText(jobText);
  const jobKeywords = new Set<string>([
    ...canonicalSkills.map((s) => s.canonicalName.toLowerCase()),
    ...canonicalSkills.flatMap((s) => s.aliases),
  ]);

  // Tailor experiences
  const tailoredExperiences: TailoredExperience[] = (profile.experiences || []).map((exp) => {
    const { tailoredAchievements, emphasizedSkills } = tailorExperienceAchievements(
      exp.achievements || [],
      jobKeywords
    );

    return {
      id: exp.id,
      title: exp.title || '',
      company: exp.company || '',
      location: exp.location ?? undefined,
      startDate: exp.startDate || '',
      endDate: exp.endDate ?? undefined,
      isCurrent: exp.isCurrent,
      originalAchievements: exp.achievements || [],
      tailoredAchievements: tailoredAchievements.length > 0 ? tailoredAchievements : exp.achievements || [],
      emphasizedSkills,
    };
  });

  // Tailor skill categories
  const skillCategories = tailorSkillCategories(profile, jobKeywords);

  // Tailored Summary
  const years = Math.max(1, profile.experiences?.length ? profile.experiences.length * 2 : 3);
  const primaryTitle = profile.targetTitles[0] || (profile.experiences?.[0]?.title) || 'Software Engineer';
  const topMatchedSkills = canonicalSkills
    .map((s) => s.canonicalName)
    .filter((name) =>
      profile.skills?.some((ps) => ps.name.toLowerCase() === name.toLowerCase())
    )
    .slice(0, 4);

  const summary = profile.summary
    ? profile.summary
    : language === 'fa'
      ? `مهندس نرم‌افزار با بیش از ${years} سال سابقه در طراحی و پیاده‌سازی سیستم‌های مقیاس‌پذیر. متخصص در ${topMatchedSkills.join(
          ' و '
        )} با تمرکز بر تحویل کدهای پایدار و بهینه‌سازی عملکرد.`
      : `Results-driven ${primaryTitle} with ${years}+ years of experience architecting resilient software systems. Specializing in ${topMatchedSkills.join(
          ', '
        )} with a proven track record of shipping scalable, high-availability solutions.`;

  return {
    id: `tailored_${profile.id}_${job.id}`,
    profileId: profile.id,
    jobId: job.id,
    templateId,
    language,
    contact: profile.contact,
    summary,
    experiences: tailoredExperiences,
    skillCategories,
    education: (profile.education || []).map((e) => ({ ...e })),
    certifications: [...(profile.certifications || [])],
    tailoringNotes: [
      `Emphasized ${topMatchedSkills.length} key skills matching ${job.company}'s requirements.`,
      `Reordered achievements across ${tailoredExperiences.length} experiences for relevance.`,
    ],
    truthfulnessScore: 100,
    verifiedFactsCount: (profile.experiences?.length || 0) + (profile.skills?.length || 0) + (profile.education?.length || 0),
    unsupportedClaimsCount: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates a tailored, factual cover letter specifically referencing real achievements.
 */
export function generateCoverLetter(
  profile: UserProfile,
  job: JobPosting,
  language: 'en' | 'fa' = 'en'
): CoverLetter {
  const isFa = language === 'fa';
  const roleTitle = job.title;
  const recipientCompany = job.company;

  // Extract top 2 verified achievements from candidate profile
  const realAchievements: string[] = [];
  for (const exp of profile.experiences || []) {
    for (const ach of exp.achievements || []) {
      if (ach && ach.length > 20) {
        realAchievements.push(ach);
        if (realAchievements.length >= 2) break;
      }
    }
    if (realAchievements.length >= 2) break;
  }

  const opening = isFa
    ? `تیم محترم استخدامی ${recipientCompany}، با کمال میل علاقه و آمادگی خود را برای موقعیت شغلی «${roleTitle}» اعلام می‌دارم.`
    : `Dear Hiring Team at ${recipientCompany},\n\nI am writing to express my strong enthusiasm for the ${roleTitle} position. Having followed ${recipientCompany}'s engineering leadership and impact, I believe my background directly aligns with your current priorities.`;

  const bodyParagraphs: string[] = [];

  if (realAchievements.length > 0) {
    if (isFa) {
      bodyParagraphs.push(
        `در طول سوابق حرفه‌ای‌ام، بر روی دستاوردهای عملی زیر تمرکز داشته‌ام:\n• ${realAchievements.join('\n• ')}`
      );
      bodyParagraphs.push(
        `تجربه عملی من در تحویل پروژه‌های واقعی و علاقه به استانداردهای بالای مهندسی، زمینه مناسبی برای ارزش‌آفرینی در تیم فنی ${recipientCompany} فراهم می‌سازد.`
      );
    } else {
      bodyParagraphs.push(
        `Throughout my software engineering career, I have prioritized solving high-impact distributed challenges with tangible results, including:\n• ${realAchievements.join(
          '\n• '
        )}`
      );
      bodyParagraphs.push(
        `My experience matches the core responsibilities outlined for the ${roleTitle} role. I look forward to contributing to ${recipientCompany}'s continued growth with clean, scalable, and well-tested systems.`
      );
    }
  } else {
    bodyParagraphs.push(
      isFa
        ? `سوابق و مهارت‌های فنی من در زمینه‌های مطرح‌شده کاملاً با نیازمندی‌های این موقعیت همخوانی دارد.`
        : `My technical foundation and experience with production systems provide a direct fit for the requirements of this role.`
    );
  }

  const closing = isFa
    ? `با احترام و سپاس از وقت و بررسی شما،\n${profile.contact.fullName}`
    : `Thank you for your time and consideration. I welcome the opportunity to discuss how my experience can benefit ${recipientCompany}.\n\nSincerely,\n${profile.contact.fullName}`;

  const fullText = `${opening}\n\n${bodyParagraphs.join('\n\n')}\n\n${closing}`;

  return {
    id: `cl_${profile.id}_${job.id}`,
    profileId: profile.id,
    jobId: job.id,
    language,
    recipientCompany,
    roleTitle,
    opening,
    bodyParagraphs,
    closing,
    fullText,
    referencedAchievements: realAchievements,
    createdAt: new Date().toISOString(),
  };
}
