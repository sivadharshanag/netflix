import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useKeySequence } from "@/hooks/useKeySequence";

function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

describe("useKeySequence", () => {
  it("fires onMatch only once the exact sequence is typed in order", () => {
    const onMatch = vi.fn();
    renderHook(() => useKeySequence(["o", "w", "u"], onMatch));

    pressKey("o");
    pressKey("x");
    pressKey("w");
    pressKey("u");
    expect(onMatch).not.toHaveBeenCalled();

    pressKey("o");
    pressKey("w");
    pressKey("u");
    expect(onMatch).toHaveBeenCalledTimes(1);
  });

  it("is case-insensitive", () => {
    const onMatch = vi.fn();
    renderHook(() => useKeySequence(["o", "w", "u"], onMatch));
    pressKey("O");
    pressKey("W");
    pressKey("U");
    expect(onMatch).toHaveBeenCalledTimes(1);
  });
});
