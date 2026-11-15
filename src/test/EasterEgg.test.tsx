import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { EasterEgg } from "@/components/EasterEgg/EasterEgg";

describe("EasterEgg", () => {
  it("shows the configured message and calls onClose", async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <EasterEgg message="You found the secret!" onClose={onClose} />
      </MemoryRouter>
    );

    expect(screen.getByText("You found the secret!")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
