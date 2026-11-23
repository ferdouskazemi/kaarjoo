import PQueue from 'p-queue';
import { defaultRobotsChecker, RobotsChecker } from './robots.js';

export interface PoliteFetchOptions extends RequestInit {
  checkRobots?: boolean;
  rateLimitPerMinute?: number;
  concurrency?: number;
  maxRetries?: number;
  useCache?: boolean;
}

export interface CachedResponse {
  etag?: string;
  lastModified?: string;
  body: string;
  status: number;
  headers: Record<string, string>;
  cachedAt: number;
}

export class RobotsDisallowedError extends Error {
  constructor(public url: string) {
    super(`PoliteCrawler: robots.txt disallows crawling ${url}`);
    this.name = 'RobotsDisallowedError';
  }
}

export class PoliteRateLimitError extends Error {
  constructor(public domain: string, public retryAfterSeconds: number) {
    super(`PoliteCrawler: Rate limited by ${domain}. Backoff required: ${retryAfterSeconds}s`);
    this.name = 'PoliteRateLimitError';
  }
}

export class PoliteHttpClient {
  private queues = new Map<string, PQueue>();
  private cache = new Map<string, CachedResponse>();
  private robotsChecker: RobotsChecker;
  private readonly defaultUserAgent = 'Kaarjoo/1.0 (+https://github.com/ferdouskazemi/kaarjoo; Desktop Job Search Tool)';

  constructor(robotsChecker: RobotsChecker = defaultRobotsChecker) {
    this.robotsChecker = robotsChecker;
  }

  private getQueueForDomain(domain: string, requestsPerMinute: number = 30, concurrency: number = 2): PQueue {
    let queue = this.queues.get(domain);
    if (!queue) {
      const intervalMs = Math.ceil(60000 / requestsPerMinute);
      queue = new PQueue({
        concurrency,
        interval: intervalMs,
        intervalCap: concurrency,
      });
      this.queues.set(domain, queue);
    }
    return queue;
  }

  /**
   * Jitter helper to prevent lockstep request bursts.
   */
  private async jitter(minMs = 150, maxMs = 350): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Check robots.txt for domain before fetching.
   */
  private async ensureRobotsAllowed(urlObj: URL): Promise<void> {
    const domain = urlObj.hostname;
    let rules = this.robotsChecker.getRules(domain);

    if (rules === null) {
      try {
        const robotsUrl = `${urlObj.protocol}//${domain}/robots.txt`;
        const res = await fetch(robotsUrl, {
          headers: { 'User-Agent': this.defaultUserAgent },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const content = await res.text();
          rules = this.robotsChecker.parse(content, 'Kaarjoo');
        } else {
          rules = [];
        }
      } catch {
        // If robots.txt cannot be fetched or 404s, allow by default
        rules = [];
      }
      this.robotsChecker.setRules(domain, rules);
    }

    if (!this.robotsChecker.isAllowed(urlObj.pathname, rules)) {
      throw new RobotsDisallowedError(urlObj.toString());
    }
  }

  /**
   * Polite fetch with queueing, rate limiting, conditional requests and retry backoff.
   */
  public async fetch(url: string, options: PoliteFetchOptions = {}): Promise<{
    status: number;
    text: () => Promise<string>;
    json: <T = unknown>() => Promise<T>;
    headers: Headers;
    fromCache: boolean;
  }> {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    if (options.checkRobots !== false) {
      await this.ensureRobotsAllowed(urlObj);
    }

    const queue = this.getQueueForDomain(
      domain,
      options.rateLimitPerMinute ?? 30,
      options.concurrency ?? 2
    );

    const result = await queue.add(async () => {
      await this.jitter();

      const maxRetries = options.maxRetries ?? 2;
      let attempt = 0;

      while (attempt <= maxRetries) {
        attempt++;

        // Prepare conditional headers if cached
        const cached = options.useCache !== false ? this.cache.get(url) : undefined;
        const requestHeaders = new Headers(options.headers);
        requestHeaders.set('User-Agent', this.defaultUserAgent);
        requestHeaders.set('Accept', 'application/json, text/html, application/xhtml+xml, application/xml;q=0.9,*/*;q=0.8');

        if (cached?.etag) {
          requestHeaders.set('If-None-Match', cached.etag);
        }
        if (cached?.lastModified) {
          requestHeaders.set('If-Modified-Since', cached.lastModified);
        }

        const response = await fetch(url, {
          ...options,
          headers: requestHeaders,
        });

        // 304 Not Modified
        if (response.status === 304 && cached) {
          return {
            status: cached.status,
            text: async () => cached.body,
            json: async <T>() => JSON.parse(cached.body) as T,
            headers: new Headers(cached.headers),
            fromCache: true,
          };
        }

        // 429 Too Many Requests or 403 Forbidden
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          let waitSeconds = retryAfter ? parseInt(retryAfter, 10) : Math.pow(2, attempt);
          if (isNaN(waitSeconds) || waitSeconds <= 0) waitSeconds = 2 * attempt;

          if (attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, waitSeconds * 1000));
            continue;
          }
          throw new PoliteRateLimitError(domain, waitSeconds);
        }

        if (response.status === 403) {
          throw new Error(`PoliteCrawler: Access forbidden (403) for ${url}. Halting politely without evasion.`);
        }

        const responseText = await response.text();

        // Update cache if cacheable headers present
        const etag = response.headers.get('ETag') || undefined;
        const lastModified = response.headers.get('Last-Modified') || undefined;
        if (response.ok && (etag || lastModified)) {
          const headerMap: Record<string, string> = {};
          response.headers.forEach((v, k) => {
            headerMap[k] = v;
          });
          this.cache.set(url, {
            etag,
            lastModified,
            body: responseText,
            status: response.status,
            headers: headerMap,
            cachedAt: Date.now(),
          });
        }

        return {
          status: response.status,
          text: async () => responseText,
          json: async <T>() => JSON.parse(responseText) as T,
          headers: response.headers,
          fromCache: false,
        };
      }

      throw new Error(`PoliteCrawler: Max retries exceeded for ${url}`);
    });

    if (!result) {
      throw new Error(`PoliteCrawler: Request was aborted or cancelled for ${url}`);
    }

    return result;
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

export const defaultPoliteClient = new PoliteHttpClient();
