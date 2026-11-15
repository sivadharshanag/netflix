import { describe, expect, it } from "vitest";
import type { MediaItem } from "@shared/types";
import { getAlternativeMemory, getNextEpisode } from "@/utils/nextEpisode";

function makeItem(overrides: Partial<MediaItem>): MediaItem {
  return {
    id: overrides.id ?? "id",
    title: overrides.title ?? "Title",
    description: "",
    folder: overrides.folder ?? "Moments to cherish",
    type: "video",
    mediaUrl: "/api/media/file/id",
    thumbnailUrl: "/api/media/thumb/id",
    hasPoster: true,
    tags: [],
    extension: "mp4",
    sizeBytes: 100,
    ...overrides,
  };
}

describe("getNextEpisode", () => {
  it("follows explicit episodeNumber order within the featured collection", () => {
    const ep1 = makeItem({ id: "ep1", featured: true, episodeNumber: 1 });
    const ep2 = makeItem({ id: "ep2", featured: true, episodeNumber: 2 });
    const ep3 = makeItem({ id: "ep3", featured: true, episodeNumber: 3 });
    expect(getNextEpisode(ep1, [ep3, ep1, ep2])?.id).toBe("ep2");
    expect(getNextEpisode(ep3, [ep3, ep1, ep2])).toBeUndefined();
  });

  it("follows season ordering by date when not featured", () => {
    const s1 = makeItem({ id: "s1", season: 1, date: "2022-01-01", folder: "Dance" });
    const s2 = makeItem({ id: "s2", season: 1, date: "2022-02-01", folder: "Hackathon" });
    expect(getNextEpisode(s1, [s2, s1])?.id).toBe("s2");
  });

  it("returns undefined when there is no season or featured context", () => {
    const lone = makeItem({ id: "lone" });
    expect(getNextEpisode(lone, [lone])).toBeUndefined();
  });
});

describe("getAlternativeMemory", () => {
  it("picks a different item from the same folder", () => {
    const current = makeItem({ id: "current", folder: "Dance" });
    const sibling = makeItem({ id: "sibling", folder: "Dance" });
    const other = makeItem({ id: "other", folder: "Hackathon" });
    const result = getAlternativeMemory(current, [current, sibling, other]);
    expect(result?.id).toBe("sibling");
  });

  it("returns undefined when there is no sibling in the same folder", () => {
    const current = makeItem({ id: "current", folder: "Dance" });
    expect(getAlternativeMemory(current, [current])).toBeUndefined();
  });
});
