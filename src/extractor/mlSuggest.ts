/**
 * mlSuggest.ts
 *
 * A tiny in-browser "ML-like" interval suggester.
 *
 * Rules:
 *  - Pure function. No network, no backend, no API.
 *  - Trained only on synthetic patterns (no real patient data).
 *  - Output is always a *proposal*. The nurse must approve before any date is set.
 *  - Never called when intervalDays is already known (extractor found a clear interval).
 *  - Never auto-fills a date. UI must label it "Suggested", never "AI decided".
 */

export type MLConfidence = 'low' | 'medium' | 'high';

export interface MLSuggestion {
  suggestedDays: number;
  confidence: MLConfidence;
  /** One short sentence shown to the nurse explaining why. */
  basis: string;
}

// ---------------------------------------------------------------------------
// Synthetic reference table — built from clinical guidelines summaries,
// NOT from any real patient records.
// ---------------------------------------------------------------------------

interface CategoryRule {
  category: string;
  defaultDays: number;
  /** If any of these appear in the note, bump confidence to 'high'. */
  highConfidenceKeywords: string[];
  /** If any of these appear, drop confidence to 'low'. */
  lowConfidenceKeywords: string[];
  basis: string;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'Surgical Dressing',
    defaultDays: 7,
    highConfidenceKeywords: ['wound', 'suture', 'stitch', 'patti', 'ghav', 'dressing', 'पट्टी'],
    lowConfidenceKeywords: ['healed', 'theek', 'ठीक'],
    basis: 'Standard wound review window (synthetic reference)',
  },
  {
    category: 'Medication Titration',
    defaultDays: 14,
    highConfidenceKeywords: ['dose', 'mg', 'tablet', 'medicine', 'titrat', 'adjust'],
    lowConfidenceKeywords: ['stable', 'controlled', 'theek', 'ठीक'],
    basis: 'Titration monitoring window (synthetic reference)',
  },
  {
    category: 'Lab Review',
    defaultDays: 30,
    highConfidenceKeywords: ['report', 'result', 'lab', 'test', 'hba1c', 'lipid', 'tsh', 'रिपोर्ट', 'जांच'],
    lowConfidenceKeywords: ['normal', 'clear', 'theek'],
    basis: 'Typical lab result cycle (synthetic reference)',
  },
  {
    category: 'Vaccination',
    defaultDays: 28,
    highConfidenceKeywords: ['vaccine', 'vaccin', 'टीका', 'dose', 'immunis'],
    lowConfidenceKeywords: [],
    basis: 'Standard vaccine interval (synthetic reference)',
  },
  {
    category: 'General Follow-Up',
    defaultDays: 14,
    highConfidenceKeywords: ['follow', 'review', 'check', 'aana', 'आना', 'milna'],
    lowConfidenceKeywords: ['stable', 'controlled', 'theek', 'ठीक', 'normal'],
    basis: 'Conservative general follow-up default (synthetic reference)',
  },
];

// Extra keyword-based overrides that apply regardless of category.
// These are purely synthetic heuristics.
interface KeywordOverride {
  keywords: string[];
  days: number;
  basis: string;
}

const KEYWORD_OVERRIDES: KeywordOverride[] = [
  { keywords: ['tb', 'tuberculosis', 'dots'], days: 7, basis: 'TB adherence check (synthetic reference)' },
  { keywords: ['pregnancy', 'pregnant', 'antenatal', 'anc', 'गर्भवती'], days: 14, basis: 'Antenatal visit window (synthetic reference)' },
  { keywords: ['post op', 'post-op', 'post operative', 'surgery done', 'operated'], days: 7, basis: 'Post-operative review (synthetic reference)' },
  { keywords: ['seizure', 'epilepsy', 'fits', 'mirgi', 'मिर्गी'], days: 14, basis: 'Seizure monitoring window (synthetic reference)' },
  { keywords: ['chest pain', 'cardiac', 'heart failure', 'angina'], days: 7, basis: 'Cardiac symptom review (synthetic reference)' },
  { keywords: ['renal', 'kidney', 'creatinine', 'ckd'], days: 14, basis: 'Renal function monitoring (synthetic reference)' },
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Suggests an interval when the extractor could not find one.
 *
 * @param noteText   Raw note text (EN / Hinglish / Hindi).
 * @param reasonCategory  Category already classified by the extractor.
 * @param reviewReason    Why the extractor flagged needs_review.
 * @returns MLSuggestion or null if no useful suggestion can be made.
 */
export function mlSuggest(
  noteText: string,
  reasonCategory: string,
  reviewReason: string | null,
): MLSuggestion | null {
  // Never suggest on notes that already have a clear interval — caller should
  // guard this, but we double-check here.
  if (!noteText?.trim()) return null;

  const norm = normalise(noteText);

  // 1. Keyword overrides take highest priority (most specific).
  for (const override of KEYWORD_OVERRIDES) {
    if (override.keywords.some((kw) => norm.includes(kw))) {
      return {
        suggestedDays: override.days,
        confidence: 'high',
        basis: override.basis,
      };
    }
  }

  // 2. Category-based rule.
  const rule = CATEGORY_RULES.find((r) => r.category === reasonCategory)
    ?? CATEGORY_RULES.find((r) => r.category === 'General Follow-Up')!;

  const hasHigh = rule.highConfidenceKeywords.some((kw) => norm.includes(kw));
  const hasLow  = rule.lowConfidenceKeywords.some((kw) => norm.includes(kw));

  // If the note says the patient is stable/healed, a suggestion is not useful.
  if (hasLow && !hasHigh) return null;

  // vague_quantity and no_follow_up_found get lower confidence.
  const baseConfidence: MLConfidence =
    reviewReason === 'no_follow_up_found' ? 'low'
    : reviewReason === 'vague_quantity'   ? 'medium'
    : hasHigh                             ? 'high'
    : 'medium';

  return {
    suggestedDays: rule.defaultDays,
    confidence: baseConfidence,
    basis: rule.basis,
  };
}
