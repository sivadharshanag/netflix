import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Play, Plus } from "lucide-react";
import { useMedia } from "@/context/MediaContext";
import { useMyList } from "@/hooks/useMyList";
import { getResumePoint } from "@/services/progress";
import { displayNameForFolder } from "@shared/folderDisplayNames";
import { MediaRow } from "@/components/MediaRow/MediaRow";
import { MediaThumbnail } from "@/components/MediaThumbnail/MediaThumbnail";
import { LoadingScreen } from "@/components/LoadingScreen/LoadingScreen";
import type { MediaItem } from "@shared/types";
import styles from "./TitleDetailPage.module.css";

export default function TitleDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { items, itemsById, loading } = useMedia();

  const item = itemsById.get(id);

  const similar = useMemo(() => {
    if (!item) return [];
    return items.filter((candidate) => candidate.id !== item.id && candidate.folder === item.folder).slice(0, 12);
  }, [item, items]);

  // Browse other photos from the same folder with Previous/Next, like a proper lightbox.
  const photoSiblings = useMemo(() => {
    if (!item || item.type !== "image") return [];
    return items.filter((candidate) => candidate.folder === item.folder && candidate.type === "image");
  }, [item, items]);

  if (loading) return <LoadingScreen />;
  if (!item) {
    return (
      <div className="page container" style={{ paddingTop: 100 }}>
        <p>That memory couldn't be found.</p>
        <button type="button" onClick={() => navigate("/home")}>
          Back to Home
        </button>
      </div>
    );
  }

  if (item.type === "image") {
    return <PhotoDetail item={item} siblings={photoSiblings} similar={similar} />;
  }

  return <VideoDetail item={item} similar={similar} />;
}

function goBack(navigate: ReturnType<typeof useNavigate>) {
  // history.back() rather than a hardcoded Link — returns to wherever the
  // user actually came from (a row's scroll position, search results,
  // gallery, ...), not always the top of the homepage.
  navigate(-1);
}

interface PhotoDetailProps {
  item: MediaItem;
  siblings: MediaItem[];
  similar: MediaItem[];
}

function PhotoDetail({ item, siblings, similar }: PhotoDetailProps) {
  const navigate = useNavigate();
  const { isInList, toggle } = useMyList();
  const inList = isInList(item.id);

  const index = siblings.findIndex((s) => s.id === item.id);
  const prevItem = siblings.length > 1 ? siblings[(index - 1 + siblings.length) % siblings.length] : undefined;
  const nextItem = siblings.length > 1 ? siblings[(index + 1) % siblings.length] : undefined;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") goBack(navigate);
      if (event.key === "ArrowLeft" && prevItem) navigate(`/title/${prevItem.id}`, { replace: true });
      if (event.key === "ArrowRight" && nextItem) navigate(`/title/${nextItem.id}`, { replace: true });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, prevItem, nextItem]);

  return (
    <div className={styles.photoWrap}>
      <button type="button" onClick={() => goBack(navigate)} className={styles.backLink}>
        <ChevronLeft size={18} /> Back
      </button>

      <div className={styles.photoStage}>
        {prevItem && (
          <button
            type="button"
            className={`${styles.photoNav} prev`}
            aria-label="Previous photo"
            onClick={() => navigate(`/title/${prevItem.id}`, { replace: true })}
          >
            <ChevronLeft />
          </button>
        )}
        <img className={styles.photoImage} src={item.mediaUrl} alt={item.title} />
        {nextItem && (
          <button
            type="button"
            className={`${styles.photoNav} next`}
            aria-label="Next photo"
            onClick={() => navigate(`/title/${nextItem.id}`, { replace: true })}
          >
            <ChevronRight />
          </button>
        )}
      </div>

      <div className={styles.photoInfo}>
        <h1 className={styles.title}>{item.title}</h1>
        <div className={styles.meta}>
          <span className={styles.tag}>{displayNameForFolder(item.folder)}</span>
          {item.season && <span className={styles.tag}>Season {item.season}</span>}
        </div>
        {item.description && <p className={styles.description}>{item.description}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.myListButton} onClick={() => toggle(item.id)}>
            {inList ? <Check size={18} /> : <Plus size={18} />} My List
          </button>
        </div>

        {similar.length > 0 && <MediaRow title={`More from ${displayNameForFolder(item.folder)}`} items={similar} />}
      </div>
    </div>
  );
}

interface VideoDetailProps {
  item: MediaItem;
  similar: MediaItem[];
}

function VideoDetail({ item, similar }: VideoDetailProps) {
  const navigate = useNavigate();
  const { isInList, toggle } = useMyList();
  const inList = isInList(item.id);
  const resumeAt = getResumePoint(item.id);

  return (
    <div className={styles.wrap}>
      <button type="button" onClick={() => goBack(navigate)} className={styles.backLink}>
        <ChevronLeft size={18} /> Back
      </button>

      <div className={styles.hero}>
        <MediaThumbnail item={item} className={`${styles.backdrop} ${styles.video}`} alt="" />
        <div className={styles.gradient} />
      </div>

      <div className={styles.body}>
        <h1 className={styles.title}>{item.title}</h1>
        <div className={styles.meta}>
          <span className={styles.tag}>{displayNameForFolder(item.folder)}</span>
          {item.season && <span className={styles.tag}>Season {item.season}</span>}
          {item.episodeNumber && <span className={styles.tag}>Episode {item.episodeNumber}</span>}
          <span className={styles.tag}>Video</span>
        </div>

        {item.description && <p className={styles.description}>{item.description}</p>}

        {item.playbackCaution && (
          <p className={styles.caution}>This file's format may not play smoothly in every browser.</p>
        )}

        <div className={styles.actions}>
          <Link className={styles.playButton} to={`/watch/${item.id}`}>
            <Play size={18} fill="currentColor" /> {resumeAt ? "Resume" : "Play"}
          </Link>
          <button type="button" className={styles.myListButton} onClick={() => toggle(item.id)}>
            {inList ? <Check size={18} /> : <Plus size={18} />} My List
          </button>
        </div>

        {similar.length > 0 && <MediaRow title={`More from ${displayNameForFolder(item.folder)}`} items={similar} />}
      </div>
    </div>
  );
}
