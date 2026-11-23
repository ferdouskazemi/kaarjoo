import { SkillItem } from '@kaarjoo/shared';

export interface CanonicalSkill {
  escoId: string;
  canonicalName: string;
  category: string;
  aliases: string[];
}

export const CANONICAL_SKILLS_TAXONOMY: CanonicalSkill[] = [
  { escoId: 'esco_js', canonicalName: 'JavaScript', category: 'Programming Languages', aliases: ['javascript', 'js', 'جاوااسکریپت'] },
  { escoId: 'esco_ts', canonicalName: 'TypeScript', category: 'Programming Languages', aliases: ['typescript', 'ts', 'تایپ‌اسکریپت'] },
  { escoId: 'esco_py', canonicalName: 'Python', category: 'Programming Languages', aliases: ['python', 'py', 'پایتون', 'python3'] },
  { escoId: 'esco_react', canonicalName: 'React', category: 'Frontend Frameworks', aliases: ['react', 'react.js', 'reactjs', 'ری‌اکت', 'ری‌اکت‌جی‌اس'] },
  { escoId: 'esco_node', canonicalName: 'Node.js', category: 'Backend Frameworks', aliases: ['node', 'node.js', 'nodejs', 'نود', 'نودجی‌اس'] },
  { escoId: 'esco_pg', canonicalName: 'PostgreSQL', category: 'Databases', aliases: ['postgresql', 'postgres', 'پستگرس'] },
  { escoId: 'esco_sqlite', canonicalName: 'SQLite', category: 'Databases', aliases: ['sqlite', 'اس‌کیولایت'] },
  { escoId: 'esco_docker', canonicalName: 'Docker', category: 'DevOps & Tools', aliases: ['docker', 'داکر'] },
  { escoId: 'esco_k8s', canonicalName: 'Kubernetes', category: 'DevOps & Tools', aliases: ['kubernetes', 'k8s', 'کوبرنتیز'] },
  { escoId: 'esco_git', canonicalName: 'Git', category: 'DevOps & Tools', aliases: ['git', 'گیت'] },
  { escoId: 'esco_rust', canonicalName: 'Rust', category: 'Programming Languages', aliases: ['rust', 'راست'] },
  { escoId: 'esco_go', canonicalName: 'Go', category: 'Programming Languages', aliases: ['go', 'golang', 'گو'] },
  { escoId: 'esco_kafka', canonicalName: 'Apache Kafka', category: 'Distributed Systems', aliases: ['kafka', 'apache kafka', 'کافکا'] },
  { escoId: 'esco_redis', canonicalName: 'Redis', category: 'Databases', aliases: ['redis', 'ردیس'] },
  { escoId: 'esco_pytorch', canonicalName: 'PyTorch', category: 'AI & Machine Learning', aliases: ['pytorch', 'پای‌تورچ'] },
];

export function extractSkills(text: string): SkillItem[] {
  if (!text.trim()) return [];

  const lowerText = text.toLowerCase();
  const matchedSkills: SkillItem[] = [];
  const seenIds = new Set<string>();

  for (const skill of CANONICAL_SKILLS_TAXONOMY) {
    let isMatched = false;

    // Check aliases
    for (const alias of skill.aliases) {
      // Word boundary match
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9_\u0600-\u06FF])${escaped}(?:$|[^a-zA-Z0-9_\u0600-\u06FF])`, 'i');

      if (regex.test(lowerText) || lowerText.includes(alias)) {
        isMatched = true;
        break;
      }
    }

    if (isMatched && !seenIds.has(skill.escoId)) {
      seenIds.add(skill.escoId);
      matchedSkills.push({
        id: `skill_${skill.escoId}`,
        name: skill.canonicalName,
        escoId: skill.escoId,
        category: skill.category,
      });
    }
  }

  return matchedSkills;
}
