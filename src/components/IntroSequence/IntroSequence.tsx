import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { playBrandAccent, playCinematicBoom, unlockAudio } from "@/utils/synthesizedSound";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useBackgroundAudio } from "@/context/AudioContext";
import { Confetti } from "@/components/Confetti/Confetti";
import styles from "./IntroSequence.module.css";

type Stage = "gate" | "video" | "black" | "brand" | "birthday";

interface IntroSequenceProps {
  onComplete: () => void;
}

export function IntroSequence({ onComplete }: IntroSequenceProps) {
  const [stage, setStage] = useState<Stage>("gate");
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [introVideoFailed, setIntroVideoFailed] = useState(false);
  const reducedMotion = useReducedMotion();
  const { muted, toggleMute } = useBackgroundAudio();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (stage !== "black") return;
    if (!muted) playCinematicBoom();
    const timer = setTimeout(() => setStage("brand"), reducedMotion ? 150 : 1800);
    return () => clearTimeout(timer);
  }, [stage, muted, reducedMotion]);

  useEffect(() => {
    if (stage !== "brand") return;
    if (!muted) playBrandAccent();
    const timer = setTimeout(() => setStage("birthday"), reducedMotion ? 150 : 2000);
    return () => clearTimeout(timer);
  }, [stage, muted, reducedMotion]);

  useEffect(() => {
    if (stage === "birthday") setConfettiTrigger((n) => n + 1);
  }, [stage]);

  async function begin() {
    await unlockAudio();

    const video = videoRef.current;
    if (video && !introVideoFailed) {
      video.muted = muted;
      video.currentTime = 0;
      try {
        await video.play();
        setStage("video");
        return;
      } catch {
        // Autoplay blocked or no intro video configured — fall back below.
      }
    }
    setStage("black");
  }

  function skip() {
    videoRef.current?.pause();
    onComplete();
  }

  return (
    <div className={styles.stage}>
      <Confetti trigger={confettiTrigger} />

      {/* Always mounted (even before "Begin") so play() can be called synchronously
          within the Begin click handler — required for autoplay-with-sound to work. */}
      <video
        ref={videoRef}
        className={styles.introVideo}
        style={{ opacity: stage === "video" ? 1 : 0, pointerEvents: stage === "video" ? "auto" : "none" }}
        src="/api/intro-video"
        preload="auto"
        playsInline
        muted
        aria-hidden={stage !== "video"}
        onError={() => setIntroVideoFailed(true)}
        onEnded={() => setStage("birthday")}
      />

      <button type="button" className={styles.skipButton} onClick={skip}>
        Skip Intro
      </button>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        style={{ position: "absolute", top: 20, left: 20, background: "transparent", border: "none", color: "var(--text-secondary)", zIndex: 10 }}
      >
        {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
      </button>

      <AnimatePresence mode="wait">
        {stage === "gate" && (
          <motion.div key="gate" className={styles.tapToBegin} exit={{ opacity: 0 }}>
            <p>A birthday original, for Varunika.</p>
            <button type="button" className={styles.tapButton} onClick={begin}>
              Begin
            </button>
          </motion.div>
        )}

        {stage === "black" && (
          <motion.div
            key="black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.6 }}
            className={styles.glow}
          >
            {introVideoFailed && (
              <p className={styles.fallbackNotice} role="status">
                Couldn't load the original intro clip — continuing with the cinematic intro.
              </p>
            )}
          </motion.div>
        )}

        {stage === "brand" && (
          <motion.div
            key="brand"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.9, ease: [0.22, 0.61, 0.36, 1] }}
            className={styles.brandMark}
          >
            V
          </motion.div>
        )}

        {stage === "birthday" && (
          <motion.div
            key="birthday"
            className={styles.birthdayWrap}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.6 }}
          >
            <motion.p
              className={styles.happyBirthday}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.2 }}
            >
              Happy Birthday
            </motion.p>
            <motion.h1
              className={styles.name}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.4 }}
            >
              VARUNIKA
            </motion.h1>
            <motion.p
              className={styles.subtitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.7 }}
            >
              Your life. Your people. Your four unforgettable years.
            </motion.p>
            <motion.p
              className={styles.production}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.95 }}
            >
              A Special Original Production
            </motion.p>
            <motion.button
              type="button"
              className={styles.continueButton}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 1.2 }}
              onClick={onComplete}
            >
              Continue
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
