import { load } from 'cheerio';
import type { AtsType } from '@kaarjoo/shared';
import type { PoliteHttpClient } from '../network/client.js';

export interface DetectedAtsInfo {
  atsType: AtsType;
  boardSlug: string;
  boardUrl: string;
  companyName: string;
}

/**
 * Detects ATS type and board slug from a careers URL or website HTML.
 */
export async function detectAtsFromUrl(
  inputUrl: string,
  httpClient?: PoliteHttpClient
): Promise<DetectedAtsInfo | null> {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathParts = parsed.pathname.split('/').filter(Boolean);

  // 1. Direct Greenhouse URL
  if (hostname.includes('greenhouse.io')) {
    const slug = pathParts[0];
    if (slug) {
      return {
        atsType: 'greenhouse',
        boardSlug: slug,
        boardUrl: `https://boards.greenhouse.io/${slug}`,
        companyName: capitalize(slug),
      };
    }
  }

  // 2. Direct Lever URL
  if (hostname.includes('lever.co')) {
    const slug = pathParts[0];
    if (slug) {
      return {
        atsType: 'lever',
        boardSlug: slug,
        boardUrl: `https://jobs.lever.co/${slug}`,
        companyName: capitalize(slug),
      };
    }
  }

  // 3. Direct Ashby URL
  if (hostname.includes('ashbyhq.com')) {
    const slug = pathParts[0];
    if (slug) {
      return {
        atsType: 'ashby',
        boardSlug: slug,
        boardUrl: `https://jobs.ashbyhq.com/${slug}`,
        companyName: capitalize(slug),
      };
    }
  }

  // 4. Direct Workable URL
  if (hostname.includes('workable.com')) {
    const slug = pathParts[0];
    if (slug) {
      return {
        atsType: 'workable',
        boardSlug: slug,
        boardUrl: `https://apply.workable.com/${slug}`,
        companyName: capitalize(slug),
      };
    }
  }

  // 5. If not a direct ATS URL, probe the careers page if httpClient is provided
  if (httpClient) {
    try {
      const res = await httpClient.fetch(parsed.toString(), {
        checkRobots: false,
        maxRetries: 1,
      });

      const html = await res.text();
      const $ = load(html);

      // Look for iframes
      const iframes = $('iframe');
      for (let i = 0; i < iframes.length; i++) {
        const src = iframes.eq(i).attr('src') || '';
        const detected = await detectAtsFromUrl(src);
        if (detected) return detected;
      }

      // Look for embedded links pointing to supported ATS boards
      const links = $('a[href]');
      for (let i = 0; i < links.length; i++) {
        const href = links.eq(i).attr('href') || '';
        if (
          href.includes('greenhouse.io') ||
          href.includes('lever.co') ||
          href.includes('ashbyhq.com') ||
          href.includes('workable.com')
        ) {
          const detected = await detectAtsFromUrl(href);
          if (detected) return detected;
        }
      }

      // Check for scripts
      const scripts = $('script[src]');
      for (let i = 0; i < scripts.length; i++) {
        const src = scripts.eq(i).attr('src') || '';
        const matchGh = src.match(/boards\.greenhouse\.io\/embed\/job_board\/js\?for=([a-zA-Z0-9_-]+)/);
        if (matchGh && matchGh[1]) {
          return {
            atsType: 'greenhouse',
            boardSlug: matchGh[1],
            boardUrl: `https://boards.greenhouse.io/${matchGh[1]}`,
            companyName: capitalize(matchGh[1]),
          };
        }
      }
    } catch {
      // Ignore network errors during probing
    }
  }

  return null;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
