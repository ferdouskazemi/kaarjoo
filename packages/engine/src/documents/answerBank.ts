import type {
  ScreeningAnswer,
  ScreeningQuestionCategory,
  UserProfile,
} from '@kaarjoo/shared';
import { calculateTotalExperienceYears } from '../matching/hardFilters.js';

export class AnswerBankManager {
  private customBank = new Map<string, ScreeningAnswer>(); // category or question hash -> answer

  /**
   * Calculates years of experience with a specific technology from profile experiences.
   */
  public calculateSkillYears(profile: UserProfile, skillName: string): number {
    const sLower = skillName.toLowerCase();
    let totalMonths = 0;

    for (const exp of profile.experiences || []) {
      const used = (exp.skillsUsed || []).some((s) => s.toLowerCase() === sLower);
      const mentionedInDesc = (exp.description || '').toLowerCase().includes(sLower);
      const mentionedInAch = (exp.achievements || []).some((a) => a.toLowerCase().includes(sLower));

      if (used || mentionedInDesc || mentionedInAch) {
        try {
          const start = exp.startDate ? new Date(exp.startDate).getTime() : Date.now();
          const end = exp.endDate ? new Date(exp.endDate).getTime() : Date.now();
          const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.4375)));
          totalMonths += months;
        } catch {
          totalMonths += 12;
        }
      }
    }

    return Math.max(1, Math.round(totalMonths / 12));
  }

  /**
   * Categorizes a screening question based on keywords.
   */
  public categorizeQuestion(question: string): ScreeningQuestionCategory {
    const q = question.toLowerCase();

    if (q.includes('notice') || q.includes('start date') || q.includes('how soon') || q.includes('availability')) {
      return 'notice_period';
    }
    if (q.includes('salary') || q.includes('compensation') || q.includes('rate') || q.includes('pay expectation')) {
      return 'salary';
    }
    if (q.includes('visa') || q.includes('sponsorship') || q.includes('authorized to work') || q.includes('work authorization') || q.includes('legally authorized')) {
      return 'work_auth';
    }
    if (q.includes('relocate') || q.includes('relocation') || q.includes('move to')) {
      return 'relocation';
    }
    if (q.includes('how many years') || q.includes('years of experience') || q.includes('years with')) {
      return 'experience_years';
    }
    if (q.includes('gender') || q.includes('race') || q.includes('ethnicity') || q.includes('veteran') || q.includes('disability')) {
      return 'eeo_demographic';
    }

    return 'custom';
  }

  /**
   * Retrieves or derives an approved answer for a screening question.
   */
  public getAnswer(question: string, profile: UserProfile): ScreeningAnswer {
    const category = this.categorizeQuestion(question);
    const existing = this.customBank.get(category);

    if (existing && existing.isApproved) {
      return {
        ...existing,
        questionText: question,
        lastUsedAt: new Date().toISOString(),
      };
    }

    // Deterministic fallback based on profile facts
    let answerText = '';

    switch (category) {
      case 'notice_period':
        answerText = 'Available within 2 weeks of offer acceptance.';
        break;

      case 'salary':
        if (profile.preferences?.minSalary) {
          answerText = `$${profile.preferences.minSalary.toLocaleString()} ${profile.preferences.salaryCurrency || 'USD'} / year (negotiable depending on equity and total compensation).`;
        } else {
          answerText = 'Competitive market rate, open to discussion based on full compensation package.';
        }
        break;

      case 'work_auth':
        if (profile.preferences?.visaSponsorshipRequired) {
          answerText = 'Currently seeking remote contract or requiring visa sponsorship for on-site relocation.';
        } else {
          answerText = 'Yes, legally authorized to work with no current visa restrictions.';
        }
        break;

      case 'relocation':
        answerText = 'Prefer 100% remote work, but open to relocation for exceptional long-term opportunities.';
        break;

      case 'experience_years': {
        // Extract technology name from question if possible
        const techMatch = question.match(/(?:with|in)\s+([A-Za-z0-9#+.\s]+)\??$/i);
        const techName = techMatch ? techMatch[1].trim() : 'Software Engineering';
        const years = this.calculateSkillYears(profile, techName);
        answerText = `${years}+ years`;
        break;
      }

      case 'eeo_demographic':
        // Mandatory default rule: Decline to answer unless set by user
        answerText = 'I decline to self-identify / Prefer not to say';
        break;

      case 'custom':
      default:
        answerText = `With over ${calculateTotalExperienceYears(profile)} years in software engineering, my background aligns well with this requirement.`;
        break;
    }

    const answer: ScreeningAnswer = {
      id: `ans_${category}_${Date.now()}`,
      questionText: question,
      category,
      answerText,
      isApproved: true,
      lastUsedAt: new Date().toISOString(),
    };

    return answer;
  }

  public saveApprovedAnswer(answer: ScreeningAnswer): void {
    this.customBank.set(answer.category, answer);
  }

  public getAllAnswers(): ScreeningAnswer[] {
    return Array.from(this.customBank.values());
  }
}

export const defaultAnswerBank = new AnswerBankManager();
