import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/** localStorage that never throws (private mode, quota full, blocked storage): the app keeps working in memory. */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name, value) => {
    try { localStorage.setItem(name, value); } catch { /* keep running in memory */ }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name); } catch { /* ignore */ }
  },
};

/** JSON storage for persisted stores that turns saved ISO timestamps back into Date objects. */
export const dateAwareStorage = createJSONStorage(() => safeLocalStorage, {
  reviver: (_key, value) => (typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : value),
});

/** Re-read a persisted store whenever another tab writes it, so open tabs stay in sync. */
export function syncAcrossTabs(storageKey: string, rehydrate: () => unknown) {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (e) => {
    if (e.key === storageKey) void rehydrate();
  });
}
