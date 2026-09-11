import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatAreaAndRooms,
  calculateMaklerFee,
  formatViewingDate,
  isUpcomingViewingDate,
  viewingDateSortRank,
} from '@/lib/apartments/format';

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

describe('formatViewingDate', () => {
  it('formats a YYYY-MM-DD string in German day.month.year order', () => {
    expect(formatViewingDate('2026-09-15')).toBe('15.09.2026');
  });

  it('returns null for missing input', () => {
    expect(formatViewingDate(null)).toBeNull();
    expect(formatViewingDate(undefined)).toBeNull();
  });
});

describe('isUpcomingViewingDate', () => {
  const today = new Date('2026-09-15T14:00:00');

  it('is true for today', () => {
    expect(isUpcomingViewingDate('2026-09-15', today)).toBe(true);
  });

  it('is true for a future date', () => {
    expect(isUpcomingViewingDate('2026-09-16', today)).toBe(true);
  });

  it('is false for a past date', () => {
    expect(isUpcomingViewingDate('2026-09-14', today)).toBe(false);
  });
});

describe('viewingDateSortRank', () => {
  const today = new Date('2026-09-15T14:00:00');

  it('returns null when there is no viewing date', () => {
    expect(viewingDateSortRank(null, today)).toBeNull();
    expect(viewingDateSortRank(undefined, today)).toBeNull();
  });

  it('ranks today as 0 and later upcoming dates higher, soonest first', () => {
    const todayRank = viewingDateSortRank('2026-09-15', today)!;
    const tomorrowRank = viewingDateSortRank('2026-09-16', today)!;
    const nextWeekRank = viewingDateSortRank('2026-09-22', today)!;
    expect(todayRank).toBe(0);
    expect(todayRank).toBeLessThan(tomorrowRank);
    expect(tomorrowRank).toBeLessThan(nextWeekRank);
  });

  it('ranks every upcoming date below every past date', () => {
    const farFutureRank = viewingDateSortRank('2027-01-01', today)!;
    const yesterdayRank = viewingDateSortRank('2026-09-14', today)!;
    expect(farFutureRank).toBeLessThan(yesterdayRank);
  });

  it('ranks past dates most-recent-first', () => {
    const yesterdayRank = viewingDateSortRank('2026-09-14', today)!;
    const lastMonthRank = viewingDateSortRank('2026-08-15', today)!;
    expect(yesterdayRank).toBeLessThan(lastMonthRank);
  });
});
