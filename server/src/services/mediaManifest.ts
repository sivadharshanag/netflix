import type { EditorialContent, MediaItem, MediaScanResult, MediaType, MediaWarning } from "../../../shared/types.js";
import { buildScanResult, isTechnicalFilename, resolveAbsolutePath, scanMediaDirectory, stableId } from "./mediaScanner.js";
import { loadEditorialContent, loadMediaOverrides } from "./editorialContent.js";
import { listLocalThumbnailIds, thumbnailPathFor } from "./thumbnails.js";
import type { MediaSource } from "../storage/mediaSource.js";
import { REMOTE_KEYS, type RemoteStorage } from "../storage/remoteStorage.js";
import { pickIntroVideoPath } from "./introVideo.js";
import { pickEndCreditsVideoPath } from "./endCreditsVideo.js";
import { displayNameForFolder } from "../../../shared/folderDisplayNames.js";

interface ManifestState {
  items: MediaItem[];
  itemsById: Map<string, MediaItem>;
  sourceById: Map<string, MediaSource>;
  thumbnailIds: Set<string>;
  warnings: MediaWarning[];
  folders: string[];
  scannedAt: string;
  editorial: EditorialContent;
  introVideo: MediaSource | undefined;
  endCreditsVideo: MediaSource | undefined;
}

let state: ManifestState | undefined;
let mediaRoot = "./media";
let remoteStorage: RemoteStorage | undefined;

/**
 * Remote mode: prefer the manifest uploaded by `npm run upload-media` (it keeps
 * the original file dates); otherwise derive one from a bucket listing (dates
 * are then upload times).
 */
async function scanRemote(remote: RemoteStorage): Promise<MediaScanResult> {
  const raw = await remote.getText(REMOTE_KEYS.manifest);
  if (raw) return JSON.parse(raw) as MediaScanResult;

  const objects = await remote.list(REMOTE_KEYS.mediaPrefix);
  return buildScanResult(
    objects
      .filter((object) => !object.key.endsWith("/"))
      .map((object) => ({
        relativePath: object.key.slice(REMOTE_KEYS.mediaPrefix.length),
        size: object.size,
        mtime: object.lastModified ?? new Date(0),
      }))
  );
}

async function listRemoteThumbnailIds(remote: RemoteStorage): Promise<Set<string>> {
  const objects = await remote.list(REMOTE_KEYS.thumbnailPrefix);
  return new Set(
    objects.filter((object) => object.key.endsWith(".jpg")).map((object) => object.key.slice(REMOTE_KEYS.thumbnailPrefix.length, -4))
  );
}

function sourceFor(root: string, relativePath: string, remote: RemoteStorage | undefined): MediaSource {
  return remote
    ? { kind: "remote", key: REMOTE_KEYS.media(relativePath) }
    : { kind: "local", path: resolveAbsolutePath(root, relativePath) };
}

function seasonForFolder(editorial: EditorialContent, folder: string): number | undefined {
  for (const season of editorial.seasons) {
    if (season.folders.includes(folder)) return season.season;
  }
  return undefined;
}

export async function buildMediaManifest(root: string, remote?: RemoteStorage): Promise<ManifestState> {
  mediaRoot = root;
  remoteStorage = remote;
  const [scan, editorial, overrides, thumbnailIds] = await Promise.all([
    remote ? scanRemote(remote) : scanMediaDirectory(root),
    loadEditorialContent(remote),
    loadMediaOverrides(remote),
    remote ? listRemoteThumbnailIds(remote) : listLocalThumbnailIds(),
  ]);

  const itemsById = new Map<string, MediaItem>();
  const sourceById = new Map<string, MediaSource>();
  const featuredFolder = editorial.featuredCollectionFolder;
  const featuredOrder = new Map(editorial.featuredEpisodeOrder.map((id, index) => [id, index + 1]));
  const folderCounters = new Map<string, number>();

  const items: MediaItem[] = scan.items.map((item) => {
      const relativePath = scan.pathById[item.id];
      sourceById.set(item.id, sourceFor(root, relativePath, remote));

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

      const hasPoster = item.type === "image" || thumbnailIds.has(item.id);

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
    });

  // If a featured item has no explicit order, fall back to chronological (file date) order
  // so "episode" numbering is still stable and meaningful.
  const featuredItems = items.filter((item) => item.featured).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  featuredItems.forEach((item, index) => {
    if (item.episodeNumber === undefined) item.episodeNumber = index + 1;
  });

  state = {
    items,
    itemsById,
    sourceById,
    thumbnailIds,
    warnings: scan.warnings,
    folders: scan.folders,
    scannedAt: scan.scannedAt,
    editorial,
    introVideo: optionalSource(root, pickIntroVideoPath(scan.rootFiles), remote),
    endCreditsVideo: optionalSource(root, pickEndCreditsVideoPath(scan.rootFiles), remote),
  };
  return state;
}

function optionalSource(root: string, relativePath: string | undefined, remote: RemoteStorage | undefined): MediaSource | undefined {
  return relativePath ? sourceFor(root, relativePath, remote) : undefined;
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

export function getSourceById(id: string): MediaSource | undefined {
  return requireState().sourceById.get(id);
}

/** The pre-generated thumbnail for this item, if one exists. */
export function getThumbnailSource(id: string): MediaSource | undefined {
  const s = requireState();
  if (!s.thumbnailIds.has(id)) return undefined;
  return remoteStorage ? { kind: "remote", key: REMOTE_KEYS.thumbnail(id) } : { kind: "local", path: thumbnailPathFor(id) };
}

export function getItemType(id: string): MediaType | undefined {
  return requireState().itemsById.get(id)?.type;
}

export function getIntroVideo(): MediaSource | undefined {
  return requireState().introVideo;
}

export function getEndCreditsVideo(): MediaSource | undefined {
  return requireState().endCreditsVideo;
}

export async function refreshMediaManifest(): Promise<void> {
  await buildMediaManifest(mediaRoot, remoteStorage);
}

export { stableId };
