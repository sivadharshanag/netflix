import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shuffle } from "lucide-react";
import { useMedia } from "@/context/MediaContext";
import { useMyList } from "@/hooks/useMyList";
import { useKeySequence } from "@/hooks/useKeySequence";
import { HeroBanner } from "@/components/HeroBanner/HeroBanner";
import { MediaRow } from "@/components/MediaRow/MediaRow";
import { LoadingScreen } from "@/components/LoadingScreen/LoadingScreen";
import { buildCategoryRows } from "@/data/categories";
import { getContinueWatching } from "@/services/progress";
import { pickSurpriseItem } from "@/utils/surpriseMe";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const navigate = useNavigate();
  const { items, itemsById, folders, warnings, editorial, loading } = useMedia();
  const { ids: myListIds } = useMyList();
  const [hiddenUnlocked, setHiddenUnlocked] = useState(false);
  const shownSurpriseRef = useRef(new Set<string>()).current;

  useKeySequence(editorial?.hiddenCollection.keySequence ?? [], () => setHiddenUnlocked(true));

  const heroItem = useMemo(() => {
    if (editorial?.heroMediaId) {
      const explicit = itemsById.get(editorial.heroMediaId);
      if (explicit) return explicit;
    }
    const featured = items.find((item) => item.featured);
    return featured ?? items[0];
  }, [editorial, itemsById, items]);

  const featuredItems = useMemo(
    () => items.filter((item) => item.featured).sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)),
    [items]
  );

  const continueWatching = useMemo(() => getContinueWatching(items).map((entry) => entry.item), [items]);
  const myListItems = useMemo(() => myListIds.map((id) => itemsById.get(id)).filter((i): i is NonNullable<typeof i> => Boolean(i)), [myListIds, itemsById]);

  const seasonRows = useMemo(() => {
    if (!editorial) return [];
    return editorial.seasons
      .map((season) => ({
        title: `Season ${season.season} — ${season.title}`,
        items: items.filter((item) => item.season === season.season),
      }))
      .filter((row) => row.items.length > 0);
  }, [editorial, items]);

  const categoryRows = useMemo(
    () => buildCategoryRows(items, folders, editorial?.featuredCollectionFolder ?? "Moments to cherish"),
    [items, folders, editorial]
  );

  const hiddenItems = useMemo(() => {
    if (!editorial) return [];
    return editorial.hiddenCollection.mediaIds.map((id) => itemsById.get(id)).filter((i): i is NonNullable<typeof i> => Boolean(i));
  }, [editorial, itemsById]);

  const surpriseMe = useCallback(() => {
    const pick = pickSurpriseItem(items, shownSurpriseRef);
    if (!pick) return;
    navigate(pick.type === "video" ? `/watch/${pick.id}` : `/title/${pick.id}`);
  }, [items, navigate, shownSurpriseRef]);

  if (loading || !editorial) return <LoadingScreen label="Gathering your memories..." />;

  return (
    <div className={styles.wrap}>
      {warnings.length > 0 && (
        <p className={styles.warningBanner}>
          {warnings.length} file{warnings.length === 1 ? "" : "s"} couldn't be included (unsupported format) — see the server console for details.
        </p>
      )}

      <HeroBanner item={heroItem} showConfigNote={import.meta.env.DEV} />

      <MediaRow title="Continue Watching" items={continueWatching} emptyState="Nothing in progress yet — start watching something below." />

      <div id="featured">
        <MediaRow
          title={editorial.featuredCollectionTitle}
          items={featuredItems}
          badgeFor={(item) => (item.episodeNumber ? `EP ${item.episodeNumber}` : undefined)}
        />
      </div>

      <div id="four-years">
        {seasonRows.map((row) => (
          <MediaRow key={row.title} title={row.title} items={row.items} />
        ))}
      </div>

      {categoryRows.map((row) => (
        <MediaRow key={row.title} title={row.title} items={row.items} />
      ))}

      <div id="my-list">
        <MediaRow title="My List" items={myListItems} emptyState="Your list is empty — add memories with the + button on any card." />
      </div>

      {hiddenUnlocked && (
        <>
          <p className={styles.unlockNotice}>{editorial.hiddenCollection.label} — unlocked</p>
          <MediaRow
            title={editorial.hiddenCollection.title}
            items={hiddenItems}
            emptyState="Nothing has been marked for this collection yet — add media ids in content/editorial.json."
          />
        </>
      )}

      <button type="button" className={styles.surpriseButton} onClick={surpriseMe}>
        <Shuffle size={18} /> Surprise Me
      </button>
    </div>
  );
}
