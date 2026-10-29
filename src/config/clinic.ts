export const CLINIC_CONFIG = {
  reasonCategories: ['Lab Review', 'Medication Titration', 'Surgical Dressing', 'General Follow-Up'],
  defaultPriority: 'Routine' as const,
  workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
  monthDays: 30,
  timePhrasePatterns: [] as string[],
  outcomeTags: [
    'Resolved',
    'Went elsewhere',
    'Too far',
    'Cost or leave issue',
    'Number wrong or off',
    'Could not reach',
  ],
  conditionalKeywords: [
    'if ',
    'unless',
    'jab dard',
    'persist',
    'recur',
    'badhe',
    'agar',
    'only if',
    'provided',
  ],
  vagueTimingPhrases: [
    'soon',
    'as needed',
    'some days',
    'after the festival',
    'when convenient',
    'return when',
  ],
} as const;

export type ReasonCategory = (typeof CLINIC_CONFIG.reasonCategories)[number];
export type OutcomeTag = (typeof CLINIC_CONFIG.outcomeTags)[number];

export type TimePhrasePattern = {
  regex: RegExp;
  kind: 'fixed' | 'multiplier' | 'vague_quantity';
  days?: number;
  unitDays?: number;
};

export const TIME_PHRASE_PATTERNS: TimePhrasePattern[] = [
  // Fixed phrases
  { regex: /\bnext month\b/gi, kind: 'fixed', days: 30 },
  { regex: /\bnext week\b/gi, kind: 'fixed', days: 7 },
  { regex: /\bday after tomorrow\b/gi, kind: 'fixed', days: 2 },
  { regex: /\b(?:a\s+)?fortnight\b/gi, kind: 'fixed', days: 14 },
  { regex: /\bek mahine\b/gi, kind: 'fixed', days: 30 },
  { regex: /(\d+)\s*महीने(?=\s|$)/gi, kind: 'multiplier', unitDays: 30 },
  { regex: /(\d+)\s*हफ्ते(?=\s|$)/gi, kind: 'multiplier', unitDays: 7 },
  { regex: /\bone week\b/gi, kind: 'fixed', days: 7 },
  { regex: /\btwo weeks\b/gi, kind: 'fixed', days: 14 },
  // Number + unit (English)
  { regex: /(\d+)\s*weeks?\b/gi, kind: 'multiplier', unitDays: 7 },
  { regex: /(\d+)\s*days?\b/gi, kind: 'multiplier', unitDays: 1 },
  { regex: /(\d+)\s*months?\b/gi, kind: 'multiplier', unitDays: 30 },
  { regex: /(\d+)\s*years?\b/gi, kind: 'multiplier', unitDays: 365 },
  // Number + unit (Hinglish)
  { regex: /(\d+)\s*hafte\b/gi, kind: 'multiplier', unitDays: 7 },
  { regex: /(\d+)\s*din\b/gi, kind: 'multiplier', unitDays: 1 },
  // Vague quantity
  { regex: /\b(some days|a few days|couple of days|several days)\b/gi, kind: 'vague_quantity' },
];
