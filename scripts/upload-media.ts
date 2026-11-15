/**
 * Uploads the local media library to the S3-compatible bucket (Cloudflare R2 /
 * Backblaze B2) configured in .env.local, in the layout the server expects:
 *
 *   media/<relative path>        every supported photo/video + loose root videos
 *   thumbnails/<id>.jpg          from server/data/thumbnails (npm run generate-thumbnails)
 *   meta/media-manifest.json     the scan result, so real file dates are kept
 *   content/editorial.json       + media-overrides.json, if present locally
 *
 * Re-runnable: objects that already exist with the same size are skipped.
 *
 *   npm run upload-media            upload everything new
 *   npm run upload-media -- --dry   show what would be uploaded
 */
import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import "../server/src/loadEnv.js";
import { resolveAbsolutePath, scanMediaDirectory } from "../server/src/services/mediaScanner.js";
import { THUMBNAIL_DIR } from "../server/src/services/thumbnails.js";
import { mimeTypeFor } from "../server/src/storage/mediaStream.js";
import { REMOTE_KEYS, RemoteStorage, readRemoteStorageConfig } from "../server/src/storage/remoteStorage.js";

const CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;
const dryRun = process.argv.includes("--dry");

interface UploadJob {
  localPath: string;
  key: string;
  size: number;
  contentType: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

async function uploadFile(storage: RemoteStorage, job: UploadJob): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await storage.client.send(
        new PutObjectCommand({
          Bucket: storage.config.bucket,
          Key: job.key,
          Body: createReadStream(job.localPath), // fresh stream per attempt
          ContentLength: job.size,
          ContentType: job.contentType,
          CacheControl: "private, max-age=86400",
        })
      );
      return;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) console.warn(`  retrying ${job.key} (${(error as Error).message})`);
    }
  }
  throw lastError;
}

async function run(): Promise<void> {
  // Uploading always targets the bucket, even if local dev runs with MEDIA_STORAGE=local.
  process.env.MEDIA_STORAGE = "s3";
  const config = readRemoteStorageConfig()!;
  const storage = new RemoteStorage(config);
  const mediaRoot = process.env.MEDIA_ROOT ?? "./media";

  console.log(`Scanning "${path.resolve(mediaRoot)}" ...`);
  const scan = await scanMediaDirectory(mediaRoot);
  console.log(`Found ${scan.items.length} media items in ${scan.folders.length} folders.`);

  const jobs: UploadJob[] = [];

  for (const item of scan.items) {
    const relativePath = scan.pathById[item.id];
    jobs.push({
      localPath: resolveAbsolutePath(mediaRoot, relativePath),
      key: REMOTE_KEYS.media(relativePath),
      size: item.sizeBytes,
      contentType: mimeTypeFor(item.extension),
    });
  }

  // Loose root files (intro / end-credits videos) — only image/video types.
  for (const relativePath of scan.rootFiles) {
    const extension = path.extname(relativePath).slice(1);
    const contentType = mimeTypeFor(extension);
    if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) continue;
    const localPath = resolveAbsolutePath(mediaRoot, relativePath);
    jobs.push({ localPath, key: REMOTE_KEYS.media(relativePath), size: (await stat(localPath)).size, contentType });
  }

  let thumbnailNames: string[] = [];
  try {
    thumbnailNames = (await readdir(THUMBNAIL_DIR)).filter((name) => name.endsWith(".jpg"));
  } catch {
    console.log("No server/data/thumbnails folder — run `npm run generate-thumbnails` first for real posters.");
  }
  for (const name of thumbnailNames) {
    const localPath = path.join(THUMBNAIL_DIR, name);
    jobs.push({ localPath, key: REMOTE_KEYS.thumbnail(name.slice(0, -4)), size: (await stat(localPath)).size, contentType: "image/jpeg" });
  }

  console.log("Checking what's already in the bucket ...");
  const existing = new Map<string, number>();
  for (const prefix of [REMOTE_KEYS.mediaPrefix, REMOTE_KEYS.thumbnailPrefix]) {
    for (const object of await storage.list(prefix)) existing.set(object.key, object.size);
  }

  const pending = jobs.filter((job) => existing.get(job.key) !== job.size);
  const totalBytes = pending.reduce((sum, job) => sum + job.size, 0);
  console.log(`${jobs.length - pending.length} already uploaded, ${pending.length} to upload (${formatBytes(totalBytes)}).`);

  if (dryRun) {
    for (const job of pending) console.log(`  would upload ${job.key} (${formatBytes(job.size)})`);
  } else {
    let done = 0;
    let doneBytes = 0;
    const failures: string[] = [];
    const queue = [...pending];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          try {
            await uploadFile(storage, job);
          } catch (error) {
            failures.push(`${job.key}: ${(error as Error).message}`);
          }
          done++;
          doneBytes += job.size;
          const percent = totalBytes > 0 ? ((doneBytes / totalBytes) * 100).toFixed(1) : "100";
          console.log(`[${done}/${pending.length}] ${percent}%  ${job.key}`);
        }
      })
    );
    if (failures.length > 0) {
      console.error(`\n${failures.length} upload(s) failed — re-run the script to retry them:`);
      for (const failure of failures) console.error(`  - ${failure}`);
      process.exitCode = 1;
    }
  }

  // Small JSON files are always re-uploaded so edits take effect.
  const contentFiles = ["editorial.json", "media-overrides.json"];
  if (!dryRun) {
    await storage.putText(REMOTE_KEYS.manifest, JSON.stringify(scan), "application/json");
    console.log(`Uploaded ${REMOTE_KEYS.manifest}`);
    for (const fileName of contentFiles) {
      try {
        const body = await readFile(path.resolve("content", fileName), "utf-8");
        JSON.parse(body); // refuse to upload broken JSON
        await storage.putText(REMOTE_KEYS.content(fileName), body, "application/json");
        console.log(`Uploaded ${REMOTE_KEYS.content(fileName)}`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }

  console.log("\nDone. Restart the Render service (or wait for it to wake) so it re-reads the manifest.");
}

run().catch((error) => {
  console.error("Upload failed:", error);
  process.exitCode = 1;
});
