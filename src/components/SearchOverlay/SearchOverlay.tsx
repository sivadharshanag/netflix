import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import type { MediaItem } from "@shared/types";
import styles from "./SearchOverlay.module.css";

interface SearchOverlayProps {
  open: boolean;
  items: MediaItem[];
  onClose: () => void;
}

export function SearchOverlay({ open, items, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim().toLowerCase()), 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebounced("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const results = useMemo(() => {
    if (!debounced) return [];
    return items.filter((item) => {
      const haystack = [item.title, item.description, item.folder, ...item.tags].join(" ").toLowerCase();
      return haystack.includes(debounced);
    });
  }, [debounced, items]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Search">
      <div className={styles.header}>
        <div className={styles.inputWrap}>
          <Search size={20} />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, folders, tags..."
            aria-label="Search your memories"
          />
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close search">
          <X size={24} />
        </button>
      </div>

      {debounced && results.length === 0 && <p className={styles.empty}>No memories match "{query}".</p>}

      <div className={styles.results}>
        {results.map((item) => (
          <Link key={item.id} to={`/title/${item.id}`} className={styles.resultCard} onClick={onClose}>
            <img className={styles.resultThumb} src={item.thumbnailUrl} alt="" loading="lazy" />
            <p className={styles.resultTitle}>{item.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
