import compression from "compression";
import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import session from "express-session";
import helmet from "helmet";
import morgan from "morgan";
import { existsSync } from "node:fs";
import path from "node:path";
import type { AppConfig } from "./config.js";
import { createAuthRouter } from "./routes/auth.js";
import { createContentRouter } from "./routes/content.js";
import { createMediaRouter } from "./routes/media.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { buildMediaManifest, getIntroVideo, getManifestMeta } from "./services/mediaManifest.js";
import { sendMedia, setRemoteStorage } from "./storage/mediaSource.js";
import { RemoteStorage } from "./storage/remoteStorage.js";

export async function buildApp(config: AppConfig): Promise<Express> {
  const remote = config.remoteStorage ? new RemoteStorage(config.remoteStorage) : undefined;
  setRemoteStorage(remote);
  const manifestState = await buildMediaManifest(config.mediaRoot, remote);
  const meta = getManifestMeta();
  if (config.env !== "test") {
    const sourceLabel = remote ? `bucket "${remote.config.bucket}" (${remote.origin})` : `"${config.mediaRoot}"`;
    console.log(`[media] Scanned ${sourceLabel}: ${manifestState.items.length} items across ${meta.folders.length} folders.`);
    if (meta.warnings.length > 0) {
      console.warn(`[media] ${meta.warnings.length} warning(s) during scan:`);
      for (const warning of meta.warnings.slice(0, 20)) {
        console.warn(`  - ${warning.path}: ${warning.reason}`);
      }
    }
  }

  const app = express();
  app.disable("x-powered-by");
  // Render (and most hosts) terminate HTTPS at a proxy. Without this, Express
  // thinks requests are plain HTTP and express-session refuses to set the
  // Secure session cookie — logging in would silently never stick.
  if (config.env === "production" || config.cookieSecure) {
    app.set("trust proxy", 1);
  }

  // Presigned media URLs point at the storage provider's host.
  const mediaOrigins = remote ? ["'self'", remote.origin] : ["'self'"];

  app.use(
    helmet({
      contentSecurityPolicy:
        config.env === "development" || config.env === "test"
          ? false
          : {
              directives: {
                defaultSrc: ["'self'"],
                imgSrc: [...mediaOrigins, "data:"],
                mediaSrc: mediaOrigins,
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                connectSrc: ["'self'"],
              },
            },
    })
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  if (config.env === "development") {
    app.use(morgan("dev"));
  } else if (config.env === "production") {
    app.use(morgan("combined"));
  }

  app.use(
    session({
      name: "varunika.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.cookieSecure,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Public (pre-login) by design: the cinematic intro plays before the
  // password gate, so it can't require a session. This never exposes any of
  // Varunika's private photos/videos — only an optional branding clip the
  // developer drops at the root of MEDIA_ROOT.
  app.get("/api/intro-video", async (req, res) => {
    const intro = getIntroVideo();
    if (!intro) {
      res.status(404).json({ success: false, message: "No intro video configured." });
      return;
    }
    await sendMedia(req, res, intro, path.extname(intro.kind === "local" ? intro.path : intro.key).slice(1));
  });

  app.use("/api/auth", createAuthRouter(config));
  app.use("/api/media", requireAuth, createMediaRouter());
  app.use("/api/content", requireAuth, createContentRouter());

  const clientDist = path.resolve("dist/client");
  app.use(express.static(path.resolve("public")));
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(express.static(path.resolve("public")));

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Not found." });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[server] Unhandled error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  });

  return app;
}
