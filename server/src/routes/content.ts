import { Router } from "express";
import { getEditorialContent } from "../services/mediaManifest.js";

export function createContentRouter(): Router {
  const router = Router();

  router.get("/editorial", (_req, res) => {
    res.json(getEditorialContent());
  });

  return router;
}
