import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, Sparkles, Volume2, VolumeX } from "lucide-react";
import type { EditorialContent } from "@shared/types";
import { Confetti } from "@/components/Confetti/Confetti";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useBackgroundAudio } from "@/context/AudioContext";
import { readingDuration } from "@/utils/readingDuration";
import styles from "./BirthdayLetter.module.css";

interface BirthdayLetterProps {
  content: EditorialContent["birthdayLetter"];
  soundtrackUrl?: string;
}

export function BirthdayLetter({ content, soundtrackUrl }: BirthdayLetterProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const reducedMotion = useReducedMotion();
  const { muted, toggleMute, setTrack, play, pause, stop } = useBackgroundAudio();

  const sequence = useMemo(
    () => [
      ...(content.messageParagraphs ?? []).map((text) => ({ text, kind: "paragraph" as const })),
      ...(content.closingLines ?? []).map((text) => ({ text, kind: "closing" as const })),
    ],
    [content.messageParagraphs, content.closingLines]
  );
  const isRolling = sequence.length > 0;

  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [paused, setPaused] = useState(false);

  function reveal() {
    setOpen(true);
    setConfettiTrigger((n) => n + 1);
  }

  // Soft background music while the letter is open, if a track is configured.
  useEffect(() => {
    if (!open || !isRolling || !soundtrackUrl) return;
    setTrack(soundtrackUrl);
    play();
    return () => {
      pause();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isRolling, soundtrackUrl]);

  // Reveal one paragraph/closing line at a time, each left up long enough to read comfortably.
  useEffect(() => {
    if (!open || !isRolling || paused || done) return;
    const current = sequence[index];
    const timer = setTimeout(() => {
      if (index + 1 < sequence.length) {
        setIndex((i) => i + 1);
      } else {
        setDone(true);
      }
    }, readingDuration(current.text));
    return () => clearTimeout(timer);
  }, [open, isRolling, index, paused, done, sequence]);

  function replayExperience() {
    navigate("/intro");
  }

  const current = isRolling ? sequence[index] : undefined;
  const envelopeClassName = open ? `${styles.envelope} ${styles.envelopeOpen}` : styles.envelope;

  return (
    <div className={styles.wrap}>
      <Confetti trigger={confettiTrigger} />
      {!open ? (
        <div>
          <button type="button" className={envelopeClassName} onClick={reveal} aria-label="Open the letter">
            <span className={styles.envelopeBody} />
            <span className={styles.envelopeFlap} />
            <span className={styles.seal}>V</span>
          </button>
          <p className={styles.hint}>Click the envelope to read.</p>
        </div>
      ) : isRolling ? (
        <div className={styles.rollingWrap}>
          <p className={`${styles.heading} ${styles.rollingAccent}`}>{content.heading}</p>
          <div className={styles.rollingStage}>
            <AnimatePresence mode="wait">
              {!done ? (
                <motion.p
                  key={index}
                  className={`${current!.kind === "closing" ? styles.rollingClosing : styles.rollingParagraph} ${reducedMotion ? "" : styles.rollingDrift}`}
                  initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -14 }}
                  transition={{ duration: 0.8 }}
                >
                  {current!.text}
                </motion.p>
              ) : (
                content.from && (
                  <motion.p
                    key="signature"
                    className={styles.rollingSignature}
                    initial={reducedMotion ? undefined : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                  >
                    — {content.from}
                  </motion.p>
                )
              )}
            </AnimatePresence>
          </div>
          <div className={styles.rollingControls}>
            {!done && (
              <button type="button" className={styles.rollingControlButton} onClick={() => setPaused((p) => !p)}>
                {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? "Resume" : "Pause"}
              </button>
            )}
            {soundtrackUrl && (
              <button type="button" className={styles.rollingControlButton} onClick={toggleMute} aria-label={muted ? "Unmute music" : "Mute music"}>
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? "Unmute" : "Mute"}
              </button>
            )}
            <button type="button" className={styles.rollingControlButton} onClick={replayExperience}>
              <Sparkles size={16} /> Replay the Experience
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          className={styles.letterCard}
          initial={reducedMotion ? undefined : { opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.5 }}
        >
          <h1 className={styles.letterHeading}>{content.heading}</h1>
          <p className={styles.letterBody}>{content.body}</p>
          <p className={styles.from}>— {content.from}</p>
        </motion.div>
      )}
    </div>
  );
}
