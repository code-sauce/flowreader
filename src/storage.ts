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

export interface Annotation {
  id: string;
  articleId: string;
  type: 'bookmark' | 'highlight' | 'note';
  position: number;       // word index
  endPosition?: number;   // word index end (for highlights spanning multiple words)
  color?: string;         // highlight color
  text?: string;          // note text or bookmark label
  createdAt: number;
}

const DB_NAME = 'flowreader';
const DB_VERSION = 2;

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
        if (!db.objectStoreNames.contains('annotations')) {
          const store = db.createObjectStore('annotations', { keyPath: 'id' });
          store.createIndex('byArticle', 'articleId');
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

async function saveAnnotation(annotation: Annotation): Promise<void> {
  const db = await getDb();
  await db.put('annotations', annotation);
}

async function getAnnotations(articleId: string): Promise<Annotation[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('annotations', 'byArticle', articleId);
  return all.sort((a, b) => a.position - b.position);
}

async function deleteAnnotation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('annotations', id);
}

async function deleteAnnotationsForArticle(articleId: string): Promise<void> {
  const db = await getDb();
  const all = await db.getAllFromIndex('annotations', 'byArticle', articleId);
  const tx = db.transaction('annotations', 'readwrite');
  for (const a of all) {
    tx.store.delete(a.id);
  }
  await tx.done;
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
  saveAnnotation,
  getAnnotations,
  deleteAnnotation,
  deleteAnnotationsForArticle,
};
