import { addDays } from '@/store/clock';
import { useConfigStore } from '@/config/store';
import { mlSuggest, type MLSuggestion } from '@/extractor/mlSuggest';

export type ReviewReason =
  | 'vague_timing'
  | 'conditional_follow_up'
  | 'conditional_no_interval'
  | 'multiple_intervals'
  | 'vague_quantity'
  | 'no_fixed_interval'
  | 'no_follow_up_found'
  | null;

export interface ExtractionResult {
  intervalDays: number | null;
  targetDate: Date | null;
  reasonCategory: string;
  sourcePhrase: string | null;
  needsReview: boolean;
  reviewReason: ReviewReason;
  /** ML proposal — only present when extractor found no clear interval. Never auto-approved. */
  mlSuggestion: MLSuggestion | null;
}

interface ResolvedConfig {
  reasonCategories: string[];
  timePhrasePatterns: Array<{
    pattern: string;
    kind: 'fixed' | 'multiplier' | 'vague_quantity';
    days?: number;
    unitDays?: number;
  }>;
  conditionalKeywords: string[];
  vagueTimingPhrases: string[];
  noFixedIntervalPhrases: string[];
  followUpKeywords: string[];
  monthDays: number;
}

function defaultConfig(): ResolvedConfig {
  const cfg = useConfigStore.getState();
  return {
    reasonCategories: cfg.reasonCategories,
    timePhrasePatterns: cfg.timePhrasePatterns,
    conditionalKeywords: [
      'if ', 'unless', 'jab dard', 'persist', 'recur', 'badhe', 'badhey',
      'agar', 'only if', 'provided', 'yadi', 'jab ', 'अगर', 'यदि', 'जब',
      'in case', 'when ', 'returns',
    ],
    vagueTimingPhrases: [
      'soon', 'as needed', 'when convenient', 'return when', 'later',
      'whenever', 'jaldi', 'zarurat ho to', 'जरूरत हो तो', 'sometime',
    ],
    noFixedIntervalPhrases: [
      'after the festival', 'after diwali', 'when the report comes',
      'after eid', 'after holi',
    ],
    followUpKeywords: [
      'follow', 'review', 'come back', 'return', 'visit', 'check',
      'aana', 'dikhana', 'आना', 'दिखाना', 'milna', 'milein',
    ],
    monthDays: cfg.monthDays,
  };
}

const BUILTIN_PATTERNS: Array<{
  pattern: string;
  kind: 'fixed' | 'multiplier' | 'vague_quantity';
  days?: number;
  unitDays?: number;
}> = [
  // Hinglish fixed
  { pattern: '\\bagle\\s+saal(?:\\s+baad)?\\b', kind: 'fixed', days: 365 },
  { pattern: '\\bagle\\s+hafte\\b', kind: 'fixed', days: 7 },
  { pattern: '\\bagla\\s+hafta\\b', kind: 'fixed', days: 7 },
  { pattern: '\\bdo\\s+din(?:\\s+baad)?\\b', kind: 'fixed', days: 2 },
  { pattern: '\\bteen\\s+din(?:\\s+baad)?\\b', kind: 'fixed', days: 3 },
  { pattern: '\\bchaar\\s+din(?:\\s+baad)?\\b', kind: 'fixed', days: 4 },
  { pattern: '\\bpaanch\\s+din(?:\\s+baad)?\\b', kind: 'fixed', days: 5 },
  { pattern: '\\bek\\s+mahine(?:\\s+baad)?\\b', kind: 'fixed', days: 30 },
  { pattern: '\\bteen\\s+hafte(?:\\s+baad)?\\b', kind: 'fixed', days: 21 },
  { pattern: '\\bdo\\s+hafte(?:\\s+baad)?\\b', kind: 'fixed', days: 14 },
  { pattern: '\\bek\\s+hafte(?:\\s+baad)?\\b', kind: 'fixed', days: 7 },
  { pattern: '\\bchaar\\s+hafte(?:\\s+baad)?\\b', kind: 'fixed', days: 28 },

  // Devanagari Hindi fixed
  { pattern: 'अगले\\s*साल(?:\\s*बाद)?', kind: 'fixed', days: 365 },
  { pattern: 'अगले\\s*ह[फ़फ]्ते', kind: 'fixed', days: 7 },
  { pattern: 'दो\\s*दिन(?:\\s*बाद)?', kind: 'fixed', days: 2 },
  { pattern: 'तीन\\s*दिन(?:\\s*बाद)?', kind: 'fixed', days: 3 },
  { pattern: 'पाँच\\s*दिन(?:\\s*बाद)?', kind: 'fixed', days: 5 },
  { pattern: 'पांच\\s*दिन(?:\\s*बाद)?', kind: 'fixed', days: 5 },
  { pattern: 'एक\\s*महीने(?:\\s*बाद)?', kind: 'fixed', days: 30 },
  { pattern: 'तीन\\s*ह[फ़फ]्ते(?:\\s*बाद)?', kind: 'fixed', days: 21 },
  { pattern: 'दो\\s*ह[फ़फ]्ते(?:\\s*बाद)?', kind: 'fixed', days: 14 },
  { pattern: 'एक\\s*ह[फ़फ]्ते(?:\\s*बाद)?', kind: 'fixed', days: 7 },
  { pattern: 'चार\\s*ह[फ़फ]्ते(?:\\s*बाद)?', kind: 'fixed', days: 28 },

  // Multipliers for Hinglish and Devanagari
  { pattern: '(\\d+)\\s*hafte(?:\\s+baad)?\\b', kind: 'multiplier', unitDays: 7 },
  { pattern: '(\\d+)\\s*din(?:\\s+baad)?\\b', kind: 'multiplier', unitDays: 1 },
  { pattern: '(\\d+)\\s*mahine(?:\\s+baad)?\\b', kind: 'multiplier', unitDays: 30 },
  { pattern: '(\\d+)\\s*saal(?:\\s+baad)?\\b', kind: 'multiplier', unitDays: 365 },
  { pattern: '(\\d+)\\s*ह[फ़फ]्ते(?:\\s*बाद)?', kind: 'multiplier', unitDays: 7 },
  { pattern: '(\\d+)\\s*दिन(?:\\s*बाद)?', kind: 'multiplier', unitDays: 1 },
  { pattern: '(\\d+)\\s*महीने(?:\\s*बाद)?', kind: 'multiplier', unitDays: 30 },
  { pattern: '(\\d+)\\s*साल(?:\\s*बाद)?', kind: 'multiplier', unitDays: 365 },
];

function compilePatterns(cfg: ResolvedConfig): Array<{ regex: RegExp; kind: string; days?: number; unitDays?: number }> {
  const existingPatterns = new Set(cfg.timePhrasePatterns.map((p) => p.pattern));
  const merged = [
    ...cfg.timePhrasePatterns,
    ...BUILTIN_PATTERNS.filter((p) => !existingPatterns.has(p.pattern)),
  ];
  return merged.map((p) => ({
    regex: new RegExp(p.pattern, 'gi'),
    kind: p.kind,
    days: p.days,
    unitDays: p.unitDays,
  }));
}

function findIntervals(note: string, cfg: ResolvedConfig): Array<{ days: number; phrase: string }> {
  const intervals: Array<{ days: number; phrase: string }> = [];
  for (const pat of compilePatterns(cfg)) {
    const regex = pat.regex;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(note)) !== null) {
      const phrase = match[0];
      if (pat.kind === 'fixed' && pat.days != null) {
        intervals.push({ days: pat.days, phrase });
      } else if (pat.kind === 'multiplier' && pat.unitDays != null && match[1] != null) {
        intervals.push({ days: Number(match[1]) * pat.unitDays, phrase });
      }
    }
  }
  return intervals;
}

function isConditional(note: string, cfg: ResolvedConfig): boolean {
  const lower = note.toLowerCase();
  return cfg.conditionalKeywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function isVagueTiming(note: string, cfg: ResolvedConfig): boolean {
  const lower = note.toLowerCase();
  return cfg.vagueTimingPhrases.some((p) => lower.includes(p.toLowerCase()));
}

function isNoFixedInterval(note: string, cfg: ResolvedConfig): boolean {
  const lower = note.toLowerCase();
  return cfg.noFixedIntervalPhrases.some((p) => lower.includes(p.toLowerCase()));
}

function hasFollowUpIntent(note: string, cfg: ResolvedConfig): boolean {
  const lower = note.toLowerCase();
  return cfg.followUpKeywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// Category detection rules: keyword patterns mapped to category names.
// Checked in order; first match wins.
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(vaccin\w*|immunis\w*|टीका|टीकाकरण)\b/i, category: 'Vaccination' },
  {
    // Medication Titration: change verb (inflected) + medicine/dose word, either order
    pattern: /\b(increas\w*|decreas\w*|adjust\w*|start\w*|stop\w*|stopp\w*|chang\w*|titrat\w*|badhai|kam kiya|shuru|band)\b.*\b(medicine|tablet|drug|dose|mg|ml)\b|\b(medicine|tablet|drug|dose|mg|ml)\b.*\b(increas\w*|decreas\w*|adjust\w*|start\w*|stop\w*|stopp\w*|chang\w*|titrat\w*|badhai|kam kiya|shuru|band)\b/i,
    category: 'Medication Titration',
  },
  {
    pattern: /\b(lipid|hba1c|tsh|cbc|creatinine|sugar report|x.?ray|blood test|report|jaanch|जांच|रिपोर्ट|lab|scan)\b/i,
    category: 'Lab Review',
  },
  { pattern: /\b(dressing|suture|wound|stitch|patti|ghav|पट्टी)\b/i, category: 'Surgical Dressing' },
];

function classifyReason(note: string, cfg: ResolvedConfig): string {
  const lower = note.toLowerCase();
  const isContinue = /\b(stable on current dose|continue same medicines|continue medicines|continue same)\b/i.test(lower);

  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (category === 'Medication Titration' && isContinue) continue;
    if (pattern.test(lower)) return category;
  }
  return cfg.reasonCategories.includes('General Follow-Up')
    ? 'General Follow-Up'
    : cfg.reasonCategories[cfg.reasonCategories.length - 1] ?? 'General Follow-Up';
}

export function extract(
  noteText: string,
  visitDate: Date,
  cfg: ResolvedConfig = defaultConfig(),
): ExtractionResult {
  const note = noteText ?? '';
  const reasonCategory = classifyReason(note, cfg);

  // 1. Check vague_quantity first (strict precedence per spec)
  for (const pat of cfg.timePhrasePatterns) {
    if (pat.kind === 'vague_quantity' && new RegExp(pat.pattern, 'gi').test(note)) {
      if (/\b(soon|sometime|jaldi)\b/i.test(note)) {
        return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'vague_timing', mlSuggestion: mlSuggest(note, reasonCategory, 'vague_timing') };
      }
      return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'vague_quantity', mlSuggestion: mlSuggest(note, reasonCategory, 'vague_quantity') };
    }
  }

  const intervals = findIntervals(note, cfg);
  const conditional = isConditional(note, cfg);

  // 2. multiple_intervals
  const uniqueDays = new Set(intervals.map((i) => i.days));
  if (uniqueDays.size > 1) {
    return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: intervals[0].phrase, needsReview: true, reviewReason: 'multiple_intervals', mlSuggestion: mlSuggest(note, reasonCategory, 'multiple_intervals') };
  }

  // 3. conditional_follow_up (has interval + conditional)
  if (intervals.length > 0 && conditional) {
    return { intervalDays: intervals[0].days, targetDate: null, reasonCategory, sourcePhrase: intervals[0].phrase, needsReview: true, reviewReason: 'conditional_follow_up', mlSuggestion: null };
  }

  // 4. Clear interval, no conditional
  if (intervals.length > 0) {
    const targetDate = addDays(visitDate, intervals[0].days);
    return { intervalDays: intervals[0].days, targetDate, reasonCategory, sourcePhrase: intervals[0].phrase, needsReview: false, reviewReason: null, mlSuggestion: null };
  }

  // No interval found — classify why
  // 5. no_fixed_interval
  if (isNoFixedInterval(note, cfg)) {
    return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'no_fixed_interval', mlSuggestion: mlSuggest(note, reasonCategory, 'no_fixed_interval') };
  }

  // 6. conditional_no_interval (conditional keyword but no interval)
  if (conditional) {
    return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'conditional_no_interval', mlSuggestion: mlSuggest(note, reasonCategory, 'conditional_no_interval') };
  }

  // 7. vague_timing (has follow-up intent but no clear time)
  if (isVagueTiming(note, cfg) || hasFollowUpIntent(note, cfg)) {
    return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'vague_timing', mlSuggestion: mlSuggest(note, reasonCategory, 'vague_timing') };
  }

  // 8. no_follow_up_found (no follow-up intent at all)
  return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'no_follow_up_found', mlSuggestion: mlSuggest(note, reasonCategory, 'no_follow_up_found') };
}
