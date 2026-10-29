import { useSyncExternalStore } from "react";

export type SidebarPosition = "left" | "right";
export type ThemePreference = "light" | "dark" | "gray" | "system";
export type Appearance = {
  sidebarPosition: SidebarPosition;
  theme: ThemePreference;
};
export const APPEARANCE_KEY = "tara.appearance.v1";
export const DEFAULT_APPEARANCE: Readonly<Appearance> = Object.freeze({
  sidebarPosition: "left",
  theme: "system",
});

export function parseAppearance(value: string | null): Appearance {
  try {
    const data: unknown = JSON.parse(value ?? "null");
    if (!data || typeof data !== "object") return { ...DEFAULT_APPEARANCE };
    const candidate = data as Record<string, unknown>;
    return {
      sidebarPosition: candidate.sidebarPosition === "right" ? "right" : "left",
      theme:
        candidate.theme === "light" ||
        candidate.theme === "dark" ||
        candidate.theme === "gray"
          ? candidate.theme
          : "system",
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}
export function readAppearance(): Appearance {
  try {
    return parseAppearance(localStorage.getItem(APPEARANCE_KEY));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

let snapshot: Appearance | undefined;
const listeners = new Set<() => void>();
function getSnapshot() {
  return (snapshot ??= readAppearance());
}
export function applyAppearance(preference = getSnapshot()) {
  const dark =
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const theme =
    preference.theme === "system"
      ? dark
        ? "dark"
        : "light"
      : preference.theme;
  document.documentElement.style.colorScheme =
    theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.bsTheme =
    theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.sidebarPosition = preference.sidebarPosition;
}
function publish(next: Appearance) {
  const current = getSnapshot();
  if (
    current.theme !== next.theme ||
    current.sidebarPosition !== next.sidebarPosition
  ) {
    snapshot = next;
    listeners.forEach((notify) => notify());
  }
  applyAppearance();
}
export function updateAppearance(update: Partial<Appearance>) {
  const next = parseAppearance(JSON.stringify({ ...getSnapshot(), ...update }));
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
  } catch {
    // Keep working in memory if storage is blocked or full.
  }
  publish(next);
}
export function resetAppearance() {
  updateAppearance(DEFAULT_APPEARANCE);
}
let detach: (() => void) | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMedia = () => applyAppearance();
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage)
        return;
      if (event.key === APPEARANCE_KEY || event.key === null) {
        publish(parseAppearance(event.key === null ? null : event.newValue));
      }
    };
    media?.addEventListener("change", onMedia);
    window.addEventListener("storage", onStorage);
    detach = () => {
      media?.removeEventListener("change", onMedia);
      window.removeEventListener("storage", onStorage);
    };
    applyAppearance();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      detach?.();
      detach = undefined;
    }
  };
}
export function useAppearance() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
