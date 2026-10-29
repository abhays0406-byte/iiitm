import { reconcile, buildQueue } from '../src/engine/reconcile';
import { makeDate } from '../src/store/clock';

const NOW = makeDate(2026, 10, 12);

function visit(overrides: any) {
  return {
    id: 'V',
    patient_id: 'P',
    token: 'OPD-0001',
    visit_date: NOW,
    note_text: null,
    doctor_priority: 'Routine',
    status: 'Approved' as const,
    approved_date: NOW,
    approved_by: 'Doctor',
    approved_at: NOW,
    interval_days: 7,
    target_date: NOW,
    reason_category: null,
    source_phrase: null,
    needs_review: false,
    review_reason: null,
    rejection_reason: null,
    simulated: true,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

let seed = 0x9e3779b9;
function next(): number {
  seed = (seed + 0x9e3779b9) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 1);
  return (t ^ (t >>> 14)) >>> 0;
}
function rand(): number {
  return next() / 0xffffffff;
}

const N = 10000;
const visits: any[] = [];
for (let i = 0; i < N; i++) {
  const priority = rand() < 0.2 ? 'High' : 'Routine';
  const daysAgo = Math.floor(rand() * 40) + 1;
  const approvedDate = makeDate(2026, 9, 31 - (daysAgo % 30));
  visits.push({
    id: `V-${i}`,
    patient_id: `P-${i}`,
    token: `OPD-${5000 + i}`,
    visit_date: NOW,
    note_text: null,
    doctor_priority: priority,
    status: 'Approved' as const,
    approved_date: approvedDate,
    approved_by: 'Doctor',
    approved_at: NOW,
    interval_days: Math.floor(rand() * 20) + 1,
    target_date: null,
    reason_category: null,
    source_phrase: null,
    needs_review: false,
    review_reason: null,
    rejection_reason: null,
    simulated: true,
    created_at: NOW,
    updated_at: NOW,
  });
}

const t0 = performance.now();
const defaulters = reconcile(visits, [], NOW);
const queue = buildQueue(defaulters);
const t1 = performance.now();

console.log(`\n=== RECONCILE BENCHMARK ===`);
console.log(`Approved visits: ${visits.length}`);
console.log(`Defaulters found: ${defaulters.length}`);
console.log(`Measured time (ms): ${(t1 - t0).toFixed(3)}`);
console.log(`=== END BENCHMARK ===`);
