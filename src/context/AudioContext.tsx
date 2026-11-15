import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

interface AudioContextValue {
  muted: boolean;
  toggleMute: () => void;
  setTrack: (url: string | undefined) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  duck: () => void;
  restore: () => void;
}

const BackgroundAudioContext = createContext<AudioContextValue | undefined>(undefined);

export function BackgroundAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useLocalStorageState<boolean>("varunika:muted", false);
  const duckedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0.55;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const setTrack = useCallback((url: string | undefined) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!url) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      return;
    }
    if (audio.src !== new URL(url, window.location.href).toString()) {
      audio.src = url;
    }
  }, []);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {
      // Autoplay was blocked — the user can still press the mute/unmute control.
    });
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
  }, []);

  const duck = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || duckedRef.current) return;
    duckedRef.current = true;
    audio.pause();
  }, []);

  const restore = useCallback(() => {
    if (!duckedRef.current) return;
    duckedRef.current = false;
    play();
  }, [play]);

  const toggleMute = useCallback(() => setMuted((prev) => !prev), [setMuted]);

  const value = useMemo(
    () => ({ muted, toggleMute, setTrack, play, pause, stop, duck, restore }),
    [muted, toggleMute, setTrack, play, pause, stop, duck, restore]
  );

  return <BackgroundAudioContext.Provider value={value}>{children}</BackgroundAudioContext.Provider>;
}

export function useBackgroundAudio(): AudioContextValue {
  const ctx = useContext(BackgroundAudioContext);
  if (!ctx) throw new Error("useBackgroundAudio must be used within BackgroundAudioProvider");
  return ctx;
}
