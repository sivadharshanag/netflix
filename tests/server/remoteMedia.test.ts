/** @vitest-environment node */
import http from "node:http";
import type { AddressInfo } from "node:net";
import argon2 from "argon2";
import request from "supertest";
import type { Express } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../server/src/app.js";
import type { AppConfig } from "../../server/src/config.js";
import { stableId } from "../../server/src/services/mediaScanner.js";

const PASSWORD = "remote-test-passcode";
const BUCKET = "test-bucket";

/** A minimal path-style S3 stand-in: GetObject + ListObjectsV2. */
const objects: Record<string, string> = {
  "media/Trip/beach.jpg": "jpeg-bytes",
  "media/Trip/clip.mp4": "mp4-bytes",
  "media/Intro video.mp4": "intro-bytes",
  ["thumbnails/" + stableId("Trip/clip.mp4") + ".jpg"]: "thumb-bytes",
};

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let fakeS3: http.Server;
let endpoint: string;
let app: Express;
let agent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  fakeS3 = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const [, bucket, ...rest] = url.pathname.split("/");
    if (bucket !== BUCKET) {
      res.writeHead(404).end();
      return;
    }
    if (url.searchParams.get("list-type") === "2") {
      const prefix = url.searchParams.get("prefix") ?? "";
      const contents = Object.entries(objects)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, body]) => `<Contents><Key>${xmlEscape(key)}</Key><Size>${body.length}</Size><LastModified>2024-05-01T00:00:00.000Z</LastModified></Contents>`)
        .join("");
      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end(`<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>${BUCKET}</Name><IsTruncated>false</IsTruncated>${contents}</ListBucketResult>`);
      return;
    }
    const key = decodeURIComponent(rest.join("/"));
    const body = objects[key];
    if (body === undefined) {
      res.writeHead(404, { "Content-Type": "application/xml" });
      res.end(`<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchKey</Code><Message>missing</Message></Error>`);
      return;
    }
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    res.end(body);
  });
  await new Promise<void>((resolve) => fakeS3.listen(0, "127.0.0.1", resolve));
  endpoint = `http://127.0.0.1:${(fakeS3.address() as AddressInfo).port}`;

  const config: AppConfig = {
    env: "test",
    port: 0,
    sessionSecret: "test-secret",
    passwordHash: await argon2.hash(PASSWORD),
    mediaRoot: "./does-not-exist",
    cookieSecure: false,
    remoteStorage: {
      endpoint,
      bucket: BUCKET,
      region: "auto",
      accessKeyId: "test",
      secretAccessKey: "test",
      signedUrlTtlSeconds: 3600,
    },
  };
  app = await buildApp(config);
  agent = request.agent(app);
  const csrf = await agent.get("/api/auth/csrf-token");
  await agent.post("/api/auth/login").set("x-csrf-token", csrf.body.csrfToken).send({ password: PASSWORD });
});

afterAll(() => {
  fakeS3?.close();
});

describe("remote (S3-compatible) media storage", () => {
  it("builds the manifest from the bucket listing with the same ids as a local scan", async () => {
    const res = await agent.get("/api/media/manifest");
    expect(res.status).toBe(200);
    const ids = res.body.items.map((item: { id: string }) => item.id).sort();
    expect(ids).toEqual([stableId("Trip/beach.jpg"), stableId("Trip/clip.mp4")].sort());
    const clip = res.body.items.find((item: { type: string }) => item.type === "video");
    expect(clip.hasPoster).toBe(true);
  });

  it("redirects an authorized file request to a presigned URL on the storage host", async () => {
    const res = await agent.get(`/api/media/file/${stableId("Trip/beach.jpg")}`);
    expect(res.status).toBe(302);
    expect(res.headers.location.startsWith(`${endpoint}/${BUCKET}/media/Trip/beach.jpg?`)).toBe(true);
    expect(res.headers.location).toContain("X-Amz-Signature=");
    expect(res.headers.location).toContain("response-content-type=image%2Fjpeg");
  });

  it("still requires a session before handing out any presigned URL", async () => {
    const res = await request(app).get(`/api/media/file/${stableId("Trip/beach.jpg")}`);
    expect(res.status).toBe(401);
    expect(res.headers.location).toBeUndefined();
  });

  it("serves pre-generated thumbnails from the bucket", async () => {
    const id = stableId("Trip/clip.mp4");
    const res = await agent.get(`/api/media/thumb/${id}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(`/thumbnails/${id}.jpg?`);
  });

  it("finds the loose intro video at the bucket root", async () => {
    const res = await request(app).get("/api/intro-video");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/media/Intro%20video.mp4?");
  });
});
