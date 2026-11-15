import type { MediaItem } from "@shared/types";
import { displayNameForFolder } from "@shared/folderDisplayNames";

export interface BuiltRow {
  title: string;
  items: MediaItem[];
}

/**
 * One row per real folder (never mixing files across folders), labeled with
 * its friendly display name. The featured folder gets its own hero treatment
 * elsewhere, so it's excluded here to avoid showing it twice.
 */
export function buildCategoryRows(items: MediaItem[], folders: string[], featuredFolder: string): BuiltRow[] {
  return folders
    .filter((folder) => folder !== featuredFolder)
    .map((folder) => ({
      title: displayNameForFolder(folder),
      items: items.filter((item) => item.folder === folder),
    }))
    .filter((row) => row.items.length > 0);
}
