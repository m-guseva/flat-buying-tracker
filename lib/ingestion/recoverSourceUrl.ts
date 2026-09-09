import * as cheerio from 'cheerio';

export function recoverSourceUrl(html: string): string | null {
  const $ = cheerio.load(html);
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) return canonical;
  const ogUrl = $('meta[property="og:url"]').attr('content');
  return ogUrl ?? null;
}
