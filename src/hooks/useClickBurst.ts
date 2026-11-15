import { useCallback, useRef } from "react";

/** Counts rapid repeated clicks (within 2s of each other) and fires onReach once the threshold hits. */
export function useClickBurst(threshold: number, onReach: () => void) {
  const countRef = useRef(0);
  const lastClickRef = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current > 2000) {
      countRef.current = 0;
    }
    lastClickRef.current = now;
    countRef.current += 1;

    if (countRef.current >= threshold) {
      countRef.current = 0;
      onReach();
    }
  }, [threshold, onReach]);
}
