import { describe, it, expect } from 'vitest';
import { extract } from '@/extractor/extract';
import { makeDate } from '@/store/clock';
import { readFileSync } from 'fs';
import { join } from 'path';

const visitDate = makeDate(2026, 10, 10);

// HOLDOUT RESULTS (run before any pattern changes, pasted raw):
// 1  "Repeat creatinine after 3 weeks."                                  -> 21, Lab Review,        false, null
// 2  "Review in two weeks."                                              -> 14, General Follow-Up,  false, null
// 3  "Dose increased. Check after 10 days."                             -> 10, Medication Titration,false, null
// 4  "Next week for dressing."                                           ->  7, Surgical Dressing,  false, null
// 5  "2 hafte baad aana, sugar ki jaanch ke saath."                     -> 14, Lab Review,          false, null
// 6  "Ek hafte baad dobara dikhana."                                     ->  7, General Follow-Up,  false, null
// 7  "6 weeks baad X-ray ke saath review."                              -> 42, Lab Review,          false, null
// 8  "Come back if fever returns."                                       -> null, General Follow-Up, true, conditional_no_interval
// 9  "Review after a few weeks."                                        -> null, General Follow-Up, true, vague_quantity
// 10 "Follow up after Diwali."                                          -> null, General Follow-Up, true, no_fixed_interval
// 11 "Come after 1 week, if BP is high then call."                      ->  7 (candidate), General Follow-Up, true, conditional_follow_up
// 12 "तीन हफ्ते बाद आएं।"                                              -> 21, General Follow-Up,  false, null
// 13 "Review tomorrow."                                                  ->  1, General Follow-Up,  false, null
// 14 "Continue medicines."                                               -> null, General Follow-Up, true, no_follow_up_found
// 15 "After 3 days for suture removal and after 1 month for review."    -> null, Surgical Dressing, true, multiple_intervals
// 16 "Please come after 15 days with blood report."                     -> 15, Lab Review,          false, null

const CASES: Array<{
  note: string;
  intervalDays: number | null;
  reasonCategory: string;
  needsReview: boolean;
  reviewReason: string | null;
}> = [
  { note: 'Repeat creatinine after 3 weeks.', intervalDays: 21, reasonCategory: 'Lab Review', needsReview: false, reviewReason: null },
  { note: 'Review in two weeks.', intervalDays: 14, reasonCategory: 'General Follow-Up', needsReview: false, reviewReason: null },
  { note: 'Dose increased. Check after 10 days.', intervalDays: 10, reasonCategory: 'Medication Titration', needsReview: false, reviewReason: null },
  { note: 'Next week for dressing.', intervalDays: 7, reasonCategory: 'Surgical Dressing', needsReview: false, reviewReason: null },
  { note: '2 hafte baad aana, sugar ki jaanch ke saath.', intervalDays: 14, reasonCategory: 'Lab Review', needsReview: false, reviewReason: null },
  { note: 'Ek hafte baad dobara dikhana.', intervalDays: 7, reasonCategory: 'General Follow-Up', needsReview: false, reviewReason: null },
  { note: '6 weeks baad X-ray ke saath review.', intervalDays: 42, reasonCategory: 'Lab Review', needsReview: false, reviewReason: null },
  { note: 'Come back if fever returns.', intervalDays: null, reasonCategory: 'General Follow-Up', needsReview: true, reviewReason: 'conditional_no_interval' },
  { note: 'Review after a few weeks.', intervalDays: null, reasonCategory: 'General Follow-Up', needsReview: true, reviewReason: 'vague_quantity' },
  { note: 'Follow up after Diwali.', intervalDays: null, reasonCategory: 'General Follow-Up', needsReview: true, reviewReason: 'no_fixed_interval' },
  { note: 'Come after 1 week, if BP is high then call.', intervalDays: 7, reasonCategory: 'General Follow-Up', needsReview: true, reviewReason: 'conditional_follow_up' },
  { note: 'तीन हफ्ते बाद आएं।', intervalDays: 21, reasonCategory: 'General Follow-Up', needsReview: false, reviewReason: null },
  { note: 'Review tomorrow.', intervalDays: 1, reasonCategory: 'General Follow-Up', needsReview: false, reviewReason: null },
  { note: 'Continue medicines.', intervalDays: null, reasonCategory: 'General Follow-Up', needsReview: true, reviewReason: 'no_follow_up_found' },
  { note: 'After 3 days for suture removal and after 1 month for review.', intervalDays: null, reasonCategory: 'Surgical Dressing', needsReview: true, reviewReason: 'multiple_intervals' },
  { note: 'Please come after 15 days with blood report.', intervalDays: 15, reasonCategory: 'Lab Review', needsReview: false, reviewReason: null },
];

describe('Phase 3 holdout (16 cases)', () => {
  CASES.forEach(({ note, intervalDays, reasonCategory, needsReview, reviewReason }, i) => {
    it(`holdout ${i + 1}: "${note.slice(0, 50)}"`, () => {
      const r = extract(note, visitDate);

      // Hard invariant: needsReview true => targetDate null
      if (r.needsReview) expect(r.targetDate).toBeNull();

      // sourcePhrase must be exact substring when non-null
      if (r.sourcePhrase !== null) {
        expect(note.includes(r.sourcePhrase)).toBe(true);
      }

      expect(r.intervalDays).toBe(intervalDays);
      expect(r.reasonCategory).toBe(reasonCategory);
      expect(r.needsReview).toBe(needsReview);
      expect(r.reviewReason).toBe(reviewReason);
    });
  });

  it('CSV hash matches SEED_HASH.txt', () => {
    const crypto = require('crypto');
    const csvPath = join(process.cwd(), 'synthetic_opd_seed_notes.csv');
    const hashPath = join(process.cwd(), 'SEED_HASH.txt');
    const data = readFileSync(csvPath);
    const actual = crypto.createHash('sha256').update(data).digest('hex');
    const recorded = readFileSync(hashPath, 'utf-8').trim();
    expect(actual).toBe(recorded);
  });
});
