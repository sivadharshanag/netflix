import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { MediaItem } from "@shared/types";
import { SearchOverlay } from "@/components/SearchOverlay/SearchOverlay";

function makeItem(overrides: Partial<MediaItem>): MediaItem {
  return {
    id: overrides.id ?? "id",
    title: overrides.title ?? "Title",
    description: overrides.description ?? "",
    folder: overrides.folder ?? "Dance",
    type: "image",
    mediaUrl: "/api/media/file/id",
    thumbnailUrl: "/api/media/thumb/id",
    hasPoster: true,
    tags: overrides.tags ?? [],
    extension: "jpg",
    sizeBytes: 1,
    ...overrides,
  };
}

const items = [makeItem({ id: "1", title: "Hackathon Finals" }), makeItem({ id: "2", title: "Beach Trip", folder: "IV Kerala" })];

describe("SearchOverlay", () => {
  it("renders nothing when closed", () => {
    render(
      <MemoryRouter>
        <SearchOverlay open={false} items={items} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("filters results by title as the user types", async () => {
    render(
      <MemoryRouter>
        <SearchOverlay open items={items} onClose={vi.fn()} />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/search your memories/i), "hackathon");
    expect(await screen.findByText("Hackathon Finals")).toBeInTheDocument();
    expect(screen.queryByText("Beach Trip")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    render(
      <MemoryRouter>
        <SearchOverlay open items={items} onClose={vi.fn()} />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText(/search your memories/i), "nonexistent-memory");
    expect(await screen.findByText(/no memories match/i)).toBeInTheDocument();
  });
});
