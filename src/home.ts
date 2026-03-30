import { storage, Article } from './storage';
import { parseText, parseFile, extractTitle } from './parser';

export async function mountInput(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div id="input-view">
      <div class="input-area">
        <textarea
          id="home-textarea"
          placeholder="Paste text or drop a file..."
          rows="5"
        ></textarea>
        <div class="input-actions">
          <label class="home-file-btn">
            Open file
            <input type="file" id="home-file-input" accept=".txt,.md,.pdf,.epub" hidden />
          </label>
          <button id="home-read-btn">Read</button>
        </div>
      </div>
      <div class="home-features">
        <div class="feature">
          <div class="feature-key">Space</div>
          <div class="feature-desc">Play / pause</div>
        </div>
        <div class="feature">
          <div class="feature-key">&uarr; &darr;</div>
          <div class="feature-desc">Reading speed</div>
        </div>
        <div class="feature">
          <div class="feature-key">&larr; &rarr;</div>
          <div class="feature-desc">Skip sentences</div>
        </div>
        <div class="feature">
          <div class="feature-key">M</div>
          <div class="feature-desc">RSVP / Page mode</div>
        </div>
        <div class="feature">
          <div class="feature-key">L</div>
          <div class="feature-desc">Library &amp; settings</div>
        </div>
        <div class="feature">
          <div class="feature-key">Esc</div>
          <div class="feature-desc">Exit reader</div>
        </div>
      </div>
      <div class="home-tagline">Paste text, drop a file, or pick from your library. Press <strong>&#8984;+Enter</strong> to start.</div>
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
