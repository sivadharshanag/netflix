import { readFile } from "node:fs/promises";
import path from "node:path";
import type { EditorialContent } from "../../../shared/types.js";
import { REMOTE_KEYS, type RemoteStorage } from "../storage/remoteStorage.js";

const CONTENT_DIR = path.resolve("content");

const HARD_DEFAULTS: EditorialContent = {
  featuredCollectionFolder: "Moments to cherish",
  featuredCollectionTitle: "MEMORIES TO CHERISH",
  featuredCollectionDescription:
    "Four years, countless photographs, endless laughter, and moments worth reliving forever.",
  featuredEpisodeOrder: [],
  seasons: [],
  profile: { name: "Varunika", tagline: "Birthday Girl" },
  birthdayLetter: {
    heading: "Birthday Letter",
    body: "Dear Varunika,\n\nThis is a placeholder letter — edit content/editorial.json to write your own.",
    from: "[Your Name]",
  },
  easterEgg: { clickThreshold: 5, message: "You found the secret. Happy Birthday!" },
  hiddenCollection: { title: "Only We Understand", label: "Classified", keySequence: ["o", "w", "u"], mediaIds: [] },
  timeline: [],
  endCredits: { heading: "THE END?", subheading: "Every great story deserves a sequel.", entries: [] },
};

function deepMerge<T>(base: T, override: Partial<T> | undefined): T {
  if (!override) return base;
  const result: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const [key, value] of Object.entries(override as any)) {
    if (key.startsWith("_")) continue; // strip documentation-only "_comment" keys
    if (value && typeof value === "object" && !Array.isArray(value) && typeof result[key] === "object" && result[key] !== null && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], value as any);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function readJsonIfExists(filePath: string): Promise<Record<string, unknown> | undefined> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

/**
 * Reads content/<fileName> from disk; if it isn't there and remote storage is
 * configured, falls back to content/<fileName> in the bucket. This lets the
 * private editorial.json live in the bucket instead of the Git repo.
 */
async function readContentJson(fileName: string, remote?: RemoteStorage): Promise<Record<string, unknown> | undefined> {
  const local = await readJsonIfExists(path.join(CONTENT_DIR, fileName));
  if (local || !remote) return local;
  const raw = await remote.getText(REMOTE_KEYS.content(fileName));
  return raw ? JSON.parse(raw) : undefined;
}

export async function loadEditorialContent(remote?: RemoteStorage): Promise<EditorialContent> {
  const example = await readJsonIfExists(path.join(CONTENT_DIR, "editorial.example.json"));
  const real = await readContentJson("editorial.json", remote);
  let content = deepMerge(HARD_DEFAULTS, example as Partial<EditorialContent> | undefined);
  content = deepMerge(content, real as Partial<EditorialContent> | undefined);
  return content;
}

export type MediaOverride = Partial<{
  title: string;
  description: string;
  season: number;
  episodeNumber: number;
  tags: string[];
  featured: boolean;
  isInsideJoke: boolean;
}>;

export async function loadMediaOverrides(remote?: RemoteStorage): Promise<Record<string, MediaOverride>> {
  const real = await readContentJson("media-overrides.json", remote);
  if (!real) return {};
  const overrides: Record<string, MediaOverride> = {};
  for (const [key, value] of Object.entries(real)) {
    if (key.startsWith("_")) continue;
    overrides[key] = value as MediaOverride;
  }
  return overrides;
}
