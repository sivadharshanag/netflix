import { defineConfig, devices } from "@playwright/test";
import argon2 from "argon2";

export const E2E_TEST_PASSWORD = "e2e-test-passcode";
const testPasswordHash = await argon2.hash(E2E_TEST_PASSWORD);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run test:e2e:server",
    url: "http://localhost:4100/api/health",
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      NODE_ENV: "test",
      PORT: "4100",
      MEDIA_ROOT: "./tests/e2e/fixtures/media",
      SESSION_SECRET: "e2e-test-secret-not-for-production",
      BIRTHDAY_PASSWORD_HASH: testPasswordHash,
      COOKIE_SECURE: "false",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
