import type { MediaItem } from "@shared/types";

/**
 * Finds the next item in an explicit series, based on manifest ordering —
 * never inferred from filenames or timestamps alone.
 */
export function getNextEpisode(current: MediaItem, allItems: MediaItem[]): MediaItem | undefined {
  if (current.featured) {
    const series = allItems
      .filter((item) => item.featured)
      .sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
    const index = series.findIndex((item) => item.id === current.id);
    if (index >= 0 && index < series.length - 1) return series[index + 1];
    return undefined;
  }

  if (current.season !== undefined) {
    const series = allItems
      .filter((item) => item.season === current.season && item.type === "video")
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const index = series.findIndex((item) => item.id === current.id);
    if (index >= 0 && index < series.length - 1) return series[index + 1];
  }

  return undefined;
}

/** A relevant alternative when there's no formal "next episode" — same folder, different item. */
export function getAlternativeMemory(current: MediaItem, allItems: MediaItem[]): MediaItem | undefined {
  const candidates = allItems.filter((item) => item.folder === current.folder && item.id !== current.id);
  if (candidates.length === 0) return undefined;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
