import path from "node:path";

/** Picks the end-credits video from files sitting loose at the root of MEDIA_ROOT, if any. Returns its path relative to the media root. */
export function pickEndCreditsVideoPath(rootFiles: string[]): string | undefined {
  const candidate = rootFiles.find((relativePath) => /credit/i.test(path.basename(relativePath)));
  if (!candidate) return undefined;
  const extension = path.extname(candidate).slice(1).toLowerCase();
  if (!["mp4", "webm", "mov", "m4v"].includes(extension)) return undefined;
  return candidate;
}
