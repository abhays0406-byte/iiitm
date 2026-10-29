import { create } from 'zustand';

export function makeDate(y: number, m: number, d: number): Date {
  return new Date(y, m, d);
}

/**
 * The day the app starts on: today, at midnight. Every date in the app (seed data, due dates,
 * overdue counts) is measured from the clock store, which starts here and can be moved forward
 * for training without touching the real system clock.
 */
function startOfToday(): Date {
  const t = new Date();
  return makeDate(t.getFullYear(), t.getMonth(), t.getDate());
}

export const SIMULATED_NOW = startOfToday();

/** Current app date (the clock store's `now`), as a fresh Date. */
export function simulatedNow(): Date {
  return new Date(useClockStore.getState().now);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

/** Same calendar day, `days` later (negative for earlier). Safe across daylight-saving changes. */
export function daysFrom(date: Date, days: number): Date {
  return makeDate(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Whole days from `from` to `to`; positive when `to` is later. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

interface ClockState {
  now: Date;
  setNow: (date: Date) => void;
  advanceDays: (days: number) => void;
}

export const useClockStore = create<ClockState>((set) => ({
  now: SIMULATED_NOW,
  setNow: (date) => set({ now: date }),
  advanceDays: (days) =>
    set((state) => {
      const next = new Date(state.now);
      next.setDate(next.getDate() + days);
      return { now: next };
    }),
}));
