import { describe, it, expect } from 'vitest';
import { linkify } from '@/lib/linkify';

describe('linkify', () => {
  it('returns a single text segment when there are no URLs', () => {
    expect(linkify('just some notes')).toEqual([{ type: 'text', value: 'just some notes' }]);
  });

  it('splits a lone URL into a single link segment', () => {
    expect(linkify('https://example.com/listing-1')).toEqual([
      { type: 'link', value: 'https://example.com/listing-1' },
    ]);
  });

  it('splits surrounding text from an embedded URL', () => {
    expect(linkify('found this: https://example.com/a nice one')).toEqual([
      { type: 'text', value: 'found this: ' },
      { type: 'link', value: 'https://example.com/a' },
      { type: 'text', value: ' nice one' },
    ]);
  });

  it('handles multiple URLs on separate lines', () => {
    expect(linkify('https://example.com/a\nhttps://example.com/b')).toEqual([
      { type: 'link', value: 'https://example.com/a' },
      { type: 'text', value: '\n' },
      { type: 'link', value: 'https://example.com/b' },
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(linkify('')).toEqual([]);
  });
});
