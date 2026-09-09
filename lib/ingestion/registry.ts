import { immoscout24Scraper } from './immoscout24';
import { immoweltScraper } from './immowelt';
import type { Scraper } from './types';

const scrapers: Scraper[] = [immoscout24Scraper, immoweltScraper];

export function pickScraper(url: string): Scraper | null {
  return scrapers.find((scraper) => scraper.canHandle(url)) ?? null;
}
