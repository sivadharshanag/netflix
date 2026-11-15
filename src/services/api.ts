import type { AuthStatusResponse, EditorialContent, LoginResponse, MediaItem, MediaWarning } from "@shared/types";

let cachedCsrfToken: string | undefined;

function readCookie(name: string): string | undefined {
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match?.split("=")[1];
}

async function ensureCsrfToken(): Promise<string> {
  const fromCookie = readCookie("csrfToken");
  if (fromCookie) {
    cachedCsrfToken = fromCookie;
    return fromCookie;
  }
  const res = await fetch("/api/auth/csrf-token", { credentials: "include" });
  const data = (await res.json()) as { csrfToken: string };
  cachedCsrfToken = data.csrfToken;
  return data.csrfToken;
}

async function request<T>(path: string, init: RequestInit = {}, mutating = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (mutating) {
    const token = cachedCsrfToken ?? (await ensureCsrfToken());
    headers.set("x-csrf-token", token);
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
  }

  const res = await fetch(path, { ...init, headers, credentials: "include" });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.message === "string") message = body.message;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAuthStatus(): Promise<AuthStatusResponse> {
  return request<AuthStatusResponse>("/api/auth/status");
}

export async function login(password: string): Promise<LoginResponse> {
  await ensureCsrfToken();
  return request<LoginResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) }, true);
}

export async function logout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" }, true);
  cachedCsrfToken = undefined;
}

export interface MediaManifestResponse {
  items: MediaItem[];
  folders: string[];
  warnings: MediaWarning[];
  scannedAt: string;
}

export function getMediaManifest(): Promise<MediaManifestResponse> {
  return request<MediaManifestResponse>("/api/media/manifest");
}

export function getEditorialContent(): Promise<EditorialContent> {
  return request<EditorialContent>("/api/content/editorial");
}
