import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  parseAppearance,
  readAppearance,
  resetAppearance,
  updateAppearance,
  useAppearance,
} from "../src/state/appearance";

afterEach(() => {
  vi.restoreAllMocks();
  resetAppearance();
  localStorage.clear();
});
describe("appearance preferences", () => {
  it("defaults safely and validates every field", () => {
    for (const value of [
      null,
      "broken",
      "null",
      "[]",
      '"dark"',
      '{"theme":"invalid","sidebarPosition":"invalid"}',
    ]) {
      expect(parseAppearance(value)).toEqual(DEFAULT_APPEARANCE);
    }
    expect(
      parseAppearance('{"theme":"gray","sidebarPosition":"right"}'),
    ).toEqual({ theme: "gray", sidebarPosition: "right" });
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
  });
  it("stores only appearance, resets only appearance and publishes stable snapshots", () => {
    localStorage.setItem("other-data", "keep");
    function Probe() {
      const value = useAppearance();
      return (
        <output>
          {value.theme}/{value.sidebarPosition}
        </output>
      );
    }
    const { unmount } = render(<Probe />);
    act(() => updateAppearance({ theme: "gray", sidebarPosition: "right" }));
    expect(screen.getByRole("status")).toHaveTextContent("gray/right");
    expect(readAppearance()).toEqual({
      theme: "gray",
      sidebarPosition: "right",
    });
    unmount();
    render(<Probe />);
    expect(screen.getByRole("status")).toHaveTextContent("gray/right");
    act(resetAppearance);
    expect(screen.getByRole("status")).toHaveTextContent("system/left");
    expect(localStorage.getItem("other-data")).toBe("keep");
  });
  it("works in memory when storage reads and writes fail", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
    expect(() => updateAppearance({ theme: "dark" })).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("shares and cleans listeners, follows OS only in system mode and receives storage changes", () => {
    let dark = false;
    const callbacks = new Set<() => void>();
    const remove = vi.fn((_: string, cb: () => void) => callbacks.delete(cb));
    vi.stubGlobal("matchMedia", () => ({
      get matches() {
        return dark;
      },
      addEventListener: (_: string, cb: () => void) => callbacks.add(cb),
      removeEventListener: remove,
    }));
    function Probe() {
      useAppearance();
      return null;
    }
    const { unmount } = render(
      <>
        <Probe />
        <Probe />
      </>,
    );
    expect(callbacks.size).toBe(1);
    dark = true;
    act(() => callbacks.forEach((cb) => cb()));
    expect(document.documentElement.dataset.theme).toBe("dark");
    act(() => updateAppearance({ theme: "gray" }));
    dark = false;
    act(() => callbacks.forEach((cb) => cb()));
    expect(document.documentElement.dataset.theme).toBe("gray");
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: APPEARANCE_KEY,
          newValue: '{"theme":"light","sidebarPosition":"right"}',
        }),
      ),
    );
    expect(document.documentElement.dataset.sidebarPosition).toBe("right");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })));
    expect(document.documentElement.dataset.sidebarPosition).toBe("left");
    unmount();
    expect(remove).toHaveBeenCalledOnce();
    expect(callbacks.size).toBe(0);
    vi.unstubAllGlobals();
  });
});
