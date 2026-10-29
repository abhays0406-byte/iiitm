import { create } from 'zustand';

export interface QueuedMutation {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  before: string | null;
  after: string | null;
  timestamp: Date;
  payload: unknown;
}

interface OfflineState {
  online: boolean;
  outbox: QueuedMutation[];
  setOnline: (online: boolean) => void;
  queue: (m: Omit<QueuedMutation, 'id'>) => void;
  replay: () => number;
  clearOutbox: () => void;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  online: true,
  outbox: [],

  setOnline: (online) => set({ online }),

  queue: (m) => {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const mutation: QueuedMutation = { ...m, id, timestamp: new Date() };
    set((state) => ({ outbox: [...state.outbox, mutation] }));
  },

  replay: () => {
    const { outbox } = get();
    const count = outbox.length;
    set({ outbox: [] });
    return count;
  },

  clearOutbox: () => set({ outbox: [] }),
}));
