import { useCallback, useEffect, useState } from "react";

function readValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** localStorage-backed state that stays in sync across tabs/windows of the same browser. */
export function useLocalStorageState<T>(key: string, fallback: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => readValue(key, fallback));

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        setState(readValue(key, fallback));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // storage unavailable (private browsing, quota) — state still updates in-memory
        }
        return next;
      });
    },
    [key]
  );

  return [state, setValue];
}
