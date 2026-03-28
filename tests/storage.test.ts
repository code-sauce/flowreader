import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { storage, Article } from '../src/storage';

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: crypto.randomUUID(),
    title: 'Test Article',
    source: 'pasted',
    fullText: 'one two three four five',
    words: ['one', 'two', 'three', 'four', 'five'],
    currentPosition: 0,
    totalWords: 5,
    lastWPM: 300,
    createdAt: Date.now(),
    lastReadAt: Date.now(),
    ...overrides,
  };
}

describe('storage', () => {
  beforeEach(async () => {
    const db = await storage.getDb();
    const tx = db.transaction('articles', 'readwrite');
    await tx.objectStore('articles').clear();
    await tx.done;
  });

  it('saves and retrieves an article', async () => {
    const article = makeArticle({ title: 'My Article' });
    await storage.saveArticle(article);
    const retrieved = await storage.getArticle(article.id);
    expect(retrieved).toEqual(article);
  });

  it('lists articles sorted by lastReadAt descending', async () => {
    const older = makeArticle({ title: 'Older', lastReadAt: 1000 });
    const newer = makeArticle({ title: 'Newer', lastReadAt: 2000 });
    await storage.saveArticle(older);
    await storage.saveArticle(newer);
    const list = await storage.listArticles();
    expect(list[0].title).toBe('Newer');
    expect(list[1].title).toBe('Older');
  });

  it('updates article position', async () => {
    const article = makeArticle();
    await storage.saveArticle(article);
    await storage.updatePosition(article.id, 3, 350);
    const updated = await storage.getArticle(article.id);
    expect(updated!.currentPosition).toBe(3);
    expect(updated!.lastWPM).toBe(350);
  });

  it('deletes an article', async () => {
    const article = makeArticle();
    await storage.saveArticle(article);
    await storage.deleteArticle(article.id);
    const retrieved = await storage.getArticle(article.id);
    expect(retrieved).toBeUndefined();
  });

  it('gets and sets settings', async () => {
    await storage.setSetting('defaultWPM', 400);
    const val = await storage.getSetting('defaultWPM');
    expect(val).toBe(400);
  });

  it('returns undefined for missing setting', async () => {
    const val = await storage.getSetting('nonexistent');
    expect(val).toBeUndefined();
  });
});
