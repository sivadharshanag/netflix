import { useNavigate } from "react-router-dom";
import { Check, Info, Play, Plus } from "lucide-react";
import type { MediaItem } from "@shared/types";
import { useMyList } from "@/hooks/useMyList";
import { getProgress } from "@/services/progress";
import { MediaThumbnail } from "@/components/MediaThumbnail/MediaThumbnail";
import styles from "./MediaCard.module.css";

interface MediaCardProps {
  item: MediaItem;
  badge?: string;
}

export function MediaCard({ item, badge }: MediaCardProps) {
  const navigate = useNavigate();
  const { isInList, toggle } = useMyList();
  const inList = isInList(item.id);
  const progress = getProgress(item.id);
  const progressFraction = progress ? Math.min(1, progress.seconds / progress.duration) : 0;

  function openDetail() {
    navigate(`/title/${item.id}`);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  }

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={onKeyDown}
      aria-label={`${item.title} — open details`}
    >
      {badge && <span className={styles.badge}>{badge}</span>}
      <MediaThumbnail item={item} className={styles.thumb} alt="" loading="lazy" />

      {progressFraction > 0 && (
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressFraction * 100}%` }} />
        </div>
      )}

      <div className={styles.overlay}>
        <p className={styles.title}>{item.title}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionButton}
            aria-label={`Play ${item.title}`}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/watch/${item.id}`);
            }}
          >
            <Play size={14} fill="currentColor" />
          </button>
          <button
            type="button"
            className={styles.actionButton}
            data-active={inList}
            aria-label={inList ? `Remove ${item.title} from My List` : `Add ${item.title} to My List`}
            onClick={(e) => {
              e.stopPropagation();
              toggle(item.id);
            }}
          >
            {inList ? <Check size={14} /> : <Plus size={14} />}
          </button>
          <button
            type="button"
            className={styles.actionButton}
            aria-label={`More info about ${item.title}`}
            onClick={(e) => {
              e.stopPropagation();
              openDetail();
            }}
          >
            <Info size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
