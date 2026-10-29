import { create } from 'zustand';

interface DemoToast {
  id: string;
  message: string;
  ms: number;
}

interface DemoToastState {
  toasts: DemoToast[];
  show: (message: string, ms?: number) => void;
  dismiss: (id: string) => void;
}

export const useDemoToastStore = create<DemoToastState>((set) => ({
  toasts: [],
  show: (message, ms = 3000) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, ms }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

let _toast: (m: string, ms?: number) => void = () => {};
export function toast(message: string, ms = 3000) {
  _toast(message, ms);
}
export function setToast(fn: (m: string, ms?: number) => void) {
  _toast = fn;
}
