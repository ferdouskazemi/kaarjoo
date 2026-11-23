import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
});

// Remove noisy/irrelevant tags
turndown.remove(['script', 'style', 'iframe', 'form', 'button', 'nav', 'footer', 'noscript']);

/**
 * Converts raw HTML content into clean, normalized Markdown.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';

  try {
    const md = turndown.turndown(html);
    return md
      // Collapse more than two consecutive newlines into two
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    // Fallback: strip tags if turndown encounters malformed HTML
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
