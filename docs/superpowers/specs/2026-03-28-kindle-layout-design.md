# FlowReader Kindle-Style Layout Redesign

## Overview

Redesign FlowReader from a two-view app (home / reader) into a single-screen layout with a toggleable right sidebar containing the library and reading settings. Inspired by Kindle's reader experience.

## Layout

The app is now one view with two areas:

**Main panel (left):** Takes full width when sidebar is collapsed. Contains:
- Top: text input area with file drop zone and "Read" button (always accessible)
- Below: the active reader (RSVP or Page mode) when reading

When not reading, the main panel shows just the input area centered. When reading, the input area collapses to a thin bar at the top (or hides) and the reader takes the space.

**Sidebar (right):** 300px wide, slides in/out. Contains:
- Library section (top)
- Settings section (bottom, collapsible accordion)

## Sidebar

### Toggle

- Button: small icon in the top-right corner, always visible in both states
- Keyboard: `L` key toggles the sidebar
- Animation: slides in/out, ~200ms ease
- On narrow screens (< 768px): overlays the main content instead of pushing it

### Library Section

Same data as current library list, displayed vertically in the sidebar:
- Article title (truncated with ellipsis)
- Source label and date
- Progress bar with percentage
- Last WPM used
- Delete button (x)
- Click to open in reader
- Active/currently-reading article gets a subtle left border accent

### Settings Section

Collapsible accordion at the bottom of the sidebar. Header reads "Settings" with a chevron toggle.

**Theme:** Three buttons in a row, click to switch. Applied immediately.
- Dark: `#0a0a0a` bg, `#888` text, `#e74c3c` accent
- Sepia: `#f4ecd8` bg, `#5b4636` text, `#e74c3c` accent
- Light: `#ffffff` bg, `#333` text, `#e74c3c` accent

Theme is implemented via CSS custom properties on `:root`. Switching theme updates the properties. All existing styles use the variables so they adapt automatically.

**Font family:** Three segmented buttons:
- Mono (`'SF Mono', 'Fira Code', monospace`)
- Sans (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- Serif (`Georgia, 'Times New Roman', serif`)

Applies to reader content in both RSVP and Page modes.

**Font size:** Slider, range 14px-36px, default 20px. Applies to Page mode content. RSVP keeps its own responsive `clamp()` sizing.

**Line height:** Slider, range 1.4-3.0, default 2.2. Applies to Page mode content.

**Letter spacing:** Slider, range 0-4px, default 0. Applies to reader content in both modes.

All settings save to IndexedDB `settings` store immediately on change and load on app startup.

## Data Model Changes

New settings keys in the existing IndexedDB `settings` store:

```typescript
theme: 'dark' | 'sepia' | 'light'    // default: 'dark'
fontFamily: 'mono' | 'sans' | 'serif' // default: 'mono'
fontSize: number                       // default: 20 (px)
lineHeight: number                     // default: 2.2
letterSpacing: number                  // default: 0 (px)
```

## File Changes

| File | Change |
|------|--------|
| `src/style.css` | Add sidebar styles, theme CSS variables for sepia/light, settings panel styles. Restructure layout to single-view with sidebar. |
| `src/home.ts` | Remove library rendering. Simplify to just the input area. |
| `src/sidebar.ts` | **New.** Sidebar component: library list, settings panel, toggle logic. |
| `src/theme.ts` | **New.** Theme/font settings: load from storage, apply CSS variables, handle changes. |
| `src/main.ts` | Update routing: single-view layout instead of view swapping. Mount sidebar alongside main content. |
| `src/reader.ts` | Read font/theme settings and apply to reader content. |
| `src/storage.ts` | No schema changes, just new setting keys. |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| L | Toggle sidebar |
| (all existing shortcuts unchanged) | |

`L` should not toggle sidebar when the text input area is focused (would interfere with typing).
