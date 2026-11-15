import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BirthdayLetter } from "@/components/BirthdayLetter/BirthdayLetter";
import { BackgroundAudioProvider } from "@/context/AudioContext";

function renderLetter(content: Parameters<typeof BirthdayLetter>[0]["content"]) {
  return render(
    <MemoryRouter>
      <BackgroundAudioProvider>
        <BirthdayLetter content={content} />
      </BackgroundAudioProvider>
    </MemoryRouter>
  );
}

const staticContent = { heading: "One Last Thing...", body: "Dear Varunika,\n\nTest body.", from: "A Friend" };

const rollingContent = {
  heading: "One Last Thing...",
  body: "",
  from: "Siva",
  messageParagraphs: ["First paragraph of the letter.", "Second paragraph of the letter."],
  closingLines: ["A closing line."],
};

describe("BirthdayLetter", () => {
  it("hides the letter body until the envelope is opened (static mode)", async () => {
    renderLetter(staticContent);
    expect(screen.queryByText(/test body/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /open the letter/i }));
    expect(await screen.findByText(/test body/i)).toBeInTheDocument();
    expect(screen.getByText(/a friend/i)).toBeInTheDocument();
  });

  it("reveals the first paragraph of a rolling letter once opened, and not before", async () => {
    renderLetter(rollingContent);
    expect(screen.queryByText(/first paragraph/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /open the letter/i }));
    expect(await screen.findByText(/first paragraph/i)).toBeInTheDocument();
    expect(screen.queryByText(/second paragraph/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /replay the experience/i })).toBeInTheDocument();
  });
});
