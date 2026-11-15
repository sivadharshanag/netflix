import { describe, expect, it } from "vitest";
import type { MediaItem } from "@shared/types";
import { buildCategoryRows } from "@/data/categories";

function makeItem(overrides: Partial<MediaItem>): MediaItem {
  return {
    id: overrides.id ?? "id",
    title: overrides.title ?? "Title",
    description: "",
    folder: overrides.folder ?? "Random college snap",
    type: "image",
    mediaUrl: "/api/media/file/id",
    thumbnailUrl: "/api/media/thumb/id",
    hasPoster: true,
    tags: [],
    extension: "jpg",
    sizeBytes: 100,
    ...overrides,
  };
}

describe("buildCategoryRows", () => {
  it("builds one row per folder, with its friendly display name", () => {
    const items = [makeItem({ id: "a", folder: "Dance" }), makeItem({ id: "b", folder: "Hackathon" })];
    const rows = buildCategoryRows(items, ["Dance", "Hackathon"], "Moments to cherish");
    expect(rows.find((r) => r.title === "Dance & Performances")?.items.map((i) => i.id)).toEqual(["a"]);
    expect(rows.find((r) => r.title === "The Genius Squad")?.items.map((i) => i.id)).toEqual(["b"]);
  });

  it("never mixes items from different folders into the same row", () => {
    const items = [makeItem({ id: "a", folder: "Dance" }), makeItem({ id: "b", folder: "Hackathon" })];
    const rows = buildCategoryRows(items, ["Dance", "Hackathon"], "Moments to cherish");
    for (const row of rows) {
      const folders = new Set(items.filter((i) => row.items.some((ri) => ri.id === i.id)).map((i) => i.folder));
      expect(folders.size).toBe(1);
    }
  });

  it("excludes the featured folder, since it gets its own hero treatment", () => {
    const items = [makeItem({ id: "featured-1", folder: "Moments to cherish" }), makeItem({ id: "dance-1", folder: "Dance" })];
    const rows = buildCategoryRows(items, ["Moments to cherish", "Dance"], "Moments to cherish");
    const allIds = rows.flatMap((r) => r.items.map((i) => i.id));
    expect(allIds).not.toContain("featured-1");
    expect(allIds).toContain("dance-1");
  });

  it("falls back to the raw folder name for an unmapped folder", () => {
    const items = [makeItem({ id: "x", folder: "A Brand New Folder" })];
    const rows = buildCategoryRows(items, ["A Brand New Folder"], "Moments to cherish");
    expect(rows.some((r) => r.title === "A Brand New Folder")).toBe(true);
  });
});
