import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { immoscout24Scraper } from '@/lib/ingestion/immoscout24';

const fixtureHtml = readFileSync(path.join(process.cwd(), 'tests/fixtures/immoscout24.html'), 'utf-8');
const sourceUrl = 'https://www.immobilienscout24.de/expose/169009235';

describe('immoscout24Scraper.canHandle', () => {
  it('matches immobilienscout24.de URLs', () => {
    expect(immoscout24Scraper.canHandle('https://www.immobilienscout24.de/expose/123')).toBe(true);
  });

  it('rejects other URLs', () => {
    expect(immoscout24Scraper.canHandle('https://www.immowelt.de/expose/123')).toBe(false);
  });
});

describe('immoscout24Scraper.parse', () => {
  const result = immoscout24Scraper.parse(fixtureHtml, sourceUrl);

  it('extracts title, address, and price from JSON-LD', () => {
    expect(result.title).toBe('2-Zimmerwohnung mit Wintergarten in Berlin-Alt-Treptow');
    expect(result.address).toBe('Elsenstraße 5, 12435 Berlin');
    expect(result.price).toBe(229900);
  });

  it('extracts rooms, living area, floor, and hausgeld', () => {
    expect(result.rooms).toBe(2);
    expect(result.livingArea).toBeCloseTo(45.99);
    expect(result.floor).toBe('1 von 4');
    expect(result.hausgeld).toBe(328);
  });

  it('leaves maklerprovisionPercent undefined when the text has no percentage', () => {
    expect(result.maklerprovisionPercent).toBeUndefined();
  });

  it('detects balcony and elevator as present', () => {
    expect(result.balcony).toBe(true);
    expect(result.elevator).toBe(true);
  });

  it('leaves condition and kitchen undefined when not present on the listing', () => {
    expect(result.condition).toBeUndefined();
    expect(result.kitchen).toBeUndefined();
  });

  it('detects kitchen when "Einbauküche" is mentioned in the boolean-criteria section', () => {
    const htmlWithKitchen = fixtureHtml.replace(
      'id="is24-boolean-criteria">',
      'id="is24-boolean-criteria"><span>Einbauküche</span>',
    );
    expect(immoscout24Scraper.parse(htmlWithKitchen, sourceUrl).kitchen).toBe(true);
  });

  it('extracts the 4 real gallery images at full size, excluding recommended listings', () => {
    expect(result.images).toEqual([
      'https://pictures.immobilienscout24.de/listings/13922db7-711e-470c-9f78-500aa4536aee-2052742405.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80',
      'https://pictures.immobilienscout24.de/listings/0c717341-0ac4-465a-a007-3b8e6f8561fd-2052742407.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80',
      'https://pictures.immobilienscout24.de/listings/18ae457b-9861-4af7-9ede-2821857e6d73-2052742404.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80',
      'https://pictures.immobilienscout24.de/listings/71272d62-4166-4ed2-8f0c-54846711248d-2052742408.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80',
    ]);
  });
});
