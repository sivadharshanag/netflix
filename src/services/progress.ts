import type { MediaItem } from "@shared/types";

const STORAGE_KEY = "varunika:progress";
const RESUME_MIN_SECONDS = 5;
const RESUME_MAX_FRACTION = 0.95;

export interface ProgressEntry {
  seconds: number;
  duration: number;
  updatedAt: string;
}

type ProgressMap = Record<string, ProgressEntry>;

function readAll(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: ProgressMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures (quota, private browsing)
  }
}

export function getProgress(id: string): ProgressEntry | undefined {
  return readAll()[id];
}

export function setProgress(id: string, seconds: number, duration: number): void {
  if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0) return;
  const map = readAll();
  map[id] = { seconds, duration, updatedAt: new Date().toISOString() };
  writeAll(map);
}

export function clearProgress(id: string): void {
  const map = readAll();
  delete map[id];
  writeAll(map);
}

/** Only resume when there's meaningful progress and the video isn't basically finished. */
export function getResumePoint(id: string): number | undefined {
  const entry = getProgress(id);
  if (!entry) return undefined;
  const fraction = entry.seconds / entry.duration;
  if (entry.seconds < RESUME_MIN_SECONDS || fraction >= RESUME_MAX_FRACTION) return undefined;
  return entry.seconds;
}

export interface ContinueWatchingEntry {
  item: MediaItem;
  progressFraction: number;
  updatedAt: string;
}

export function getContinueWatching(items: MediaItem[]): ContinueWatchingEntry[] {
  const map = readAll();
  const byId = new Map(items.map((item) => [item.id, item]));
  const entries: ContinueWatchingEntry[] = [];

  for (const [id, entry] of Object.entries(map)) {
    const item = byId.get(id);
    if (!item) continue;
    const fraction = entry.seconds / entry.duration;
    if (fraction <= 0 || fraction >= RESUME_MAX_FRACTION) continue;
    entries.push({ item, progressFraction: fraction, updatedAt: entry.updatedAt });
  }

  return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
