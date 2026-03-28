import { describe, it, expect } from 'vitest';
import { calculateDelay, ReaderState, createReaderState, adjustWpm, ReadingMode } from '../src/reader';

describe('calculateDelay', () => {
  const baseDelay = 60_000 / 300; // 200ms at 300 WPM

  it('returns base delay for normal short words', () => {
    const delay = calculateDelay('the', 'cat', 300);
    expect(delay).toBe(baseDelay);
  });

  it('adds 30% for words with 8+ characters', () => {
    const delay = calculateDelay('beautiful', 'day', 300);
    expect(delay).toBeCloseTo(baseDelay * 1.3);
  });

  it('adds 30% for words ending with comma', () => {
    const delay = calculateDelay('however,', 'the', 300);
    expect(delay).toBeCloseTo(baseDelay * 1.3);
  });

  it('adds 50% for words ending with period', () => {
    const delay = calculateDelay('done.', 'The', 300);
    expect(delay).toBeCloseTo(baseDelay * 1.5);
  });

  it('adds 50% for words ending with question mark', () => {
    const delay = calculateDelay('why?', 'Because', 300);
    expect(delay).toBeCloseTo(baseDelay * 1.5);
  });

  it('adds 50% for words ending with exclamation', () => {
    const delay = calculateDelay('wow!', 'That', 300);
    expect(delay).toBeCloseTo(baseDelay * 1.5);
  });

  it('stacks long-word and punctuation multipliers', () => {
    // "finished." = 8 alpha chars (strip period) + ends with period = 1.3 * 1.5
    const delay = calculateDelay('finished.', 'The', 300);
    expect(delay).toBeCloseTo(baseDelay * 1.3 * 1.5);
  });

  it('returns 2x delay when next word is empty (paragraph break)', () => {
    const delay = calculateDelay('end.', '', 300);
    expect(delay).toBeCloseTo(baseDelay * 1.5 * 2);
  });
});

describe('createReaderState', () => {
  it('creates initial state with defaults', () => {
    const words = ['Hello', 'world'];
    const state = createReaderState(words, 300);
    expect(state.words).toEqual(words);
    expect(state.position).toBe(0);
    expect(state.wpm).toBe(300);
    expect(state.playing).toBe(false);
    expect(state.mode).toBe('rsvp');
  });

  it('accepts a starting position', () => {
    const state = createReaderState(['a', 'b', 'c'], 300, 2);
    expect(state.position).toBe(2);
  });

  it('accepts a reading mode', () => {
    const state = createReaderState(['a', 'b'], 300, 0, 'gradient');
    expect(state.mode).toBe('gradient');
  });
});

describe('adjustWpm', () => {
  it('increases WPM by 25', () => {
    expect(adjustWpm(300, 'up')).toBe(325);
  });

  it('decreases WPM by 25', () => {
    expect(adjustWpm(300, 'down')).toBe(275);
  });

  it('clamps minimum to 100', () => {
    expect(adjustWpm(100, 'down')).toBe(100);
  });

  it('clamps maximum to 1000', () => {
    expect(adjustWpm(1000, 'up')).toBe(1000);
  });
});
