import { describe, expect, it } from "vitest";
import type { MediaItem } from "@shared/types";
import { pickSurpriseItem } from "@/utils/surpriseMe";

function makeItems(ids: string[]): MediaItem[] {
  return ids.map((id) => ({
    id,
    title: id,
    description: "",
    folder: "Dance",
    type: "image",
    mediaUrl: `/api/media/file/${id}`,
    thumbnailUrl: `/api/media/thumb/${id}`,
    hasPoster: true,
    tags: [],
    extension: "jpg",
    sizeBytes: 1,
  }));
}

describe("pickSurpriseItem", () => {
  it("returns undefined when there's nothing eligible", () => {
    expect(pickSurpriseItem([], new Set())).toBeUndefined();
  });

  it("never repeats an item until every eligible item has been shown once", () => {
    const items = makeItems(["a", "b", "c"]);
    const shown = new Set<string>();
    const seen = new Set<string>();

    for (let i = 0; i < 3; i++) {
      const pick = pickSurpriseItem(items, shown);
      expect(pick).toBeDefined();
      expect(seen.has(pick!.id)).toBe(false);
      seen.add(pick!.id);
    }

    // after all 3 shown, the set resets so a 4th pick is possible and valid
    expect(shown.size).toBe(0);
    expect(pickSurpriseItem(items, shown)).toBeDefined();
  });
});
