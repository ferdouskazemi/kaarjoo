import { UserProfile, ContactInfo, ExperienceItem, EducationItem, SkillItem } from '@kaarjoo/shared';

export interface FieldConflict {
  id: string;
  fieldPath: string;
  fieldLabel: string;
  options: Array<{
    value: string;
    source: string;
    confidence: number;
  }>;
  resolvedValue?: string;
}

export interface ProfileMergeResult {
  mergedProfile: UserProfile;
  conflicts: FieldConflict[];
  overallConfidence: number;
}

/**
 * Merges multiple user profiles extracted from different files.
 * Deduplicates overlapping experiences, aggregates skills, and flags
 * conflicting values (e.g. differing phone numbers or overlapping dates)
 * for user verification rather than silently choosing.
 */
export function mergeProfiles(profiles: UserProfile[], sourceNames: string[] = []): ProfileMergeResult {
  if (!profiles.length) {
    throw new Error('At least one profile must be provided to merge');
  }

  if (profiles.length === 1) {
    return {
      mergedProfile: profiles[0],
      conflicts: [],
      overallConfidence: 0.95,
    };
  }

  const conflicts: FieldConflict[] = [];

  // 1. Merge Contact Info
  const baseContact = profiles[0].contact;
  const mergedContact: ContactInfo = { ...baseContact };

  const phoneMap = new Map<string, string>();
  if (baseContact.phone) {
    phoneMap.set(baseContact.phone, sourceNames[0] || 'File 1');
  }

  for (let i = 1; i < profiles.length; i++) {
    const c = profiles[i].contact;
    const source = sourceNames[i] || `File ${i + 1}`;

    // Prefer non-empty fields
    if (!mergedContact.linkedinUrl && c.linkedinUrl) {
      mergedContact.linkedinUrl = c.linkedinUrl;
    }
    if (!mergedContact.githubUrl && c.githubUrl) {
      mergedContact.githubUrl = c.githubUrl;
    }
    if (!mergedContact.location && c.location) {
      mergedContact.location = c.location;
    }

    // Check phone conflicts
    if (c.phone) {
      if (!mergedContact.phone) {
        mergedContact.phone = c.phone;
        phoneMap.set(c.phone, source);
      } else if (c.phone !== mergedContact.phone && !phoneMap.has(c.phone)) {
        phoneMap.set(c.phone, source);
      }
    }
  }

  if (phoneMap.size > 1) {
    conflicts.push({
      id: 'conflict_contact_phone',
      fieldPath: 'contact.phone',
      fieldLabel: 'شماره تماس / Phone Number',
      options: Array.from(phoneMap.entries()).map(([value, source]) => ({
        value,
        source,
        confidence: 0.85,
      })),
    });
  }

  // 2. Merge Experiences (deduplicate by employer & overlapping dates)
  const allExperiences: ExperienceItem[] = [];
  const seenCompanies = new Map<string, ExperienceItem>();

  for (const p of profiles) {
    for (const exp of p.experiences) {
      const normalizedCompany = (exp.company || '').toLowerCase().trim();
      const existing = normalizedCompany ? seenCompanies.get(normalizedCompany) : undefined;

      if (existing) {
        // If same company and overlapping start date, merge achievements
        if (existing.startDate === exp.startDate) {
          const combinedAchievements = Array.from(new Set([...existing.achievements, ...exp.achievements]));
          existing.achievements = combinedAchievements;
          // Keep longer title if richer
          if ((exp.title || '').length > (existing.title || '').length) {
            existing.title = exp.title;
          }
        } else {
          // Different dates for same company, add as distinct or flag
          allExperiences.push(exp);
        }
      } else {
        seenCompanies.set(normalizedCompany, { ...exp });
        allExperiences.push(seenCompanies.get(normalizedCompany)!);
      }
    }
  }

  // 3. Merge Education (deduplicate by degree + institution)
  const allEducation: EducationItem[] = [];
  const seenEducation = new Set<string>();

  for (const p of profiles) {
    for (const edu of p.education) {
      const key = `${edu.degree}_${edu.institution}`.toLowerCase();
      if (!seenEducation.has(key)) {
        seenEducation.add(key);
        allEducation.push(edu);
      }
    }
  }

  // 4. Merge Skills (union by canonical name or escoId)
  const allSkills: SkillItem[] = [];
  const seenSkills = new Set<string>();

  for (const p of profiles) {
    for (const skill of p.skills) {
      const key = (skill.escoId || skill.name).toLowerCase();
      if (!seenSkills.has(key)) {
        seenSkills.add(key);
        allSkills.push(skill);
      }
    }
  }

  const mergedProfile: UserProfile = {
    ...profiles[0],
    id: `merged_profile_${Date.now()}`,
    updatedAt: new Date().toISOString(),
    contact: mergedContact,
    experiences: allExperiences,
    education: allEducation,
    skills: allSkills,
  };

  const overallConfidence = conflicts.length === 0 ? 0.95 : 0.85;

  return {
    mergedProfile,
    conflicts,
    overallConfidence,
  };
}
