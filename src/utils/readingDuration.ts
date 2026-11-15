const MS_PER_WORD = 160;
const MIN_MS = 4200;
const MAX_MS = 9500;

/** How long to leave a paragraph on screen so it's comfortably readable (not a blind guess — scaled by word count). */
export function readingDuration(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.min(MAX_MS, Math.max(MIN_MS, words * MS_PER_WORD));
}
