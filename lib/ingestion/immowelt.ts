import * as cheerio from 'cheerio';
import type { Scraper, ScrapedApartment } from './types';
import { extractGalleryImages } from './extractGalleryImages';
import { parseGermanNumber } from './parseGermanNumber';

const CDN_HOST = 'mms.immowelt.de';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export const immoweltScraper: Scraper = {
  source: 'IMMOWELT',

  canHandle(url: string): boolean {
    return /immowelt\.de/.test(url);
  },

  async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      throw new Error(`Immowelt fetch failed: HTTP ${response.status}`);
    }
    return response.text();
  },

  parse(html: string, sourceUrl: string): ScrapedApartment {
    const $ = cheerio.load(html);
    const result: ScrapedApartment = { images: [] };

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data['@type'] === 'RealEstateListing' && data.name) {
          result.title = data.name;
        }
      } catch {
        // not the listing's JSON-LD block, or malformed — skip it
      }
    });

    const address = $('[data-testid="cdp-location-address"]').first().text().trim();
    if (address) result.address = address;

    // cheerio's .text() concatenates sibling elements with no inserted
    // whitespace (e.g. "Kaufpreis360000 €", not "Kaufpreis 360000 €"), so
    // these patterns deliberately do not require whitespace after the label.
    const priceBoxText = $('[data-testid="cdp-price"]').first().text();
    const beforeCostBreakdown = priceBoxText.split('Geschätzte Gesamtkosten')[0];

    const priceMatch = beforeCostBreakdown.match(/Kaufpreis(\d+)\s*€/);
    if (priceMatch) result.price = Number(priceMatch[1]);

    const hausgeldMatch = beforeCostBreakdown.match(/Hausgeld(\d+)\s*€/);
    if (hausgeldMatch) result.hausgeld = Number(hausgeldMatch[1]);

    // "Provision für Käufer" appears a second time inside the cost-breakdown
    // section in a different format ("(3,57%)") — beforeCostBreakdown already
    // excludes that, so this only ever matches the first occurrence.
    const provisionMatch = beforeCostBreakdown.match(/Provision für Käufer([\d,]+\s*%[^]*?)(?=Geld vom Staat|$)/);
    if (provisionMatch) result.maklerprovision = provisionMatch[1].trim();

    const hardfactSpans = $('[data-testid="cdp-hardfacts-keyfacts"]')
      .children('span')
      .map((_, el) => $(el).text().replace(/^•/, '').trim())
      .get();

    for (const text of hardfactSpans) {
      const roomsMatch = text.match(/^(\d+)\s*Zimmer/);
      if (roomsMatch) result.rooms = Number(roomsMatch[1]);
      const areaMatch = text.match(/^([\d,]+)\s*m²/);
      if (areaMatch) result.livingArea = parseGermanNumber(areaMatch[1]);
      if (/Geschoss/.test(text)) result.floor = text;
    }

    // No per-feature hook exists (Emotion's css-xxxxxx classnames are not
    // stable across deploys) — match each list item's text against known
    // keywords instead. German compound nouns keep the second component
    // lowercase ("Personenaufzug", not "PersonenAufzug"), hence /i.
    $('[data-testid="cdp-features"] li').each((_, el) => {
      const text = $(el).text().trim();
      if (/balkon/i.test(text)) result.balcony = true;
      if (/aufzug|fahrstuhl/i.test(text)) result.elevator = true;
      if (/einbauküche/i.test(text)) result.kitchen = text;
    });

    const localSrcs = $('[data-testid="cdp-medias-overview"]')
      .find('img')
      .map((_, img) => $(img).attr('src') ?? '')
      .get()
      .filter(Boolean);
    result.images = extractGalleryImages(html, localSrcs, CDN_HOST);

    return result;
  },
};
