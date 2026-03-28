# FlowReader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side PWA that presents text one word at a time with ORP highlighting to induce flow-state reading.

**Architecture:** Two-view SPA (home + reader) with no framework. IndexedDB for persistence. All text parsing client-side. PWA for installability and offline support.

**Tech Stack:** Vite, vanilla TypeScript, plain CSS, idb, pdf.js, epub.js, vite-plugin-pwa

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/orp.ts` | ORP index calculation, pure function |
| `src/storage.ts` | IndexedDB wrapper: articles CRUD, settings, position saves |
| `src/parser.ts` | Text extraction from files (TXT, PDF, EPUB, MD) and pasted HTML |
| `src/reader.ts` | RSVP engine: word display, timing, adaptive speed, keyboard controls, flow state UI |
| `src/home.ts` | Home view: text input, file drop zone, library list, navigation to reader |
| `src/main.ts` | Entry point, view routing between home and reader |
| `src/style.css` | All styles: reader dark theme, home layout, library cards, animations |
| `index.html` | Shell HTML with mount point |
| `vite.config.ts` | Vite config with PWA plugin |
| `public/manifest.json` | PWA manifest |
| `tests/orp.test.ts` | ORP calculation tests |
| `tests/storage.test.ts` | Storage layer tests |
| `tests/reader.test.ts` | Reader engine timing/control tests |
| `tests/parser.test.ts` | Text parsing tests |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `public/manifest.json`

- [ ] **Step 1: Initialize the project**

```bash
cd /Users/saurabh.jain/rsvp-reader
npm init -y
npm install -D vite typescript vite-plugin-pwa
npm install idb
```

- [ ] **Step 2: Create tsconfig.json**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
    }),
  ],
});
```

- [ ] **Step 4: Create index.html**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FlowReader</title>
  <link rel="manifest" href="/manifest.json" />
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Create public/manifest.json**

Create `public/manifest.json`:

```json
{
  "name": "FlowReader",
  "short_name": "FlowReader",
  "description": "RSVP speed reading for flow state",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#e74c3c",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 6: Create placeholder icon**

```bash
mkdir -p /Users/saurabh.jain/rsvp-reader/public/icons
```

Generate minimal SVG icons (we'll replace with real icons later):

Create `public/icons/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0a0a"/>
  <text x="256" y="300" text-anchor="middle" font-family="monospace" font-size="200" fill="#888">F<tspan fill="#e74c3c">R</tspan></text>
</svg>
```

Convert to PNG using Vite's build or leave as SVG and update manifest to reference SVG:

Update `public/manifest.json` icons section:

```json
    {
      "src": "/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
```

- [ ] **Step 7: Create src/style.css with base reset**

Create `src/style.css`:

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
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
```

- [ ] **Step 8: Create src/main.ts stub**

Create `src/main.ts`:

```typescript
import './style.css';

const app = document.getElementById('app')!;
app.textContent = 'FlowReader';
```

- [ ] **Step 9: Verify dev server starts**

```bash
cd /Users/saurabh.jain/rsvp-reader
npx vite --open
```

Expected: Browser opens, shows "FlowReader" text on dark background.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + TypeScript project with PWA config"
```

---

### Task 2: ORP Calculation

**Files:**
- Create: `src/orp.ts`, `tests/orp.test.ts`

- [ ] **Step 1: Install Vitest**

```bash
cd /Users/saurabh.jain/rsvp-reader
npm install -D vitest
```

Add to `package.json` scripts:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 2: Create tsconfig for tests**

Create `tsconfig.json` — update the `include` to also cover tests:

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Write failing tests for ORP calculation**

Create `tests/orp.test.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd /Users/saurabh.jain/rsvp-reader
npx vitest run tests/orp.test.ts
```

Expected: FAIL — `getOrpIndex` is not exported / does not exist.

- [ ] **Step 5: Implement getOrpIndex**

Create `src/orp.ts`:

```typescript
export function getOrpIndex(word: string): number {
  const len = word.length;
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run tests/orp.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/orp.ts tests/orp.test.ts package.json tsconfig.json
git commit -m "feat: add ORP index calculation with tests"
```

---

### Task 3: Storage Layer

**Files:**
- Create: `src/storage.ts`, `tests/storage.test.ts`

- [ ] **Step 1: Install fake-indexeddb for testing**

```bash
cd /Users/saurabh.jain/rsvp-reader
npm install -D fake-indexeddb
```

- [ ] **Step 2: Write failing tests for storage**

Create `tests/storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { storage, Article } from '../src/storage';

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: crypto.randomUUID(),
    title: 'Test Article',
    source: 'pasted',
    fullText: 'one two three four five',
    words: ['one', 'two', 'three', 'four', 'five'],
    currentPosition: 0,
    totalWords: 5,
    lastWPM: 300,
    createdAt: Date.now(),
    lastReadAt: Date.now(),
    ...overrides,
  };
}

describe('storage', () => {
  beforeEach(async () => {
    // Clear the database before each test
    const db = await storage.getDb();
    const tx = db.transaction('articles', 'readwrite');
    await tx.objectStore('articles').clear();
    await tx.done;
  });

  it('saves and retrieves an article', async () => {
    const article = makeArticle({ title: 'My Article' });
    await storage.saveArticle(article);
    const retrieved = await storage.getArticle(article.id);
    expect(retrieved).toEqual(article);
  });

  it('lists articles sorted by lastReadAt descending', async () => {
    const older = makeArticle({ title: 'Older', lastReadAt: 1000 });
    const newer = makeArticle({ title: 'Newer', lastReadAt: 2000 });
    await storage.saveArticle(older);
    await storage.saveArticle(newer);
    const list = await storage.listArticles();
    expect(list[0].title).toBe('Newer');
    expect(list[1].title).toBe('Older');
  });

  it('updates article position', async () => {
    const article = makeArticle();
    await storage.saveArticle(article);
    await storage.updatePosition(article.id, 3, 350);
    const updated = await storage.getArticle(article.id);
    expect(updated!.currentPosition).toBe(3);
    expect(updated!.lastWPM).toBe(350);
  });

  it('deletes an article', async () => {
    const article = makeArticle();
    await storage.saveArticle(article);
    await storage.deleteArticle(article.id);
    const retrieved = await storage.getArticle(article.id);
    expect(retrieved).toBeUndefined();
  });

  it('gets and sets settings', async () => {
    await storage.setSetting('defaultWPM', 400);
    const val = await storage.getSetting('defaultWPM');
    expect(val).toBe(400);
  });

  it('returns undefined for missing setting', async () => {
    const val = await storage.getSetting('nonexistent');
    expect(val).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/storage.test.ts
```

Expected: FAIL — `storage` not exported.

- [ ] **Step 4: Implement storage layer**

Create `src/storage.ts`:

```typescript
import { openDB, IDBPDatabase } from 'idb';

export interface Article {
  id: string;
  title: string;
  source: string;
  fullText: string;
  words: string[];
  currentPosition: number;
  totalWords: number;
  lastWPM: number;
  createdAt: number;
  lastReadAt: number;
}

const DB_NAME = 'flowreader';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('articles')) {
          db.createObjectStore('articles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

async function saveArticle(article: Article): Promise<void> {
  const db = await getDb();
  await db.put('articles', article);
}

async function getArticle(id: string): Promise<Article | undefined> {
  const db = await getDb();
  return db.get('articles', id);
}

async function listArticles(): Promise<Article[]> {
  const db = await getDb();
  const all = await db.getAll('articles');
  return all.sort((a, b) => b.lastReadAt - a.lastReadAt);
}

async function updatePosition(id: string, position: number, wpm: number): Promise<void> {
  const db = await getDb();
  const article = await db.get('articles', id);
  if (!article) return;
  article.currentPosition = position;
  article.lastWPM = wpm;
  article.lastReadAt = Date.now();
  await db.put('articles', article);
}

async function deleteArticle(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('articles', id);
}

async function getSetting(key: string): Promise<unknown> {
  const db = await getDb();
  return db.get('settings', key);
}

async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('settings', value, key);
}

export const storage = {
  getDb,
  saveArticle,
  getArticle,
  listArticles,
  updatePosition,
  deleteArticle,
  getSetting,
  setSetting,
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/storage.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/storage.ts tests/storage.test.ts package.json
git commit -m "feat: add IndexedDB storage layer with tests"
```

---

### Task 4: Text Parser

**Files:**
- Create: `src/parser.ts`, `tests/parser.test.ts`

- [ ] **Step 1: Install PDF and EPUB parsing libraries**

```bash
cd /Users/saurabh.jain/rsvp-reader
npm install pdfjs-dist epubjs
```

- [ ] **Step 2: Write failing tests for text parsing**

Create `tests/parser.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/parser.test.ts
```

Expected: FAIL — functions not exported.

- [ ] **Step 4: Implement parser**

Create `src/parser.ts`:

```typescript
export function parseText(input: string): string[] {
  // Strip HTML tags
  const stripped = input.replace(/<[^>]*>/g, ' ');
  // Split on whitespace, filter empties
  return stripped.split(/\s+/).filter(w => w.length > 0);
}

export function stripMarkdown(md: string): string {
  return md
    // Images: ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Links: [text](url) -> text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Bold: **text** or __text__
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    // Italic: *text* or _text_
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Inline code
    .replace(/`([^`]*)`/g, '$1')
    // Headings
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

export function extractTitle(text: string): string {
  if (!text.trim()) return 'Untitled';

  const firstLine = text.split('\n')[0].trim();

  if (firstLine.length <= 50) {
    return firstLine;
  }

  // If first line is long, truncate at 50 chars + ...
  if (text.includes('\n')) {
    return firstLine.slice(0, 50) + '...';
  }

  // Single line: take first 6 words + ...
  const words = firstLine.split(/\s+/).slice(0, 6);
  return words.join(' ') + '...';
}

export async function readTxtFile(file: File): Promise<string> {
  return file.text();
}

export async function readMdFile(file: File): Promise<string> {
  const raw = await file.text();
  return stripMarkdown(raw);
}

export async function readPdfFile(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  // Set worker source to bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: { str?: string }) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}

export async function readEpubFile(file: File): Promise<string> {
  const ePub = (await import('epubjs')).default;
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;

  const spine = book.spine as { each: (fn: (section: { load: (doc: Document) => Promise<Document> }) => void) => void };
  const sections: string[] = [];

  // epub.js requires loading each section to get text
  const spineItems: Array<{ load: (doc: Document) => Promise<Document> }> = [];
  spine.each((section) => spineItems.push(section));

  for (const section of spineItems) {
    const doc = await section.load(document);
    sections.push(doc.body?.textContent || '');
  }

  book.destroy();
  return sections.join('\n\n');
}

export async function parseFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.txt')) return readTxtFile(file);
  if (name.endsWith('.md')) return readMdFile(file);
  if (name.endsWith('.pdf')) return readPdfFile(file);
  if (name.endsWith('.epub')) return readEpubFile(file);

  // Fallback: try to read as text
  return file.text();
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/parser.test.ts
```

Expected: All tests PASS (only pure functions are tested; file readers tested manually).

- [ ] **Step 6: Commit**

```bash
git add src/parser.ts tests/parser.test.ts package.json
git commit -m "feat: add text parser with markdown stripping and file readers"
```

---

### Task 5: RSVP Reader Engine

**Files:**
- Create: `src/reader.ts`, `tests/reader.test.ts`

- [ ] **Step 1: Write failing tests for reader timing logic**

Create `tests/reader.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateDelay, ReaderState, createReaderState, adjustWpm } from '../src/reader';

describe('calculateDelay', () => {
  const baseDelay = 60_000 / 300; // 200ms at 300 WPM

  it('returns base delay for normal short words', () => {
    // "the" is 3 chars, next word is "cat" (no punctuation)
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
    // 9 chars + ends with period = 1.3 * 1.5 = 1.95x
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
  });

  it('accepts a starting position', () => {
    const state = createReaderState(['a', 'b', 'c'], 300, 2);
    expect(state.position).toBe(2);
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/reader.test.ts
```

Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement reader engine (logic only, no DOM)**

Create `src/reader.ts`:

```typescript
import { getOrpIndex } from './orp';
import { storage } from './storage';

export interface ReaderState {
  words: string[];
  position: number;
  wpm: number;
  playing: boolean;
  articleId: string | null;
}

export function createReaderState(words: string[], wpm: number, position = 0): ReaderState {
  return { words, position, wpm, playing: false, articleId: null };
}

export function calculateDelay(word: string, nextWord: string, wpm: number): number {
  const base = 60_000 / wpm;
  let multiplier = 1;

  // Long word adjustment
  if (word.replace(/[^a-zA-Z]/g, '').length >= 8) {
    multiplier *= 1.3;
  }

  // Punctuation adjustment
  const lastChar = word[word.length - 1];
  if (lastChar === ',') {
    multiplier *= 1.3;
  } else if (lastChar === '.' || lastChar === '?' || lastChar === '!') {
    multiplier *= 1.5;
  }

  // Paragraph break (next word empty signals break)
  if (nextWord === '') {
    multiplier *= 2;
  }

  return base * multiplier;
}

export function adjustWpm(current: number, direction: 'up' | 'down'): number {
  const step = 25;
  if (direction === 'up') return Math.min(1000, current + step);
  return Math.max(100, current - step);
}

// --- DOM rendering and playback ---

let state: ReaderState | null = null;
let timerId: number | null = null;
let controlsFadeTimer: number | null = null;
let saveCounter = 0;

function renderWord(): void {
  if (!state) return;

  const container = document.getElementById('reader-display')!;
  const word = state.words[state.position] || '';
  const orpIdx = getOrpIndex(word);

  const before = word.slice(0, orpIdx);
  const orp = word[orpIdx] || '';
  const after = word.slice(orpIdx + 1);

  container.innerHTML = `
    <div class="reader-notch"></div>
    <div class="reader-word">
      <span class="reader-before">${before}</span><span class="reader-orp">${orp}</span><span class="reader-after">${after}</span>
    </div>
  `;

  // Update progress bar
  const progress = document.getElementById('reader-progress') as HTMLDivElement | null;
  if (progress) {
    const pct = (state.position / (state.words.length - 1)) * 100;
    progress.style.width = `${pct}%`;
  }

  // Update WPM display
  const wpmDisplay = document.getElementById('reader-wpm');
  if (wpmDisplay) {
    wpmDisplay.textContent = `${state.wpm} WPM`;
  }

  // Save position every 10 words
  saveCounter++;
  if (saveCounter >= 10 && state.articleId) {
    saveCounter = 0;
    storage.updatePosition(state.articleId, state.position, state.wpm);
  }
}

function scheduleNext(): void {
  if (!state || !state.playing) return;
  if (state.position >= state.words.length - 1) {
    state.playing = false;
    showControls();
    return;
  }

  const currentWord = state.words[state.position];
  const nextWord = state.words[state.position + 1] || '';
  const delay = calculateDelay(currentWord, nextWord, state.wpm);

  timerId = window.setTimeout(() => {
    state!.position++;
    renderWord();
    scheduleNext();
  }, delay);
}

function play(): void {
  if (!state) return;
  state.playing = true;
  hideControls();
  renderWord();
  scheduleNext();
}

function pause(): void {
  if (!state) return;
  state.playing = false;
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
  showControls();

  // Save position on pause
  if (state.articleId) {
    storage.updatePosition(state.articleId, state.position, state.wpm);
  }
}

function togglePlayPause(): void {
  if (!state) return;
  if (state.playing) pause();
  else play();
}

function skipForward(): void {
  if (!state) return;
  state.position = Math.min(state.words.length - 1, state.position + 5);
  renderWord();
}

function skipBack(): void {
  if (!state) return;
  state.position = Math.max(0, state.position - 5);
  renderWord();
}

function restart(): void {
  if (!state) return;
  const wasPlaying = state.playing;
  if (wasPlaying) pause();
  state.position = 0;
  renderWord();
  if (wasPlaying) play();
}

function hideControls(): void {
  if (controlsFadeTimer !== null) clearTimeout(controlsFadeTimer);
  controlsFadeTimer = window.setTimeout(() => {
    const controls = document.getElementById('reader-controls');
    if (controls) controls.classList.add('hidden');
  }, 2000);
}

function showControls(): void {
  if (controlsFadeTimer !== null) {
    clearTimeout(controlsFadeTimer);
    controlsFadeTimer = null;
  }
  const controls = document.getElementById('reader-controls');
  if (controls) controls.classList.remove('hidden');
}

function handleKeydown(e: KeyboardEvent): void {
  if (!state) return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlayPause();
      break;
    case 'ArrowUp':
      e.preventDefault();
      state.wpm = adjustWpm(state.wpm, 'up');
      renderWord();
      break;
    case 'ArrowDown':
      e.preventDefault();
      state.wpm = adjustWpm(state.wpm, 'down');
      renderWord();
      break;
    case 'ArrowRight':
      e.preventDefault();
      skipForward();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      skipBack();
      break;
    case 'Escape':
      exitReader();
      break;
    case 'KeyR':
      if (!e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        restart();
      }
      break;
  }
}

function exitReader(): void {
  if (state?.articleId) {
    storage.updatePosition(state.articleId, state.position, state.wpm);
  }
  pause();
  state = null;
  document.removeEventListener('keydown', handleKeydown);
  // Navigate back to home (main.ts handles this)
  window.dispatchEvent(new CustomEvent('navigate', { detail: 'home' }));
}

export function mountReader(
  container: HTMLElement,
  words: string[],
  wpm: number,
  position: number,
  articleId: string | null,
): void {
  state = createReaderState(words, wpm, position);
  state.articleId = articleId;
  saveCounter = 0;

  container.innerHTML = `
    <div id="reader-view">
      <div id="reader-display"></div>
      <div id="reader-controls">
        <div id="reader-wpm">${wpm} WPM</div>
        <input
          type="range"
          id="reader-slider"
          min="100"
          max="1000"
          step="25"
          value="${wpm}"
        />
        <div class="reader-hint">Space: play/pause &middot; &uarr;&darr;: speed &middot; &larr;&rarr;: skip &middot; Esc: exit</div>
      </div>
      <div id="reader-progress-bar">
        <div id="reader-progress" style="width: ${(position / (words.length - 1)) * 100}%"></div>
      </div>
    </div>
  `;

  // Wire up slider
  const slider = document.getElementById('reader-slider') as HTMLInputElement;
  slider.addEventListener('input', () => {
    state!.wpm = parseInt(slider.value, 10);
    renderWord();
  });

  // Wire up click to pause/play
  const display = document.getElementById('reader-display')!;
  display.addEventListener('click', togglePlayPause);

  document.addEventListener('keydown', handleKeydown);

  renderWord();
  // Auto-play after a brief moment
  setTimeout(() => play(), 500);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/reader.test.ts
```

Expected: All tests PASS (only pure logic functions tested).

- [ ] **Step 5: Commit**

```bash
git add src/reader.ts tests/reader.test.ts
git commit -m "feat: add RSVP reader engine with adaptive timing and keyboard controls"
```

---

### Task 6: Reader Styles

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Add reader styles to style.css**

Append to `src/style.css`:

```css
/* ===== Reader View ===== */

#reader-view {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  user-select: none;
  cursor: default;
}

#reader-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  cursor: pointer;
}

.reader-notch {
  width: 2px;
  height: 40px;
  background: var(--accent);
  margin-bottom: 8px;
}

.reader-word {
  font-family: var(--font-mono);
  font-size: clamp(48px, 8vw, 80px);
  letter-spacing: 4px;
  white-space: nowrap;
}

.reader-before,
.reader-after {
  color: var(--text);
}

.reader-orp {
  color: var(--accent);
  font-weight: bold;
}

/* Controls */

#reader-controls {
  position: fixed;
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

#reader-wpm {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text);
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
  position: fixed;
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
```

- [ ] **Step 2: Verify reader renders correctly**

```bash
cd /Users/saurabh.jain/rsvp-reader
npx vite --open
```

Manually test: will wire up in Task 8. For now, visually confirm styles exist.

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: add reader view dark theme styles"
```

---

### Task 7: Home View

**Files:**
- Create: `src/home.ts`

- [ ] **Step 1: Implement home view**

Create `src/home.ts`:

```typescript
import { storage, Article } from './storage';
import { parseText, parseFile, stripMarkdown, extractTitle } from './parser';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function renderLibraryItem(article: Article): string {
  const pct = article.totalWords > 0
    ? Math.round((article.currentPosition / article.totalWords) * 100)
    : 0;
  const done = pct >= 100;

  return `
    <div class="library-item" data-id="${article.id}">
      <div class="library-item-main">
        <div class="library-item-title">${article.title}</div>
        <div class="library-item-meta">
          <span>${article.source}</span>
          <span>&middot;</span>
          <span>${formatDate(article.createdAt)}</span>
          <span>&middot;</span>
          <span>${article.lastWPM} WPM</span>
        </div>
        <div class="library-progress-track">
          <div class="library-progress-fill ${done ? 'done' : ''}" style="width: ${pct}%"></div>
        </div>
      </div>
      <button class="library-item-delete" data-delete-id="${article.id}" title="Delete">&times;</button>
    </div>
  `;
}

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

async function resumeReading(articleId: string): Promise<void> {
  window.dispatchEvent(new CustomEvent('navigate', {
    detail: { view: 'reader', articleId },
  }));
}

export async function mountHome(container: HTMLElement): Promise<void> {
  const articles = await storage.listArticles();
  const libraryHtml = articles.length > 0
    ? articles.map(renderLibraryItem).join('')
    : '<div class="library-empty">No reading history yet. Paste some text or drop a file to get started.</div>';

  container.innerHTML = `
    <div id="home-view">
      <div class="home-header">
        <h1 class="home-title">Flow<span class="home-title-accent">Reader</span></h1>
      </div>
      <div class="home-input-area">
        <textarea
          id="home-textarea"
          placeholder="Paste text here and press Enter to start reading..."
          rows="6"
        ></textarea>
        <div class="home-actions">
          <label class="home-file-btn">
            Open file
            <input type="file" id="home-file-input" accept=".txt,.md,.pdf,.epub" hidden />
          </label>
          <button id="home-read-btn">Read</button>
        </div>
        <div id="home-drop-hint" class="home-drop-hint">Drop a file anywhere</div>
      </div>
      <div class="home-library">
        <h2 class="home-section-title">Library</h2>
        <div id="home-library-list">
          ${libraryHtml}
        </div>
      </div>
    </div>
  `;

  // --- Wire up events ---

  const textarea = document.getElementById('home-textarea') as HTMLTextAreaElement;
  const readBtn = document.getElementById('home-read-btn')!;
  const fileInput = document.getElementById('home-file-input') as HTMLInputElement;
  const libraryList = document.getElementById('home-library-list')!;

  // Read button
  readBtn.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (text) startReading(text, 'Pasted text');
  });

  // Enter to submit (Shift+Enter for newline)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = textarea.value.trim();
      if (text) startReading(text, 'Pasted text');
    }
  });

  // File input
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const text = await parseFile(file);
    if (text.trim()) startReading(text, file.name);
  });

  // Drag and drop
  const preventDefaults = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const dropHint = document.getElementById('home-drop-hint')!;

  document.addEventListener('dragover', preventDefaults);
  document.addEventListener('dragenter', (e) => {
    preventDefaults(e);
    dropHint.classList.add('visible');
  });
  document.addEventListener('dragleave', (e) => {
    preventDefaults(e);
    if (e.relatedTarget === null) dropHint.classList.remove('visible');
  });
  document.addEventListener('drop', async (e) => {
    preventDefaults(e);
    dropHint.classList.remove('visible');
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const text = await parseFile(file);
    if (text.trim()) startReading(text, file.name);
  });

  // Library click to resume
  libraryList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Delete button
    const deleteId = target.getAttribute('data-delete-id');
    if (deleteId) {
      e.stopPropagation();
      storage.deleteArticle(deleteId).then(() => mountHome(container));
      return;
    }

    // Click item to resume
    const item = target.closest('.library-item') as HTMLElement | null;
    if (item) {
      const id = item.getAttribute('data-id')!;
      resumeReading(id);
    }
  });
}
```

- [ ] **Step 2: Add home view styles to style.css**

Append to `src/style.css`:

```css
/* ===== Home View ===== */

#home-view {
  max-width: 640px;
  margin: 0 auto;
  padding: 60px 24px;
}

.home-header {
  margin-bottom: 48px;
}

.home-title {
  font-family: var(--font-mono);
  font-size: 32px;
  color: var(--text-bright);
  font-weight: 400;
}

.home-title-accent {
  color: var(--accent);
  font-weight: 700;
}

/* Input area */

.home-input-area {
  margin-bottom: 48px;
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

.home-actions {
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

/* Drop hint */

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

/* Library */

.home-section-title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #555;
  margin-bottom: 16px;
}

.library-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-surface);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.library-item:hover {
  background: var(--bg-hover);
}

.library-item-main {
  flex: 1;
  min-width: 0;
}

.library-item-title {
  color: var(--text-bright);
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.library-item-meta {
  font-size: 12px;
  color: #555;
  margin-top: 4px;
  display: flex;
  gap: 6px;
}

.library-progress-track {
  height: 3px;
  background: #222;
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}

.library-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s;
}

.library-progress-fill.done {
  background: #27ae60;
}

.library-item-delete {
  background: none;
  border: none;
  color: #555;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.2s;
}

.library-item-delete:hover {
  color: var(--accent);
}

.library-empty {
  color: #555;
  font-size: 14px;
  text-align: center;
  padding: 32px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/home.ts src/style.css
git commit -m "feat: add home view with text input, file upload, and library"
```

---

### Task 8: Main Entry Point & View Routing

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Implement view routing in main.ts**

Replace `src/main.ts` with:

```typescript
import './style.css';
import { mountHome } from './home';
import { mountReader } from './reader';
import { storage } from './storage';

const app = document.getElementById('app')!;

async function navigateToHome(): Promise<void> {
  await mountHome(app);
}

async function navigateToReader(articleId: string): Promise<void> {
  const article = await storage.getArticle(articleId);
  if (!article) {
    await navigateToHome();
    return;
  }
  mountReader(app, article.words, article.lastWPM, article.currentPosition, article.id);
}

// Listen for navigation events from views
window.addEventListener('navigate', ((e: CustomEvent) => {
  if (e.detail === 'home') {
    navigateToHome();
  } else if (e.detail?.view === 'reader' && e.detail?.articleId) {
    navigateToReader(e.detail.articleId);
  }
}) as EventListener);

// Start at home
navigateToHome();
```

- [ ] **Step 2: Verify full flow works**

```bash
cd /Users/saurabh.jain/rsvp-reader
npx vite --open
```

Manual test:
1. Page loads with home view, dark theme, textarea visible
2. Paste "The quick brown fox jumps over the lazy dog. It was a beautiful sunny day." and press Enter
3. Reader view opens, words display one at a time with ORP highlight
4. Space pauses/resumes, arrows adjust speed, Escape goes back to home
5. Article appears in library list with progress
6. Click library item to resume reading

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire up view routing between home and reader"
```

---

### Task 9: End-to-End Smoke Test & Polish

**Files:**
- Modify: various files for bug fixes found during manual testing

- [ ] **Step 1: Run all tests**

```bash
cd /Users/saurabh.jain/rsvp-reader
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run the build**

```bash
npx vite build
```

Expected: Build succeeds, output in `dist/`.

- [ ] **Step 3: Preview the production build**

```bash
npx vite preview --open
```

Manual test the same flow as Task 8 Step 2. Verify:
- PWA installs (check browser address bar for install prompt)
- Reader displays words with notch aligned above ORP letter
- Controls fade after 2 seconds of playback
- WPM slider and keyboard controls work
- Progress bar updates at bottom
- Library persists after page refresh
- Resuming an article picks up near where you left off
- File drag-and-drop works for .txt files
- Escape returns to home

- [ ] **Step 4: Fix any issues found during testing**

Address bugs discovered in step 3. Common things to check:
- ORP alignment: the notch should be directly above the highlighted letter
- Word centering: ORP letter should be at exact screen center
- Controls fade timing
- Keyboard events not firing (focus issues)

- [ ] **Step 5: Add .gitignore**

Create `.gitignore`:

```
node_modules/
dist/
.superpowers/
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete FlowReader MVP - RSVP reader with library and PWA support"
```
