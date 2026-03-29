# Kindle-Style Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign FlowReader into a single-screen layout with a toggleable right sidebar containing the library and Kindle-style reading settings (theme, font, size, spacing).

**Architecture:** Replace the two-view (home/reader) navigation with a persistent layout: main panel (input + reader) on the left, collapsible sidebar (library + settings) on the right. New `theme.ts` handles CSS variable switching. New `sidebar.ts` renders the sidebar. `main.ts` becomes the layout orchestrator instead of a view router.

**Tech Stack:** Same as before — Vite, vanilla TypeScript, plain CSS, idb.

---

## File Map

| File | Change | Responsibility |
|------|--------|---------------|
| `src/theme.ts` | Create | Load/save/apply theme and font settings via CSS variables |
| `src/sidebar.ts` | Create | Sidebar component: library list, settings panel, toggle |
| `src/main.ts` | Rewrite | Single-screen layout orchestrator |
| `src/home.ts` | Rewrite | Input-only component (no library, no full-page layout) |
| `src/reader.ts` | Modify | Remove `position:fixed`, read font settings from CSS vars |
| `src/style.css` | Rewrite | Layout grid, sidebar styles, theme variants, settings panel |
| `tests/theme.test.ts` | Create | Theme setting logic tests |

---

### Task 1: Theme Module

**Files:**
- Create: `src/theme.ts`
- Create: `tests/theme.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/theme.test.ts`:

```typescript
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

  it('includes font size, line height, letter spacing as CSS vars', () => {
    const vars = getThemeVars({ ...DEFAULT_SETTINGS, fontSize: 24, lineHeight: 2.5, letterSpacing: 2 });
    expect(vars['--reader-font-size']).toBe('24px');
    expect(vars['--reader-line-height']).toBe('2.5');
    expect(vars['--reader-letter-spacing']).toBe('2px');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/theme.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement theme module**

Create `src/theme.ts`:

```typescript
import { storage } from './storage';

export type ThemeName = 'dark' | 'sepia' | 'light';
export type FontFamily = 'mono' | 'sans' | 'serif';

export interface ThemeSettings {
  theme: ThemeName;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

export const DEFAULT_SETTINGS: ThemeSettings = {
  theme: 'dark',
  fontFamily: 'mono',
  fontSize: 20,
  lineHeight: 2.2,
  letterSpacing: 0,
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
  };
}

export function applyTheme(settings: ThemeSettings): void {
  const vars = getThemeVars(settings);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export async function loadSettings(): Promise<ThemeSettings> {
  const saved = await storage.getSetting('themeSettings') as Partial<ThemeSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings: ThemeSettings): Promise<void> {
  await storage.setSetting('themeSettings', settings);
  applyTheme(settings);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/theme.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme.ts tests/theme.test.ts
git commit -m "feat: add theme module with dark/sepia/light + font settings"
```

---

### Task 2: Sidebar Component

**Files:**
- Create: `src/sidebar.ts`

- [ ] **Step 1: Implement sidebar**

Create `src/sidebar.ts`:

```typescript
import { storage, Article } from './storage';
import { ThemeSettings, ThemeName, FontFamily, saveSettings } from './theme';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderLibraryItem(article: Article, activeId: string | null): string {
  const pct = article.totalWords > 0
    ? Math.round((article.currentPosition / article.totalWords) * 100)
    : 0;
  const isActive = article.id === activeId;

  return `
    <div class="sidebar-item ${isActive ? 'sidebar-item-active' : ''}" data-id="${article.id}">
      <div class="sidebar-item-main">
        <div class="sidebar-item-title">${article.title}</div>
        <div class="sidebar-item-meta">${article.source} · ${formatDate(article.createdAt)} · ${article.lastWPM} WPM</div>
        <div class="sidebar-progress-track">
          <div class="sidebar-progress-fill ${pct >= 100 ? 'done' : ''}" style="width:${pct}%"></div>
        </div>
      </div>
      <button class="sidebar-item-delete" data-delete-id="${article.id}">&times;</button>
    </div>
  `;
}

function renderSettings(settings: ThemeSettings): string {
  function themeBtn(name: ThemeName, label: string): string {
    const active = settings.theme === name ? 'active' : '';
    return `<button class="theme-btn ${active}" data-theme="${name}">${label}</button>`;
  }

  function fontBtn(name: FontFamily, label: string): string {
    const active = settings.fontFamily === name ? 'active' : '';
    return `<button class="font-btn ${active}" data-font="${name}">${label}</button>`;
  }

  return `
    <div class="sidebar-settings">
      <button class="sidebar-accordion-toggle" id="settings-toggle">
        Settings <span class="chevron">▾</span>
      </button>
      <div class="sidebar-accordion-body" id="settings-body">
        <div class="setting-group">
          <div class="setting-label">Theme</div>
          <div class="setting-row">
            ${themeBtn('dark', 'Dark')}
            ${themeBtn('sepia', 'Sepia')}
            ${themeBtn('light', 'Light')}
          </div>
        </div>
        <div class="setting-group">
          <div class="setting-label">Font</div>
          <div class="setting-row">
            ${fontBtn('mono', 'Mono')}
            ${fontBtn('sans', 'Sans')}
            ${fontBtn('serif', 'Serif')}
          </div>
        </div>
        <div class="setting-group">
          <div class="setting-label">Size <span class="setting-value" id="size-value">${settings.fontSize}px</span></div>
          <input type="range" class="setting-slider" id="font-size-slider" min="14" max="36" step="1" value="${settings.fontSize}" />
        </div>
        <div class="setting-group">
          <div class="setting-label">Line height <span class="setting-value" id="lh-value">${settings.lineHeight}</span></div>
          <input type="range" class="setting-slider" id="line-height-slider" min="1.4" max="3.0" step="0.1" value="${settings.lineHeight}" />
        </div>
        <div class="setting-group">
          <div class="setting-label">Spacing <span class="setting-value" id="ls-value">${settings.letterSpacing}px</span></div>
          <input type="range" class="setting-slider" id="letter-spacing-slider" min="0" max="4" step="0.5" value="${settings.letterSpacing}" />
        </div>
      </div>
    </div>
  `;
}

export async function mountSidebar(
  container: HTMLElement,
  settings: ThemeSettings,
  activeArticleId: string | null,
  onArticleClick: (id: string) => void,
  onSettingsChange: (settings: ThemeSettings) => void,
): Promise<void> {
  const articles = await storage.listArticles();
  const libraryHtml = articles.length > 0
    ? articles.map(a => renderLibraryItem(a, activeArticleId)).join('')
    : '<div class="sidebar-empty">No articles yet</div>';

  container.innerHTML = `
    <div class="sidebar-header">
      <span class="sidebar-brand">Flow<span class="sidebar-brand-accent">Reader</span></span>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-title">Library</div>
      <div class="sidebar-list" id="sidebar-list">
        ${libraryHtml}
      </div>
    </div>
    ${renderSettings(settings)}
  `;

  let currentSettings = { ...settings };

  // Library clicks
  const list = container.querySelector('#sidebar-list')!;
  list.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const deleteId = target.getAttribute('data-delete-id');
    if (deleteId) {
      e.stopPropagation();
      storage.deleteArticle(deleteId).then(() => {
        mountSidebar(container, currentSettings, activeArticleId, onArticleClick, onSettingsChange);
      });
      return;
    }
    const item = target.closest('.sidebar-item') as HTMLElement | null;
    if (item) {
      onArticleClick(item.dataset.id!);
    }
  });

  // Settings accordion
  const toggle = container.querySelector('#settings-toggle')!;
  const body = container.querySelector('#settings-body') as HTMLElement;
  toggle.addEventListener('click', () => {
    body.classList.toggle('collapsed');
    toggle.querySelector('.chevron')!.textContent = body.classList.contains('collapsed') ? '▸' : '▾';
  });

  // Theme buttons
  container.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.theme = (btn as HTMLElement).dataset.theme as ThemeName;
      container.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveSettings(currentSettings);
      onSettingsChange(currentSettings);
    });
  });

  // Font buttons
  container.querySelectorAll('.font-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.fontFamily = (btn as HTMLElement).dataset.font as FontFamily;
      container.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveSettings(currentSettings);
      onSettingsChange(currentSettings);
    });
  });

  // Sliders
  const fontSizeSlider = container.querySelector('#font-size-slider') as HTMLInputElement;
  const lineHeightSlider = container.querySelector('#line-height-slider') as HTMLInputElement;
  const letterSpacingSlider = container.querySelector('#letter-spacing-slider') as HTMLInputElement;

  fontSizeSlider.addEventListener('input', () => {
    currentSettings.fontSize = Number(fontSizeSlider.value);
    container.querySelector('#size-value')!.textContent = `${currentSettings.fontSize}px`;
    saveSettings(currentSettings);
    onSettingsChange(currentSettings);
  });

  lineHeightSlider.addEventListener('input', () => {
    currentSettings.lineHeight = Number(lineHeightSlider.value);
    container.querySelector('#lh-value')!.textContent = `${currentSettings.lineHeight}`;
    saveSettings(currentSettings);
    onSettingsChange(currentSettings);
  });

  letterSpacingSlider.addEventListener('input', () => {
    currentSettings.letterSpacing = Number(letterSpacingSlider.value);
    container.querySelector('#ls-value')!.textContent = `${currentSettings.letterSpacing}px`;
    saveSettings(currentSettings);
    onSettingsChange(currentSettings);
  });
}
```

- [ ] **Step 2: Verify existing tests still pass**

```bash
npx vitest run
```

- [ ] **Step 3: Commit**

```bash
git add src/sidebar.ts
git commit -m "feat: add sidebar component with library and settings panel"
```

---

### Task 3: Rewrite Home as Input-Only Component

**Files:**
- Modify: `src/home.ts`

- [ ] **Step 1: Rewrite home.ts to input-only**

Replace `src/home.ts` with:

```typescript
import { storage, Article } from './storage';
import { parseText, parseFile, extractTitle } from './parser';

export async function mountInput(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div id="input-view">
      <div class="input-area">
        <textarea
          id="home-textarea"
          placeholder="Paste text here and press ⌘+Enter to start reading..."
          rows="6"
        ></textarea>
        <div class="input-actions">
          <label class="home-file-btn">
            Open file
            <input type="file" id="home-file-input" accept=".txt,.md,.pdf,.epub" hidden />
          </label>
          <button id="home-read-btn">Read</button>
        </div>
      </div>
      <div id="home-drop-hint" class="home-drop-hint">Drop a file anywhere</div>
    </div>
  `;

  const textarea = document.getElementById('home-textarea') as HTMLTextAreaElement;
  const readBtn = document.getElementById('home-read-btn')!;
  const fileInput = document.getElementById('home-file-input') as HTMLInputElement;

  async function startReading(text: string, source: string): Promise<void> {
    const words = parseText(text);
    if (words.length === 0) return;
    const defaultWPM = (await storage.getSetting('defaultWPM') as number) || 300;
    const title = extractTitle(text);
    const article: Article = {
      id: crypto.randomUUID(),
      title,
      source,
      fullText: text,
      words,
      currentPosition: 0,
      totalWords: words.length,
      lastWPM: defaultWPM,
      createdAt: Date.now(),
      lastReadAt: Date.now(),
    };
    await storage.saveArticle(article);
    window.dispatchEvent(new CustomEvent('navigate', {
      detail: { view: 'reader', articleId: article.id },
    }));
  }

  readBtn.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (text) startReading(text, 'Pasted text');
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const text = textarea.value.trim();
      if (text) startReading(text, 'Pasted text');
    }
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const text = await parseFile(file);
    if (text.trim()) startReading(text, file.name);
  });

  const preventDefaults = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const dropHint = document.getElementById('home-drop-hint')!;
  document.addEventListener('dragover', preventDefaults);
  document.addEventListener('dragenter', (e) => { preventDefaults(e); dropHint.classList.add('visible'); });
  document.addEventListener('dragleave', (e) => { preventDefaults(e); if (e.relatedTarget === null) dropHint.classList.remove('visible'); });
  document.addEventListener('drop', async (e) => {
    preventDefaults(e);
    dropHint.classList.remove('visible');
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const text = await parseFile(file);
    if (text.trim()) startReading(text, file.name);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/home.ts
git commit -m "refactor: simplify home to input-only component"
```

---

### Task 4: Rewrite Main Layout Orchestrator

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Rewrite main.ts as layout orchestrator**

Replace `src/main.ts` with:

```typescript
import './style.css';
import { mountInput } from './home';
import { mountReader, ReadingMode } from './reader';
import { mountSidebar } from './sidebar';
import { storage } from './storage';
import { loadSettings, applyTheme, ThemeSettings } from './theme';

const app = document.getElementById('app')!;

let sidebarOpen = false;
let currentArticleId: string | null = null;
let currentSettings: ThemeSettings;

async function init(): Promise<void> {
  currentSettings = await loadSettings();
  applyTheme(currentSettings);

  app.innerHTML = `
    <div id="layout">
      <div id="main-panel">
        <div id="main-content"></div>
      </div>
      <div id="sidebar" class="sidebar-closed">
        <div id="sidebar-content"></div>
      </div>
      <button id="sidebar-toggle" class="sidebar-toggle-btn" title="Toggle sidebar (L)">☰</button>
    </div>
  `;

  const mainContent = document.getElementById('main-content')!;
  const sidebar = document.getElementById('sidebar')!;
  const sidebarContent = document.getElementById('sidebar-content')!;
  const toggleBtn = document.getElementById('sidebar-toggle')!;

  function toggleSidebar(): void {
    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('sidebar-closed', !sidebarOpen);
    sidebar.classList.toggle('sidebar-open', sidebarOpen);
  }

  toggleBtn.addEventListener('click', toggleSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'l' || e.key === 'L') {
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) return;
      e.preventDefault();
      toggleSidebar();
    }
  });

  async function refreshSidebar(): Promise<void> {
    await mountSidebar(sidebarContent, currentSettings, currentArticleId, onArticleClick, onSettingsChange);
  }

  function onSettingsChange(settings: ThemeSettings): void {
    currentSettings = settings;
  }

  async function onArticleClick(articleId: string): Promise<void> {
    await navigateToReader(articleId);
  }

  async function navigateToHome(): Promise<void> {
    currentArticleId = null;
    await mountInput(mainContent);
    await refreshSidebar();
  }

  async function navigateToReader(articleId: string): Promise<void> {
    const article = await storage.getArticle(articleId);
    if (!article) {
      await navigateToHome();
      return;
    }
    currentArticleId = articleId;
    const mode = (await storage.getSetting('readingMode') as ReadingMode) || 'rsvp';
    mountReader(mainContent, article.words, article.lastWPM, article.currentPosition, article.id, mode);
    await refreshSidebar();
  }

  window.addEventListener('navigate', ((e: CustomEvent) => {
    if (e.detail === 'home') {
      navigateToHome();
    } else if (e.detail?.view === 'reader' && e.detail?.articleId) {
      navigateToReader(e.detail.articleId);
    }
  }) as EventListener);

  await navigateToHome();
  // Open sidebar by default on first load
  toggleSidebar();
}

init();
```

- [ ] **Step 2: Commit**

```bash
git add src/main.ts
git commit -m "refactor: rewrite main.ts as single-screen layout orchestrator"
```

---

### Task 5: Update Reader for New Layout

**Files:**
- Modify: `src/reader.ts`

- [ ] **Step 1: Update reader to work within main panel instead of fixed position**

The reader currently uses `position: fixed` on `#reader-view`. Change it to fill its container instead. Also update the reader to use CSS variables for font settings.

In `src/reader.ts`, change the `container.innerHTML` template:

Replace the opening `<div id="reader-view">` section. The reader-view should no longer be `position: fixed` — that will be handled in CSS. The HTML stays the same, but the CSS changes (Task 6).

Also update the `exit()` function to dispatch the navigate event on `window` instead of `container`:

Change:
```typescript
container.dispatchEvent(new CustomEvent('navigate', { detail: 'home', bubbles: true }));
```
To:
```typescript
window.dispatchEvent(new CustomEvent('navigate', { detail: 'home' }));
```

- [ ] **Step 2: Verify all tests pass**

```bash
npx vitest run
```

- [ ] **Step 3: Commit**

```bash
git add src/reader.ts
git commit -m "refactor: update reader to work within main panel layout"
```

---

### Task 6: Rewrite Styles

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Rewrite style.css with layout grid, sidebar styles, theme variables, and settings panel**

Replace `src/style.css` entirely with the new styles. Key changes:

- Add `#layout` as a CSS grid: `grid-template-columns: 1fr auto`
- Sidebar: 300px wide, slides via `transform: translateX(100%)` when closed
- `#reader-view` changes from `position: fixed` to filling its parent
- Add sidebar component styles (items, settings, accordion, buttons, sliders)
- Add theme button and font button styles
- Add sepia/light theme variable sets (applied via JS, not CSS classes)
- Reader content uses `var(--reader-font)`, `var(--reader-font-size)`, etc.
- Mobile: sidebar overlays at `< 768px`
- Move library item styles to sidebar namespace

Full CSS (write the complete file — this is a rewrite):

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #0a0a0a;
  --bg-surface: #141414;
  --bg-hover: #1a1a1a;
  --text: #888;
  --text-bright: #ccc;
  --accent: #e74c3c;
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --reader-font: var(--font-mono);
  --reader-font-size: 20px;
  --reader-line-height: 2.2;
  --reader-letter-spacing: 0px;
}

html, body {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100%;
}

/* ===== Layout ===== */

#layout {
  display: flex;
  height: 100%;
  position: relative;
  overflow: hidden;
}

#main-panel {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

#main-content {
  height: 100%;
}

/* ===== Sidebar ===== */

#sidebar {
  width: 300px;
  height: 100%;
  background: var(--bg-surface);
  border-left: 1px solid #222;
  overflow-y: auto;
  scrollbar-width: thin;
  transition: margin-right 0.25s ease, opacity 0.25s ease;
  flex-shrink: 0;
}

#sidebar.sidebar-closed {
  margin-right: -300px;
  opacity: 0;
  pointer-events: none;
}

#sidebar.sidebar-open {
  margin-right: 0;
  opacity: 1;
  pointer-events: auto;
}

.sidebar-toggle-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 200;
  background: var(--bg-surface);
  border: 1px solid #333;
  color: var(--text);
  font-size: 18px;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}

.sidebar-toggle-btn:hover {
  border-color: var(--accent);
  color: var(--text-bright);
}

.sidebar-header {
  padding: 20px 16px 12px;
  border-bottom: 1px solid #222;
}

.sidebar-brand {
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--text-bright);
  font-weight: 400;
}

.sidebar-brand-accent {
  color: var(--accent);
  font-weight: 700;
}

.sidebar-section {
  padding: 16px;
}

.sidebar-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #555;
  margin-bottom: 12px;
}

.sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  border-left: 3px solid transparent;
}

.sidebar-item:hover {
  background: var(--bg-hover);
}

.sidebar-item-active {
  border-left-color: var(--accent);
}

.sidebar-item-main {
  flex: 1;
  min-width: 0;
}

.sidebar-item-title {
  color: var(--text-bright);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-item-meta {
  font-size: 11px;
  color: #555;
  margin-top: 3px;
}

.sidebar-progress-track {
  height: 2px;
  background: #222;
  border-radius: 1px;
  margin-top: 6px;
  overflow: hidden;
}

.sidebar-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 1px;
}

.sidebar-progress-fill.done {
  background: #27ae60;
}

.sidebar-item-delete {
  background: none;
  border: none;
  color: #555;
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.sidebar-item-delete:hover {
  color: var(--accent);
}

.sidebar-empty {
  color: #555;
  font-size: 13px;
  text-align: center;
  padding: 24px 0;
}

/* Settings */

.sidebar-settings {
  border-top: 1px solid #222;
}

.sidebar-accordion-toggle {
  width: 100%;
  padding: 14px 16px;
  background: none;
  border: none;
  color: var(--text);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-accordion-toggle:hover {
  color: var(--text-bright);
}

.chevron {
  font-size: 14px;
}

.sidebar-accordion-body {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-accordion-body.collapsed {
  display: none;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-label {
  font-size: 12px;
  color: #555;
  display: flex;
  justify-content: space-between;
}

.setting-value {
  color: var(--text);
}

.setting-row {
  display: flex;
  gap: 6px;
}

.theme-btn,
.font-btn {
  flex: 1;
  padding: 6px 8px;
  font-size: 12px;
  background: var(--bg);
  border: 1px solid #333;
  border-radius: 4px;
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.2s;
}

.theme-btn:hover,
.font-btn:hover {
  border-color: var(--text);
}

.theme-btn.active,
.font-btn.active {
  border-color: var(--accent);
  color: var(--text-bright);
}

.setting-slider {
  width: 100%;
  accent-color: var(--accent);
}

/* ===== Reader View ===== */

#reader-view {
  height: 100%;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  user-select: none;
  cursor: default;
  position: relative;
}

#reader-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  cursor: pointer;
  overflow: hidden;
  min-height: 0;
}

.reader-word {
  font-family: var(--reader-font);
  font-size: clamp(48px, 8vw, 80px);
  letter-spacing: var(--reader-letter-spacing);
  white-space: nowrap;
}

.reader-word.paused {
  animation: pulse 2s ease-in-out infinite;
}

.reader-before,
.reader-after {
  color: var(--text);
}

.reader-orp {
  color: var(--accent);
  font-weight: bold;
}

/* Toast */

.reader-toast {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--font-mono);
  font-size: 24px;
  color: var(--text-bright);
  background: rgba(30, 30, 30, 0.85);
  padding: 10px 24px;
  border-radius: 8px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 50;
}

.reader-toast.visible {
  opacity: 1;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Page mode */

.reader-gradient {
  font-family: var(--reader-font);
  font-size: var(--reader-font-size);
  line-height: var(--reader-line-height);
  letter-spacing: var(--reader-letter-spacing);
  text-align: center;
  max-width: 680px;
  width: 100%;
  padding: 40px 32px;
  overflow-y: auto;
  height: 100%;
  scrollbar-width: none;
  word-spacing: 0.12em;
}

.reader-gradient::-webkit-scrollbar {
  display: none;
}

.gw {
  color: var(--text);
}

.gw-focus {
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-underline-offset: 4px;
  text-decoration-thickness: 2px;
}

.gw-paused {
  animation: pulse-underline 2s ease-in-out infinite;
}

@keyframes pulse-underline {
  0%, 100% { text-decoration-color: var(--accent); }
  50% { text-decoration-color: transparent; }
}

/* Controls */

#reader-controls {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transition: opacity 0.5s ease;
  opacity: 1;
}

#reader-controls.hidden {
  opacity: 0;
  pointer-events: none;
}

.reader-controls-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

#reader-wpm {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text);
}

.reader-mode-btn {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  background: var(--bg-surface);
  border: 1px solid #333;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.reader-mode-btn:hover {
  border-color: var(--accent);
  color: var(--text-bright);
}

#reader-slider {
  width: 200px;
  accent-color: var(--accent);
}

.reader-hint {
  font-size: 12px;
  color: #555;
}

/* Progress bar */

#reader-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: transparent;
}

#reader-progress {
  height: 100%;
  background: var(--accent);
  opacity: 0.3;
  transition: width 0.1s linear;
}

/* ===== Input View ===== */

#input-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.input-area {
  width: 100%;
  max-width: 560px;
}

#home-textarea {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid #333;
  border-radius: 8px;
  color: var(--text-bright);
  font-family: var(--font-sans);
  font-size: 15px;
  padding: 16px;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}

#home-textarea:focus {
  border-color: var(--accent);
}

#home-textarea::placeholder {
  color: #555;
}

.input-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  justify-content: flex-end;
}

.home-file-btn {
  font-size: 14px;
  color: var(--text);
  background: var(--bg-surface);
  border: 1px solid #333;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.home-file-btn:hover {
  border-color: var(--text);
}

#home-read-btn {
  font-size: 14px;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  padding: 8px 24px;
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.2s;
}

#home-read-btn:hover {
  opacity: 0.85;
}

.home-drop-hint {
  position: fixed;
  inset: 0;
  background: rgba(231, 76, 60, 0.08);
  border: 3px dashed var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--accent);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 100;
  border-radius: 12px;
  margin: 12px;
}

.home-drop-hint.visible {
  opacity: 1;
}

/* ===== Mobile ===== */

@media (max-width: 768px) {
  #sidebar {
    position: fixed;
    right: 0;
    top: 0;
    z-index: 150;
    border-left: none;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
  }
}
```

- [ ] **Step 2: Verify all tests pass and build succeeds**

```bash
npx vitest run && npx vite build
```

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "refactor: rewrite styles for sidebar layout, themes, and settings"
```

---

### Task 7: Update Reader Exit Navigation

**Files:**
- Modify: `src/reader.ts`

- [ ] **Step 1: Change exit navigation dispatch**

In `src/reader.ts`, update the `exit()` function:

Change:
```typescript
container.dispatchEvent(new CustomEvent('navigate', { detail: 'home', bubbles: true }));
```
To:
```typescript
window.dispatchEvent(new CustomEvent('navigate', { detail: 'home' }));
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

- [ ] **Step 3: Verify build**

```bash
npx vite build
```

- [ ] **Step 4: Commit**

```bash
git add src/reader.ts
git commit -m "fix: dispatch navigate events on window for layout compatibility"
```

---

### Task 8: Integration Test & Polish

**Files:**
- Various fixes as needed

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

All tests must pass.

- [ ] **Step 2: Build**

```bash
npx vite build
```

Must succeed.

- [ ] **Step 3: Manual testing checklist**

Start dev server:
```bash
npx vite
```

Verify:
1. App loads with input area centered in main panel
2. Sidebar toggle (☰) button visible top-right
3. Click toggle opens sidebar with library (empty) and settings
4. L key toggles sidebar (doesn't trigger when textarea focused)
5. Paste text, Cmd+Enter starts reader in main panel
6. Reader fills main panel (not full screen), sidebar can be open alongside
7. Article appears in sidebar library with active indicator
8. Theme buttons switch between dark/sepia/light immediately
9. Font buttons switch between mono/sans/serif
10. Size/line-height/spacing sliders update Page mode content live
11. Escape exits reader, shows input area
12. Click library item to resume reading
13. Delete article from sidebar
14. Settings persist after page refresh
15. File drag-and-drop still works
16. Mobile viewport: sidebar overlays

- [ ] **Step 4: Fix any issues found**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Kindle-style layout with sidebar, themes, and font settings"
```
