import { useEffect, useRef, useState } from "react";
import { getCachedVideoFrameThumbnail, getVideoFrameThumbnail } from "@/utils/videoFrameCache";

/**
 * Lazily (via IntersectionObserver) grabs a real frame from `videoUrl` as a
 * client-side poster, for videos with no server-generated thumbnail.
 * Returns the fallback until a frame is ready, and stays on it if extraction fails.
 */
export function useVideoFrameThumbnail(mediaId: string, videoUrl: string, fallback: string, enabled: boolean) {
  const elementRef = useRef<HTMLElement | null>(null);
  const [src, setSrc] = useState<string>(() => getCachedVideoFrameThumbnail(mediaId) ?? fallback);

  useEffect(() => {
    if (!enabled) return;
    const cached = getCachedVideoFrameThumbnail(mediaId);
    if (cached) {
      setSrc(cached);
      return;
    }

    const el = elementRef.current;
    if (!el) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        getVideoFrameThumbnail(mediaId, videoUrl).then((frame) => {
          if (!cancelled && frame) setSrc(frame);
        });
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [mediaId, videoUrl, enabled]);

  return { ref: elementRef, src };
}
