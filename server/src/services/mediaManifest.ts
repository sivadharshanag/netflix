import type { EditorialContent, MediaItem, MediaType, MediaWarning } from "../../../shared/types.js";
import { isTechnicalFilename, resolveAbsolutePath, scanMediaDirectory, stableId } from "./mediaScanner.js";
import { loadEditorialContent, loadMediaOverrides } from "./editorialContent.js";
import { hasGeneratedThumbnail } from "./thumbnails.js";
import { pickIntroVideoPath } from "./introVideo.js";
import { pickEndCreditsVideoPath } from "./endCreditsVideo.js";
import { displayNameForFolder } from "../../../shared/folderDisplayNames.js";

interface ManifestState {
  items: MediaItem[];
  itemsById: Map<string, MediaItem>;
  absolutePathById: Map<string, string>;
  warnings: MediaWarning[];
  folders: string[];
  scannedAt: string;
  editorial: EditorialContent;
  introVideoPath: string | undefined;
  endCreditsVideoPath: string | undefined;
}

let state: ManifestState | undefined;
let mediaRoot = "./media";

function seasonForFolder(editorial: EditorialContent, folder: string): number | undefined {
  for (const season of editorial.seasons) {
    if (season.folders.includes(folder)) return season.season;
  }
  return undefined;
}

export async function buildMediaManifest(root: string): Promise<ManifestState> {
  mediaRoot = root;
  const [scan, editorial, overrides] = await Promise.all([
    scanMediaDirectory(root),
    loadEditorialContent(),
    loadMediaOverrides(),
  ]);

  const itemsById = new Map<string, MediaItem>();
  const absolutePathById = new Map<string, string>();
  const featuredFolder = editorial.featuredCollectionFolder;
  const featuredOrder = new Map(editorial.featuredEpisodeOrder.map((id, index) => [id, index + 1]));
  const folderCounters = new Map<string, number>();

  const items: MediaItem[] = await Promise.all(
    scan.items.map(async (item) => {
      const relativePath = scan.pathById[item.id];
      absolutePathById.set(item.id, resolveAbsolutePath(root, relativePath));

      const overrideKey = relativePath.split("\\").join("/");
      const override = overrides[overrideKey];

      const isFeatured = item.folder === featuredFolder;
      const episodeNumber = isFeatured ? featuredOrder.get(item.id) ?? undefined : undefined;

      // Camera/app-generated filenames (IMG_1234, WA0005, Screenshot (42), ...)
      // get a friendly generated title instead of being shown verbatim.
      // Nothing specific is invented — just "<collection> — Memory N".
      let title = item.title;
      if (isTechnicalFilename(item.title)) {
        const next = (folderCounters.get(item.folder) ?? 0) + 1;
        folderCounters.set(item.folder, next);
        title = `${displayNameForFolder(item.folder)} — Memory ${next}`;
      }

      const hasPoster = item.type === "image" || (await hasGeneratedThumbnail(item.id));

      const merged: MediaItem = {
        ...item,
        title,
        mediaUrl: `/api/media/file/${item.id}`,
        thumbnailUrl: `/api/media/thumb/${item.id}`,
        posterUrl: item.type === "video" ? `/api/media/thumb/${item.id}` : undefined,
        season: seasonForFolder(editorial, item.folder),
        featured: isFeatured,
        episodeNumber,
        hasPoster,
        ...override,
      };
      itemsById.set(merged.id, merged);
      return merged;
    })
  );

  // If a featured item has no explicit order, fall back to chronological (file date) order
  // so "episode" numbering is still stable and meaningful.
  const featuredItems = items.filter((item) => item.featured).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  featuredItems.forEach((item, index) => {
    if (item.episodeNumber === undefined) item.episodeNumber = index + 1;
  });

  state = {
    items,
    itemsById,
    absolutePathById,
    warnings: scan.warnings,
    folders: scan.folders,
    scannedAt: scan.scannedAt,
    editorial,
    introVideoPath: pickIntroVideoPath(scan.rootFiles, root),
    endCreditsVideoPath: pickEndCreditsVideoPath(scan.rootFiles, root),
  };
  return state;
}

function requireState(): ManifestState {
  if (!state) throw new Error("Media manifest has not been built yet. Call buildMediaManifest() at server startup.");
  return state;
}

export function getManifestItems(): MediaItem[] {
  return requireState().items;
}

export function getManifestMeta() {
  const s = requireState();
  return { folders: s.folders, warnings: s.warnings, scannedAt: s.scannedAt };
}

export function getEditorialContent(): EditorialContent {
  return requireState().editorial;
}

export function getItemById(id: string): MediaItem | undefined {
  return requireState().itemsById.get(id);
}

export function getAbsolutePathById(id: string): string | undefined {
  return requireState().absolutePathById.get(id);
}

export function getItemType(id: string): MediaType | undefined {
  return requireState().itemsById.get(id)?.type;
}

export function getIntroVideoPath(): string | undefined {
  return requireState().introVideoPath;
}

export function getEndCreditsVideoPath(): string | undefined {
  return requireState().endCreditsVideoPath;
}

export async function refreshMediaManifest(): Promise<void> {
  await buildMediaManifest(mediaRoot);
}

export { stableId };
