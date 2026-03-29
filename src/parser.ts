export function parseText(input: string): string[] {
  // Strip HTML tags
  const stripped = input.replace(/<[^>]*>/g, ' ');
  // Split on whitespace, filter empties
  return stripped.split(/\s+/).filter(w => w.length > 0);
}

export function stripMarkdown(md: string): string {
  return md
    // Images: ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Links: [text](url) -> text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Bold: **text** or __text__
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    // Italic: *text* or _text_
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Inline code
    .replace(/`([^`]*)`/g, '$1')
    // Headings
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

export function extractTitle(text: string): string {
  if (!text.trim()) return 'Untitled';

  const firstLine = text.split('\n')[0].trim();

  if (firstLine.length <= 50) {
    return firstLine;
  }

  // If first line is long, truncate at 50 chars + ...
  if (text.includes('\n')) {
    return firstLine.slice(0, 50) + '...';
  }

  // Single line: take first 6 words + ...
  const words = firstLine.split(/\s+/).slice(0, 6);
  return words.join(' ') + '...';
}

export async function readTxtFile(file: File): Promise<string> {
  return file.text();
}

export async function readMdFile(file: File): Promise<string> {
  const raw = await file.text();
  return stripMarkdown(raw);
}

export async function readPdfFile(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}

export async function readEpubFile(file: File): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ePub = (await import('epubjs')).default as any;
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spine = book.spine as { each: (fn: (section: any) => void) => void };
  const sections: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spineItems: Array<{ load: (doc: Document) => Promise<Document> }> = [];
  spine.each((section: { load: (doc: Document) => Promise<Document> }) => spineItems.push(section));

  for (const section of spineItems) {
    const doc = await section.load(document);
    sections.push(doc.body?.textContent || '');
  }

  book.destroy();
  return sections.join('\n\n');
}

export async function parseFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.txt')) return readTxtFile(file);
  if (name.endsWith('.md')) return readMdFile(file);
  if (name.endsWith('.pdf')) return readPdfFile(file);
  if (name.endsWith('.epub')) return readEpubFile(file);

  // Fallback: try to read as text
  return file.text();
}
