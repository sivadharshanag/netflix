import { Router } from "express";
import { stat } from "node:fs/promises";
import path from "node:path";
import { getEndCreditsVideo, getItemById, getManifestItems, getManifestMeta, getSourceById, getThumbnailSource } from "../services/mediaManifest.js";
import { sendMedia } from "../storage/mediaSource.js";
import { streamMediaFile } from "../storage/mediaStream.js";

const VIDEO_PLACEHOLDER = path.resolve("server/assets/video-placeholder.svg");

function extensionOfSource(source: { kind: "local"; path: string } | { kind: "remote"; key: string }): string {
  return path.extname(source.kind === "local" ? source.path : source.key).slice(1);
}

export function createMediaRouter(): Router {
  const router = Router();

  router.get("/manifest", (_req, res) => {
    const meta = getManifestMeta();
    res.json({ items: getManifestItems(), ...meta });
  });

  // A real end-credits video edit, placed loose at the root of MEDIA_ROOT
  // (same convention as the intro video) — excluded from every regular
  // collection, served only here for the End Credits screen.
  router.get("/end-credits-video", async (req, res) => {
    const video = getEndCreditsVideo();
    if (!video) {
      res.status(404).json({ success: false, message: "No end-credits video configured." });
      return;
    }
    await sendMedia(req, res, video, extensionOfSource(video));
  });

  router.get("/file/:id", async (req, res) => {
    const item = getItemById(req.params.id);
    const source = getSourceById(req.params.id);
    if (!item || !source) {
      res.status(404).json({ success: false, message: "Unknown media id." });
      return;
    }
    await sendMedia(req, res, source, item.extension);
  });

  router.get("/thumb/:id", async (req, res) => {
    const item = getItemById(req.params.id);
    const source = getSourceById(req.params.id);
    if (!item || !source) {
      res.status(404).json({ success: false, message: "Unknown media id." });
      return;
    }

    const thumbnail = getThumbnailSource(item.id);
    if (thumbnail) {
      await sendMedia(req, res, thumbnail, "jpg");
      return;
    }

    if (item.type === "image") {
      await sendMedia(req, res, source, item.extension);
      return;
    }

    try {
      await stat(VIDEO_PLACEHOLDER);
      await streamMediaFile(req, res, VIDEO_PLACEHOLDER, "svg");
    } catch {
      res.status(404).json({ success: false, message: "No thumbnail available." });
    }
  });

  return router;
}
