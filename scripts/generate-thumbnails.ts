import { execFile } from "node:child_process";
import { mkdir, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import "dotenv/config";
import sharp from "sharp";
import { resolveAbsolutePath, scanMediaDirectory } from "../server/src/services/mediaScanner.js";

const execFileAsync = promisify(execFile);
const THUMB_WIDTH = 480;

/**
 * Tries a chain of seek offsets and keeps the first that actually extracts a
 * frame. A fixed 1-second seek (the original approach) fails outright for
 * very short clips (e.g. a ~0.6s Snapchat export) since there's nothing at
 * that timestamp — falling back toward 0 handles those without needing a
 * separate ffprobe duration lookup for every single video.
 */
async function extractVideoFrame(ffmpegPath: string, source: string, thumbPath: string): Promise<void> {
  const seekOffsets = ["00:00:01", "00:00:00.3", "00:00:00"];
  let lastError: unknown;

  for (const seek of seekOffsets) {
    try {
      await execFileAsync(ffmpegPath, [
        "-y",
        "-ss", seek,
        "-i", source,
        "-frames:v", "1",
        "-vf", `scale=${THUMB_WIDTH}:-1`,
        thumbPath,
      ]);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await stat(candidate);
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds a usable ffmpeg binary: an explicit FFMPEG_PATH, then PATH, then (on
 * Windows) common per-user install locations — winget's install doesn't
 * always land on PATH until a fresh shell, so this avoids depending on that.
 */
async function resolveFfmpeg(): Promise<string | undefined> {
  if (process.env.FFMPEG_PATH && (await pathExists(process.env.FFMPEG_PATH))) {
    return process.env.FFMPEG_PATH;
  }

  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return "ffmpeg";
  } catch {
    // not on PATH
  }

  if (os.platform() === "win32") {
    const wingetPackages = path.join(os.homedir(), "AppData", "Local", "Microsoft", "WinGet", "Packages");
    try {
      const entries = await readdir(wingetPackages);
      const ffmpegPkg = entries.find((name) => name.toLowerCase().startsWith("gyan.ffmpeg"));
      if (ffmpegPkg) {
        const pkgDir = path.join(wingetPackages, ffmpegPkg);
        const buildDirs = await readdir(pkgDir);
        const buildDir = buildDirs.find((name) => name.toLowerCase().startsWith("ffmpeg-"));
        if (buildDir) {
          const candidate = path.join(pkgDir, buildDir, "bin", "ffmpeg.exe");
          if (await pathExists(candidate)) return candidate;
        }
      }
    } catch {
      // winget packages dir not present — ignore
    }

    const chocoCandidate = "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe";
    if (await pathExists(chocoCandidate)) return chocoCandidate;
  }

  return undefined;
}

async function alreadyExists(thumbPath: string): Promise<boolean> {
  return pathExists(thumbPath);
}

async function run(): Promise<void> {
  const mediaRoot = process.env.MEDIA_ROOT ?? "./media";
  const outDir = path.resolve("server/data/thumbnails");
  await mkdir(outDir, { recursive: true });

  const { items, pathById } = await scanMediaDirectory(mediaRoot);
  const ffmpegPath = await resolveFfmpeg();
  if (!ffmpegPath) {
    console.log("ffmpeg was not found — video poster thumbnails will be skipped (the browser generates one client-side instead).");
    console.log("Install ffmpeg (e.g. `winget install Gyan.FFmpeg`) and re-run this script to pre-generate real video posters.");
  } else {
    console.log(`Using ffmpeg: ${ffmpegPath}`);
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const thumbPath = path.join(outDir, `${item.id}.jpg`);
    if (await alreadyExists(thumbPath)) {
      skipped++;
      continue;
    }

    const absoluteSource = resolveAbsolutePath(mediaRoot, pathById[item.id]);

    if (item.type === "image") {
      try {
        await sharp(absoluteSource).rotate().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).jpeg({ quality: 78 }).toFile(thumbPath);
        created++;
      } catch (error) {
        console.warn(`Could not generate thumbnail for ${pathById[item.id]}: ${(error as Error).message}`);
        failed++;
      }
    } else if (item.type === "video" && ffmpegPath) {
      try {
        await extractVideoFrame(ffmpegPath, absoluteSource, thumbPath);
        created++;
      } catch (error) {
        console.warn(`Could not generate poster for ${pathById[item.id]}: ${(error as Error).message}`);
        failed++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\nThumbnails: ${created} created, ${skipped} already existed or skipped, ${failed} failed.`);
}

run().catch((error) => {
  console.error("Thumbnail generation failed:", error);
  process.exitCode = 1;
});
