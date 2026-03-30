import './style.css';
import { mountInput } from './home';
import { mountReader, ReadingMode } from './reader';
import { mountSidebar } from './sidebar';
import { storage } from './storage';
import { loadSettings, applyTheme, ThemeSettings } from './theme';

const app = document.getElementById('app')!;

let sidebarOpen = false;
let currentArticleId: string | null = null;
let currentSettings: ThemeSettings;

async function init(): Promise<void> {
  currentSettings = await loadSettings();
  applyTheme(currentSettings);

  app.innerHTML = `
    <div id="layout">
      <div id="main-panel">
        <div id="main-content"></div>
      </div>
      <div id="sidebar" class="sidebar-closed">
        <div id="sidebar-content"></div>
      </div>
      <button id="sidebar-toggle" class="sidebar-toggle-btn" title="Toggle sidebar (L)">☰</button>
    </div>
  `;

  const mainContent = document.getElementById('main-content')!;
  const sidebar = document.getElementById('sidebar')!;
  const sidebarContent = document.getElementById('sidebar-content')!;
  const toggleBtn = document.getElementById('sidebar-toggle')!;

  function toggleSidebar(): void {
    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('sidebar-closed', !sidebarOpen);
    sidebar.classList.toggle('sidebar-open', sidebarOpen);
  }

  toggleBtn.addEventListener('click', toggleSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'l' || e.key === 'L') {
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) return;
      e.preventDefault();
      toggleSidebar();
    }
  });

  async function refreshSidebar(): Promise<void> {
    await mountSidebar(sidebarContent, currentSettings, currentArticleId, onArticleClick, onSettingsChange);
  }

  function onSettingsChange(settings: ThemeSettings): void {
    currentSettings = settings;
  }

  async function onArticleClick(articleId: string): Promise<void> {
    await navigateToReader(articleId);
  }

  async function navigateToHome(): Promise<void> {
    currentArticleId = null;
    await mountInput(mainContent);
    await refreshSidebar();
  }

  async function navigateToReader(articleId: string): Promise<void> {
    const article = await storage.getArticle(articleId);
    if (!article) {
      await navigateToHome();
      return;
    }
    currentArticleId = articleId;
    const mode = (await storage.getSetting('readingMode') as ReadingMode) || 'rsvp';
    mountReader(mainContent, article.words, article.lastWPM, article.currentPosition, article.id, mode);
    await refreshSidebar();
  }

  window.addEventListener('navigate', ((e: CustomEvent) => {
    if (e.detail === 'home') {
      navigateToHome();
    } else if (e.detail?.view === 'reader' && e.detail?.articleId) {
      navigateToReader(e.detail.articleId);
    }
  }) as EventListener);

  window.addEventListener('annotations-changed', () => refreshSidebar());

  await navigateToHome();
  toggleSidebar();
}

init().catch(err => {
  console.error('FlowReader init failed:', err);
  app.textContent = 'Failed to load. Check console.';
});
