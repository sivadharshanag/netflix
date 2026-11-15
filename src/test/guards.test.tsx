import type { ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ authenticated: false, loading: false }),
}));

function renderWithGuard(Guard: ComponentType) {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/intro" element={<div>Intro screen</div>} />
        <Route element={<Guard />}>
          <Route path="/login" element={<div>Login screen</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireIntroSeen", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("redirects to /intro when the intro hasn't played this page load", async () => {
    const { RequireIntroSeen } = await import("@/routes/guards");
    renderWithGuard(RequireIntroSeen);
    expect(screen.getByText("Intro screen")).toBeInTheDocument();
    expect(screen.queryByText("Login screen")).not.toBeInTheDocument();
  });

  it("allows the route through once the intro has played", async () => {
    const introState = await import("@/state/introState");
    introState.markIntroShown();
    const { RequireIntroSeen } = await import("@/routes/guards");
    renderWithGuard(RequireIntroSeen);
    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });
});
