import { describe, it, expect } from 'vitest';
import { reconcile, buildQueue } from '@/engine/reconcile';
import { makeDate } from '@/store/clock';

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

describe('P6 reconcile', () => {
  it('AT-04: High priority ranks before Routine regardless of days overdue', () => {
    const a = visit({
      id: 'A', patient_id: 'PA', token: 'OPD-0100', doctor_priority: 'Routine',
      approved_date: makeDate(2026, 9, 31), // 12 days before 12 Nov (Oct has 31 days -> Oct 31)
      interval_days: 7,
    });
    const b = visit({
      id: 'B', patient_id: 'PB', token: 'OPD-0101', doctor_priority: 'High',
      approved_date: makeDate(2026, 10, 10), // 2 days before 12 Nov
      interval_days: 7,
    });
    const defaulters = reconcile([a, b], [], NOW);
    const queue = buildQueue(defaulters);
    expect(queue[0].visit.id).toBe('B');
    expect(queue[1].visit.id).toBe('A');
    expect(queue[0].whyThisRank).toContain('High priority');
    expect(queue[1].whyThisRank).toContain('Routine');
  });

  it('stability: equal priority and days -> token ascending tie-break', () => {
    const t1 = visit({ id: 'T1', patient_id: 'P1', token: 'OPD-0200', doctor_priority: 'High', approved_date: makeDate(2026, 10, 10), interval_days: 7 });
    const t2 = visit({ id: 'T2', patient_id: 'P2', token: 'OPD-0100', doctor_priority: 'High', approved_date: makeDate(2026, 10, 10), interval_days: 7 });
    const queue = buildQueue(reconcile([t1, t2], [], NOW));
    expect(queue[0].visit.token).toBe('OPD-0100');
    expect(queue[1].visit.token).toBe('OPD-0200');
  });

  it('check-in on or before window end clears overdue status', () => {
    const v = visit({ id: 'C', patient_id: 'PC', approved_date: makeDate(2026, 10, 5), interval_days: 7 });
    const checkin = { id: 'CHK', patient_id: 'PC', visit_id: 'C', checkin_date: makeDate(2026, 10, 10), mode: 'OPD' as const, simulated: true, created_at: NOW };
    const defaulters = reconcile([v], [checkin], NOW);
    expect(defaulters).toHaveLength(0);
  });

  it('check-in after window end does not clear overdue', () => {
    const v = visit({ id: 'C2', patient_id: 'PC2', approved_date: makeDate(2026, 10, 5), interval_days: 7 });
    const checkin = { id: 'CHK2', patient_id: 'PC2', visit_id: 'C2', checkin_date: makeDate(2026, 10, 20), mode: 'OPD' as const, simulated: true, created_at: NOW };
    const defaulters = reconcile([v], [checkin], NOW);
    expect(defaulters).toHaveLength(1);
  });
});
