import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/routes/LoginPage";

const loginMock = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ login: loginMock }),
}));

beforeEach(() => {
  loginMock.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  it("shows a validation message when submitted empty", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText("Enter the birthday passcode.")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("shows the server's error message on a rejected passcode", async () => {
    loginMock.mockResolvedValue({ success: false, message: "That's not quite it. Try again." });
    renderPage();

    await userEvent.type(screen.getByLabelText(/birthday passcode/i), "wrong-guess");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("That's not quite it. Try again.")).toBeInTheDocument();
  });

  it("toggles passcode visibility", async () => {
    renderPage();
    const input = screen.getByLabelText(/birthday passcode/i) as HTMLInputElement;
    expect(input.type).toBe("password");
    await userEvent.click(screen.getByRole("button", { name: /show passcode/i }));
    expect(input.type).toBe("text");
  });
});
