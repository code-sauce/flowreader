import { storage } from './storage';

export type ThemeName = 'dark' | 'sepia' | 'light';
export type FontFamily = 'mono' | 'sans' | 'serif';

export type FocusStyle = 'underline' | 'highlight' | 'blur';
export type FocusColor = string;

export interface ThemeSettings {
  theme: ThemeName;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  pageWidth: number;
  focusStyle: FocusStyle;
  focusColor: FocusColor;
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
