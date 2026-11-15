import { access } from "node:fs/promises";
import path from "node:path";

export const THUMBNAIL_DIR = path.resolve("server/data/thumbnails");

export function thumbnailPathFor(id: string): string {
  return path.join(THUMBNAIL_DIR, `${id}.jpg`);
}

export async function hasGeneratedThumbnail(id: string): Promise<boolean> {
  try {
    await access(thumbnailPathFor(id));
    return true;
  } catch {
    return false;
  }
}
