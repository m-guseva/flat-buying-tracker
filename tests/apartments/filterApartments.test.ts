import { describe, it, expect } from 'vitest';
import type { Apartment } from '@prisma/client';
import { matchesFilter, matchesAllFilters, type FilterCondition } from '@/lib/apartments/filterApartments';

function makeApartment(overrides: Partial<Apartment> = {}): Apartment {
  return {
    id: 'a1',
    title: null,
    source: 'MANUAL',
    sourceUrl: null,
    address: 'Müllerstraße 42',
    price: 425000,
    livingArea: 58,
    rooms: 2,
    floor: null,
    balcony: true,
    elevator: null,
    kitchen: null,
    condition: null,
    hausgeld: 280,
    maklerprovision: null,
    locationRating: null,
    personalRating: 4,
    status: 'CONTACTED',
    maklervertragStatus: 'NOT_RECEIVED',
    notes: null,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    ...overrides,
  };
}

describe('matchesFilter', () => {
  it('matches a text field via case-insensitive contains', () => {
    const apartment = makeApartment();
    expect(matchesFilter(apartment, { id: '1', field: 'address', operator: 'contains', value: 'müller' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'address', operator: 'contains', value: 'hauptstraße' })).toBe(false);
  });

  it('matches a number field with each comparison operator', () => {
    const apartment = makeApartment({ price: 425000 });
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'lt', value: '450000' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'gt', value: '450000' })).toBe(false);
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'eq', value: '425000' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'gte', value: '425000' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'lte', value: '425000' })).toBe(true);
  });

  it('never matches a number filter when the field is null', () => {
    const apartment = makeApartment({ hausgeld: null });
    expect(matchesFilter(apartment, { id: '1', field: 'hausgeld', operator: 'gte', value: '0' })).toBe(false);
  });

  it('matches a boolean field by strict equality', () => {
    const apartment = makeApartment({ balcony: true });
    expect(matchesFilter(apartment, { id: '1', field: 'balcony', operator: 'eq', value: 'true' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'balcony', operator: 'eq', value: 'false' })).toBe(false);
  });

  it('never matches a boolean filter when the field is null (unknown is neither yes nor no)', () => {
    const apartment = makeApartment({ elevator: null });
    expect(matchesFilter(apartment, { id: '1', field: 'elevator', operator: 'eq', value: 'true' })).toBe(false);
    expect(matchesFilter(apartment, { id: '1', field: 'elevator', operator: 'eq', value: 'false' })).toBe(false);
  });

  it('matches a select field by strict equality', () => {
    const apartment = makeApartment({ status: 'CONTACTED' });
    expect(matchesFilter(apartment, { id: '1', field: 'status', operator: 'eq', value: 'CONTACTED' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'status', operator: 'eq', value: 'SETUP_VIEWING' })).toBe(false);
  });

  it('matches everything when the condition references an unknown field', () => {
    const apartment = makeApartment();
    expect(matchesFilter(apartment, { id: '1', field: 'nonexistentField', operator: 'eq', value: 'anything' })).toBe(true);
  });

  it('treats an unconfigured (empty value) text condition as inactive, matching regardless of field value — including null', () => {
    const withAddress = makeApartment({ address: 'Müllerstraße 42' });
    const withNullAddress = makeApartment({ address: null });
    expect(matchesFilter(withAddress, { id: '1', field: 'address', operator: 'contains', value: '' })).toBe(true);
    expect(matchesFilter(withNullAddress, { id: '1', field: 'address', operator: 'contains', value: '' })).toBe(true);
    expect(matchesFilter(withNullAddress, { id: '1', field: 'address', operator: 'contains', value: '   ' })).toBe(true);
  });

  it('treats an unconfigured (empty value) number condition as inactive, not as a match on 0', () => {
    const apartment = makeApartment({ price: 425000 });
    const zeroPriceApartment = makeApartment({ price: 0 });
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'eq', value: '' })).toBe(true);
    // Confirms this isn't accidentally passing because Number('') happens to equal the apartment's price.
    expect(matchesFilter(zeroPriceApartment, { id: '1', field: 'price', operator: 'eq', value: '' })).toBe(true);
  });
});

describe('matchesAllFilters', () => {
  it('requires every condition to match (AND)', () => {
    const apartment = makeApartment({ price: 425000, rooms: 2, balcony: true });
    const conditions: FilterCondition[] = [
      { id: '1', field: 'price', operator: 'lt', value: '450000' },
      { id: '2', field: 'rooms', operator: 'gte', value: '2' },
      { id: '3', field: 'balcony', operator: 'eq', value: 'true' },
    ];
    expect(matchesAllFilters(apartment, conditions)).toBe(true);
    expect(matchesAllFilters(apartment, [...conditions, { id: '4', field: 'rooms', operator: 'gte', value: '3' }])).toBe(false);
  });

  it('matches everything when there are no conditions', () => {
    expect(matchesAllFilters(makeApartment(), [])).toBe(true);
  });
});
