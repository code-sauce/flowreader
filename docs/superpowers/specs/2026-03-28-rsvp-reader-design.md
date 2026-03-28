# FlowReader -- RSVP Speed Reading PWA

## Overview

A client-side Progressive Web App that presents text one word at a time using RSVP (Rapid Serial Visual Presentation) with ORP (Optimal Recognition Point) highlighting. Designed to induce and protect flow state for ADHD-friendly reading.

No backend. No accounts. Pure browser app with local persistence.

## Core Experience: The Reader

### Display

- Full-screen, distraction-free dark view (#0a0a0a background)
- Large monospace text in muted gray (#888)
- ORP letter highlighted in red (#e74c3c, bold)
- Red alignment notch (2px wide, 40px tall) positioned above the ORP letter
- Words positioned so the ORP letter always sits at exact screen center -- short words shift right, long words shift left

### ORP Calculation

Focal letter index based on word length (0-indexed):

| Word length | ORP index |
|-------------|-----------|
| 1-3         | 0         |
| 4-6         | 1         |
| 7-9         | 2         |
| 10-13       | 3         |
| 14+         | 4         |

### Speed Control

- Base WPM via slider: range 100-1000, default 300
- Keyboard adjustment: up/down arrows change WPM by 25 increments while reading, no pause
- Adaptive timing adjustments applied on top of base WPM:
  - Words 8+ characters: +30% display time
  - Words followed by comma: +30% display time
  - Words followed by period, question mark, exclamation: +50% display time
  - Paragraph boundaries: 2x word duration pause

### Flow State Protection

- All UI controls fade out 2 seconds after reading starts -- only the word and notch remain
- Space to pause/resume. Controls fade back in when paused
- Mouse movement does NOT reveal controls (prevents accidental breaks)
- Escape exits reader back to home view
- 1-2px thin progress bar at screen bottom, low opacity -- provides position sense without distraction

### Keyboard Controls

| Key         | Action                              |
|-------------|-------------------------------------|
| Space       | Play / pause                        |
| Up arrow    | Increase WPM by 25                  |
| Down arrow  | Decrease WPM by 25                  |
| Right arrow | Skip forward 5 words               |
| Left arrow  | Skip back 5 words                   |
| Escape      | Exit reader, return to home         |
| R           | Restart from beginning              |

## Text Input

Two input methods for MVP, both client-side:

### Paste Text

A large text area on the home screen. Paste any text, press Enter or click "Read" to start. The app strips HTML and markdown, works with plain text. The input auto-detects content and cleans it.

### File Upload

Drag-and-drop zone overlaid on the home screen, or click to browse. Supported formats:

| Format    | Parser                        |
|-----------|-------------------------------|
| .txt      | Direct read (FileReader API)  |
| .pdf      | pdf.js (client-side)          |
| .epub     | epub.js (client-side)         |
| .md       | Strip markdown to plain text  |

All parsing happens in the browser. No files leave the device.

## Home Screen

Minimal layout:

1. **Input area** -- single large text area that accepts pasted text. Drop zone hint around it for file uploads.
2. **Library** -- below the input. A list of articles/texts sorted by most recent.

No tabs, no mode switching, no navigation beyond home and reader.

## Library

A flat list of everything the user has started reading. Each entry shows:

- Title (extracted from content: first heading, filename, or first few words of pasted text)
- Source label ("Pasted text" or filename)
- Progress bar with percentage
- Date added
- Last WPM used

Actions:
- Click to resume reading from saved position
- Delete to remove from library

No folders, tags, or categories. Flat and simple.

## Data Model (IndexedDB)

### `articles` store

```typescript
interface Article {
  id: string;           // crypto.randomUUID()
  title: string;
  source: string;       // "pasted" | filename
  fullText: string;     // cleaned plain text
  words: string[];      // pre-split word array
  currentPosition: number;  // word index
  totalWords: number;
  lastWPM: number;
  createdAt: number;    // timestamp
  lastReadAt: number;   // timestamp
}
```

### `settings` store

```typescript
interface Settings {
  defaultWPM: number;       // default: 300
  theme: 'dark';            // only dark for MVP
}
```

Position is saved to IndexedDB every 10 words and on pause/exit. Closing the tab mid-read and returning picks up within a few words of where you left off.

## Tech Stack

- **Vite** -- build tool, dev server, PWA plugin
- **Vanilla TypeScript** -- no framework, two views with simple state
- **Plain CSS** -- custom properties for theming
- **vite-plugin-pwa** -- service worker, manifest, offline support
- **pdf.js** -- client-side PDF text extraction
- **epub.js** -- client-side EPUB parsing
- **idb** -- thin promise wrapper around IndexedDB API

## Project Structure

```
rsvp-reader/
  src/
    main.ts           # entry point, view routing
    reader.ts         # RSVP engine: timing, display, controls
    home.ts           # input area, file handling, library list
    orp.ts            # ORP index calculation
    storage.ts        # IndexedDB operations via idb
    parser.ts         # text extraction from files (PDF, EPUB, MD, TXT)
    style.css         # all styles
  public/
    manifest.json     # PWA manifest
    icons/            # app icons (192x192, 512x512)
  index.html
  vite.config.ts
  tsconfig.json
  package.json
```

## Post-MVP Features (Not In Scope)

These are explicitly out of scope for MVP but the architecture supports adding them later:

- **URL text extraction** -- via serverless edge function or browser extension
- **Browser extension** -- right-click "Read in FlowReader", toolbar button
- **Stats dashboard** -- WPM trends, reading streaks, total words read
- **Session tracking** -- per-reading-session data for analytics
- **Light theme** -- theme toggle
- **Cross-device sync** -- optional cloud backup of library
- **Clipboard monitor** -- detect large clipboard text, offer to read it
- **Chunk mode** -- show 2-3 words at a time instead of single word
