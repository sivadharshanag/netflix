import { GetObjectCommand, ListObjectsV2Command, NoSuchKey, PutObjectCommand, S3Client, S3ServiceException } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage (Cloudflare R2, Backblaze B2, AWS S3, ...).
 *
 * Bucket layout (written by `npm run upload-media`):
 *   media/<path relative to MEDIA_ROOT>   the photos/videos themselves
 *   thumbnails/<id>.jpg                   pre-generated posters
 *   meta/media-manifest.json              scan result (keeps real file dates)
 *   content/editorial.json                private editorial content
 *   content/media-overrides.json
 *
 * The bucket stays PRIVATE. The server checks the session, then redirects the
 * browser to a short-lived presigned URL, so media bytes never flow through
 * the (free, small) web server.
 */
export interface RemoteStorageConfig {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Lifetime of presigned URLs, in seconds. */
  signedUrlTtlSeconds: number;
}

export const REMOTE_KEYS = {
  media: (relativePath: string) => `media/${toPosix(relativePath)}`,
  thumbnail: (id: string) => `thumbnails/${id}.jpg`,
  thumbnailPrefix: "thumbnails/",
  mediaPrefix: "media/",
  manifest: "meta/media-manifest.json",
  content: (fileName: string) => `content/${fileName}`,
};

export function toPosix(relativePath: string): string {
  return relativePath.split("\\").join("/");
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Returns the remote storage config when MEDIA_STORAGE=s3, otherwise undefined
 * (local filesystem mode). Throws if s3 mode is selected but incomplete.
 */
export function readRemoteStorageConfig(): RemoteStorageConfig | undefined {
  const mode = (readEnv("MEDIA_STORAGE") ?? "local").toLowerCase();
  if (mode === "local") return undefined;
  if (mode !== "s3") {
    throw new Error(`MEDIA_STORAGE must be "local" or "s3" (got "${mode}").`);
  }

  const missing = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter((name) => !readEnv(name));
  if (missing.length > 0) {
    throw new Error(`MEDIA_STORAGE=s3 requires: ${missing.join(", ")}. See .env.example.`);
  }

  const ttl = Number(readEnv("S3_SIGNED_URL_TTL") ?? "21600");
  return {
    endpoint: readEnv("S3_ENDPOINT")!.replace(/\/+$/, ""),
    bucket: readEnv("S3_BUCKET")!,
    region: readEnv("S3_REGION") ?? "auto",
    accessKeyId: readEnv("S3_ACCESS_KEY_ID")!,
    secretAccessKey: readEnv("S3_SECRET_ACCESS_KEY")!,
    // Clamp to [10 min, 7 days] — 7 days is the SigV4 maximum.
    signedUrlTtlSeconds: Math.min(Math.max(Number.isFinite(ttl) ? ttl : 21600, 600), 604800),
  };
}

export interface RemoteObject {
  key: string;
  size: number;
  lastModified?: Date;
}

export class RemoteStorage {
  readonly client: S3Client;
  private readonly urlCache = new Map<string, { url: string; expiresAt: number }>();

  constructor(readonly config: RemoteStorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      // Path-style keeps every presigned URL on the endpoint's own host, which
      // makes the Content-Security-Policy a single, predictable origin.
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      // Newer SDKs add checksum headers by default that some S3-compatible
      // providers (notably B2) reject; only send them when actually required.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  /** The origin presigned URLs point at, for the CSP img-src/media-src. */
  get origin(): string {
    return new URL(this.config.endpoint).origin;
  }

  /**
   * A presigned GET URL for `key`. URLs are cached and reused until they're
   * within 1/3 of their lifetime of expiring, so the browser sees the same URL
   * across page views and can actually use its HTTP cache.
   */
  async signedUrl(key: string, contentType: string): Promise<{ url: string; remainingSeconds: number }> {
    const now = Date.now();
    const ttlMs = this.config.signedUrlTtlSeconds * 1000;
    const cached = this.urlCache.get(key);
    if (cached && cached.expiresAt - now > ttlMs / 3) {
      return { url: cached.url, remainingSeconds: Math.floor((cached.expiresAt - now) / 1000) };
    }

    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ResponseContentType: contentType,
        ResponseCacheControl: "private, max-age=86400",
      }),
      { expiresIn: this.config.signedUrlTtlSeconds }
    );
    this.urlCache.set(key, { url, expiresAt: now + ttlMs });
    return { url, remainingSeconds: this.config.signedUrlTtlSeconds };
  }

  /** Reads a small text object (JSON config); undefined if it doesn't exist. */
  async getText(key: string): Promise<string | undefined> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return await result.Body?.transformToString("utf-8");
    } catch (error) {
      if (error instanceof NoSuchKey) return undefined;
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) return undefined;
      throw error;
    }
  }

  async putText(key: string, body: string, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "no-cache" })
    );
  }

  async list(prefix: string): Promise<RemoteObject[]> {
    const objects: RemoteObject[] = [];
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.config.bucket, Prefix: prefix, ContinuationToken: continuationToken })
      );
      for (const entry of page.Contents ?? []) {
        if (entry.Key) objects.push({ key: entry.Key, size: entry.Size ?? 0, lastModified: entry.LastModified });
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
    return objects;
  }
}
