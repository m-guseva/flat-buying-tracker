import { describe, it, expect } from 'vitest';
import { normalizeUrl } from '@/lib/ingestion/normalizeUrl';

describe('normalizeUrl', () => {
  it('strips query parameters and a hash fragment', () => {
    const url =
      'https://www.immobilienscout24.de/expose/169175842?referrer=HYBRID_VIEW_LISTING&searchId=6fd43899-2240-3ae4-b78f-89e8f99eb939&searchType=radius&fairPrice=FAIR_OFFER#/';
    expect(normalizeUrl(url)).toBe('https://www.immobilienscout24.de/expose/169175842');
  });

  it('strips a trailing slash', () => {
    expect(normalizeUrl('https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3/')).toBe(
      'https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3',
    );
  });

  it('leaves an already-normalized URL unchanged', () => {
    expect(normalizeUrl('https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3')).toBe(
      'https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3',
    );
  });
});
