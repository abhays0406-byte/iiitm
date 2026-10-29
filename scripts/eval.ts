import { extract } from '../src/extractor/extract';
import { makeDate } from '../src/store/clock';
import { parseCSV } from '../src/lib/csv';
import { readFileSync } from 'fs';

const csvText = readFileSync('synthetic_opd_seed_notes.csv', 'utf-8');
const rows = parseCSV(csvText);
const visitDate = makeDate(2026, 10, 10);

let intervalMatches = 0;
let reasonMatches = 0;
let sourceExact = 0;
let wronglyDatedAmbiguous = 0;
const mismatches: Array<string> = [];

const EXPECTED: Record<string, { intervalDays: number | null; needsReview: boolean; reviewReason: string | null; reasonCategory: string }> = {
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

  if (expected.needsReview && result.targetDate !== null) {
    wronglyDatedAmbiguous++;
  }

  const intervalOk = result.intervalDays === expected.intervalDays;
  const reasonOk = result.reasonCategory === expected.reasonCategory;
  const reviewOk = result.needsReview === expected.needsReview && result.reviewReason === expected.reviewReason;
  if (!intervalOk || !reasonOk || !reviewOk) {
    mismatches.push(
      `${vid} | expected interval=${expected.intervalDays} reason=${expected.reasonCategory} review=${expected.reviewReason} | got interval=${result.intervalDays} reason=${result.reasonCategory} review=${result.reviewReason} phrase=${JSON.stringify(result.sourcePhrase)} | note="${note}"`
    );
  }
}

const total = rows.length;
console.log('\n=== EXTRACTOR EVAL ===');
console.log(`Total notes: ${total}`);
console.log(`Interval match rate: ${intervalMatches}/${total}`);
console.log(`Reason match rate: ${reasonMatches}/${total}`);
console.log(`Source-phrase-exact rate: ${sourceExact}/${total}`);
console.log(`Wrongly dated ambiguous notes: ${wronglyDatedAmbiguous} (must be 0)`);
if (mismatches.length > 0) {
  console.log('\nMISMATCHES:');
  mismatches.forEach((m) => console.log(m));
} else {
  console.log('\nNo mismatches.');
}
console.log('=== END EVAL ===\n');
