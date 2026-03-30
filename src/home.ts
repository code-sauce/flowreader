import { storage, Article } from './storage';
import { parseText, parseFile, extractTitle } from './parser';
import { Readability } from '@mozilla/readability';

function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  // If running inside extension iframe, use extension's CORS-free fetch
  if (window.parent !== window) {
    try {
      const result = await new Promise<{ ok: boolean; html?: string }>((resolve) => {
        const handler = (e: MessageEvent) => {
          if (e.data?.type === 'flowreader-fetch-response') {
            window.removeEventListener('message', handler);
            resolve(e.data);
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ type: 'flowreader-fetch-url', url }, '*');
        // Timeout after 10s
        setTimeout(() => { window.removeEventListener('message', handler); resolve({ ok: false }); }, 10000);
      });
      if (result.ok && result.html) return result.html;
    } catch { /* fall through */ }
  }

  // Try direct fetch
  try {
    const response = await fetch(url);
    if (response.ok) return await response.text();
  } catch { /* CORS blocked, try proxy */ }

  // Fallback: CORS proxy
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) return await response.text();
  } catch { /* proxy also failed */ }

  return null;
}

async function fetchArticle(url: string): Promise<{ title: string; text: string } | null> {
  const html = await fetchHtml(url);
  if (!html) return null;

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const base = doc.createElement('base');
    base.href = url;
    doc.head.prepend(base);
    const article = new Readability(doc).parse();
    if (!article || !article.textContent?.trim()) return null;
    return { title: article.title || url, text: article.textContent };
  } catch (err) {
    console.error('Failed to parse article:', err);
    return null;
  }
}

export async function mountInput(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div id="input-view">
      <div class="input-area">
        <textarea
          id="home-textarea"
          placeholder="Paste text, a URL, or drop a file..."
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
      <div class="home-why">
        <p>Guided reading eliminates the effort of tracking lines. Especially effective for ADHD readers.</p>
        <div class="home-refs">
          <a href="https://pubmed.ncbi.nlm.nih.gov/29461715/" target="_blank" rel="noopener">Research: speed-reading &amp; comprehension</a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7464337/" target="_blank" rel="noopener">Research: visual attention &amp; reading</a>
        </div>
      </div>
      <div class="home-features">
        <div class="feature">
          <div class="feature-key">Space</div>
          <div class="feature-desc">Play / pause</div>
        </div>
        <div class="feature">
          <div class="feature-key">&uarr; &darr;</div>
          <div class="feature-desc">Speed</div>
        </div>
        <div class="feature">
          <div class="feature-key">&larr; &rarr;</div>
          <div class="feature-desc">Skip</div>
        </div>
        <div class="feature">
          <div class="feature-key">M</div>
          <div class="feature-desc">RSVP / Page</div>
        </div>
        <div class="feature">
          <div class="feature-key">L</div>
          <div class="feature-desc">Sidebar</div>
        </div>
        <div class="feature">
          <div class="feature-key">B</div>
          <div class="feature-desc">Bookmark</div>
        </div>
      </div>
      <div class="home-tagline">Paste text, a URL, or drop a file. Press <strong>&#8984;+Enter</strong> to start.</div>
      <div class="home-note">URLs work best with blogs and articles. Dynamic or paywalled sites may load partially.</div>
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

  async function handleInput(): Promise<void> {
    const text = textarea.value.trim();
    if (!text) return;

    if (isUrl(text)) {
      readBtn.textContent = 'Loading...';
      readBtn.setAttribute('disabled', '');
      const article = await fetchArticle(text);
      readBtn.textContent = 'Read';
      readBtn.removeAttribute('disabled');
      if (article) {
        startReading(article.text, text);
      } else {
        textarea.value = '';
        textarea.placeholder = 'Could not extract text from that URL. Try pasting the text directly.';
      }
    } else {
      startReading(text, 'Pasted text');
    }
  }

  readBtn.addEventListener('click', handleInput);

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleInput();
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
