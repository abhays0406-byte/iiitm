import { create } from 'zustand';

export const SIMULATED_NOW = new Date(2026, 10, 12);

export function simulatedNow(): Date {
  return new Date(SIMULATED_NOW);
}

export function makeDate(y: number, m: number, d: number): Date {
  return new Date(y, m, d);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
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
