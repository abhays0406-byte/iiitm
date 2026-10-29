import { addDays } from '@/store/clock';
import { useConfigStore } from '@/config/store';

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
      'if ', 'unless', 'jab dard', 'persist', 'recur', 'badhe',
      'agar', 'only if', 'provided', 'yadi', 'jab ', 'अगर', 'यदि', 'जब',
      'in case', 'when ', 'returns',
    ],
    vagueTimingPhrases: [
      'soon', 'as needed', 'when convenient', 'return when', 'later',
      'whenever', 'jaldi', 'zarurat ho to', 'जरूरत हो तो',
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

function compilePatterns(cfg: ResolvedConfig): Array<{ regex: RegExp; kind: string; days?: number; unitDays?: number }> {
  return cfg.timePhrasePatterns.map((p) => ({
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
      return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'vague_quantity' };
    }
  }

  const intervals = findIntervals(note, cfg);
  const conditional = isConditional(note, cfg);

  // 2. multiple_intervals
  const uniqueDays = new Set(intervals.map((i) => i.days));
  if (uniqueDays.size > 1) {
    return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: intervals[0].phrase, needsReview: true, reviewReason: 'multiple_intervals' };
  }

  // 3. conditional_follow_up (has interval + conditional)
  if (intervals.length > 0 && conditional) {
    return { intervalDays: intervals[0].days, targetDate: null, reasonCategory, sourcePhrase: intervals[0].phrase, needsReview: true, reviewReason: 'conditional_follow_up' };
  }

  // 4. Clear interval, no conditional
  if (intervals.length > 0) {
    const targetDate = addDays(visitDate, intervals[0].days);
    return { intervalDays: intervals[0].days, targetDate, reasonCategory, sourcePhrase: intervals[0].phrase, needsReview: false, reviewReason: null };
  }

  // No interval found — classify why
  // 5. no_fixed_interval
  if (isNoFixedInterval(note, cfg)) {
    return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'no_fixed_interval' };
  }

  // 6. conditional_no_interval (conditional keyword but no interval)
  if (conditional) {
    return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'conditional_no_interval' };
  }

  // 7. vague_timing (has follow-up intent but no clear time)
  if (isVagueTiming(note, cfg) || hasFollowUpIntent(note, cfg)) {
    return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'vague_timing' };
  }

  // 8. no_follow_up_found (no follow-up intent at all)
  return { intervalDays: null, targetDate: null, reasonCategory, sourcePhrase: null, needsReview: true, reviewReason: 'no_follow_up_found' };
}
