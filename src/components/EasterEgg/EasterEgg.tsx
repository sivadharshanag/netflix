import { useState } from "react";
import { Link } from "react-router-dom";
import type { MediaItem } from "@shared/types";
import { Confetti } from "@/components/Confetti/Confetti";
import styles from "./EasterEgg.module.css";

interface EasterEggProps {
  message: string;
  favoriteItem?: MediaItem;
  onClose: () => void;
}

export function EasterEgg({ message, favoriteItem, onClose }: EasterEggProps) {
  const [confettiTrigger] = useState(1);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Secret found">
      <Confetti trigger={confettiTrigger} />
      <div className={styles.card}>
        <p className={styles.badge}>You found it</p>
        {favoriteItem && <img className={styles.thumb} src={favoriteItem.thumbnailUrl} alt="" />}
        <p className={styles.message}>{message}</p>
        {favoriteItem && (
          <Link to={`/title/${favoriteItem.id}`} onClick={onClose} style={{ color: "var(--accent)" }}>
            Go to this memory
          </Link>
        )}
        <button type="button" className={styles.closeButton} onClick={onClose} autoFocus>
          Close
        </button>
      </div>
    </div>
  );
}
