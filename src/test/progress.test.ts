import { beforeEach, describe, expect, it } from "vitest";
import type { MediaItem } from "@shared/types";
import { getContinueWatching, getResumePoint, setProgress } from "@/services/progress";

function makeItem(id: string): MediaItem {
  return {
    id,
    title: id,
    description: "",
    folder: "Dance",
    type: "video",
    mediaUrl: `/api/media/file/${id}`,
    thumbnailUrl: `/api/media/thumb/${id}`,
    hasPoster: true,
    tags: [],
    extension: "mp4",
    sizeBytes: 100,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("getResumePoint", () => {
  it("returns undefined when there's no saved progress", () => {
    expect(getResumePoint("missing")).toBeUndefined();
  });

  it("returns undefined for negligible progress", () => {
    setProgress("a", 2, 120);
    expect(getResumePoint("a")).toBeUndefined();
  });

  it("returns undefined once the video is essentially finished", () => {
    setProgress("a", 119, 120);
    expect(getResumePoint("a")).toBeUndefined();
  });

  it("returns the saved second for meaningful, unfinished progress", () => {
    setProgress("a", 45, 120);
    expect(getResumePoint("a")).toBe(45);
  });
});

describe("getContinueWatching", () => {
  it("excludes finished items and orders the rest newest-first", async () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    setProgress("a", 30, 120);
    setProgress("b", 119, 120); // essentially finished — excluded
    await new Promise((resolve) => setTimeout(resolve, 5));
    setProgress("c", 60, 120); // saved after "a" — should sort first

    const result = getContinueWatching(items);
    expect(result.map((entry) => entry.item.id)).toEqual(["c", "a"]);
  });

  it("ignores items that no longer exist in the manifest", () => {
    setProgress("ghost", 30, 120);
    expect(getContinueWatching([makeItem("a")])).toEqual([]);
  });
});
