import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useMedia } from "@/context/MediaContext";
import { LoadingScreen } from "@/components/LoadingScreen/LoadingScreen";
import styles from "./TimelinePage.module.css";

export default function TimelinePage() {
  const { editorial, itemsById, loading } = useMedia();

  const sorted = useMemo(() => {
    if (!editorial) return [];
    return [...editorial.timeline].sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
  }, [editorial]);

  if (loading || !editorial) return <LoadingScreen />;

  return (
    <div className={styles.wrap}>
      <Link to="/home" className={styles.backLink}>
        <ChevronLeft size={18} /> Back
      </Link>
      <h1 className={styles.heading}>Four Years. A Million Memories.</h1>
      <p className={styles.subheading}>Every milestone here was added on purpose — nothing is guessed.</p>

      {sorted.length === 0 ? (
        <p className={styles.empty}>
          No milestones yet. Add them to <code>content/editorial.json</code> under <code>timeline</code>.
        </p>
      ) : (
        <ol className={styles.list}>
          {sorted.map((milestone) => {
            const media = milestone.mediaId ? itemsById.get(milestone.mediaId) : undefined;
            const body = (
              <>
                {milestone.date && <p className={styles.date}>{new Date(milestone.date).toLocaleDateString()}</p>}
                <h2 className={styles.milestoneTitle}>{milestone.title}</h2>
                {milestone.description && <p className={styles.milestoneDescription}>{milestone.description}</p>}
                {media && <img className={styles.thumb} src={media.thumbnailUrl} alt="" />}
              </>
            );
            return (
              <li key={milestone.id} className={styles.milestone}>
                <span className={styles.dot} aria-hidden="true" />
                {media ? (
                  <Link className={styles.milestoneLink} to={media.type === "video" ? `/watch/${media.id}` : `/title/${media.id}`}>
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
