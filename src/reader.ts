import { getOrpIndex } from './orp';
import { storage } from './storage';

export interface ReaderState {
  words: string[];
  position: number;
  wpm: number;
  playing: boolean;
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

export function createReaderState(words: string[], wpm: number, position = 0): ReaderState {
  return { words, position, wpm, playing: false };
}

export function adjustWpm(current: number, direction: 'up' | 'down'): number {
  const next = direction === 'up' ? current + 25 : current - 25;
  return Math.min(1000, Math.max(100, next));
}

export function mountReader(
  container: HTMLElement,
  words: string[],
  wpm: number,
  position: number,
  articleId: string
): void {
  let state = createReaderState(words, wpm, position);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let controlsTimer: ReturnType<typeof setTimeout> | null = null;

  container.innerHTML = `
    <div id="reader-view">
      <div id="reader-display">
        <div class="reader-notch"></div>
        <div class="reader-word">
          <span class="reader-before"></span><span class="reader-orp"></span><span class="reader-after"></span>
        </div>
      </div>
      <div id="reader-controls">
        <div id="reader-wpm">${state.wpm} WPM</div>
        <input type="range" id="reader-slider" min="100" max="1000" step="25" value="${state.wpm}" />
        <div class="reader-hint">Space: play/pause · ↑↓: speed · ←→: skip · Esc: exit</div>
      </div>
      <div id="reader-progress-bar">
        <div id="reader-progress" style="width: 0%"></div>
      </div>
    </div>
  `;

  const wordEl = container.querySelector('.reader-word') as HTMLElement;
  const beforeEl = container.querySelector('.reader-before') as HTMLElement;
  const orpEl = container.querySelector('.reader-orp') as HTMLElement;
  const afterEl = container.querySelector('.reader-after') as HTMLElement;
  const notchEl = container.querySelector('.reader-notch') as HTMLElement;
  const wpmLabel = container.querySelector('#reader-wpm') as HTMLElement;
  const slider = container.querySelector('#reader-slider') as HTMLInputElement;
  const controls = container.querySelector('#reader-controls') as HTMLElement;
  const progressEl = container.querySelector('#reader-progress') as HTMLElement;

  function renderWord(): void {
    const word = state.words[state.position] ?? '';
    const orpIdx = getOrpIndex(word);
    beforeEl.textContent = word.slice(0, orpIdx);
    orpEl.textContent = word[orpIdx] ?? '';
    afterEl.textContent = word.slice(orpIdx + 1);

    const progress = state.words.length > 1
      ? (state.position / (state.words.length - 1)) * 100
      : 100;
    progressEl.style.width = `${progress}%`;

    // Position notch above ORP letter
    requestAnimationFrame(() => {
      const orpRect = orpEl.getBoundingClientRect();
      const displayRect = (container.querySelector('#reader-display') as HTMLElement).getBoundingClientRect();
      notchEl.style.left = `${orpRect.left - displayRect.left + orpRect.width / 2}px`;
    });
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

  document.addEventListener('keydown', handleKey);

  // Clean up listener when reader is removed from DOM
  const observer = new MutationObserver(() => {
    if (!document.contains(container)) {
      document.removeEventListener('keydown', handleKey);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  renderWord();

  // Auto-play after 500ms
  setTimeout(() => play(), 500);
}
