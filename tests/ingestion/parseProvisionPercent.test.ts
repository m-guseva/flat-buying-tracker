import { describe, it, expect } from 'vitest';
import { parseProvisionPercent } from '@/lib/ingestion/parseProvisionPercent';

describe('parseProvisionPercent', () => {
  it('extracts a percentage with German comma decimals and trailing text', () => {
    expect(parseProvisionPercent('3,57 % inkl. MwSt.')).toBeCloseTo(3.57);
  });

  it('extracts a percentage with a dot decimal and no space before %', () => {
    expect(parseProvisionPercent('3.57%')).toBeCloseTo(3.57);
  });

  it('returns undefined when the text has no leading percentage', () => {
    expect(parseProvisionPercent('Nein')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(parseProvisionPercent(undefined)).toBeUndefined();
  });
});
