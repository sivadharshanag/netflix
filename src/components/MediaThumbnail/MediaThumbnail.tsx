import type { ImgHTMLAttributes } from "react";
import type { MediaItem } from "@shared/types";
import { useVideoFrameThumbnail } from "@/hooks/useVideoFrameThumbnail";

interface MediaThumbnailProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  item: MediaItem;
}

/**
 * Renders the best available thumbnail for a media item: the server-generated
 * poster when there is one, otherwise (for videos only) a real frame grabbed
 * client-side from the actual video — never the same generic placeholder for
 * every video.
 */
export function MediaThumbnail({ item, ...imgProps }: MediaThumbnailProps) {
  const needsClientFrame = item.type === "video" && !item.hasPoster;
  const { ref, src } = useVideoFrameThumbnail(item.id, item.mediaUrl, item.thumbnailUrl, needsClientFrame);

  if (!needsClientFrame) {
    return <img src={item.thumbnailUrl} {...imgProps} />;
  }

  return <img ref={ref as React.RefObject<HTMLImageElement>} src={src} {...imgProps} />;
}
