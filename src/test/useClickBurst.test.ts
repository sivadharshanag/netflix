import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useClickBurst } from "@/hooks/useClickBurst";

describe("useClickBurst", () => {
  it("fires onReach once the click threshold is hit within the time window", () => {
    const onReach = vi.fn();
    const { result } = renderHook(() => useClickBurst(3, onReach));

    result.current();
    result.current();
    expect(onReach).not.toHaveBeenCalled();

    result.current();
    expect(onReach).toHaveBeenCalledTimes(1);
  });

  it("resets the counter if clicks are more than 2s apart", () => {
    vi.useFakeTimers();
    const onReach = vi.fn();
    const { result } = renderHook(() => useClickBurst(2, onReach));

    result.current();
    vi.advanceTimersByTime(2500);
    result.current();
    expect(onReach).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
