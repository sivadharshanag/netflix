import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import argon2 from "argon2";
import { buildApp } from "../../server/src/app.js";
import type { AppConfig } from "../../server/src/config.js";

export const TEST_PASSWORD = "test-passcode-123";

export async function createTestMediaRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "varunika-test-media-"));
  const folder = path.join(root, "Test Folder");
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, "photo.jpg"), Buffer.from("fake-jpeg-bytes-for-testing"));
  await writeFile(path.join(folder, "clip.mp4"), Buffer.from("fake-mp4-bytes-for-testing-0123456789"));
  return root;
}

export async function createTestApp() {
  const mediaRoot = await createTestMediaRoot();
  const passwordHash = await argon2.hash(TEST_PASSWORD);
  const config: AppConfig = {
    env: "test",
    port: 0,
    sessionSecret: "test-secret-not-for-production",
    passwordHash,
    mediaRoot,
    cookieSecure: false,
  };
  const app = await buildApp(config);
  return { app, mediaRoot };
}
