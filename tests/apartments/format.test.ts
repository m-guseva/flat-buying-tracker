import { describe, it, expect } from 'vitest';
import { formatPrice, formatAreaAndRooms } from '@/lib/apartments/format';

describe('formatPrice', () => {
  it('formats a price in German locale', () => {
    expect(formatPrice(425000)).toBe('€425.000');
  });

  it('returns null for missing price', () => {
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(undefined)).toBeNull();
  });
});

describe('formatAreaAndRooms', () => {
  it('combines area and rooms', () => {
    expect(formatAreaAndRooms(58, 2)).toBe('58 m² · 2 rooms');
  });

  it('handles only area', () => {
    expect(formatAreaAndRooms(58, null)).toBe('58 m²');
  });

  it('returns null when both are missing', () => {
    expect(formatAreaAndRooms(null, null)).toBeNull();
  });
});
