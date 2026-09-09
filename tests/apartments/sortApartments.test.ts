import { describe, it, expect } from 'vitest';
import type { Apartment } from '@prisma/client';
import { sortApartments } from '@/lib/apartments/sortApartments';

function makeApartment(overrides: Partial<Apartment> = {}): Apartment {
  return {
    id: 'a1',
    title: null,
    source: 'MANUAL',
    sourceUrl: null,
    address: null,
    price: null,
    livingArea: null,
    rooms: null,
    floor: null,
    balcony: null,
    elevator: null,
    kitchen: null,
    condition: null,
    hausgeld: null,
    maklerprovision: null,
    locationRating: null,
    personalRating: null,
    status: 'NOT_CONTACTED',
    maklervertragStatus: 'NOT_RECEIVED',
    notes: null,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    ...overrides,
  };
}

describe('sortApartments', () => {
  it('sorts ascending by a numeric field', () => {
    const cheap = makeApartment({ id: 'cheap', price: 100 });
    const mid = makeApartment({ id: 'mid', price: 200 });
    const expensive = makeApartment({ id: 'expensive', price: 300 });
    const result = sortApartments([expensive, cheap, mid], [{ id: 's1', field: 'price', direction: 'asc' }]);
    expect(result.map((a) => a.id)).toEqual(['cheap', 'mid', 'expensive']);
  });

  it('sorts descending by a numeric field', () => {
    const cheap = makeApartment({ id: 'cheap', price: 100 });
    const expensive = makeApartment({ id: 'expensive', price: 300 });
    const result = sortApartments([cheap, expensive], [{ id: 's1', field: 'price', direction: 'desc' }]);
    expect(result.map((a) => a.id)).toEqual(['expensive', 'cheap']);
  });

  it('breaks ties using the second sort criterion', () => {
    const a = makeApartment({ id: 'a', personalRating: 5, price: 300 });
    const b = makeApartment({ id: 'b', personalRating: 5, price: 100 });
    const result = sortApartments(
      [a, b],
      [
        { id: 's1', field: 'personalRating', direction: 'desc' },
        { id: 's2', field: 'price', direction: 'asc' },
      ],
    );
    expect(result.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('always sorts a null value last regardless of direction', () => {
    const withRating = makeApartment({ id: 'has-rating', personalRating: 3 });
    const withoutRating = makeApartment({ id: 'no-rating', personalRating: null });
    const asc = sortApartments([withoutRating, withRating], [{ id: 's1', field: 'personalRating', direction: 'asc' }]);
    expect(asc.map((a) => a.id)).toEqual(['has-rating', 'no-rating']);
    const desc = sortApartments([withoutRating, withRating], [{ id: 's1', field: 'personalRating', direction: 'desc' }]);
    expect(desc.map((a) => a.id)).toEqual(['has-rating', 'no-rating']);
  });

  it('sorts status by its pipeline position, not alphabetically', () => {
    const interested = makeApartment({ id: 'interested', status: 'INTEREST_FOR_PURCHASE' });
    const notContacted = makeApartment({ id: 'not-contacted', status: 'NOT_CONTACTED' });
    const contacted = makeApartment({ id: 'contacted', status: 'CONTACTED' });
    const result = sortApartments(
      [interested, notContacted, contacted],
      [{ id: 's1', field: 'status', direction: 'asc' }],
    );
    expect(result.map((a) => a.id)).toEqual(['not-contacted', 'contacted', 'interested']);
  });

  it('sorts by date added (createdAt) as a timestamp', () => {
    const older = makeApartment({ id: 'older', createdAt: new Date('2026-01-01') });
    const newer = makeApartment({ id: 'newer', createdAt: new Date('2026-06-01') });
    const result = sortApartments([older, newer], [{ id: 's1', field: 'createdAt', direction: 'desc' }]);
    expect(result.map((a) => a.id)).toEqual(['newer', 'older']);
  });

  it('returns the list in the same order when there are no sort criteria', () => {
    const a = makeApartment({ id: 'a' });
    const b = makeApartment({ id: 'b' });
    expect(sortApartments([a, b], []).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('does not mutate the input array', () => {
    const a = makeApartment({ id: 'a', price: 300 });
    const b = makeApartment({ id: 'b', price: 100 });
    const input = [a, b];
    sortApartments(input, [{ id: 's1', field: 'price', direction: 'asc' }]);
    expect(input.map((x) => x.id)).toEqual(['a', 'b']);
  });
});
