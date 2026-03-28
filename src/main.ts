import './style.css';
import { mountHome } from './home';
import { mountReader } from './reader';
import { storage } from './storage';

const app = document.getElementById('app')!;

async function navigateToHome(): Promise<void> {
  await mountHome(app);
}

async function navigateToReader(articleId: string): Promise<void> {
  const article = await storage.getArticle(articleId);
  if (!article) {
    await navigateToHome();
    return;
  }
  mountReader(app, article.words, article.lastWPM, article.currentPosition, article.id);
}

// Listen for navigation events from views
window.addEventListener('navigate', ((e: CustomEvent) => {
  if (e.detail === 'home') {
    navigateToHome();
  } else if (e.detail?.view === 'reader' && e.detail?.articleId) {
    navigateToReader(e.detail.articleId);
  }
}) as EventListener);

// Start at home
navigateToHome();
