import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useMedia } from "@/context/MediaContext";
import { BirthdayLetter } from "@/components/BirthdayLetter/BirthdayLetter";
import { LoadingScreen } from "@/components/LoadingScreen/LoadingScreen";
import styles from "@/components/BirthdayLetter/BirthdayLetter.module.css";

export default function LetterPage() {
  const { editorial, loading } = useMedia();

  if (loading || !editorial) return <LoadingScreen />;

  return (
    <>
      <Link to="/home" className={styles.backLink}>
        <ChevronLeft size={18} /> Back
      </Link>
      <BirthdayLetter content={editorial.birthdayLetter} soundtrackUrl={editorial.soundtrack?.backgroundMusicUrl ?? undefined} />
    </>
  );
}
