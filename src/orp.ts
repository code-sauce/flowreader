export function getOrpIndex(word: string): number {
  const len = word.length;
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}
