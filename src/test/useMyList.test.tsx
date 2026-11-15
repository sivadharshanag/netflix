import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useMyList } from "@/hooks/useMyList";

beforeEach(() => {
  localStorage.clear();
});

describe("useMyList", () => {
  it("adds and removes ids, persisting them to localStorage", () => {
    const { result } = renderHook(() => useMyList());
    expect(result.current.ids).toEqual([]);

    act(() => result.current.toggle("abc123"));
    expect(result.current.ids).toEqual(["abc123"]);
    expect(result.current.isInList("abc123")).toBe(true);
    expect(JSON.parse(localStorage.getItem("varunika:myList")!)).toEqual(["abc123"]);

    act(() => result.current.toggle("abc123"));
    expect(result.current.ids).toEqual([]);
    expect(result.current.isInList("abc123")).toBe(false);
  });
});
