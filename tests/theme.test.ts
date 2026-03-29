import { describe, it, expect } from 'vitest';
import { getThemeVars, DEFAULT_SETTINGS, ThemeSettings } from '../src/theme';

describe('getThemeVars', () => {
  it('returns dark theme variables', () => {
    const vars = getThemeVars({ ...DEFAULT_SETTINGS, theme: 'dark' });
    expect(vars['--bg']).toBe('#0a0a0a');
    expect(vars['--text']).toBe('#888');
    expect(vars['--bg-surface']).toBe('#141414');
  });

  it('returns sepia theme variables', () => {
    const vars = getThemeVars({ ...DEFAULT_SETTINGS, theme: 'sepia' });
    expect(vars['--bg']).toBe('#f4ecd8');
    expect(vars['--text']).toBe('#5b4636');
  });

  it('returns light theme variables', () => {
    const vars = getThemeVars({ ...DEFAULT_SETTINGS, theme: 'light' });
    expect(vars['--bg']).toBe('#ffffff');
    expect(vars['--text']).toBe('#333');
  });

  it('maps font family setting to CSS value', () => {
    const mono = getThemeVars({ ...DEFAULT_SETTINGS, fontFamily: 'mono' });
    expect(mono['--reader-font']).toContain('SF Mono');

    const sans = getThemeVars({ ...DEFAULT_SETTINGS, fontFamily: 'sans' });
    expect(sans['--reader-font']).toContain('system-ui');

    const serif = getThemeVars({ ...DEFAULT_SETTINGS, fontFamily: 'serif' });
    expect(serif['--reader-font']).toContain('Georgia');
  });

  it('includes font size, line height, letter spacing, page width as CSS vars', () => {
    const vars = getThemeVars({ ...DEFAULT_SETTINGS, fontSize: 24, lineHeight: 2.5, letterSpacing: 2, pageWidth: 800 });
    expect(vars['--reader-font-size']).toBe('24px');
    expect(vars['--reader-line-height']).toBe('2.5');
    expect(vars['--reader-letter-spacing']).toBe('2px');
    expect(vars['--reader-max-width']).toBe('800px');
  });
});
