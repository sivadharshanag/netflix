import type { Request, Response } from "express";
import { mimeTypeFor, streamMediaFile } from "./mediaStream.js";
import type { RemoteStorage } from "./remoteStorage.js";

/** Where a piece of media actually lives. Never sent to the client. */
export type MediaSource = { kind: "local"; path: string } | { kind: "remote"; key: string };

let remote: RemoteStorage | undefined;

export function setRemoteStorage(storage: RemoteStorage | undefined): void {
  remote = storage;
}

export function getRemoteStorage(): RemoteStorage | undefined {
  return remote;
}

/**
 * Sends a media file. Local files are streamed (with Range support); remote
 * objects get a 302 to a short-lived presigned URL so the storage provider
 * serves the bytes (and handles Range/seeking) directly.
 *
 * Call only after the caller has verified the requester may read this file.
 */
export async function sendMedia(req: Request, res: Response, source: MediaSource, extension: string): Promise<void> {
  if (source.kind === "local") {
    await streamMediaFile(req, res, source.path, extension);
    return;
  }

  if (!remote) {
    res.status(500).json({ success: false, message: "Remote storage is not configured." });
    return;
  }

  try {
    const { url, remainingSeconds } = await remote.signedUrl(source.key, mimeTypeFor(extension));
    // Let the browser reuse this redirect for a while (well inside the URL's
    // validity) so repeat views hit its cache instead of re-requesting.
    const maxAge = Math.max(0, Math.min(3600, remainingSeconds - 600));
    res.setHeader("Cache-Control", `private, max-age=${maxAge}`);
    res.redirect(302, url);
  } catch (error) {
    console.error(`[media] Could not sign URL for "${source.key}":`, error);
    res.status(502).json({ success: false, message: "Media storage is unavailable." });
  }
}
