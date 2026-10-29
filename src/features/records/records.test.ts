import { describe, it, expect } from 'vitest';
import { buildSafeRows, neutralMessage, messageContainsForbidden } from '@/features/records/selector';
import { makeDate } from '@/store/clock';
import type { Visit, Patient, Checkin } from '@/domain/types';

const NOW = makeDate(2026, 10, 12);

function patient(overrides: Partial<Patient>): Patient {
  return {
    id: 'P',
    name: 'Test Patient',
    age: 40,
    sex: 'M',
    phone: '9000000001',
    token: 'OPD-0901',
    unreachable_flag: false,
    shared_contact: false,
    created_at: NOW,
    updated_at: NOW,
    simulated: true,
    ...overrides,
  };
}

function visit(overrides: Partial<Visit>): Visit {
  return {
    id: 'V',
    patient_id: 'P',
    token: 'OPD-0901',
    visit_date: NOW,
    note_text: 'some clinical note text',
    doctor_priority: 'High',
    status: 'Approved',
    approved_date: makeDate(2026, 9, 30),
    approved_by: 'Doctor',
    approved_at: NOW,
    interval_days: 7,
    target_date: makeDate(2026, 10, 7),
    reason_category: 'Lab Review',
    source_phrase: 'next week',
    needs_review: false,
    review_reason: null,
    rejection_reason: null,
    simulated: true,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe('P7 Records Desk privacy', () => {
  it('AT-03: neutral message contains no diagnosis/department/specialty/reason text', () => {
    const msg = neutralMessage('OPD-0901');
    expect(messageContainsForbidden(msg)).toBe(false);
  });

  it('safe rows exclude note_text and reason_category', () => {
    const p1 = patient({ id: 'P1', name: 'Shared A', phone: '9000000001', token: 'OPD-0901' });
    const p2 = patient({ id: 'P2', name: 'Shared B', phone: '9000000001', token: 'OPD-0902' }); // shared phone
    const v1 = visit({ id: 'V1', patient_id: 'P1', token: 'OPD-0901', doctor_priority: 'High', approved_date: makeDate(2026, 9, 30), interval_days: 7 });
    const v2 = visit({ id: 'V2', patient_id: 'P2', token: 'OPD-0902', doctor_priority: 'Routine', approved_date: makeDate(2026, 9, 28), interval_days: 7 });

    const rows = buildSafeRows([v1, v2], [p1, p2], [], NOW);
    for (const r of rows) {
      const keys = Object.keys(r);
      expect(keys).not.toContain('note_text');
      expect(keys).not.toContain('reason_category');
    }
    const sharedRow = rows.find((r) => r.token === 'OPD-0902');
    expect(sharedRow?.shared).toBe(true);
  });
});
