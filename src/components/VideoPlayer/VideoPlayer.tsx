import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Maximize, Minimize, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react";
import type { MediaItem } from "@shared/types";
import { clearProgress, getResumePoint, setProgress } from "@/services/progress";
import { getAlternativeMemory, getNextEpisode } from "@/utils/nextEpisode";
import { useBackgroundAudio } from "@/context/AudioContext";
import styles from "./VideoPlayer.module.css";

interface VideoPlayerProps {
  item: MediaItem;
  allItems: MediaItem[];
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const NEAR_END_SECONDS = 8;
const IDLE_HIDE_MS = 3000;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoPlayer({ item, allItems }: VideoPlayerProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<number | undefined>(undefined);
  const { duck, restore } = useBackgroundAudio();

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [ended, setEnded] = useState(false);

  const nextEpisode = getNextEpisode(item, allItems);
  const alternative = !nextEpisode ? getAlternativeMemory(item, allItems) : undefined;
  const upNext = nextEpisode ?? alternative;

  useEffect(() => {
    duck();
    return () => restore();
  }, [duck, restore]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const resumeAt = getResumePoint(item.id);
    if (resumeAt) {
      const applyResume = () => {
        video.currentTime = resumeAt;
      };
      video.addEventListener("loadedmetadata", applyResume, { once: true });
      return () => video.removeEventListener("loadedmetadata", applyResume);
    }
  }, [item.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing) return;
    const interval = window.setInterval(() => {
      if (video.duration > 0) setProgress(item.id, video.currentTime, video.duration);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [playing, item.id]);

  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && video.duration > 0 && !video.ended) {
        setProgress(item.id, video.currentTime, video.duration);
      }
    };
  }, [item.id]);

  const resetIdleTimer = useCallback(() => {
    setControlsVisible(true);
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, IDLE_HIDE_MS);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => setError("Playback couldn't start. Try again."));
    } else {
      video.pause();
    }
  }

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), video.duration || Infinity);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function changeVolume(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    setVolume(value);
    if (value > 0 && video.muted) {
      video.muted = false;
      setMuted(false);
    }
  }

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      await containerRef.current.requestFullscreen?.().catch(() => undefined);
    }
  }

  function retry() {
    setError(undefined);
    videoRef.current?.load();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case " ":
      case "k":
        event.preventDefault();
        togglePlay();
        break;
      case "ArrowRight":
        seekBy(5);
        break;
      case "ArrowLeft":
        seekBy(-5);
        break;
      case "ArrowUp":
        event.preventDefault();
        changeVolume(Math.min(1, volume + 0.1));
        break;
      case "ArrowDown":
        event.preventDefault();
        changeVolume(Math.max(0, volume - 0.1));
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
      case "Escape":
        if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
        break;
      default:
        break;
    }
  }

  return (
    <div
      className={styles.wrap}
      ref={containerRef}
      onMouseMove={resetIdleTimer}
      onTouchStart={resetIdleTimer}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="application"
      aria-label={`Playing ${item.title}`}
    >
      <video
        ref={videoRef}
        className={styles.video}
        src={item.mediaUrl}
        autoPlay
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          setCurrentTime(video.currentTime);
          if (video.duration > 0 && video.duration - video.currentTime < NEAR_END_SECONDS && upNext) {
            setShowNextPrompt(true);
          }
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
        onEnded={() => {
          setEnded(true);
          clearProgress(item.id);
          if (upNext) setShowNextPrompt(true);
        }}
        onError={() => setError(item.playbackCaution ? "This video's format isn't playing in your browser. Try converting it to MP4 (H.264/AAC)." : "This video couldn't be played.")}
      />

      <div className={`${styles.controls} ${controlsVisible ? "" : styles.hidden}`}>
        <div className={styles.topBar}>
          <Link className={styles.backLink} to={`/title/${item.id}`} replace>
            <ChevronLeft size={18} /> Back
          </Link>
          <span className={styles.titleTag}>{item.title}</span>
        </div>

        {!playing && !error && (
          <button type="button" className={styles.centerButton} onClick={togglePlay} aria-label={ended ? "Replay" : "Play"}>
            {ended ? <RotateCcw size={30} /> : <Play size={30} fill="currentColor" />}
          </button>
        )}

        <div className={styles.bottomBar}>
          <div className={styles.seekRow}>
            <span className={styles.time}>{formatTime(currentTime)}</span>
            <input
              type="range"
              className={styles.seekBar}
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const video = videoRef.current;
                if (video) video.currentTime = Number(e.target.value);
              }}
              aria-label="Seek"
            />
            <span className={styles.time}>{formatTime(duration)}</span>
          </div>

          <div className={styles.controlsRow}>
            <button type="button" className={styles.iconButton} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button type="button" className={styles.iconButton} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
              {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              className={styles.volumeRange}
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
            />

            <select
              className={styles.speedSelect}
              value={speed}
              onChange={(e) => {
                const value = Number(e.target.value);
                setSpeed(value);
                if (videoRef.current) videoRef.current.playbackRate = value;
              }}
              aria-label="Playback speed"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>

            <div className={styles.spacer} />

            {nextEpisode && (
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => navigate(`/watch/${nextEpisode.id}`)}
                aria-label="Next episode"
              >
                <SkipForward size={20} />
              </button>
            )}

            <button type="button" className={styles.iconButton} onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {showNextPrompt && upNext && (
        <div className={styles.nextPrompt}>
          <img className={styles.nextPromptThumb} src={upNext.thumbnailUrl} alt="" />
          <p>{nextEpisode ? "Next episode" : "You might also like"}</p>
          <strong>{upNext.title}</strong>
          <div className={styles.nextPromptActions}>
            <button type="button" className={styles.nextPromptButton} onClick={() => navigate(`/watch/${upNext.id}`)}>
              {nextEpisode ? "Play Next" : "Watch"}
            </button>
            <button type="button" className={styles.nextPromptDismiss} onClick={() => setShowNextPrompt(false)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorOverlay} role="alert">
          <div>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <button type="button" className={styles.retryButton} onClick={retry}>
                Retry
              </button>
              <Link className={styles.errorBackLink} to={`/title/${item.id}`} replace>
                Back to details
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
