import { getApartment, updateApartment, type UpdateApartmentInput } from '@/lib/db/apartments';
import { normalizeUrl } from './normalizeUrl';
import { recoverSourceUrl } from './recoverSourceUrl';
import { pickScraper } from './registry';
import { downloadAndStoreImages } from './downloadAndStoreImages';
import type { ScrapedApartment } from './types';

type ApartmentWithRelations = NonNullable<Awaited<ReturnType<typeof getApartment>>>;

export async function retryImportFromHtml(apartmentId: string, html: string): Promise<void> {
  const apartment = await getApartment(apartmentId);
  if (!apartment) return;

  const recoveredUrl = recoverSourceUrl(html);

  // Refuse the backfill if the uploaded file's own canonical URL doesn't match
  // the listing this apartment was created from — otherwise a saved page for a
  // different listing would silently overwrite this apartment's data.
  if (recoveredUrl && apartment.sourceUrl) {
    let normalizedRecoveredUrl: string | null;
    try {
      normalizedRecoveredUrl = normalizeUrl(recoveredUrl);
    } catch {
      normalizedRecoveredUrl = null;
    }
    if (normalizedRecoveredUrl !== apartment.sourceUrl) {
      return;
    }
  }

  const sourceUrl = recoveredUrl ?? apartment.sourceUrl ?? undefined;
  const scraper = sourceUrl ? pickScraper(sourceUrl) : null;
  if (!scraper || !sourceUrl) return;

  const scraped = scraper.parse(html, sourceUrl);
  const fillable = fillableFieldsFrom(apartment, scraped);
  if (Object.keys(fillable).length > 0) {
    await updateApartment(apartmentId, fillable);
  }
  if (apartment.images.length === 0 && scraped.images.length > 0) {
    await downloadAndStoreImages(apartmentId, scraped.images);
  }
}

function fillableFieldsFrom(apartment: ApartmentWithRelations, scraped: ScrapedApartment): UpdateApartmentInput {
  const result: UpdateApartmentInput = {};
  if (scraped.title !== undefined && apartment.title == null) result.title = scraped.title;
  if (scraped.address !== undefined && apartment.address == null) result.address = scraped.address;
  if (scraped.price !== undefined && apartment.price == null) result.price = scraped.price;
  if (scraped.rooms !== undefined && apartment.rooms == null) result.rooms = scraped.rooms;
  if (scraped.livingArea !== undefined && apartment.livingArea == null) result.livingArea = scraped.livingArea;
  if (scraped.floor !== undefined && apartment.floor == null) result.floor = scraped.floor;
  if (scraped.balcony !== undefined && apartment.balcony == null) result.balcony = scraped.balcony;
  if (scraped.elevator !== undefined && apartment.elevator == null) result.elevator = scraped.elevator;
  if (scraped.kitchen !== undefined && apartment.kitchen == null) result.kitchen = scraped.kitchen;
  if (scraped.condition !== undefined && apartment.condition == null) result.condition = scraped.condition;
  if (scraped.hausgeld !== undefined && apartment.hausgeld == null) result.hausgeld = scraped.hausgeld;
  if (scraped.maklerprovisionPercent !== undefined && apartment.maklerprovisionPercent == null) {
    result.maklerprovisionPercent = scraped.maklerprovisionPercent;
  }
  return result;
}
