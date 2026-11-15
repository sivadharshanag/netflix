import { useEffect, useRef } from "react";

/** Calls onMatch when the user types `sequence` (case-insensitive) anywhere on the page. */
export function useKeySequence(sequence: string[], onMatch: () => void): void {
  const bufferRef = useRef<string[]>([]);
  const normalizedSequence = sequence.map((key) => key.toLowerCase());

  useEffect(() => {
    if (normalizedSequence.length === 0) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      const buffer = [...bufferRef.current, event.key.toLowerCase()].slice(-normalizedSequence.length);
      bufferRef.current = buffer;

      if (buffer.length === normalizedSequence.length && buffer.every((key, i) => key === normalizedSequence[i])) {
        bufferRef.current = [];
        onMatch();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSequence.join(","), onMatch]);
}
