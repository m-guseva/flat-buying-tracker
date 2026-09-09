import { describe, it, expect } from 'vitest';
import { parseGermanNumber } from '@/lib/ingestion/parseGermanNumber';

describe('parseGermanNumber', () => {
  it('parses a simple integer', () => {
    expect(parseGermanNumber('2')).toBe(2);
  });

  it('parses a German decimal comma with a unit suffix', () => {
    expect(parseGermanNumber('45,99  m²')).toBe(45.99);
  });

  it('parses a value with a thousands separator', () => {
    expect(parseGermanNumber('1.328 €')).toBe(1328);
  });

  it('returns undefined for missing input', () => {
    expect(parseGermanNumber(undefined)).toBeUndefined();
  });

  it('returns undefined for unparseable text', () => {
    expect(parseGermanNumber('n/a')).toBeUndefined();
  });
});
