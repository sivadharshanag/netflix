/** @vitest-environment node */
import request from "supertest";
import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestApp, TEST_PASSWORD } from "./testApp.js";

let app: Express;
let agent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  const created = await createTestApp();
  app = created.app;
  agent = request.agent(app);
  const csrfRes = await agent.get("/api/auth/csrf-token");
  await agent.post("/api/auth/login").set("x-csrf-token", csrfRes.body.csrfToken).send({ password: TEST_PASSWORD });
});

describe("media routes require authentication", () => {
  it("rejects an unauthenticated manifest request", async () => {
    const anonymous = request.agent(app);
    const res = await anonymous.get("/api/media/manifest");
    expect(res.status).toBe(401);
  });

  it("rejects an unauthenticated file request even for a real id", async () => {
    const manifest = await agent.get("/api/media/manifest");
    const realId = manifest.body.items[0].id;

    const anonymous = request.agent(app);
    const res = await anonymous.get(`/api/media/file/${realId}`);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/media/manifest", () => {
  it("returns the scanned items once authenticated", async () => {
    const res = await agent.get("/api/media/manifest");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item.mediaUrl).toMatch(/^\/api\/media\/file\//);
      expect(item).not.toHaveProperty("path");
      expect(item).not.toHaveProperty("absolutePath");
    }
  });
});

describe("GET /api/media/file/:id", () => {
  it("streams the correct file for a valid id", async () => {
    const manifest = await agent.get("/api/media/manifest");
    const photo = manifest.body.items.find((item: { type: string }) => item.type === "image");

    const res = await agent.get(`/api/media/file/${photo.id}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/jpeg");
    expect(Buffer.from(res.body).toString("utf-8")).toBe("fake-jpeg-bytes-for-testing");
  });

  it("supports range requests for seeking", async () => {
    const manifest = await agent.get("/api/media/manifest");
    const video = manifest.body.items.find((item: { type: string }) => item.type === "video");

    const res = await agent.get(`/api/media/file/${video.id}`).set("Range", "bytes=5-9");
    expect(res.status).toBe(206);
    expect(res.headers["content-range"]).toMatch(/^bytes 5-9\//);
    expect(Buffer.from(res.body).toString("utf-8")).toBe("mp4-b"); // bytes 5..9 (inclusive) of "fake-mp4-bytes-for-testing-0123456789"
  });

  it("returns 404 for an id that doesn't exist, instead of leaking a file", async () => {
    const res = await agent.get("/api/media/file/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("cannot be tricked into path traversal via the id parameter", async () => {
    const res = await agent.get("/api/media/file/" + encodeURIComponent("../../../../etc/passwd"));
    expect(res.status).toBe(404);
  });
});
