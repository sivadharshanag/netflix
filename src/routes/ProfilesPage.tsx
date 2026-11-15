import { useNavigate } from "react-router-dom";
import { useMedia } from "@/context/MediaContext";
import { LoadingScreen } from "@/components/LoadingScreen/LoadingScreen";
import styles from "./ProfilesPage.module.css";

export default function ProfilesPage() {
  const navigate = useNavigate();
  const { editorial, loading } = useMedia();

  if (loading || !editorial) return <LoadingScreen label="Setting the scene..." />;

  const photoUrl = editorial.profile.photoMediaId ? `/api/media/file/${editorial.profile.photoMediaId}` : undefined;

  function selectProfile() {
    sessionStorage.setItem("varunika:profileSelected", "true");
    navigate("/home");
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>Who's watching?</h1>
      <button type="button" className={styles.profile} onClick={selectProfile}>
        <span className={styles.avatarRing}>
          {photoUrl ? (
            <img className={styles.avatarImage} src={photoUrl} alt="" />
          ) : (
            <span className={styles.monogram} aria-hidden="true">
              {editorial.profile.name.charAt(0)}
            </span>
          )}
        </span>
        <span className={styles.name}>{editorial.profile.name}</span>
        <span className={styles.tagline}>{editorial.profile.tagline}</span>
      </button>
    </div>
  );
}
