import { describe, it, expect, beforeEach } from 'vitest';
import { useDomainStore } from '@/domain/store';
import { extract } from '@/extractor/extract';
import { makeDate } from '@/store/clock';

const store = useDomainStore;

beforeEach(() => {
  store.getState().resetDemo();
});

describe('P5 nurse rules', () => {
  it('AT-01 flows Staged -> Approved only after nurse approval', () => {
    const s = store.getState();
    const visit = s.visits.find((v) => v.status === 'Staged' && !v.needs_review)!;
    expect(visit.status).toBe('Staged');

    s.approveVisit(visit.id, 'High');
    const after = store.getState();
    const v2 = after.visits.find((x) => x.id === visit.id)!;
    expect(v2.status).toBe('Approved');
    expect(v2.doctor_priority).toBe('High');
    expect(v2.approved_date).not.toBeNull();

    const audit = after.audit;
    expect(audit.some((a) => a.action === 'approve' && a.entity_id === visit.id)).toBe(true);
  });

  it('approving a Needs Review item without a date is impossible', () => {
    const s = store.getState();
    const needs = s.visits.find((v) => v.needs_review && !v.target_date)!;
    expect(needs.status).toBe('Needs Review');

    // Approve without setting a date: target_date stays null -> blocked
    try {
      s.approveVisit(needs.id, 'Routine');
    } catch {
      // ignore
    }
    const still = store.getState();
    const v2 = still.visits.find((x) => x.id === needs.id)!;
    expect(v2.status).toBe('Needs Review');

    // After nurse sets a date, approval works
    s.editVisitDate(needs.id, makeDate(2026, 10, 26));
    s.approveVisit(needs.id, 'Routine');
    const done = store.getState();
    const v3 = done.visits.find((x) => x.id === needs.id)!;
    expect(v3.status).toBe('Approved');
    expect(v3.target_date).not.toBeNull();
  });

  it('extractor never assigns a target date to a needs-review note', () => {
    const cases = ['Soon', 'If symptoms recur, return', '2 weeks or 10 days', 'After the festival'];
    for (const note of cases) {
      const r = extract(note, makeDate(2026, 10, 10));
      if (r.needsReview) expect(r.targetDate).toBeNull();
    }
  });
});
