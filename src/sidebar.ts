import { storage, Article } from './storage';
import { ThemeSettings, ThemeName, FontFamily, FocusStyle, saveSettings } from './theme';

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

  function focusBtn(name: FocusStyle, label: string): string {
    const active = settings.focusStyle === name ? 'active' : '';
    return `<button class="focus-btn ${active}" data-focus="${name}">${label}</button>`;
  }

  const FOCUS_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
  function colorDot(color: string): string {
    const active = settings.focusColor === color ? 'active' : '';
    return `<button class="color-dot ${active}" data-color="${color}" style="background:${color}"></button>`;
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
          <div class="setting-label">Focus style</div>
          <div class="setting-row">
            ${focusBtn('underline', 'Underline')}
            ${focusBtn('highlight', 'Highlight')}
            ${focusBtn('blur', 'Blur')}
          </div>
        </div>
        <div class="setting-group">
          <div class="setting-label">Focus color</div>
          <div class="setting-row color-row">
            ${FOCUS_COLORS.map(c => colorDot(c)).join('')}
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
        <div class="setting-group">
          <div class="setting-label">Page width <span class="setting-value" id="pw-value">${settings.pageWidth}px</span></div>
          <input type="range" class="setting-slider" id="page-width-slider" min="400" max="1200" step="20" value="${settings.pageWidth}" />
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

  // Focus style buttons
  container.querySelectorAll('.focus-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.focusStyle = (btn as HTMLElement).dataset.focus as FocusStyle;
      container.querySelectorAll('.focus-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveSettings(currentSettings);
      onSettingsChange(currentSettings);
    });
  });

  // Focus color dots
  container.querySelectorAll('.color-dot').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.focusColor = (btn as HTMLElement).dataset.color!;
      container.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'));
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

  const pageWidthSlider = container.querySelector('#page-width-slider') as HTMLInputElement;
  pageWidthSlider.addEventListener('input', () => {
    currentSettings.pageWidth = Number(pageWidthSlider.value);
    container.querySelector('#pw-value')!.textContent = `${currentSettings.pageWidth}px`;
    saveSettings(currentSettings);
    onSettingsChange(currentSettings);
  });
}
