import { describe, it, expect } from 'vitest';
import { extract } from '@/extractor/extract';
import { makeDate } from '@/store/clock';
import { parseCSV } from '@/lib/csv';
import csvText from '../../synthetic_opd_seed_notes.csv?raw';

const visitDate = makeDate(2026, 10, 10);

describe('AT-01: clear interval extraction', () => {
  it('extracts interval, target date, reason, and exact source phrase', () => {
    const result = extract('Come back after 2 weeks for dressing change', visitDate);
    expect(result.intervalDays).toBe(14);
    expect(result.targetDate).toEqual(makeDate(2026, 10, 24));
    expect(result.reasonCategory).toBe('Surgical Dressing');
    expect(result.sourcePhrase).toBe('2 weeks');
    expect(result.needsReview).toBe(false);
    expect(result.reviewReason).toBeNull();
  });

  it('sourcePhrase is an exact substring of the note', () => {
    const note = 'Review blood test reports next month';
    const result = extract(note, visitDate);
    expect(result.sourcePhrase).toBe('next month');
    expect(note.includes(result.sourcePhrase!)).toBe(true);
  });
});

describe('AT-02: vague / conditional notes get no date', () => {
  it('vague timing -> needsReview true, targetDate null', () => {
    const result = extract('Soon', visitDate);
    expect(result.intervalDays).toBeNull();
    expect(result.targetDate).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.reviewReason).toBe('vague_timing');
    expect(result.sourcePhrase).toBeNull();
  });

  it('conditional with no interval -> conditional_no_interval', () => {
    const result = extract('If symptoms recur, return', visitDate);
    expect(result.intervalDays).toBeNull();
    expect(result.targetDate).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.reviewReason).toBe('conditional_no_interval');
  });

  it('conditional WITH interval -> conditional_follow_up, keeps intervalDays, targetDate null', () => {
    const result = extract('Come back after 2 weeks if no improvement', visitDate);
    expect(result.intervalDays).toBe(14);
    expect(result.targetDate).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.reviewReason).toBe('conditional_follow_up');
    expect(result.sourcePhrase).toBe('2 weeks');
  });

  it('multiple intervals -> multiple_intervals, targetDate null', () => {
    const result = extract('2 weeks or 10 days', visitDate);
    expect(result.intervalDays).toBeNull();
    expect(result.targetDate).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.reviewReason).toBe('multiple_intervals');
  });

  it('vague quantity -> vague_quantity', () => {
    const result = extract('Some days later', visitDate);
    expect(result.intervalDays).toBeNull();
    expect(result.targetDate).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.reviewReason).toBe('vague_quantity');
  });
});

const rows = parseCSV(csvText);

type Expected = {
  intervalDays: number | null;
  needsReview: boolean;
  reviewReason: string | null;
  reasonCategory: string;
};

const EXPECTED: Record<string, Expected> = {
  'V-001': { intervalDays: 14, needsReview: false, reviewReason: null, reasonCategory: 'Surgical Dressing' },
  'V-002': { intervalDays: 30, needsReview: false, reviewReason: null, reasonCategory: 'Lab Review' },
  'V-003': { intervalDays: null, needsReview: true, reviewReason: 'conditional_no_interval', reasonCategory: 'Medication Titration' },
  'V-004': { intervalDays: 10, needsReview: false, reviewReason: null, reasonCategory: 'Surgical Dressing' },
  'V-005': { intervalDays: null, needsReview: true, reviewReason: 'vague_timing', reasonCategory: 'General Follow-Up' },
  'V-006': { intervalDays: 14, needsReview: false, reviewReason: null, reasonCategory: 'General Follow-Up' },
  'V-007': { intervalDays: null, needsReview: true, reviewReason: 'vague_timing', reasonCategory: 'General Follow-Up' },
  'V-008': { intervalDays: 14, needsReview: true, reviewReason: 'conditional_follow_up', reasonCategory: 'General Follow-Up' },
  'V-009': { intervalDays: 7, needsReview: false, reviewReason: null, reasonCategory: 'Surgical Dressing' },
  'V-010': { intervalDays: 30, needsReview: false, reviewReason: null, reasonCategory: 'Lab Review' },
  'V-011': { intervalDays: 14, needsReview: false, reviewReason: null, reasonCategory: 'Surgical Dressing' },
  'V-012': { intervalDays: 15, needsReview: false, reviewReason: null, reasonCategory: 'General Follow-Up' },
  'V-013': { intervalDays: 30, needsReview: false, reviewReason: null, reasonCategory: 'General Follow-Up' },
  'V-014': { intervalDays: 2, needsReview: false, reviewReason: null, reasonCategory: 'General Follow-Up' },
  'V-015': { intervalDays: null, needsReview: true, reviewReason: 'vague_timing', reasonCategory: 'General Follow-Up' },
  'V-016': { intervalDays: null, needsReview: true, reviewReason: 'conditional_no_interval', reasonCategory: 'General Follow-Up' },
  'V-017': { intervalDays: null, needsReview: true, reviewReason: 'multiple_intervals', reasonCategory: 'General Follow-Up' },
  'V-018': { intervalDays: null, needsReview: true, reviewReason: 'vague_timing', reasonCategory: 'General Follow-Up' },
  'V-019': { intervalDays: 14, needsReview: false, reviewReason: null, reasonCategory: 'Surgical Dressing' },
  'V-020': { intervalDays: 7, needsReview: false, reviewReason: null, reasonCategory: 'Lab Review' },
  'V-021': { intervalDays: 14, needsReview: false, reviewReason: null, reasonCategory: 'Medication Titration' },
  'V-022': { intervalDays: null, needsReview: true, reviewReason: 'vague_timing', reasonCategory: 'General Follow-Up' },
  'V-023': { intervalDays: null, needsReview: true, reviewReason: 'conditional_no_interval', reasonCategory: 'General Follow-Up' },
  'V-024': { intervalDays: 7, needsReview: false, reviewReason: null, reasonCategory: 'Surgical Dressing' },
  'V-025': { intervalDays: null, needsReview: true, reviewReason: 'vague_quantity', reasonCategory: 'General Follow-Up' },
  'V-026': { intervalDays: 30, needsReview: false, reviewReason: null, reasonCategory: 'Medication Titration' },
  'V-027': { intervalDays: 14, needsReview: false, reviewReason: null, reasonCategory: 'General Follow-Up' },
  'V-028': { intervalDays: 30, needsReview: false, reviewReason: null, reasonCategory: 'Surgical Dressing' },
  'V-029': { intervalDays: 14, needsReview: false, reviewReason: null, reasonCategory: 'General Follow-Up' },
  'V-030': { intervalDays: null, needsReview: true, reviewReason: 'conditional_no_interval', reasonCategory: 'General Follow-Up' },
};

describe('CSV eval', () => {
  it('extracts every seed note with no wrongly-dated ambiguous notes', () => {
    let intervalMatches = 0;
    let reasonMatches = 0;
    let sourceExact = 0;
    let wronglyDatedAmbiguous = 0;
    const mismatches: Array<string> = [];

    for (const row of rows) {
      const note = row.note_text;
      const vid = row.visit_id;
      const parts = row.visit_date.split('-').map(Number);
      const vDate = makeDate(parts[0], parts[1], parts[2]);
      const expected = EXPECTED[vid];
      if (!expected) continue;

      const result = extract(note, vDate);

      if (result.intervalDays === expected.intervalDays) intervalMatches++;
      if (result.reasonCategory === expected.reasonCategory) reasonMatches++;
      if (result.sourcePhrase !== null && note.includes(result.sourcePhrase)) sourceExact++;

      // Ambiguous notes must NOT receive a target date
      if (expected.needsReview && result.targetDate !== null) {
        wronglyDatedAmbiguous++;
      }

      const intervalOk = result.intervalDays === expected.intervalDays;
      const reasonOk = result.reasonCategory === expected.reasonCategory;
      const reviewOk = result.needsReview === expected.needsReview && result.reviewReason === expected.reviewReason;
      if (!intervalOk || !reasonOk || !reviewOk) {
        mismatches.push(
          `${vid} | expected interval=${expected.intervalDays} reason=${expected.reasonCategory} review=${expected.reviewReason} | got interval=${result.intervalDays} reason=${result.reasonCategory} review=${result.reviewReason} phrase=${JSON.stringify(result.sourcePhrase)}`
        );
      }
    }

    const total = rows.length;
    console.log('\n=== EXTRACTOR EVAL ===');
    console.log(`Interval match rate: ${intervalMatches}/${total}`);
    console.log(`Reason match rate: ${reasonMatches}/${total}`);
    console.log(`Source-phrase-exact rate: ${sourceExact}/${total}`);
    console.log(`Wrongly dated ambiguous notes: ${wronglyDatedAmbiguous} (must be 0)`);
    if (mismatches.length > 0) {
      console.log('\nMISMATCHES:');
      mismatches.forEach((m) => console.log(m));
    }
    console.log('=== END EVAL ===\n');

    expect(wronglyDatedAmbiguous).toBe(0);
  });
});
