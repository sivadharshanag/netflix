import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EditorialContent, MediaItem, MediaWarning } from "@shared/types";
import * as api from "@/services/api";
import { useAuth } from "./AuthContext";

interface MediaContextValue {
  items: MediaItem[];
  itemsById: Map<string, MediaItem>;
  folders: string[];
  warnings: MediaWarning[];
  editorial: EditorialContent | undefined;
  loading: boolean;
  error: string | undefined;
  reload: () => Promise<void>;
}

const MediaContext = createContext<MediaContextValue | undefined>(undefined);

export function MediaProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<MediaWarning[]>([]);
  const [editorial, setEditorial] = useState<EditorialContent | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [manifest, editorialContent] = await Promise.all([api.getMediaManifest(), api.getEditorialContent()]);
      setItems(manifest.items);
      setFolders(manifest.folders);
      setWarnings(manifest.warnings);
      setEditorial(editorialContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your memories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) reload();
  }, [authenticated, reload]);

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const value = useMemo(
    () => ({ items, itemsById, folders, warnings, editorial, loading, error, reload }),
    [items, itemsById, folders, warnings, editorial, loading, error, reload]
  );

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

export function useMedia(): MediaContextValue {
  const ctx = useContext(MediaContext);
  if (!ctx) throw new Error("useMedia must be used within MediaProvider");
  return ctx;
}
