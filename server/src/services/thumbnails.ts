import { readdir } from "node:fs/promises";
import path from "node:path";

export const THUMBNAIL_DIR = path.resolve("server/data/thumbnails");

export function thumbnailPathFor(id: string): string {
  return path.join(THUMBNAIL_DIR, `${id}.jpg`);
}

/** Ids that have a pre-generated local thumbnail (one directory read instead of one stat per item). */
export async function listLocalThumbnailIds(): Promise<Set<string>> {
  try {
    const names = await readdir(THUMBNAIL_DIR);
    return new Set(names.filter((name) => name.endsWith(".jpg")).map((name) => name.slice(0, -4)));
  } catch {
    return new Set();
  }
}
