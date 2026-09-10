import { describe, it, expect } from 'vitest';
import { formatPrice, formatAreaAndRooms, calculateMaklerFee } from '@/lib/apartments/format';

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

describe('calculateMaklerFee', () => {
  it('calculates the fee and rounds to the nearest euro', () => {
    expect(calculateMaklerFee(345000, 3.57)).toBe(12317);
  });

  it('returns 0 when the percentage is 0', () => {
    expect(calculateMaklerFee(300000, 0)).toBe(0);
  });

  it('returns null when price is missing', () => {
    expect(calculateMaklerFee(null, 3.57)).toBeNull();
  });

  it('returns null when the percentage is missing', () => {
    expect(calculateMaklerFee(345000, null)).toBeNull();
  });
});
