import { createHash } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { MediaItem, MediaScanResult, MediaType, MediaWarning } from "../../../shared/types.js";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);
const KNOWN_UNSUPPORTED_HINTS: Record<string, string> = {
  heic: "HEIC photos are not reliably viewable in browsers. Convert to JPEG or PNG.",
  heif: "HEIF photos are not reliably viewable in browsers. Convert to JPEG or PNG.",
  mkv: "MKV is not reliably playable via HTML5 video. Convert to MP4 (H.264/AAC).",
  avi: "AVI is not reliably playable via HTML5 video. Convert to MP4 (H.264/AAC).",
  wmv: "WMV is not playable in most browsers. Convert to MP4 (H.264/AAC).",
};

/** MOV files frequently use codecs (e.g. HEVC) that do not play in every browser. */
const PLAYBACK_CAUTION_EXTENSIONS = new Set(["mov"]);

function extensionOf(fileName: string): string {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  return ext;
}

function mediaTypeFor(extension: string): MediaType | null {
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return null;
}

export function stableId(relativePath: string): string {
  const normalized = relativePath.split(path.sep).join("/");
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

function titleFromFilename(fileName: string): string {
  const base = fileName.slice(0, fileName.length - path.extname(fileName).length);
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True for filenames that are camera/app-generated technical names
 * (IMG_1234, VID-20251008-WA0036, Screenshot (42), DSC_0001, …) rather than
 * something a person actually typed — these get a friendly generated title
 * instead of being shown verbatim.
 */
export function isTechnicalFilename(cleanedTitle: string): boolean {
  const compact = cleanedTitle.replace(/\s+/g, "");
  if (/^(IMG|VID|DSC|PXL|DCIM|MVI)[-_]?\d/i.test(compact)) return true;
  if (/^(Screenshot|InShot|WhatsApp Image|WhatsApp Video|video)/i.test(cleanedTitle)) return true;
  if (/WA\d{4,}/i.test(compact)) return true;
  // Mostly digits/symbols with little actual wording (e.g. "20241020 152011012")
  const letters = cleanedTitle.replace(/[^a-zA-Z]/g, "");
  return letters.length < 3;
}

function tagsForFolder(folder: string): string[] {
  return folder
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Recursively scans `mediaRoot` for supported images/videos and builds a manifest.
 * Entries (files or directories) whose basename starts with "." are treated as
 * hidden/trashed and skipped entirely — this is how OS-level "deleted" media
 * markers (e.g. ".trashed-...") show up on disk.
 */
export async function scanMediaDirectory(mediaRoot: string): Promise<MediaScanResult> {
  const absoluteRoot = path.resolve(mediaRoot);
  const items: MediaItem[] = [];
  const warnings: MediaWarning[] = [];
  const folderSet = new Set<string>();
  const pathById: Record<string, string> = {};
  const rootFiles: string[] = [];

  async function walk(dir: string, topFolder: string | null): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      warnings.push({ path: dir, reason: `Could not read directory: ${(error as Error).message}` });
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue; // hidden / trashed

      const absolutePath = path.join(dir, entry.name);
      const relativePath = path.relative(absoluteRoot, absolutePath);

      if (entry.isDirectory()) {
        await walk(absolutePath, topFolder ?? entry.name);
        continue;
      }
      if (!entry.isFile()) continue;

      if (topFolder === null) {
        // A file sitting loose directly under MEDIA_ROOT, not inside any
        // named folder — not a browsable collection item (no folder to
        // categorize it under). Kept aside for special-purpose use (e.g.
        // a pre-login intro video), never shown as a regular memory.
        rootFiles.push(relativePath);
        continue;
      }
      const currentFolder = topFolder;

      const extension = extensionOf(entry.name);
      const type = mediaTypeFor(extension);

      if (!type) {
        const hint = KNOWN_UNSUPPORTED_HINTS[extension];
        if (hint) {
          warnings.push({ path: relativePath, reason: hint });
        }
        continue;
      }

      let fileStat;
      try {
        fileStat = await stat(absolutePath);
      } catch (error) {
        warnings.push({ path: relativePath, reason: `Could not stat file: ${(error as Error).message}` });
        continue;
      }

      folderSet.add(currentFolder);
      const id = stableId(relativePath);
      pathById[id] = relativePath;

      items.push({
        id,
        title: titleFromFilename(entry.name),
        description: "",
        folder: currentFolder,
        type,
        mediaUrl: "", // filled in by the route layer once an id -> path lookup exists
        thumbnailUrl: "",
        hasPoster: type === "image", // refined for videos in mediaManifest.ts once thumbnails are checked
        tags: tagsForFolder(currentFolder),
        extension,
        playbackCaution: PLAYBACK_CAUTION_EXTENSIONS.has(extension),
        sizeBytes: fileStat.size,
        date: fileStat.mtime.toISOString(),
      });
    }
  }

  await walk(absoluteRoot, null);

  // Stable, deterministic ordering (by folder, then filename-derived title).
  items.sort((a, b) => (a.folder + a.title).localeCompare(b.folder + b.title));

  return {
    items,
    warnings,
    folders: Array.from(folderSet).sort(),
    scannedAt: new Date().toISOString(),
    pathById,
    rootFiles,
  };
}

export function resolveAbsolutePath(mediaRoot: string, relativePath: string): string {
  return path.join(path.resolve(mediaRoot), relativePath);
}
