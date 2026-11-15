import { readFile } from "node:fs/promises";
import path from "node:path";
import type { EditorialContent } from "../../../shared/types.js";

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

export async function loadEditorialContent(): Promise<EditorialContent> {
  const example = await readJsonIfExists(path.join(CONTENT_DIR, "editorial.example.json"));
  const real = await readJsonIfExists(path.join(CONTENT_DIR, "editorial.json"));
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

export async function loadMediaOverrides(): Promise<Record<string, MediaOverride>> {
  const real = await readJsonIfExists(path.join(CONTENT_DIR, "media-overrides.json"));
  if (!real) return {};
  const overrides: Record<string, MediaOverride> = {};
  for (const [key, value] of Object.entries(real)) {
    if (key.startsWith("_")) continue;
    overrides[key] = value as MediaOverride;
  }
  return overrides;
}
