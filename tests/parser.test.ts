import { describe, it, expect } from 'vitest';
import { parseText, stripMarkdown, extractTitle } from '../src/parser';

describe('parseText', () => {
  it('splits plain text into words', () => {
    const result = parseText('Hello world this is a test');
    expect(result).toEqual(['Hello', 'world', 'this', 'is', 'a', 'test']);
  });

  it('collapses multiple whitespace into single splits', () => {
    const result = parseText('Hello   world\n\nthis   is');
    expect(result).toEqual(['Hello', 'world', 'this', 'is']);
  });

  it('preserves punctuation attached to words', () => {
    const result = parseText('Hello, world. How are you?');
    expect(result).toEqual(['Hello,', 'world.', 'How', 'are', 'you?']);
  });

  it('strips HTML tags', () => {
    const result = parseText('<p>Hello <strong>world</strong></p>');
    expect(result).toEqual(['Hello', 'world']);
  });

  it('handles empty input', () => {
    const result = parseText('');
    expect(result).toEqual([]);
  });

  it('handles whitespace-only input', () => {
    const result = parseText('   \n\n  ');
    expect(result).toEqual([]);
  });
});

describe('stripMarkdown', () => {
  it('strips heading markers', () => {
    expect(stripMarkdown('# Hello World')).toBe('Hello World');
    expect(stripMarkdown('## Sub heading')).toBe('Sub heading');
  });

  it('strips bold and italic markers', () => {
    expect(stripMarkdown('**bold** and *italic*')).toBe('bold and italic');
  });

  it('strips link syntax, keeping text', () => {
    expect(stripMarkdown('[click here](http://example.com)')).toBe('click here');
  });

  it('strips inline code backticks', () => {
    expect(stripMarkdown('use `console.log` here')).toBe('use console.log here');
  });

  it('strips image syntax', () => {
    expect(stripMarkdown('![alt text](image.png)')).toBe('alt text');
  });
});

describe('extractTitle', () => {
  it('uses first line if short enough', () => {
    expect(extractTitle('Short Title\nMore content here')).toBe('Short Title');
  });

  it('truncates long first lines', () => {
    const long = 'A'.repeat(80) + '\nMore content';
    const title = extractTitle(long);
    expect(title.length).toBeLessThanOrEqual(53);
    expect(title.endsWith('...')).toBe(true);
  });

  it('falls back to first N words for single-line text', () => {
    expect(extractTitle('one two three four five six seven eight nine ten eleven'))
      .toBe('one two three four five six...');
  });

  it('handles empty string', () => {
    expect(extractTitle('')).toBe('Untitled');
  });
});
