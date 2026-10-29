import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimePhrasePattern {
  pattern: string;
  kind: 'fixed' | 'multiplier' | 'vague_quantity';
  days?: number;
  unitDays?: number;
}

interface ConfigState {
  reasonCategories: string[];
  timePhrasePatterns: TimePhrasePattern[];
  defaultPriority: 'Routine' | 'High';
  workingDays: number[];
  monthDays: number;
  outcomeTags: string[];
  addReasonCategory: (cat: string) => void;
  addTimePhrasePattern: (p: TimePhrasePattern) => void;
  setWorkingDays: (days: number[]) => void;
  setDefaultPriority: (p: 'Routine' | 'High') => void;
  setMonthDays: (n: number) => void;
  reset: () => void;
}

const DEFAULT_CONFIG = {
  reasonCategories: ['Lab Review', 'Medication Titration', 'Surgical Dressing', 'General Follow-Up'],
  timePhrasePatterns: [
    { pattern: '\\bnext month\\b', kind: 'fixed', days: 30 },
    { pattern: '\\bnext week\\b', kind: 'fixed', days: 7 },
    { pattern: '\\btomorrow\\b', kind: 'fixed', days: 1 },
    { pattern: '\\bday after tomorrow\\b', kind: 'fixed', days: 2 },
    { pattern: '\\b(?:a\\s+)?fortnight\\b', kind: 'fixed', days: 14 },
    // Hinglish fixed
    { pattern: '\\bek mahine\\b', kind: 'fixed', days: 30 },
    { pattern: '\\bek hafte\\b', kind: 'fixed', days: 7 },
    { pattern: '\\bdo hafte\\b', kind: 'fixed', days: 14 },
    // Hindi fixed
    { pattern: '\\bएक महीने\\b', kind: 'fixed', days: 30 },
    // English number words
    { pattern: '\\bone\\s+week\\b', kind: 'fixed', days: 7 },
    { pattern: '\\btwo\\s+weeks\\b', kind: 'fixed', days: 14 },
    { pattern: '\\bthree\\s+weeks\\b', kind: 'fixed', days: 21 },
    { pattern: '\\bfour\\s+weeks\\b', kind: 'fixed', days: 28 },
    { pattern: '\\bone\\s+month\\b', kind: 'fixed', days: 30 },
    { pattern: '\\btwo\\s+months\\b', kind: 'fixed', days: 60 },
    // Hindi number + unit
    { pattern: '(\\d+)\\s*महीने(?:\\s|$|\\b)', kind: 'multiplier', unitDays: 30 },
    { pattern: '(\\d+)\\s*हफ़्ते(?:\\s|$|\\b)', kind: 'multiplier', unitDays: 7 },
    { pattern: '(\\d+)\\s*हफ्ते(?:\\s|$|\\b)', kind: 'multiplier', unitDays: 7 },
    { pattern: '(\\d+)\\s*दिन(?:\\s|$|\\b)', kind: 'multiplier', unitDays: 1 },
    // Hindi word numbers + unit
    { pattern: 'तीन\\s*हफ्ते', kind: 'fixed', days: 21 },
    { pattern: 'दो\\s*हफ्ते', kind: 'fixed', days: 14 },
    { pattern: 'एक\\s*हफ्ते', kind: 'fixed', days: 7 },
    // English number + unit
    { pattern: '(\\d+)\\s*weeks?\\b', kind: 'multiplier', unitDays: 7 },
    { pattern: '(\\d+)\\s*days?\\b', kind: 'multiplier', unitDays: 1 },
    { pattern: '(\\d+)\\s*months?\\b', kind: 'multiplier', unitDays: 30 },
    { pattern: '(\\d+)\\s*years?\\b', kind: 'multiplier', unitDays: 365 },
    // Hinglish number + unit
    { pattern: '(\\d+)\\s*hafte\\b', kind: 'multiplier', unitDays: 7 },
    { pattern: '(\\d+)\\s*din\\b', kind: 'multiplier', unitDays: 1 },
    { pattern: '(\\d+)\\s*mahine\\b', kind: 'multiplier', unitDays: 30 },
    // Vague quantity
    { pattern: '\\b(some days|a few days|a few weeks|few days|couple of days|several days|kuch din|कुछ दिन)\\b', kind: 'vague_quantity' },
  ],
  defaultPriority: 'Routine' as const,
  workingDays: [1, 2, 3, 4, 5, 6],
  monthDays: 30,
  outcomeTags: [
    'Resolved',
    'Went elsewhere',
    'Too far',
    'Cost or leave issue',
    'Number wrong or off',
    'Could not reach',
  ],
} as const;

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...DEFAULT_CONFIG,
      addReasonCategory: (cat) =>
        set((state) => ({ reasonCategories: [...state.reasonCategories, cat] })),
      addTimePhrasePattern: (p) =>
        set((state) => ({ timePhrasePatterns: [...state.timePhrasePatterns, p] })),
      setWorkingDays: (days) => set({ workingDays: days }),
      setDefaultPriority: (p) => set({ defaultPriority: p }),
      setMonthDays: (n) => set({ monthDays: n }),
      reset: () => {
        localStorage.removeItem('followup-config');
        set({ ...DEFAULT_CONFIG });
      },
    }),
    { name: 'followup-config' }
  ),
);
