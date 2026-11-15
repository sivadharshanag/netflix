// Types shared between the Express server and the React client.
// Keep this file free of Node-only or DOM-only APIs.

export type MediaType = "image" | "video";

export interface MediaItem {
  /** Stable id derived from the file's path relative to MEDIA_ROOT. Never a raw filesystem path. */
  id: string;
  /** Human-facing title, derived from the filename unless overridden in editorial content. */
  title: string;
  description: string;
  /** Top-level folder name directly under MEDIA_ROOT, exactly as it appears on disk. */
  folder: string;
  type: MediaType;
  /** Protected API path, e.g. /api/media/file/<id>. Never a direct filesystem or public path. */
  mediaUrl: string;
  thumbnailUrl: string;
  posterUrl?: string;
  /** False only for a video with no generated poster frame yet (thumbnailUrl then serves a generic placeholder). Always true for photos. */
  hasPoster: boolean;
  /** Video duration in seconds, filled in client-side once metadata loads; absent on the server manifest. */
  duration?: number;
  season?: number;
  episodeNumber?: number;
  tags: string[];
  /** ISO date string, only ever set from a real filesystem timestamp or explicit editorial override — never fabricated. */
  date?: string;
  featured?: boolean;
  isInsideJoke?: boolean;
  /** File extension without the dot, lowercase. */
  extension: string;
  /** Whether this exact format is known to have inconsistent browser playback support (e.g. MOV/HEVC). */
  playbackCaution?: boolean;
  /** Bytes on disk, used only for diagnostics in the scan report — never shown as a "quality" claim. */
  sizeBytes: number;
}

export interface MediaWarning {
  path: string;
  reason: string;
}

export interface MediaScanResult {
  items: MediaItem[];
  warnings: MediaWarning[];
  folders: string[];
  scannedAt: string;
  /** Server-internal only: id -> path relative to MEDIA_ROOT. Never sent to the client. */
  pathById: Record<string, string>;
  /** Files sitting loose directly under MEDIA_ROOT (not in any folder) — excluded from browsable items, used for special-purpose assets like the intro video. */
  rootFiles: string[];
}

export interface EditorialSeason {
  season: number;
  title: string;
  description: string;
  /** Folder names (as on disk) whose items belong to this season, unless a per-item override says otherwise. */
  folders: string[];
}

export interface EditorialTimelineMilestone {
  id: string;
  title: string;
  description: string;
  /** ISO date, only set when a real date is known or manually supplied. Omit rather than invent one. */
  date?: string;
  mediaId?: string;
}

export interface EditorialEndCreditEntry {
  mediaId: string;
  caption?: string;
}

export interface EditorialContent {
  heroMediaId?: string;
  featuredCollectionFolder: string;
  featuredCollectionTitle: string;
  featuredCollectionDescription: string;
  /** Explicit episode order for items inside the featured collection, by media id. */
  featuredEpisodeOrder: string[];
  seasons: EditorialSeason[];
  profile: {
    name: string;
    tagline: string;
    photoMediaId?: string;
  };
  birthdayLetter: {
    heading: string;
    /** Single-block fallback, shown as-is if messageParagraphs isn't set. */
    body: string;
    from: string;
    /** When set, the letter rolls one paragraph at a time instead of showing `body` as one static block. */
    messageParagraphs?: string[];
    /** Short lines shown one at a time after the letter (e.g. a final sentiment, then a thank-you). */
    closingLines?: string[];
  };
  easterEgg: {
    /** Number of clicks on the wordmark logo needed to reveal the hidden screen. */
    clickThreshold: number;
    message: string;
    favoriteMediaId?: string;
  };
  hiddenCollection: {
    title: string;
    label: string;
    /** Sequence of keys (KeyboardEvent.key values) that unlocks the collection. */
    keySequence: string[];
    mediaIds: string[];
  };
  timeline: EditorialTimelineMilestone[];
  endCredits: {
    heading: string;
    subheading: string;
    entries: EditorialEndCreditEntry[];
    /** A personal closing message, shown as a slow-rolling credits letter — one paragraph at a time. Omit for no letter. */
    messageParagraphs?: string[];
    /** Short lines shown one at a time after the letter, e.g. a final sentiment then a thank-you. */
    closingLines?: string[];
    /** Signature shown after the closing lines, e.g. "— Siva". */
    from?: string;
  };
  soundtrack?: {
    backgroundMusicUrl?: string;
  };
}

export interface PublicEditorialContent extends EditorialContent {}

export interface AuthStatusResponse {
  authenticated: boolean;
}

export interface LoginRequestBody {
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
}
