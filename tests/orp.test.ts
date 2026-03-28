import { describe, it, expect } from 'vitest';
import { getOrpIndex } from '../src/orp';

describe('getOrpIndex', () => {
  it('returns 0 for words with 1-3 characters', () => {
    expect(getOrpIndex('a')).toBe(0);
    expect(getOrpIndex('to')).toBe(0);
    expect(getOrpIndex('the')).toBe(0);
  });

  it('returns 1 for words with 4-6 characters', () => {
    expect(getOrpIndex('word')).toBe(1);
    expect(getOrpIndex('hello')).toBe(1);
    expect(getOrpIndex('reader')).toBe(1);
  });

  it('returns 2 for words with 7-9 characters', () => {
    expect(getOrpIndex('reading')).toBe(2);
    expect(getOrpIndex('elephant')).toBe(2);
    expect(getOrpIndex('wonderful')).toBe(2);
  });

  it('returns 3 for words with 10-13 characters', () => {
    expect(getOrpIndex('understand')).toBe(3);
    expect(getOrpIndex('transmission')).toBe(3);
    expect(getOrpIndex('communication')).toBe(3);
  });

  it('returns 4 for words with 14+ characters', () => {
    expect(getOrpIndex('representation')).toBe(4);
    expect(getOrpIndex('internationalization')).toBe(4);
  });

  it('handles empty string', () => {
    expect(getOrpIndex('')).toBe(0);
  });
});
