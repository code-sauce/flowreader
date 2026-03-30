import { getOrpIndex } from './orp';
import { storage } from './storage';
import { FocusStyle, HighlightMode } from './theme';

export type ReadingMode = 'rsvp' | 'gradient';

export interface ReaderState {
  words: string[];
  position: number;
  wpm: number;
  playing: boolean;
  mode: ReadingMode;
}

export function calculateDelay(word: string, nextWord: string, wpm: number): number {
  const base = 60_000 / wpm;

  const alphaOnly = word.replace(/[^a-zA-Z]/g, '');
  const lastChar = word[word.length - 1];

  let multiplier = 1;

  if (alphaOnly.length >= 8) {
    multiplier *= 1.3;
  }

  if (lastChar === ',') {
    multiplier *= 1.3;
  } else if (lastChar === '.' || lastChar === '?' || lastChar === '!') {
    multiplier *= 1.5;
  }

  if (nextWord === '') {
    multiplier *= 3.5;
  }

  return base * multiplier;
}

export function createReaderState(words: string[], wpm: number, position = 0, mode: ReadingMode = 'rsvp'): ReaderState {
  return { words, position, wpm, playing: false, mode };
}

export function adjustWpm(current: number, direction: 'up' | 'down'): number {
  const next = direction === 'up' ? current + 25 : current - 25;
  return Math.min(1000, Math.max(100, next));
}

function isSentenceEnd(word: string): boolean {
  const last = word[word.length - 1];
  return last === '.' || last === '?' || last === '!';
}

// Find sentence boundaries around a position: [start, end] (inclusive)
function findSentenceBounds(words: string[], pos: number): [number, number] {
  let start = 0;
  for (let i = pos - 1; i >= 0; i--) {
    if (isSentenceEnd(words[i])) { start = i + 1; break; }
  }
  let end = words.length - 1;
  for (let i = pos; i < words.length; i++) {
    if (isSentenceEnd(words[i])) { end = i; break; }
  }
  return [start, end];
}

// Find the start of the previous sentence
function findPrevSentenceStart(words: string[], from: number): number {
  // First, find the start of the current sentence
  let currentStart = 0;
  for (let i = from - 1; i >= 0; i--) {
    const last = words[i][words[i].length - 1];
    if (last === '.' || last === '?' || last === '!') {
      currentStart = i + 1;
      break;
    }
  }
  // If we're more than 3 words into the current sentence, go to its start
  if (from - currentStart > 3) return currentStart;
  // Otherwise go to the sentence before that
  if (currentStart === 0) return 0;
  for (let i = currentStart - 2; i >= 0; i--) {
    const last = words[i][words[i].length - 1];
    if (last === '.' || last === '?' || last === '!') return i + 1;
  }
  return 0;
}

// Find the start of the next sentence
function findNextSentenceStart(words: string[], from: number): number {
  for (let i = from; i < words.length; i++) {
    const last = words[i][words[i].length - 1];
    if (last === '.' || last === '?' || last === '!') {
      return Math.min(i + 1, words.length - 1);
    }
  }
  return words.length - 1;
}

export function mountReader(
  container: HTMLElement,
  words: string[],
  wpm: number,
  position: number,
  articleId: string,
  mode: ReadingMode = 'rsvp'
): void {
  let state = createReaderState(words, wpm, position, mode);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let controlsTimer: ReturnType<typeof setTimeout> | null = null;
  let hasStarted = false; // don't show pause pulse until user has played at least once
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  container.innerHTML = `
    <div id="reader-view">
      <div id="reader-display">
        <div class="reader-word">
          <span class="reader-before"></span><span class="reader-orp"></span><span class="reader-after"></span>
        </div>
        <div class="reader-gradient" style="display:none"></div>
      </div>
      <div id="reader-toast" class="reader-toast"></div>
      <div id="reader-bottom-bar">
        <div id="reader-scrub">
          <div id="reader-scrub-fill" style="width: 0%"></div>
          <div id="reader-scrub-handle" style="left: 0%"></div>
          <div id="reader-scrub-label" class="reader-scrub-label"></div>
        </div>
        <div id="reader-controls">
          <div id="reader-wpm">${state.wpm}</div>
          <input type="range" id="reader-slider" min="100" max="1000" step="25" value="${state.wpm}" />
          <button id="reader-mode-btn" class="reader-mode-btn">${state.mode === 'rsvp' ? 'RSVP' : 'Page'}</button>
        </div>
      </div>
    </div>
  `;

  const beforeEl = container.querySelector('.reader-before') as HTMLElement;
  const orpEl = container.querySelector('.reader-orp') as HTMLElement;
  const afterEl = container.querySelector('.reader-after') as HTMLElement;
  const rsvpWordEl = container.querySelector('.reader-word') as HTMLElement;
  const gradientEl = container.querySelector('.reader-gradient') as HTMLElement;

  // Apply focus style and highlight mode from settings
  let currentHighlightMode: HighlightMode = 'line';
  let currentFocusStyle: FocusStyle = 'underline';

  // BeeLine color pairs: end of line N matches start of line N+1
  const BEELINE_COLORS = [
    ['#5B8DEF', '#E85D75'],  // blue -> rose
    ['#E85D75', '#4EC9B0'],  // rose -> teal
    ['#4EC9B0', '#D4A843'],  // teal -> gold
    ['#D4A843', '#5B8DEF'],  // gold -> blue (cycles)
  ];

  function applyBeelineColors(): void {
    if (currentFocusStyle !== 'beeline' || wordElements.length === 0) return;

    // Group words by visual line
    const lines: HTMLElement[][] = [];
    let currentLine: HTMLElement[] = [];
    let lastTop = -1;
    for (const w of wordElements) {
      if (lastTop >= 0 && Math.abs(w.offsetTop - lastTop) > 2) {
        lines.push(currentLine);
        currentLine = [];
      }
      currentLine.push(w);
      lastTop = w.offsetTop;
    }
    if (currentLine.length) lines.push(currentLine);

    // Apply gradient colors per line
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const pair = BEELINE_COLORS[lineIdx % BEELINE_COLORS.length];
      const lineWords = lines[lineIdx];
      for (let wi = 0; wi < lineWords.length; wi++) {
        const t = lineWords.length > 1 ? wi / (lineWords.length - 1) : 0;
        // Interpolate between pair[0] and pair[1]
        const c0 = hexToRgb(pair[0]);
        const c1 = hexToRgb(pair[1]);
        const r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
        const g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
        const b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
        lineWords[wi].style.color = `rgb(${r},${g},${b})`;
      }
    }
  }

  function clearBeelineColors(): void {
    for (const w of wordElements) {
      w.style.color = '';
    }
  }

  function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function applySettings(focusStyle?: FocusStyle, hlMode?: HighlightMode): void {
    const newStyle = focusStyle || 'underline';
    if (currentFocusStyle === 'beeline' && newStyle !== 'beeline') {
      clearBeelineColors();
    }
    currentFocusStyle = newStyle;
    gradientEl.dataset.focus = newStyle;
    currentHighlightMode = hlMode || 'line';
    if (newStyle === 'beeline') {
      requestAnimationFrame(applyBeelineColors);
    }
  }

  storage.getSetting('themeSettings').then((saved: unknown) => {
    const s = saved as { focusStyle?: FocusStyle; highlightMode?: HighlightMode } | undefined;
    applySettings(s?.focusStyle, s?.highlightMode);
  });

  // Listen for live settings changes
  window.addEventListener('theme-changed', ((e: CustomEvent) => {
    applySettings(e.detail?.focusStyle, e.detail?.highlightMode);
    renderGradient(); // re-render to apply new highlight mode
  }) as EventListener);

  // Listen for pace preset changes
  window.addEventListener('set-wpm', ((e: CustomEvent) => {
    updateWpm(e.detail as number);
  }) as EventListener);

  const wpmLabel = container.querySelector('#reader-wpm') as HTMLElement;
  const slider = container.querySelector('#reader-slider') as HTMLInputElement;
  const controls = container.querySelector('#reader-controls') as HTMLElement;
  const bottomBar = container.querySelector('#reader-bottom-bar') as HTMLElement;
  const scrubBar = container.querySelector('#reader-scrub') as HTMLElement;
  const scrubFill = container.querySelector('#reader-scrub-fill') as HTMLElement;
  const scrubHandle = container.querySelector('#reader-scrub-handle') as HTMLElement;
  const scrubLabel = container.querySelector('#reader-scrub-label') as HTMLElement;
  const modeBtn = container.querySelector('#reader-mode-btn') as HTMLElement;
  const toastEl = container.querySelector('#reader-toast') as HTMLElement;

  // --- Toast (brief feedback overlay) ---

  function showToast(text: string): void {
    toastEl.textContent = text;
    toastEl.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 800);
  }

  // --- Page mode (infinite scroll, centered underline) ---

  let prevFocusEl: HTMLElement | null = null;
  let prevLineEls: HTMLElement[] = [];
  let prevNearEls: HTMLElement[] = [];
  let wordElements: HTMLElement[] = [];
  let scrollRaf: number | null = null;
  let renderedStart = 0;
  let renderedEnd = 0;
  const WINDOW_SIZE = 500;
  const REBUILD_MARGIN = 150;
  let userScrollUntil = 0; // timestamp: suppress auto-scroll until this time

  function scrollLoop(): void {
    if (gradientEl.offsetParent === null) {
      scrollRaf = requestAnimationFrame(scrollLoop);
      return;
    }

    // Keep focused word near vertical center (unless user recently scrolled)
    if (prevFocusEl && state.playing && Date.now() > userScrollUntil) {
      const containerRect = gradientEl.getBoundingClientRect();
      const elRect = prevFocusEl.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height * 0.45;
      const diff = elRect.top - centerY;
      if (Math.abs(diff) > 0.5) {
        gradientEl.scrollTop += diff * 0.08;
      }
    }

    scrollRaf = requestAnimationFrame(scrollLoop);
  }

  function buildWindow(centerOn: number): void {
    const newStart = Math.max(0, centerOn - Math.floor(WINDOW_SIZE / 2));
    const newEnd = Math.min(state.words.length, newStart + WINDOW_SIZE);

    // Remember where the center word was visually
    const oldEl = wordElements[centerOn - renderedStart];
    let oldVisualTop = 0;
    if (oldEl) {
      oldVisualTop = oldEl.getBoundingClientRect().top;
    }

    renderedStart = newStart;
    renderedEnd = newEnd;

    const frag = document.createDocumentFragment();
    wordElements = [];
    for (let i = renderedStart; i < renderedEnd; i++) {
      if (i > renderedStart) frag.appendChild(document.createTextNode(' '));
      const span = document.createElement('span');
      span.className = 'gw';
      span.textContent = state.words[i];
      wordElements.push(span);
      frag.appendChild(span);
    }
    gradientEl.innerHTML = '';
    gradientEl.appendChild(frag);
    prevFocusEl = null;

    // Restore scroll so the center word stays in the same visual spot
    const newEl = wordElements[centerOn - renderedStart];
    if (newEl) {
      if (oldVisualTop) {
        // Match previous visual position
        const newRect = newEl.getBoundingClientRect();
        gradientEl.scrollTop += newRect.top - oldVisualTop;
      } else {
        // First build: center it
        const elTop = newEl.offsetTop - gradientEl.offsetTop;
        gradientEl.scrollTop = Math.max(0, elTop - gradientEl.clientHeight * 0.45);
      }
    }

    // Apply beeline colors after layout
    if (currentFocusStyle === 'beeline') {
      requestAnimationFrame(applyBeelineColors);
    }
  }

  // When paused and user scrolls, find the word nearest the center and update position
  let scrollDebounce: ReturnType<typeof setTimeout> | null = null;
  function onManualScroll(): void {
    if (state.playing || state.mode !== 'gradient') return;
    if (scrollDebounce) clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => {
      const centerY = gradientEl.scrollTop + gradientEl.clientHeight * 0.45;
      let closest = state.position;
      let closestDist = Infinity;
      for (let i = 0; i < wordElements.length; i++) {
        const el = wordElements[i];
        const dist = Math.abs((el.offsetTop - gradientEl.offsetTop) - centerY);
        if (dist < closestDist) {
          closestDist = dist;
          closest = renderedStart + i;
        }
      }
      if (closest !== state.position) {
        state.position = closest;
        renderGradient();
        savePosition();
      }
    }, 200);
  }

  function renderGradient(): void {
    // Rebuild window if position is near the edges
    if (wordElements.length === 0 ||
        state.position < renderedStart + REBUILD_MARGIN ||
        state.position >= renderedEnd - REBUILD_MARGIN) {
      buildWindow(state.position);
    }

    // Remove previous highlights
    for (const prev of prevLineEls) prev.classList.remove('gw-line');
    for (const prev of prevNearEls) prev.classList.remove('gw-near');
    if (prevFocusEl) {
      prevFocusEl.classList.remove('gw-focus');
      prevFocusEl.classList.remove('gw-paused');
    }

    const idx = state.position - renderedStart;
    const el = wordElements[idx];
    if (el) {
      prevLineEls = [];
      prevNearEls = [];

      if (currentHighlightMode === 'sentence') {
        // Sentence mode: highlight full sentence
        const [sentStart, sentEnd] = findSentenceBounds(state.words, state.position);
        for (let i = 0; i < wordElements.length; i++) {
          const wordIdx = renderedStart + i;
          const w = wordElements[i];
          if (wordIdx >= sentStart && wordIdx <= sentEnd) {
            w.classList.add('gw-line');
            prevLineEls.push(w);
          } else if (!state.playing) {
            const dist = wordIdx < sentStart ? sentStart - wordIdx : wordIdx - sentEnd;
            if (dist <= 30) {
              w.classList.add('gw-near');
              prevNearEls.push(w);
            }
          }
        }
      } else {
        // Line mode (default): highlight words on the same visual line
        const lineTop = el.offsetTop;
        const lineTops = [...new Set(wordElements.map(w => w.offsetTop))].sort((a, b) => a - b);
        const currentLineIdx = lineTops.findIndex(t => Math.abs(t - lineTop) < 2);

        for (const w of wordElements) {
          const wLineIdx = lineTops.findIndex(t => Math.abs(t - w.offsetTop) < 2);
          const dist = Math.abs(wLineIdx - currentLineIdx);
          if (dist === 0) {
            w.classList.add('gw-line');
            prevLineEls.push(w);
          } else if (!state.playing && dist <= 3) {
            w.classList.add('gw-near');
            prevNearEls.push(w);
          }
        }
      }

      el.classList.add('gw-focus');
      prevFocusEl = el;
    }
  }

  // --- RSVP mode ---

  function renderRsvp(): void {
    const word = state.words[state.position] ?? '';
    const orpIdx = getOrpIndex(word);
    beforeEl.textContent = word.slice(0, orpIdx);
    orpEl.textContent = word[orpIdx] ?? '';
    afterEl.textContent = word.slice(orpIdx + 1);
  }

  // --- Shared ---

  function applyModeVisibility(): void {
    if (state.mode === 'rsvp') {
      rsvpWordEl.style.display = '';
      gradientEl.style.display = 'none';
      if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = null; }
    } else {
      rsvpWordEl.style.display = 'none';
      gradientEl.style.display = '';
      buildWindow(state.position);
      if (!scrollRaf) scrollRaf = requestAnimationFrame(scrollLoop);
    }
    modeBtn.textContent = state.mode === 'rsvp' ? 'RSVP' : 'Page';
  }

  function renderWord(): void {
    if (state.mode === 'gradient') {
      renderGradient();
    } else {
      renderRsvp();
    }

    const progress = state.words.length > 1
      ? (state.position / (state.words.length - 1)) * 100
      : 100;
    scrubFill.style.width = `${progress}%`;
    scrubHandle.style.left = `${progress}%`;

    // Pause pulse: only after user has played at least once
    if (hasStarted) {
      if (state.mode === 'rsvp') {
        if (!state.playing) {
          rsvpWordEl.classList.add('paused');
        } else {
          rsvpWordEl.classList.remove('paused');
        }
      }
      if (state.mode === 'gradient' && prevFocusEl) {
        if (!state.playing) {
          prevFocusEl.classList.add('gw-paused');
        } else {
          prevFocusEl.classList.remove('gw-paused');
        }
      }
    }
  }

  function toggleMode(): void {
    state.mode = state.mode === 'rsvp' ? 'gradient' : 'rsvp';
    applyModeVisibility();
    renderWord();
    storage.setSetting('readingMode', state.mode);
    showToast(state.mode === 'rsvp' ? 'RSVP' : 'Page');
  }

  function savePosition(): void {
    storage.updatePosition(articleId, state.position, state.wpm);
  }

  function showControls(): void {
    bottomBar.classList.add('visible');
    controls.classList.remove('hidden');
    if (controlsTimer) clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => {
      if (state.playing) {
        bottomBar.classList.remove('visible');
        controls.classList.add('hidden');
      }
    }, 2000);
  }

  function updateWpm(newWpm: number): void {
    state.wpm = newWpm;
    wpmLabel.textContent = `${state.wpm} WPM`;
    slider.value = String(state.wpm);
    showToast(`${state.wpm} WPM`);
  }

  function step(): void {
    if (!state.playing) return;
    if (state.position >= state.words.length - 1) {
      state.playing = false;
      showControls();
      savePosition();
      renderWord(); // update pause state
      return;
    }

    renderWord();

    const word = state.words[state.position];
    const nextWord = state.words[state.position + 1] ?? '';
    const delay = calculateDelay(word, nextWord, state.wpm);

    if (state.position % 10 === 0 && state.position > 0) {
      savePosition();
    }

    state.position++;
    timeoutId = setTimeout(step, delay);
  }

  function play(): void {
    if (state.position >= state.words.length) return;
    state.playing = true;
    hasStarted = true;
    showControls();
    showToast('▶');
    step();
  }

  function pause(): void {
    state.playing = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    showControls();
    savePosition();
    renderWord(); // update pause state
    showToast('⏸');
  }

  function scrollToFocus(): void {
    if (state.mode !== 'gradient' || !prevFocusEl) return;
    const elTop = prevFocusEl.offsetTop - gradientEl.offsetTop;
    gradientEl.scrollTop = Math.max(0, elTop - gradientEl.clientHeight * 0.45);
  }

  function skipBack(): void {
    if (state.playing) pause();
    state.position = findPrevSentenceStart(state.words, state.position);
    renderWord();
    scrollToFocus();
  }

  function skipForward(): void {
    const wasPlaying = state.playing;
    if (wasPlaying) pause();
    state.position = findNextSentenceStart(state.words, state.position);
    renderWord();
    if (wasPlaying) {
      play();
    } else {
      scrollToFocus();
    }
  }

  function exit(): void {
    pause();
    savePosition();
    if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = null; }
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'home' }));
  }

  function handleKey(e: KeyboardEvent): void {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        state.playing ? pause() : play();
        break;
      case 'ArrowUp':
        e.preventDefault();
        updateWpm(adjustWpm(state.wpm, 'up'));
        break;
      case 'ArrowDown':
        e.preventDefault();
        updateWpm(adjustWpm(state.wpm, 'down'));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skipBack();
        break;
      case 'ArrowRight':
        e.preventDefault();
        skipForward();
        break;
      case 'Escape':
        e.preventDefault();
        exit();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMode();
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        state.position = 0;
        renderWord();
        if (state.playing) {
          pause();
          play();
        }
        break;
    }
  }

  slider.addEventListener('input', () => {
    updateWpm(Number(slider.value));
  });

  modeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMode();
  });

  const display = container.querySelector('#reader-display') as HTMLElement;
  display.addEventListener('click', () => {
    state.playing ? pause() : play();
  });

  // Show bottom bar on mouse move, hide after timeout
  container.addEventListener('mousemove', () => showControls());

  gradientEl.addEventListener('scroll', onManualScroll);

  // Mouse wheel: always allow, suppress auto-scroll briefly so it doesn't fight
  gradientEl.addEventListener('wheel', () => {
    userScrollUntil = Date.now() + 2000; // suppress auto-scroll for 2s after last wheel
  }, { passive: true });

  // Scrub bar: click or drag to jump to any position
  function scrubTo(clientX: number): void {
    const rect = scrubBar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newPos = Math.round(fraction * (state.words.length - 1));
    if (state.playing) pause();
    state.position = newPos;
    renderWord();
    scrollToFocus();
    savePosition();
    const pct = Math.round(fraction * 100);
    scrubLabel.textContent = `${pct}%`;
    scrubLabel.style.left = `${pct}%`;
    scrubLabel.classList.add('visible');
  }

  scrubBar.addEventListener('click', (e) => {
    scrubTo(e.clientX);
    setTimeout(() => scrubLabel.classList.remove('visible'), 1000);
  });

  let dragging = false;
  scrubHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true;
    scrubLabel.classList.add('visible');
  });
  document.addEventListener('mousemove', (e) => {
    if (dragging) scrubTo(e.clientX);
  });
  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      setTimeout(() => scrubLabel.classList.remove('visible'), 1000);
    }
  });

  document.addEventListener('keydown', handleKey);

  // Clean up listener when reader is removed from DOM
  const observer = new MutationObserver(() => {
    if (!document.contains(container)) {
      document.removeEventListener('keydown', handleKey);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  applyModeVisibility();
  renderWord();

  // Auto-play after 500ms
  setTimeout(() => play(), 500);
}
