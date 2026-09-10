import { describe, it, expect, afterEach } from 'vitest';
import { isReadOnly, assertNotReadOnly } from '@/lib/readOnly';

describe('isReadOnly', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_READ_ONLY;
  });

  it('is true when NEXT_PUBLIC_READ_ONLY is "true"', () => {
    process.env.NEXT_PUBLIC_READ_ONLY = 'true';
    expect(isReadOnly()).toBe(true);
  });

  it('is false when unset', () => {
    delete process.env.NEXT_PUBLIC_READ_ONLY;
    expect(isReadOnly()).toBe(false);
  });

  it('is false for any value other than "true"', () => {
    process.env.NEXT_PUBLIC_READ_ONLY = 'yes';
    expect(isReadOnly()).toBe(false);
  });
});

describe('assertNotReadOnly', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_READ_ONLY;
  });

  it('throws when read-only', () => {
    process.env.NEXT_PUBLIC_READ_ONLY = 'true';
    expect(() => assertNotReadOnly()).toThrow();
  });

  it('does not throw otherwise', () => {
    expect(() => assertNotReadOnly()).not.toThrow();
  });
});
