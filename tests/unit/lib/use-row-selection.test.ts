// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRowSelection } from "../../../src/lib/use-row-selection";

interface Item {
  id: string;
  name: string;
}

const ITEMS: Item[] = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bilal" },
  { id: "3", name: "Chitra" },
];

describe("useRowSelection", () => {
  it("starts with nothing selected", () => {
    const { result } = renderHook(() => useRowSelection(ITEMS, (item) => item.id));
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.isIndeterminate).toBe(false);
  });

  it("toggles a single item's selection", () => {
    const { result } = renderHook(() => useRowSelection(ITEMS, (item) => item.id));

    act(() => result.current.toggle(ITEMS[0]!));
    expect(result.current.isSelected(ITEMS[0]!)).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    act(() => result.current.toggle(ITEMS[0]!));
    expect(result.current.isSelected(ITEMS[0]!)).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it("reports isIndeterminate when some but not all items are selected", () => {
    const { result } = renderHook(() => useRowSelection(ITEMS, (item) => item.id));
    act(() => result.current.toggle(ITEMS[0]!));

    expect(result.current.isIndeterminate).toBe(true);
    expect(result.current.isAllSelected).toBe(false);
  });

  it("toggleAll selects every visible item, then clears on a second call", () => {
    const { result } = renderHook(() => useRowSelection(ITEMS, (item) => item.id));

    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.isIndeterminate).toBe(false);

    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(0);
  });

  it("clear empties the selection regardless of prior state", () => {
    const { result } = renderHook(() => useRowSelection(ITEMS, (item) => item.id));
    act(() => result.current.toggleAll());
    act(() => result.current.clear());
    expect(result.current.selectedCount).toBe(0);
  });

  it("tracks selection by id, not object identity — a new array with the same ids preserves selection", () => {
    const { result, rerender } = renderHook(({ items }) => useRowSelection(items, (item) => item.id), {
      initialProps: { items: ITEMS },
    });

    act(() => result.current.toggle(ITEMS[0]!));
    expect(result.current.selectedCount).toBe(1);

    // A new array reference, same ids/content — simulates a re-fetch.
    const refetched: Item[] = ITEMS.map((item) => ({ ...item }));
    rerender({ items: refetched });

    expect(result.current.isSelected(refetched[0]!)).toBe(true);
  });
});
