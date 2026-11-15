import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MediaItem } from "@shared/types";
import { MediaCard } from "@/components/MediaCard/MediaCard";
import styles from "./MediaRow.module.css";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  emptyState?: ReactNode;
  badgeFor?: (item: MediaItem) => string | undefined;
}

export function MediaRow({ title, items, emptyState, badgeFor }: MediaRowProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  if (items.length === 0 && !emptyState) return null;

  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollBy(320);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollBy(-320);
    }
  }

  return (
    <section className={styles.row} aria-label={title}>
      <h2 className={styles.heading}>{title}</h2>

      {items.length === 0 ? (
        <p className={styles.empty}>{emptyState}</p>
      ) : (
        <div className={styles.scrollerWrap}>
          <button type="button" className={styles.navButton} aria-label={`Scroll ${title} left`} onClick={() => scrollBy(-320)}>
            <ChevronLeft />
          </button>

          <div className={`${styles.scroller} scroll-row`} ref={scrollerRef} tabIndex={0} onKeyDown={onKeyDown}>
            {items.map((item) => (
              <MediaCard key={item.id} item={item} badge={badgeFor?.(item)} />
            ))}
          </div>

          <button
            type="button"
            className={`${styles.navButton} right`}
            aria-label={`Scroll ${title} right`}
            onClick={() => scrollBy(320)}
          >
            <ChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}
