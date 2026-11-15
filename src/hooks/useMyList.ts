import { useCallback } from "react";
import { useLocalStorageState } from "./useLocalStorageState";

export function useMyList() {
  const [ids, setIds] = useLocalStorageState<string[]>("varunika:myList", []);

  const isInList = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => (prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]));
    },
    [setIds]
  );

  return { ids, isInList, toggle };
}
