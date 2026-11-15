import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Play, RotateCcw, Sparkles, X } from "lucide-react";
import type { EditorialContent, MediaItem } from "@shared/types";
import { useBackgroundAudio } from "@/context/AudioContext";
import styles from "./EndCredits.module.css";

interface EndCreditsProps {
  content: EditorialContent["endCredits"];
  itemsById: Map<string, MediaItem>;
  soundtrackUrl?: string;
}

export function EndCredits(_props: EndCreditsProps) {
  const navigate = useNavigate();
  const { setTrack, play, pause } = useBackgroundAudio();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [videoAvailable, setVideoAvailable] = useState<boolean | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);

  const showingVideo = videoAvailable !== false && !videoWatched;

  useEffect(() => {
    if (!_props.soundtrackUrl || showingVideo) return;
    setTrack(_props.soundtrackUrl);
    play();
    return () => pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showingVideo, _props.soundtrackUrl]);

  function startVideo() {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(() => setVideoStarted(true)).catch(() => setVideoStarted(true));
  }

  function skipVideo() {
    videoRef.current?.pause();
    setVideoWatched(true);
  }

  function replayInPlace() {
    if (videoAvailable !== false) {
      setVideoWatched(false);
      setVideoStarted(false);
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }

  function replayExperience() {
    navigate("/intro");
  }

  return (
    <div className={styles.wrap}>
      {videoAvailable !== false && (
        <div className={styles.videoStage} style={{ display: videoWatched ? "none" : "flex" }}>
          <video
            ref={videoRef}
            className={styles.creditsVideo}
            src="/api/media/end-credits-video"
            controls={videoStarted}
            preload="metadata"
            playsInline
            onError={() => setVideoAvailable(false)}
            onLoadedMetadata={() => setVideoAvailable(true)}
            onEnded={() => setVideoWatched(true)}
          />
          {!videoStarted && videoAvailable && (
            <button type="button" className={styles.videoPlayButton} onClick={startVideo} aria-label="Play the end credits video">
              <Play size={28} fill="currentColor" />
            </button>
          )}
          {videoStarted && (
            <button type="button" className={styles.skipVideoButton} onClick={skipVideo}>
              Skip <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      <div className={styles.controls}>
        <button type="button" className={styles.controlButton} onClick={replayInPlace}>
          <RotateCcw size={16} /> Replay
        </button>
        <button type="button" className={styles.controlButton} onClick={replayExperience}>
          <Sparkles size={16} /> Replay the Experience
        </button>
        <button type="button" className={styles.controlButton} onClick={() => navigate("/home")}>
          <X size={16} /> Exit
        </button>
      </div>
    </div>
  );
}
