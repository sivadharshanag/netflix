// Client-side video poster generation: grabs a real frame from a video using
// a detached <video> + <canvas>, for videos the server couldn't generate a
// poster for (no ffmpeg available). Runs entirely in the browser — nothing
// is uploaded anywhere. Results are cached in memory for the session so the
// same video is never decoded twice.

const cache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

const MAX_WIDTH = 480;
const SEEK_SECONDS = 1;

function captureFrame(videoUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    video.src = videoUrl;

    let settled = false;
    const finish = (result: string | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      resolve(result);
    };

    const timeout = window.setTimeout(() => finish(null), 8000);

    video.addEventListener("error", () => {
      window.clearTimeout(timeout);
      finish(null);
    });

    video.addEventListener("loadedmetadata", () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        video.currentTime = 0;
        return;
      }
      video.currentTime = Math.min(SEEK_SECONDS, video.duration / 2);
    });

    video.addEventListener("seeked", () => {
      window.clearTimeout(timeout);
      try {
        const scale = video.videoWidth > MAX_WIDTH ? MAX_WIDTH / video.videoWidth : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale) || MAX_WIDTH;
        canvas.height = Math.round(video.videoHeight * scale) || Math.round((MAX_WIDTH * 9) / 16);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.75));
      } catch {
        finish(null);
      }
    });
  });
}

/** Returns a data-URL frame for this video, generating and caching it on first call. */
export function getVideoFrameThumbnail(mediaId: string, videoUrl: string): Promise<string | null> {
  if (cache.has(mediaId)) return Promise.resolve(cache.get(mediaId)!);
  const existing = inFlight.get(mediaId);
  if (existing) return existing;

  const promise = captureFrame(videoUrl).then((result) => {
    cache.set(mediaId, result);
    inFlight.delete(mediaId);
    return result;
  });
  inFlight.set(mediaId, promise);
  return promise;
}

export function getCachedVideoFrameThumbnail(mediaId: string): string | null | undefined {
  return cache.get(mediaId);
}
