import type { MediaItem } from "@shared/types";

/**
 * Picks a random item from `eligible`, preferring ones not in `shown` yet.
 * Mutates `shown` in place: adds the pick, and clears it once everything
 * eligible has been shown once (so the cycle repeats rather than stalling).
 */
export function pickSurpriseItem(eligible: MediaItem[], shown: Set<string>): MediaItem | undefined {
  if (eligible.length === 0) return undefined;

  const unseen = eligible.filter((item) => !shown.has(item.id));
  const pool = unseen.length > 0 ? unseen : eligible;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  shown.add(pick.id);
  if (shown.size >= eligible.length) shown.clear();

  return pick;
}
