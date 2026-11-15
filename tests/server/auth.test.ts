/** @vitest-environment node */
import request from "supertest";
import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestApp, TEST_PASSWORD } from "./testApp.js";

let app: Express;

beforeAll(async () => {
  const created = await createTestApp();
  app = created.app;
});

async function getCsrfToken(agent: ReturnType<typeof request.agent>): Promise<string> {
  const res = await agent.get("/api/auth/csrf-token");
  return res.body.csrfToken;
}

describe("POST /api/auth/login", () => {
  it("rejects an incorrect passcode without revealing details", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);

    const res = await agent.post("/api/auth/login").set("x-csrf-token", csrfToken).send({ password: "definitely-wrong" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);

    const status = await agent.get("/api/auth/status");
    expect(status.body.authenticated).toBe(false);
  });

  it("accepts the correct passcode and starts an authenticated session", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);

    const res = await agent.post("/api/auth/login").set("x-csrf-token", csrfToken).send({ password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const status = await agent.get("/api/auth/status");
    expect(status.body.authenticated).toBe(true);
  });

  it("rejects a login request without a valid CSRF token", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/login").send({ password: TEST_PASSWORD });
    expect(res.status).toBe(403);
  });

  it("rate-limits repeated failed attempts from the same client", async () => {
    // Uses its own app instance so this test's deliberate rate-limit trip
    // doesn't leak (the limiter is keyed by IP, not by session) into other tests.
    const isolated = (await createTestApp()).app;
    const agent = request.agent(isolated);
    const csrfToken = await getCsrfToken(agent);

    let lastStatus = 0;
    for (let i = 0; i < 12; i++) {
      const res = await agent.post("/api/auth/login").set("x-csrf-token", csrfToken).send({ password: "wrong" });
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });
});

describe("POST /api/auth/logout", () => {
  it("ends the session so protected routes become unauthorized again", async () => {
    // Also uses its own app instance, for the same reason as above.
    const isolated = (await createTestApp()).app;
    const agent = request.agent(isolated);
    const csrfToken = await getCsrfToken(agent);
    await agent.post("/api/auth/login").set("x-csrf-token", csrfToken).send({ password: TEST_PASSWORD });

    expect((await agent.get("/api/media/manifest")).status).toBe(200);

    await agent.post("/api/auth/logout").set("x-csrf-token", csrfToken);

    expect((await agent.get("/api/media/manifest")).status).toBe(401);
  });
});
