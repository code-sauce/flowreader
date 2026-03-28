import { openDB, IDBPDatabase } from 'idb';

export interface Article {
  id: string;
  title: string;
  source: string;
  fullText: string;
  words: string[];
  currentPosition: number;
  totalWords: number;
  lastWPM: number;
  createdAt: number;
  lastReadAt: number;
}

const DB_NAME = 'flowreader';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('articles')) {
          db.createObjectStore('articles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

async function saveArticle(article: Article): Promise<void> {
  const db = await getDb();
  await db.put('articles', article);
}

async function getArticle(id: string): Promise<Article | undefined> {
  const db = await getDb();
  return db.get('articles', id);
}

async function listArticles(): Promise<Article[]> {
  const db = await getDb();
  const all = await db.getAll('articles');
  return all.sort((a, b) => b.lastReadAt - a.lastReadAt);
}

async function updatePosition(id: string, position: number, wpm: number): Promise<void> {
  const db = await getDb();
  const article = await db.get('articles', id);
  if (!article) return;
  article.currentPosition = position;
  article.lastWPM = wpm;
  article.lastReadAt = Date.now();
  await db.put('articles', article);
}

async function deleteArticle(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('articles', id);
}

async function getSetting(key: string): Promise<unknown> {
  const db = await getDb();
  return db.get('settings', key);
}

async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('settings', value, key);
}

export const storage = {
  getDb,
  saveArticle,
  getArticle,
  listArticles,
  updatePosition,
  deleteArticle,
  getSetting,
  setSetting,
};
