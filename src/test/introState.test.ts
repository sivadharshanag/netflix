import { beforeEach, describe, expect, it, vi } from "vitest";

describe("introState", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("starts unshown and reflects markIntroShown()", async () => {
    const { hasShownIntro, markIntroShown } = await import("@/state/introState");
    expect(hasShownIntro()).toBe(false);
    markIntroShown();
    expect(hasShownIntro()).toBe(true);
  });

  it("resets when the module is re-evaluated (simulating a fresh page load)", async () => {
    const first = await import("@/state/introState");
    first.markIntroShown();
    expect(first.hasShownIntro()).toBe(true);

    vi.resetModules();
    const second = await import("@/state/introState");
    expect(second.hasShownIntro()).toBe(false);
  });
});
