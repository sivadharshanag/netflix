import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Film, Pause, Play, X } from "lucide-react";
import { useMedia } from "@/context/MediaContext";
import { displayNameForFolder } from "@shared/folderDisplayNames";
import { LoadingScreen } from "@/components/LoadingScreen/LoadingScreen";
import { MediaThumbnail } from "@/components/MediaThumbnail/MediaThumbnail";
import styles from "./GalleryPage.module.css";

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23232323'/%3E%3C/svg%3E";

export default function GalleryPage() {
  const navigate = useNavigate();
  const { items, folders, loading } = useMedia();
  const [folderFilter, setFolderFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return items
      .filter((item) => folderFilter === "all" || item.folder === folderFilter)
      .filter((item) => !query || item.title.toLowerCase().includes(query.toLowerCase()));
  }, [items, folderFilter, query]);

  const images = filtered.filter((item) => item.type === "image");
  const lightboxItem = lightboxIndex !== null ? images[lightboxIndex] : undefined;

  useEffect(() => {
    if (!slideshow || lightboxIndex === null) return;
    const timer = setTimeout(() => {
      setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));
    }, 4000);
    return () => clearTimeout(timer);
  }, [slideshow, lightboxIndex, images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowRight") setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));
      if (event.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, images.length]);

  if (loading) return <LoadingScreen />;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <Link to="/home" className={styles.backLink}>
          <ChevronLeft size={18} /> Back
        </Link>
        <h1 className={styles.heading}>Collections</h1>
        <input
          className={styles.searchInput}
          placeholder="Filter by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter gallery by title"
        />
        <select className={styles.select} value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} aria-label="Filter by folder">
          <option value="all">All collections</option>
          {folders.map((folder) => (
            <option key={folder} value={folder}>
              {displayNameForFolder(folder)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No memories match this filter.</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((item) => {
            const imageIndex = item.type === "image" ? images.findIndex((i) => i.id === item.id) : -1;
            return (
              <button
                key={item.id}
                type="button"
                className={styles.tile}
                onClick={() => (item.type === "image" ? setLightboxIndex(imageIndex) : navigate(`/watch/${item.id}`))}
                aria-label={item.title}
              >
                <MediaThumbnail
                  item={item}
                  className={`${styles.tileImage} ${loadedIds.has(item.id) ? styles.loaded : ""}`}
                  alt={item.title}
                  loading="lazy"
                  onLoad={() => setLoadedIds((prev) => new Set(prev).add(item.id))}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMAGE;
                    setLoadedIds((prev) => new Set(prev).add(item.id));
                  }}
                />
                {item.type === "video" && (
                  <span className={styles.videoBadge}>
                    <Film size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {lightboxItem && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={lightboxItem.title}>
          <button type="button" className={styles.lightboxClose} onClick={() => setLightboxIndex(null)} aria-label="Close">
            <X size={26} />
          </button>
          <button
            type="button"
            className={`${styles.lightboxNav} prev`}
            onClick={() => setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length))}
            aria-label="Previous photo"
          >
            <ChevronLeft />
          </button>
          <img className={styles.lightboxImage} src={lightboxItem.mediaUrl} alt={lightboxItem.title} />
          <button
            type="button"
            className={`${styles.lightboxNav} next`}
            onClick={() => setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length))}
            aria-label="Next photo"
          >
            <ChevronRight />
          </button>
          <p className={styles.lightboxCaption}>
            {lightboxItem.title} · {displayNameForFolder(lightboxItem.folder)}
          </p>
          <button type="button" className={styles.slideshowToggle} onClick={() => setSlideshow((v) => !v)}>
            {slideshow ? <Pause size={16} /> : <Play size={16} />} Slideshow
          </button>
        </div>
      )}
    </div>
  );
}
