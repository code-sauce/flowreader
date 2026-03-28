import { getOrpIndex } from './orp';
import { storage } from './storage';

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
    multiplier *= 2;
  }

  return base * multiplier;
}

export function createReaderState(words: string[], wpm: number, position = 0, mode: ReadingMode = 'rsvp'): ReaderState {
  return { words, position, wpm, playing: false, mode };
}

// Page mode: show ~100 words as a static paragraph, highlight moves through

export function adjustWpm(current: number, direction: 'up' | 'down'): number {
  const next = direction === 'up' ? current + 25 : current - 25;
  return Math.min(1000, Math.max(100, next));
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

  container.innerHTML = `
    <div id="reader-view">
      <div id="reader-display">
        <div class="reader-notch"></div>
        <div class="reader-word">
          <span class="reader-before"></span><span class="reader-orp"></span><span class="reader-after"></span>
        </div>
        <div class="reader-gradient" style="display:none"></div>
      </div>
      <div id="reader-controls">
        <div class="reader-controls-row">
          <div id="reader-wpm">${state.wpm} WPM</div>
          <button id="reader-mode-btn" class="reader-mode-btn">${state.mode === 'rsvp' ? 'RSVP' : 'Gradient'}</button>
        </div>
        <input type="range" id="reader-slider" min="100" max="1000" step="25" value="${state.wpm}" />
        <div class="reader-hint">Space: play/pause · ↑↓: speed · ←→: skip · M: mode · Esc: exit</div>
      </div>
      <div id="reader-progress-bar">
        <div id="reader-progress" style="width: 0%"></div>
      </div>
    </div>
  `;

  const beforeEl = container.querySelector('.reader-before') as HTMLElement;
  const orpEl = container.querySelector('.reader-orp') as HTMLElement;
  const afterEl = container.querySelector('.reader-after') as HTMLElement;
  const rsvpWordEl = container.querySelector('.reader-word') as HTMLElement;
  const gradientEl = container.querySelector('.reader-gradient') as HTMLElement;
  const wpmLabel = container.querySelector('#reader-wpm') as HTMLElement;
  const slider = container.querySelector('#reader-slider') as HTMLInputElement;
  const controls = container.querySelector('#reader-controls') as HTMLElement;
  const progressEl = container.querySelector('#reader-progress') as HTMLElement;
  const modeBtn = container.querySelector('#reader-mode-btn') as HTMLElement;

  const PAGE_SIZE = 80; // words per page
  let pageStart = 0;
  let pageEnd = 0;
  let prevFocusEl: HTMLElement | null = null;

  function buildPage(): void {
    // Build a page of words centered around current position
    pageStart = Math.max(0, state.position - Math.floor(PAGE_SIZE / 2));
    pageEnd = Math.min(state.words.length, pageStart + PAGE_SIZE);
    // Adjust start if we're near the end
    if (pageEnd - pageStart < PAGE_SIZE && pageStart > 0) {
      pageStart = Math.max(0, pageEnd - PAGE_SIZE);
    }

    const parts: string[] = [];
    for (let i = pageStart; i < pageEnd; i++) {
      parts.push(`<span class="gw" data-idx="${i}">${state.words[i]}</span>`);
    }
    gradientEl.innerHTML = parts.join(' ');
    prevFocusEl = null;
  }

  function renderGradient(): void {
    // Rebuild page if current word is outside the rendered range
    if (state.position < pageStart || state.position >= pageEnd) {
      buildPage();
    }

    // Remove highlight from previous word
    if (prevFocusEl) {
      prevFocusEl.classList.remove('gw-focus');
      prevFocusEl.innerHTML = state.words[Number(prevFocusEl.dataset.idx)];
    }

    // Add highlight to current word
    const el = gradientEl.querySelector(`[data-idx="${state.position}"]`) as HTMLElement | null;
    if (el) {
      const word = state.words[state.position];
      const orpIdx = getOrpIndex(word);
      const before = word.slice(0, orpIdx);
      const orp = word[orpIdx] ?? '';
      const after = word.slice(orpIdx + 1);
      el.innerHTML = `${before}<span class="gradient-orp">${orp}</span>${after}`;
      el.classList.add('gw-focus');
      prevFocusEl = el;

      // Smooth scroll to keep focused word visible
      el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }

  function renderRsvp(): void {
    const word = state.words[state.position] ?? '';
    const orpIdx = getOrpIndex(word);
    beforeEl.textContent = word.slice(0, orpIdx);
    orpEl.textContent = word[orpIdx] ?? '';
    afterEl.textContent = word.slice(orpIdx + 1);
  }

  function applyModeVisibility(): void {
    const notchEl = container.querySelector('.reader-notch') as HTMLElement;
    if (state.mode === 'rsvp') {
      rsvpWordEl.style.display = '';
      if (notchEl) notchEl.style.display = '';
      gradientEl.style.display = 'none';
    } else {
      rsvpWordEl.style.display = 'none';
      if (notchEl) notchEl.style.display = 'none';
      gradientEl.style.display = '';
      buildPage();
    }
    modeBtn.textContent = state.mode === 'rsvp' ? 'RSVP' : 'Gradient';
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
    progressEl.style.width = `${progress}%`;
  }

  function toggleMode(): void {
    state.mode = state.mode === 'rsvp' ? 'gradient' : 'rsvp';
    applyModeVisibility();
    renderWord();
    storage.setSetting('readingMode', state.mode);
  }

  function savePosition(): void {
    storage.updatePosition(articleId, state.position, state.wpm);
  }

  function showControls(): void {
    controls.classList.remove('hidden');
    if (controlsTimer) clearTimeout(controlsTimer);
    if (state.playing) {
      controlsTimer = setTimeout(() => controls.classList.add('hidden'), 2000);
    }
  }

  function updateWpm(newWpm: number): void {
    state.wpm = newWpm;
    wpmLabel.textContent = `${state.wpm} WPM`;
    slider.value = String(state.wpm);
  }

  function step(): void {
    if (!state.playing) return;
    if (state.position >= state.words.length - 1) {
      state.playing = false;
      showControls();
      savePosition();
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
    showControls();
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
  }

  function skip(delta: number): void {
    const wasPlaying = state.playing;
    if (wasPlaying) pause();
    state.position = Math.min(state.words.length - 1, Math.max(0, state.position + delta));
    renderWord();
    if (wasPlaying) play();
  }

  function exit(): void {
    pause();
    savePosition();
    container.dispatchEvent(new CustomEvent('navigate', { detail: 'home', bubbles: true }));
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
        skip(-5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        skip(5);
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
