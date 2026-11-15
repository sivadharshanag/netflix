import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useMedia } from "@/context/MediaContext";
import { VideoPlayer } from "@/components/VideoPlayer/VideoPlayer";
import { LoadingScreen } from "@/components/LoadingScreen/LoadingScreen";

export default function WatchPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { items, itemsById, loading } = useMedia();
  const item = itemsById.get(id);

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

  // Photos get the full-screen viewer (with prev/next, My List, etc.) that
  // lives at /title/:id — there's no separate "play" experience for a photo.
  if (item.type === "image") {
    return <Navigate to={`/title/${item.id}`} replace />;
  }

  return <VideoPlayer item={item} allItems={items} />;
}
