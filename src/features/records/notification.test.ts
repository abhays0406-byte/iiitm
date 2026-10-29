import { describe, it, expect, beforeEach } from 'vitest';
import { useDomainStore } from '@/domain/store';
import { neutralMessage, neutralDateMessage, messageContainsForbidden } from '@/features/records/selector';
import { makeDate } from '@/store/clock';

beforeEach(() => {
  useDomainStore.getState().resetDemo();
});

describe('Phase 7: Follow-up notification', () => {
  it('neutral date message contains no clinical data', () => {
    const msg = neutralDateMessage('OPD-0412', '26 Nov 2026');
    expect(messageContainsForbidden(msg)).toBe(false);
    expect(msg).toContain('Token #OPD-0412');
    expect(msg).toContain('26 Nov 2026');
    expect(msg).not.toContain('Lab');
    expect(msg).not.toContain('diagnosis');
    expect(msg).not.toContain('department');
  });

  it('AT-03: every patient-facing message has no diagnosis/department/specialty/reason', () => {
    const tokens = ['OPD-0001', 'OPD-0412', 'OPD-9999'];
    for (const t of tokens) {
      expect(messageContainsForbidden(neutralMessage(t))).toBe(false);
      expect(messageContainsForbidden(neutralDateMessage(t, '12 Nov 2026'))).toBe(false);
    }
  });

  it('recordOutreach creates an outreach entry with audit', () => {
    const store = useDomainStore.getState();
    const before = store.outreach.length;
    const auditBefore = store.audit.length;
    store.recordOutreach({
      patient_id: 'P-001',
      visit_id: 'V-001',
      channel: 'SMS',
      message: neutralMessage('OPD-0412'),
      status: 'Sent',
      sent_at: makeDate(2026, 10, 12),
    });
    const after = useDomainStore.getState();
    expect(after.outreach.length).toBe(before + 1);
    expect(after.audit.length).toBe(auditBefore + 1);
    expect(after.outreach[after.outreach.length - 1].message).toContain('OPD-0412');
  });

  it('undoApproval reverts visit and appends REVERSAL audit entry', () => {
    const store = useDomainStore.getState();
    const visit = store.visits.find((v) => v.status === 'Staged' && !v.needs_review)!;
    store.approveVisit(visit.id, 'Routine');
    const approved = useDomainStore.getState().visits.find((v) => v.id === visit.id)!;
    expect(approved.status).toBe('Approved');

    const auditBefore = useDomainStore.getState().audit.length;
    store.undoApproval(visit.id);
    const reverted = useDomainStore.getState().visits.find((v) => v.id === visit.id)!;
    expect(reverted.status).toBe('Staged');
    expect(reverted.approved_date).toBeNull();

    const audit = useDomainStore.getState().audit;
    expect(audit.length).toBe(auditBefore + 1);
    expect(audit[audit.length - 1].action).toBe('undo_approval');
  });

  it('approveVisit does not auto-create outreach (requireSeparateSend default)', () => {
    const store = useDomainStore.getState();
    const visit = store.visits.find((v) => v.status === 'Staged' && !v.needs_review)!;
    const outreachBefore = store.outreach.length;
    store.approveVisit(visit.id, 'Routine');
    expect(useDomainStore.getState().outreach.length).toBe(outreachBefore);
  });
});
