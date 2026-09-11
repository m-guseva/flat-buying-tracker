import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { immoweltScraper } from '@/lib/ingestion/immowelt';

const fixtureHtml = readFileSync(path.join(process.cwd(), 'tests/fixtures/immowelt.html'), 'utf-8');
const sourceUrl = 'https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3';

describe('immoweltScraper.canHandle', () => {
  it('matches immowelt.de URLs', () => {
    expect(immoweltScraper.canHandle('https://www.immowelt.de/expose/123')).toBe(true);
  });

  it('rejects other URLs', () => {
    expect(immoweltScraper.canHandle('https://www.immobilienscout24.de/expose/123')).toBe(false);
  });
});

describe('immoweltScraper.parse', () => {
  const result = immoweltScraper.parse(fixtureHtml, sourceUrl);

  it('extracts a title from JSON-LD (an auto-generated summary on this listing)', () => {
    expect(result.title).toBe('Wohnung 46.25 m² 360000 € zum Kauf Mitte,Berlin (10115)');
  });

  it('extracts only district and postal code for address (no street address is present)', () => {
    expect(result.address).toBe('Mitte, Mitte (10115)');
  });

  it('extracts price, hausgeld, and maklerprovisionPercent from the price details box', () => {
    expect(result.price).toBe(360000);
    expect(result.hausgeld).toBe(380);
    expect(result.maklerprovisionPercent).toBeCloseTo(3.57);
  });

  it('extracts rooms, living area, and floor from the hardfacts row', () => {
    expect(result.rooms).toBe(2);
    expect(result.livingArea).toBeCloseTo(46.3);
    expect(result.floor).toBe('3. Geschoss');
  });

  it('detects balcony, elevator, and kitchen from the features list', () => {
    expect(result.balcony).toBe(true);
    expect(result.elevator).toBe(true);
    expect(result.kitchen).toBe(true);
  });

  it('leaves condition undefined when no condition keyword is present', () => {
    expect(result.condition).toBeUndefined();
  });

  it('extracts the energy efficiency class from the highlighted scale marker', () => {
    expect(result.energieausweis).toBe('B');
  });

  it('extracts all 13 real gallery images, excluding similar listings', () => {
    expect(result.images).toEqual([
      'https://mms.immowelt.de/2/b/6/7/2b67b692-e8f0-4b0f-b9fb-be45f34a8978.jpg?ci_seal=f0bbac39e4223fdf2260b7399e829880a3ce2ec6',
      'https://mms.immowelt.de/d/4/e/2/d4e21e41-36b9-48cc-a224-560c5351e086.jpg?ci_seal=ea9f99c9725e37e6e2e0980eb7100d5bcfef243f',
      'https://mms.immowelt.de/2/e/3/2/2e329ed7-dcb7-4cd6-894c-2f1fe72cf6e2.jpg?ci_seal=cc407a921c2adc375989255efaa5a4a712e3171c',
      'https://mms.immowelt.de/1/1/6/e/116ec32e-337e-4c20-8ba8-d71ba70235a2.jpg?ci_seal=9147f29df6d6583882f97a45591996f82487300f',
      'https://mms.immowelt.de/1/1/c/0/11c0cca9-96cf-4325-bccc-a862347373ca.jpg?ci_seal=5af42afd93b29ef297af3039e7bd4b0726b1e62e',
      'https://mms.immowelt.de/8/2/c/7/82c717a3-5db3-4058-93f1-a01d79bd3c23.jpg?ci_seal=af588f3fb307d8a46e3d8af099df1313bc08b160',
      'https://mms.immowelt.de/c/5/5/e/c55ef18e-e040-416e-85e9-ecf693bf81b4.jpg?ci_seal=6f56d2e7eb151c643eb1ee8766d16a6475232f3d',
      'https://mms.immowelt.de/0/5/5/b/055b2643-4927-430b-a5dc-5de34670ddf1.jpg?ci_seal=51f5f91c9268cec0f89423ca93c73ea9de226da8',
      'https://mms.immowelt.de/a/c/3/1/ac31e635-5f70-437d-a4ec-2d6b0723e43b.jpg?ci_seal=042e77858b9f5a37a7f17c9bc809d978f7da0060',
      'https://mms.immowelt.de/4/2/4/3/42432ec2-84e7-458d-9ebc-40a627b63a2b.jpg?ci_seal=4e6215fa7929f201a306a3ec74b86f1d3ff18712',
      'https://mms.immowelt.de/9/9/5/b/995bfd87-8355-4d80-ae78-d19b047ad888.jpg?ci_seal=d8528046696d593b62e715ecf4b7ad839d87dfc0',
      'https://mms.immowelt.de/d/7/7/0/d7705877-e938-4ae5-9b98-e9096804898f.jpg?ci_seal=0d6e49d8baaa0b82bcfd83690c12bef3260836fa',
      'https://mms.immowelt.de/2/8/4/8/2848e3f7-da00-4c02-8452-9a3b5bf142cb.jpg?ci_seal=731e49a59fed6046b4e9548b55ee91e80737a7df',
    ]);
  });
});
