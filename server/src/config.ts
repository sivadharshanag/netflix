import "./loadEnv.js";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { readRemoteStorageConfig, type RemoteStorageConfig } from "./storage/remoteStorage.js";

export type Env = "development" | "production" | "test";

export interface AppConfig {
  env: Env;
  port: number;
  sessionSecret: string;
  passwordHash: string;
  mediaRoot: string;
  /** Set when MEDIA_STORAGE=s3: media is read from an S3-compatible bucket (R2/B2) instead of mediaRoot. */
  remoteStorage?: RemoteStorageConfig;
  cookieSecure: boolean;
  /** Only set in development when no BIRTHDAY_PASSWORD_HASH was configured. */
  devGeneratedPassword?: string;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export async function loadConfig(): Promise<AppConfig> {
  const env = (readEnv("NODE_ENV") as Env | undefined) ?? "development";
  const port = Number(readEnv("PORT") ?? "3000");
  const mediaRoot = readEnv("MEDIA_ROOT") ?? "./media";
  const cookieSecure = readEnv("COOKIE_SECURE") === "true";
  const remoteStorage = readRemoteStorageConfig();

  let sessionSecret = readEnv("SESSION_SECRET");
  if (!sessionSecret) {
    if (env === "production") {
      throw new Error("SESSION_SECRET must be set in production. See .env.example.");
    }
    sessionSecret = randomBytes(48).toString("hex");
    console.warn("[config] No SESSION_SECRET set — using a random one for this process only. Sessions will not survive a restart. Set SESSION_SECRET in .env for real use.");
  }

  let passwordHash = readEnv("BIRTHDAY_PASSWORD_HASH");
  let devGeneratedPassword: string | undefined;
  if (!passwordHash) {
    if (env === "production" || env === "test") {
      throw new Error("BIRTHDAY_PASSWORD_HASH must be set. Generate one with: npm run hash-password -- \"yourPasscode\"");
    }
    devGeneratedPassword = randomBytes(6).toString("base64url");
    passwordHash = await argon2.hash(devGeneratedPassword, { type: argon2.argon2id });
    console.warn("\n[config] DEVELOPMENT MODE: no BIRTHDAY_PASSWORD_HASH was set in .env.");
    console.warn(`[config] Using a temporary passcode for this run only: ${devGeneratedPassword}`);
    console.warn("[config] Set BIRTHDAY_PASSWORD_HASH in .env for a real, persistent passcode.\n");
  }

  return { env, port, sessionSecret, passwordHash, mediaRoot, remoteStorage, cookieSecure, devGeneratedPassword };
}
