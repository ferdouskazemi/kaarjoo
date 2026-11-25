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
  { escoId: 'esco_aws', canonicalName: 'AWS', category: 'Cloud Platforms', aliases: ['aws', 'amazon web services'] },
  { escoId: 'esco_terraform', canonicalName: 'Terraform', category: 'DevOps & Tools', aliases: ['terraform'] },
  { escoId: 'esco_linux', canonicalName: 'Linux', category: 'Systems', aliases: ['linux', 'ubuntu', 'لینوکس'] },
  { escoId: 'esco_cicd', canonicalName: 'CI/CD', category: 'DevOps & Tools', aliases: ['ci/cd', 'github actions', 'gitlab ci'] },
  { escoId: 'esco_sql', canonicalName: 'SQL', category: 'Databases', aliases: ['sql'] },
  { escoId: 'esco_nextjs', canonicalName: 'Next.js', category: 'Frontend Frameworks', aliases: ['next.js', 'nextjs'] },
  { escoId: 'esco_tailwind', canonicalName: 'Tailwind CSS', category: 'Frontend Frameworks', aliases: ['tailwind css', 'tailwindcss', 'tailwind'] },
  { escoId: 'esco_graphql', canonicalName: 'GraphQL', category: 'Backend Frameworks', aliases: ['graphql'] },
  { escoId: 'esco_rest', canonicalName: 'REST APIs', category: 'Backend Frameworks', aliases: ['rest apis', 'rest api', 'restful'] },
  { escoId: 'esco_playwright', canonicalName: 'Playwright', category: 'Testing', aliases: ['playwright'] },
  { escoId: 'esco_vitest', canonicalName: 'Vitest', category: 'Testing', aliases: ['vitest'] },
  { escoId: 'esco_java', canonicalName: 'Java', category: 'Programming Languages', aliases: ['java', 'جاوا'] },
  { escoId: 'esco_spring', canonicalName: 'Spring Boot', category: 'Backend Frameworks', aliases: ['spring boot', 'spring'] },
  { escoId: 'esco_flutter', canonicalName: 'Flutter', category: 'Mobile', aliases: ['flutter', 'فلاتر'] },
  { escoId: 'esco_kotlin', canonicalName: 'Kotlin', category: 'Programming Languages', aliases: ['kotlin', 'کاتلین'] },
  { escoId: 'esco_figma', canonicalName: 'Figma', category: 'Design', aliases: ['figma', 'فیگما'] },
  { escoId: 'esco_agile', canonicalName: 'Agile', category: 'Methodology', aliases: ['agile', 'scrum'] },
  { escoId: 'esco_sec', canonicalName: 'Cybersecurity', category: 'Security', aliases: ['cybersecurity', 'appsec', 'penetration testing'] },
  { escoId: 'esco_tauri', canonicalName: 'Tauri', category: 'Desktop', aliases: ['tauri'] },
  { escoId: 'esco_cpp', canonicalName: 'C++', category: 'Programming Languages', aliases: ['c++'] },
  { escoId: 'esco_nlp', canonicalName: 'NLP', category: 'AI & Machine Learning', aliases: ['nlp', 'natural language processing'] },
  { escoId: 'esco_microservices', canonicalName: 'Microservices', category: 'Architecture', aliases: ['microservices', 'میکروسرویس'] },
  { escoId: 'esco_mysql', canonicalName: 'MySQL', category: 'Databases', aliases: ['mysql'] },
  { escoId: 'esco_redux', canonicalName: 'Redux', category: 'Frontend Frameworks', aliases: ['redux'] },
  { escoId: 'esco_html', canonicalName: 'HTML', category: 'Frontend Frameworks', aliases: ['html', 'html5'] },
  { escoId: 'esco_css', canonicalName: 'CSS', category: 'Frontend Frameworks', aliases: ['css', 'css3'] },
  { escoId: 'esco_bootstrap', canonicalName: 'Bootstrap', category: 'Frontend Frameworks', aliases: ['bootstrap'] },
  { escoId: 'esco_wordpress', canonicalName: 'WordPress', category: 'CMS', aliases: ['wordpress'] },
  { escoId: 'esco_shopify', canonicalName: 'Shopify', category: 'CMS', aliases: ['shopify'] },
  { escoId: 'esco_azure', canonicalName: 'Microsoft Azure', category: 'Cloud Platforms', aliases: ['microsoft azure', 'azure'] },
  { escoId: 'esco_hubspot', canonicalName: 'HubSpot', category: 'Platforms', aliases: ['hubspot'] },
  { escoId: 'esco_chartjs', canonicalName: 'Chart.js', category: 'Frontend Frameworks', aliases: ['chart.js', 'chartjs'] },
];

export function extractSkills(text: string): SkillItem[] {
  if (!text.trim()) return [];

  const lowerText = text.toLowerCase();
  const matchedSkills: SkillItem[] = [];
  const seenIds = new Set<string>();

  for (const skill of CANONICAL_SKILLS_TAXONOMY) {
    let isMatched = false;

    // Check aliases with boundary checks to prevent substring false positives (e.g. 'sql' in 'postgresql')
    for (const alias of skill.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9_\u0600-\u06FF])${escaped}(?:$|[^a-zA-Z0-9_\u0600-\u06FF])`, 'i');

      if (regex.test(lowerText)) {
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
