import { createApartment, findApartmentBySourceUrl } from '@/lib/db/apartments';
import { normalizeUrl } from './normalizeUrl';
import { recoverSourceUrl } from './recoverSourceUrl';
import { pickScraper } from './registry';
import { downloadAndStoreImages } from './downloadAndStoreImages';
import type { ScrapedApartment } from './types';

export type AddApartmentInput = {
  url?: string;
  html?: string;
  force?: boolean;
};

export type AddApartmentResult =
  | { status: 'duplicate'; existingApartmentId: string }
  | { status: 'created'; apartmentId: string }
  | { status: 'invalid' };

function tryNormalizeUrl(url: string): string | null {
  try {
    return normalizeUrl(url);
  } catch {
    return null;
  }
}

export async function addApartmentFromInput(input: AddApartmentInput): Promise<AddApartmentResult> {
  const candidateUrl = input.html ? (recoverSourceUrl(input.html) ?? input.url) : input.url;

  // An HTML file was provided but we couldn't recover a canonical URL from it,
  // and no URL was separately pasted either — we genuinely can't identify this input.
  if (input.html && !candidateUrl) {
    return { status: 'invalid' };
  }

  let normalizedUrl: string | null = null;
  if (candidateUrl) {
    normalizedUrl = tryNormalizeUrl(candidateUrl);
    // A candidate URL string exists but doesn't parse as a valid absolute URL.
    if (!normalizedUrl) {
      return { status: 'invalid' };
    }
  }

  if (normalizedUrl && !input.force) {
    const existing = await findApartmentBySourceUrl(normalizedUrl);
    if (existing) {
      return { status: 'duplicate', existingApartmentId: existing.id };
    }
  }

  const scraper = candidateUrl ? pickScraper(candidateUrl) : null;

  let html = input.html;
  if (!html && candidateUrl && scraper) {
    try {
      html = await scraper.fetchHtml(candidateUrl);
    } catch {
      html = undefined; // live fetch blocked/failed — fall back to an empty apartment
    }
  }

  const scraped = html && scraper && candidateUrl ? scraper.parse(html, candidateUrl) : null;

  const apartment = await createApartment({
    source: scraper ? scraper.source : candidateUrl ? 'OTHER' : 'MANUAL',
    sourceUrl: normalizedUrl ?? undefined,
    ...(scraped ? scrapedToCreateFields(scraped) : {}),
  });

  if (scraped && scraped.images.length > 0) {
    await downloadAndStoreImages(apartment.id, scraped.images);
  }

  return { status: 'created', apartmentId: apartment.id };
}

function scrapedToCreateFields(scraped: ScrapedApartment): Omit<ScrapedApartment, 'images'> {
  const { images, ...rest } = scraped;
  return rest;
}
