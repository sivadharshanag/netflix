import { Router } from "express";
import { stat } from "node:fs/promises";
import path from "node:path";
import { getAbsolutePathById, getEndCreditsVideoPath, getItemById, getManifestItems, getManifestMeta } from "../services/mediaManifest.js";
import { hasGeneratedThumbnail, thumbnailPathFor } from "../services/thumbnails.js";
import { streamMediaFile } from "../storage/mediaStream.js";

const VIDEO_PLACEHOLDER = path.resolve("server/assets/video-placeholder.svg");

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
    const videoPath = getEndCreditsVideoPath();
    if (!videoPath) {
      res.status(404).json({ success: false, message: "No end-credits video configured." });
      return;
    }
    await streamMediaFile(req, res, videoPath, path.extname(videoPath).slice(1));
  });

  router.get("/file/:id", async (req, res) => {
    const item = getItemById(req.params.id);
    const absolutePath = getAbsolutePathById(req.params.id);
    if (!item || !absolutePath) {
      res.status(404).json({ success: false, message: "Unknown media id." });
      return;
    }
    await streamMediaFile(req, res, absolutePath, item.extension);
  });

  router.get("/thumb/:id", async (req, res) => {
    const item = getItemById(req.params.id);
    const absolutePath = getAbsolutePathById(req.params.id);
    if (!item || !absolutePath) {
      res.status(404).json({ success: false, message: "Unknown media id." });
      return;
    }

    if (await hasGeneratedThumbnail(item.id)) {
      await streamMediaFile(req, res, thumbnailPathFor(item.id), "jpg");
      return;
    }

    if (item.type === "image") {
      await streamMediaFile(req, res, absolutePath, item.extension);
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
