import { Link } from "react-router-dom";
import { Info, Play } from "lucide-react";
import type { MediaItem } from "@shared/types";
import { displayNameForFolder } from "@shared/folderDisplayNames";
import { MediaThumbnail } from "@/components/MediaThumbnail/MediaThumbnail";
import styles from "./HeroBanner.module.css";

interface HeroBannerProps {
  item?: MediaItem;
  showConfigNote?: boolean;
}

export function HeroBanner({ item, showConfigNote }: HeroBannerProps) {
  // Generated titles already start with the collection's display name
  // (e.g. "Childhood Chronicles — Memory 2") — showing it again right below
  // would just be repeated text, so skip it in that case.
  const folderName = item ? displayNameForFolder(item.folder) : "";
  const titleAlreadyShowsFolder = item ? item.title.startsWith(folderName) : false;

  return (
    <section className={styles.hero} aria-label="Featured">
      {item && (
        <div className={styles.imagePanel}>
          {item.type === "image" ? (
            <img className={styles.backdrop} src={item.mediaUrl} alt="" />
          ) : (
            <MediaThumbnail item={item} className={styles.backdrop} alt="" />
          )}
        </div>
      )}
      <div className={styles.gradient} />
      <div className={styles.content}>
        <p className={styles.eyebrow}>A Birthday Original</p>
        {item ? (
          <>
            <h1 className={styles.title}>{item.title}</h1>
            {item.description && <p className={styles.synopsis}>{item.description}</p>}
            {(!titleAlreadyShowsFolder || item.season) && (
              <p className={styles.meta}>
                {!titleAlreadyShowsFolder && <span>{folderName}</span>}
                {item.season && <span>Season {item.season}</span>}
              </p>
            )}
            <div className={styles.actions}>
              <Link className={styles.playButton} to={`/watch/${item.id}`}>
                <Play size={18} fill="currentColor" /> Play
              </Link>
              <Link className={styles.infoButton} to={`/title/${item.id}`}>
                <Info size={18} /> More Info
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.title}>VARUNIKA</h1>
            <p className={styles.synopsis}>Four years. Countless memories. One unforgettable story.</p>
            {showConfigNote && (
              <p className={styles.meta}>Dev note: set heroMediaId in content/editorial.json to feature a real memory here.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
