import { describe, it, expect } from 'vitest';
import type { Apartment, Document } from '@prisma/client';
import { matchesSearch } from '@/lib/apartments/searchApartments';

type ApartmentWithDocuments = Apartment & { documents: Pick<Document, 'filename'>[] };

function makeApartment(overrides: Partial<ApartmentWithDocuments> = {}): ApartmentWithDocuments {
  return {
    id: 'a1',
    title: 'Nice flat',
    source: 'IMMOSCOUT24',
    sourceUrl: null,
    address: 'Müllerstraße 42',
    price: null,
    livingArea: null,
    rooms: null,
    floor: null,
    balcony: null,
    elevator: null,
    kitchen: null,
    condition: null,
    energieausweis: null,
    hausgeld: null,
    maklerprovisionPercent: null,
    locationRating: null,
    personalRating: null,
    status: 'NOT_CONTACTED',
    viewingDate: null,
    maklervertragStatus: 'NOT_RECEIVED',
    notes: 'Really like the light',
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    documents: [{ filename: 'Expose_Müllerstraße.pdf' }],
    ...overrides,
  };
}

describe('matchesSearch', () => {
  it('matches on address', () => {
    expect(matchesSearch(makeApartment(), 'müller')).toBe(true);
  });

  it('matches on title', () => {
    expect(matchesSearch(makeApartment(), 'nice')).toBe(true);
  });

  it('matches on notes', () => {
    expect(matchesSearch(makeApartment(), 'light')).toBe(true);
  });

  it('matches on source', () => {
    expect(matchesSearch(makeApartment(), 'immoscout')).toBe(true);
  });

  it('matches on a document filename', () => {
    expect(matchesSearch(makeApartment(), 'expose')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(matchesSearch(makeApartment(), 'MÜLLER')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(matchesSearch(makeApartment(), 'nonexistent')).toBe(false);
  });

  it('matches everything for an empty or whitespace-only query', () => {
    expect(matchesSearch(makeApartment(), '')).toBe(true);
    expect(matchesSearch(makeApartment(), '   ')).toBe(true);
  });
});
