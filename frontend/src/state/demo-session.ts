// In-memory demo state only. Reset on reload; never a business approval.
import { useSyncExternalStore } from "react";
export type DemoSchedule = {
  optionId: string;
  title: string;
  period: string;
  outlet: string;
  offer: string;
  hours: string;
};
let schedule: DemoSchedule | null = null;
const listeners = new Set<() => void>();
export function setDemoSchedule(value: DemoSchedule | null) {
  schedule = value;
  listeners.forEach((listener) => listener());
}
export function getDemoSchedule() {
  return schedule;
}
export function useDemoSchedule() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getDemoSchedule,
    () => null,
  );
}
