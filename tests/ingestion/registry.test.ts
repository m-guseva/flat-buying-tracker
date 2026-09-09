import { describe, it, expect } from 'vitest';
import { pickScraper } from '@/lib/ingestion/registry';

describe('pickScraper', () => {
  it('picks the ImmoScout24 scraper for an immobilienscout24.de URL', () => {
    expect(pickScraper('https://www.immobilienscout24.de/expose/169009235')?.source).toBe('IMMOSCOUT24');
  });

  it('picks the Immowelt scraper for an immowelt.de URL', () => {
    expect(pickScraper('https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3')?.source).toBe(
      'IMMOWELT',
    );
  });

  it('returns null for an unrecognized URL', () => {
    expect(pickScraper('https://www.example.com/listing/123')).toBeNull();
  });
});
