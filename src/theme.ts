import { storage } from './storage';

export type ThemeName = 'dark' | 'sepia' | 'light' | 'nord' | 'monokai' | 'solarized' | 'ocean' | 'rose';
export type FontFamily = 'mono' | 'sans' | 'serif';

export type FocusStyle = 'underline' | 'highlight' | 'blur' | 'ruler';
export type FocusColor = string;
export type HighlightMode = 'line' | 'sentence';

export interface ThemeSettings {
  theme: ThemeName;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  pageWidth: number;
  focusStyle: FocusStyle;
  focusColor: FocusColor;
  highlightMode: HighlightMode;
}

export const DEFAULT_SETTINGS: ThemeSettings = {
  theme: 'dark',
  fontFamily: 'mono',
  fontSize: 20,
  lineHeight: 2.2,
  letterSpacing: 0,
  pageWidth: 680,
  focusStyle: 'underline',
  focusColor: '#e74c3c',
  highlightMode: 'line',
};

const THEME_COLORS: Record<ThemeName, Record<string, string>> = {
  dark: {
    '--bg': '#0a0a0a',
    '--bg-surface': '#141414',
    '--bg-hover': '#1a1a1a',
    '--text': '#888',
    '--text-bright': '#ccc',
  },
  sepia: {
    '--bg': '#f4ecd8',
    '--bg-surface': '#ebe3cf',
    '--bg-hover': '#e2d9c3',
    '--text': '#5b4636',
    '--text-bright': '#3b2a1a',
  },
  light: {
    '--bg': '#ffffff',
    '--bg-surface': '#f5f5f5',
    '--bg-hover': '#eaeaea',
    '--text': '#333',
    '--text-bright': '#111',
  },
  nord: {
    '--bg': '#2e3440',
    '--bg-surface': '#3b4252',
    '--bg-hover': '#434c5e',
    '--text': '#8fbcbb',
    '--text-bright': '#eceff4',
  },
  monokai: {
    '--bg': '#272822',
    '--bg-surface': '#2d2e27',
    '--bg-hover': '#3e3d32',
    '--text': '#a6e22e',
    '--text-bright': '#f8f8f2',
  },
  solarized: {
    '--bg': '#002b36',
    '--bg-surface': '#073642',
    '--bg-hover': '#094050',
    '--text': '#839496',
    '--text-bright': '#eee8d5',
  },
  ocean: {
    '--bg': '#1b2838',
    '--bg-surface': '#1e3045',
    '--bg-hover': '#243852',
    '--text': '#6b93b0',
    '--text-bright': '#c4dde8',
  },
  rose: {
    '--bg': '#1a1118',
    '--bg-surface': '#231720',
    '--bg-hover': '#2d1e28',
    '--text': '#b08a9a',
    '--text-bright': '#e8d0dc',
  },
};

const FONT_FAMILIES: Record<FontFamily, string> = {
  mono: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

export function getThemeVars(settings: ThemeSettings): Record<string, string> {
  return {
    ...THEME_COLORS[settings.theme],
    '--accent': '#e74c3c',
    '--reader-font': FONT_FAMILIES[settings.fontFamily],
    '--reader-font-size': `${settings.fontSize}px`,
    '--reader-line-height': `${settings.lineHeight}`,
    '--reader-letter-spacing': `${settings.letterSpacing}px`,
    '--reader-max-width': `${settings.pageWidth}px`,
    '--focus-color': settings.focusColor,
  };
}

export function applyTheme(settings: ThemeSettings): void {
  const vars = getThemeVars(settings);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: settings }));
}

export async function loadSettings(): Promise<ThemeSettings> {
  const saved = await storage.getSetting('themeSettings') as Partial<ThemeSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings: ThemeSettings): Promise<void> {
  await storage.setSetting('themeSettings', settings);
  applyTheme(settings);
}
