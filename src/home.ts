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

  const textarea = document.getElementById('home-textarea') as HTMLTextAreaElement;
  const readBtn = document.getElementById('home-read-btn')!;
  const fileInput = document.getElementById('home-file-input') as HTMLInputElement;
  const libraryList = document.getElementById('home-library-list')!;

  readBtn.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (text) startReading(text, 'Pasted text');
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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

  libraryList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const deleteId = target.getAttribute('data-delete-id');
    if (deleteId) {
      e.stopPropagation();
      storage.deleteArticle(deleteId).then(() => mountHome(container));
      return;
    }

    const item = target.closest('.library-item') as HTMLElement | null;
    if (item) {
      const id = item.getAttribute('data-id')!;
      resumeReading(id);
    }
  });
}
