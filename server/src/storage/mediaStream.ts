import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { Request, Response } from "express";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
};

export function mimeTypeFor(extension: string): string {
  return MIME_TYPES[extension.toLowerCase()] ?? "application/octet-stream";
}

/**
 * Streams a file to the response, honoring Range requests so <video> seeking
 * and scrubbing work. Call only after the caller has already verified the
 * requester is authorized to read this specific file.
 */
export async function streamMediaFile(req: Request, res: Response, absolutePath: string, extension: string): Promise<void> {
  const mimeType = mimeTypeFor(extension);
  let fileSize: number;
  try {
    fileSize = (await stat(absolutePath)).size;
  } catch {
    res.status(404).json({ success: false, message: "Media file not found." });
    return;
  }

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader("Accept-Ranges", "bytes");

  const range = req.headers.range;
  if (!range) {
    res.setHeader("Content-Length", String(fileSize));
    createReadStream(absolutePath).pipe(res);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).end();
    return;
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : fileSize - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= fileSize) {
    res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).end();
    return;
  }

  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
  res.setHeader("Content-Length", String(end - start + 1));
  createReadStream(absolutePath, { start, end }).pipe(res);
}
