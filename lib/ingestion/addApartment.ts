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
  | { status: 'created'; apartmentId: string };

export async function addApartmentFromInput(input: AddApartmentInput): Promise<AddApartmentResult> {
  const sourceUrl = input.html ? (recoverSourceUrl(input.html) ?? input.url) : input.url;

  if (sourceUrl && !input.force) {
    const existing = await findApartmentBySourceUrl(normalizeUrl(sourceUrl));
    if (existing) {
      return { status: 'duplicate', existingApartmentId: existing.id };
    }
  }

  const scraper = sourceUrl ? pickScraper(sourceUrl) : null;

  let html = input.html;
  if (!html && sourceUrl && scraper) {
    try {
      html = await scraper.fetchHtml(sourceUrl);
    } catch {
      html = undefined; // live fetch blocked/failed — fall back to an empty apartment
    }
  }

  const scraped = html && scraper && sourceUrl ? scraper.parse(html, sourceUrl) : null;

  const apartment = await createApartment({
    source: scraper ? scraper.source : sourceUrl ? 'OTHER' : 'MANUAL',
    sourceUrl: sourceUrl ? normalizeUrl(sourceUrl) : undefined,
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
