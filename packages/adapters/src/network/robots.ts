/**
 * robots.txt parser and in-memory cache for polite crawling.
 */

export interface RobotsRule {
  allow: boolean;
  pattern: string;
}

export class RobotsChecker {
  private cache = new Map<string, { rules: RobotsRule[]; fetchedAt: number }>();
  private readonly ttlMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Parse robots.txt content into rules for wildcard or Kaarjoo user-agent.
   */
  public parse(content: string, userAgent: string = 'Kaarjoo'): RobotsRule[] {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const rules: RobotsRule[] = [];

    let appliesToUs = false;

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const directive = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (directive === 'user-agent') {
        const agent = value.toLowerCase();
        appliesToUs = agent === '*' || agent === userAgent.toLowerCase();
      } else if (appliesToUs) {
        if (directive === 'disallow') {
          if (value === '') {
            // "Disallow: " with empty value means allow all
            rules.push({ allow: true, pattern: '/' });
          } else {
            rules.push({ allow: false, pattern: value });
          }
        } else if (directive === 'allow') {
          rules.push({ allow: true, pattern: value });
        }
      }
    }

    // Sort rules by pattern length descending so specific rules match before general ones
    rules.sort((a, b) => b.pattern.length - a.pattern.length);
    return rules;
  }

  /**
   * Check if a URL path is allowed according to robots rules.
   */
  public isAllowed(urlPath: string, rules: RobotsRule[]): boolean {
    if (rules.length === 0) return true;

    for (const rule of rules) {
      if (this.matchesPattern(urlPath, rule.pattern)) {
        return rule.allow;
      }
    }

    return true; // Default allowed if no rule matches
  }

  public setRules(domain: string, rules: RobotsRule[]): void {
    this.cache.set(domain.toLowerCase(), {
      rules,
      fetchedAt: Date.now(),
    });
  }

  public getRules(domain: string): RobotsRule[] | null {
    const entry = this.cache.get(domain.toLowerCase());
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > this.ttlMs) {
      this.cache.delete(domain.toLowerCase());
      return null;
    }
    return entry.rules;
  }

  private matchesPattern(path: string, pattern: string): boolean {
    if (pattern === '/') return true;
    // Simple prefix matching with wildcards
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(path);
  }
}

export const defaultRobotsChecker = new RobotsChecker();
