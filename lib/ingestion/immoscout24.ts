import * as cheerio from 'cheerio';
import type { Scraper, ScrapedApartment } from './types';
import { extractGalleryImages } from './extractGalleryImages';
import { parseGermanNumber } from './parseGermanNumber';
import { parseProvisionPercent } from './parseProvisionPercent';

const CDN_HOST = 'pictures.immobilienscout24.de';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export const immoscout24Scraper: Scraper = {
  source: 'IMMOSCOUT24',

  canHandle(url: string): boolean {
    return /immobilienscout24\.de/.test(url);
  },

  async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      throw new Error(`ImmoScout24 fetch failed: HTTP ${response.status}`);
    }
    return response.text();
  },

  parse(html: string, sourceUrl: string): ScrapedApartment {
    const $ = cheerio.load(html);
    const result: ScrapedApartment = { images: [] };

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        const nodes: Array<Record<string, any>> = data['@graph'] ?? [data];
        const listing = nodes.find((node) => node['@type'] === 'RealEstateListing');
        if (listing) {
          if (listing.name) result.title = listing.name;
          if (listing.offers?.price) result.price = Number(listing.offers.price);
          const addr = listing.address;
          if (addr) {
            const cityLine = [addr.postalCode, addr.addressLocality].filter(Boolean).join(' ');
            const parts = [addr.streetAddress, cityLine].filter(Boolean);
            if (parts.length) result.address = parts.join(', ');
          }
        }
      } catch {
        // not the listing's JSON-LD block, or malformed — skip it
      }
    });

    const qaText = (className: string): string | undefined => {
      const text = $(`.${className}`).first().text().trim();
      return text || undefined;
    };

    const rooms = parseGermanNumber(qaText('is24qa-zimmer'));
    if (rooms !== undefined) result.rooms = rooms;
    const livingArea = parseGermanNumber(qaText('is24qa-wohnflaeche-ca'));
    if (livingArea !== undefined) result.livingArea = livingArea;
    const floor = qaText('is24qa-etage');
    if (floor) result.floor = floor;
    const hausgeld = parseGermanNumber(qaText('is24qa-hausgeld'));
    if (hausgeld !== undefined) result.hausgeld = hausgeld;
    const maklerprovision = qaText('is24qa-provision');
    if (maklerprovision) {
      result.maklerprovisionPercent = parseProvisionPercent(maklerprovision);
    }

    // IS24's boolean-feature indicator tags only render when the feature IS
    // present — there is no explicit "no balcony" tag — so absence means
    // "unknown", not "false". Only ever set true, never false.
    if ($('[data-qa="is24qa-balcony-label"]').length > 0) result.balcony = true;
    if ($('[data-qa="is24qa-lift-label"]').length > 0) result.elevator = true;
    // No dedicated indicator tag confirmed for a fitted kitchen (not present
    // on the sample listing) — fall back to a keyword match against the same
    // container that holds the balcony/lift tags as human-readable text.
    if (/einbauküche/i.test($('#is24-boolean-criteria').text())) result.kitchen = true;

    const localSrcs = $('#is24-gallery-entry-point')
      .find('img[data-testid="gallery-entry-image"]')
      .map((_, img) => $(img).attr('src') ?? '')
      .get()
      .filter(Boolean);
    result.images = extractGalleryImages(html, localSrcs, CDN_HOST);

    return result;
  },
};
