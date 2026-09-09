import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { recoverSourceUrl } from '@/lib/ingestion/recoverSourceUrl';

const immoscout24Html = readFileSync(path.join(process.cwd(), 'tests/fixtures/immoscout24.html'), 'utf-8');
const immoweltHtml = readFileSync(path.join(process.cwd(), 'tests/fixtures/immowelt.html'), 'utf-8');

describe('recoverSourceUrl', () => {
  it('recovers the canonical URL from a saved ImmoScout24 page', () => {
    expect(recoverSourceUrl(immoscout24Html)).toBe('https://www.immobilienscout24.de/expose/169009235');
  });

  it('recovers the canonical URL from a saved Immowelt page', () => {
    expect(recoverSourceUrl(immoweltHtml)).toBe('https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3');
  });

  it('returns null when neither a canonical link nor an og:url meta tag is present', () => {
    expect(recoverSourceUrl('<html><head></head><body></body></html>')).toBeNull();
  });
});
