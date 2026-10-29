import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { VirtualList } from '@/ui/VirtualList';
import { DatePicker } from '@/ui/DatePicker';
import { Kbd } from '@/ui/Kbd';
import { Chip } from '@/ui/Chip';
import { Banner } from '@/ui/Banner';
import { EmptyState } from '@/ui/EmptyState';
import { Toast } from '@/ui/Toast';
import { neutralDateMessage, neutralMessage, messageContainsForbidden } from '@/features/records/selector';

type Tab = 'needs-review' | 'staged' | 'done';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function relTime(d: Date | null, now: Date): string {
  if (!d) return '—';
  const days = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 0) return `${days}d ago`;
  return `${Math.abs(days)}d ahead`;
}

const REJECT_REASONS = [
  'Patient could not be contacted',
  'Patient moved away',
  'No longer needs follow-up',
  'Other',
];

interface Props {
  /** 'Nurse' sees Routine items; 'Doctor' sees High items */
  role: 'Nurse' | 'Doctor';
}

export function ApprovalScreen({ role }: Props) {
  const visits = useDomainStore((s) => s.visits);
  const patients = useDomainStore((s) => s.patients);
  const approveVisit = useDomainStore((s) => s.approveVisit);
  const undoApproval = useDomainStore((s) => s.undoApproval);
  const editVisitDate = useDomainStore((s) => s.editVisitDate);
  const rejectVisit = useDomainStore((s) => s.rejectVisit);
  const recordOutreach = useDomainStore((s) => s.recordOutreach);
  const actor = useDomainStore((s) => s.actor);
  const now = useClockStore((s) => s.now);

  const [tab, setTab] = useState<Tab>('staged');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [undoToast, setUndoToast] = useState<{ visitId: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [manualDate, setManualDate] = useState('');

  // Role enforcement: nurse sees only Routine, doctor sees only High
  const allowedPriority = role === 'Nurse' ? 'Routine' : 'High';

  const queue = useMemo(() => {
    const base = visits.filter((v) => {
      const p = v.doctor_priority ?? 'Routine';
      return p === allowedPriority;
    });
    if (tab === 'needs-review') return base.filter((v) => v.status === 'Needs Review');
    if (tab === 'staged') return base.filter((v) => v.status === 'Staged');
    return base.filter((v) => v.status === 'Approved' || v.status === 'Rejected');
  }, [visits, tab, allowedPriority]);

  const tabCounts = useMemo(() => {
    const base = visits.filter((v) => (v.doctor_priority ?? 'Routine') === allowedPriority);
    return {
      needs: base.filter((v) => v.status === 'Needs Review').length,
      staged: base.filter((v) => v.status === 'Staged').length,
      done: base.filter((v) => v.status === 'Approved' || v.status === 'Rejected').length,
    };
  }, [visits, allowedPriority]);

  const selected = visits.find((v) => v.id === selectedId) ?? null;
  const selectedPatient = selected ? patients.find((p) => p.id === selected.patient_id) : null;
  const reviewedToday = visits.filter((v) => (v.status === 'Approved' || v.status === 'Rejected') && v.updated_at?.toDateString() === now.toDateString()).length;
  const totalQueue = visits.filter((v) => (v.doctor_priority ?? 'Routine') === allowedPriority && v.status !== 'Rejected').length;

  const needsReview = selected?.needs_review ?? false;
  const noDate = needsReview && !selected?.target_date && !manualDate;

  // Keyboard nav
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'SELECT') return;
    if (e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      const idx = queue.findIndex((v) => v.id === selectedId);
      const next = queue[idx + 1] ?? queue[0];
      if (next) setSelectedId(next.id);
    }
    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      const idx = queue.findIndex((v) => v.id === selectedId);
      const prev = queue[idx - 1] ?? queue[queue.length - 1];
      if (prev) setSelectedId(prev.id);
    }
    if (e.key === 'a' || e.key === 'A') { e.preventDefault(); if (!noDate && selected) doApprove(); }
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); if (selected) setDateOpen(true); }
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); if (selected) setRejectOpen(true); }
  }, [queue, selectedId, noDate, selected]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset manual date when selection changes
  useEffect(() => { setManualDate(''); }, [selectedId]);

  const doApprove = useCallback(() => {
    if (!selected) return;
    if (noDate) return;

    // If manual date was set for needs-review, apply it first
    if (manualDate) {
      const d = new Date(manualDate);
      if (!isNaN(d.getTime())) editVisitDate(selected.id, d);
    }

    approveVisit(selected.id, allowedPriority as 'Routine' | 'High');

    // Create outreach notification (simulated)
    const targetDate = manualDate ? new Date(manualDate) : selected.target_date;
    const token = selected.token;
    const msg = targetDate
      ? neutralDateMessage(token, fmtDate(targetDate))
      : neutralMessage(token);
    if (!messageContainsForbidden(msg)) {
      recordOutreach({
        patient_id: selected.patient_id,
        visit_id: selected.id,
        channel: 'SMS',
        message: msg,
        status: 'Sent',
        sent_at: now,
      });
    }

    // Move to next card
    const idx = queue.findIndex((v) => v.id === selected.id);
    const next = queue[idx + 1] ?? queue[idx - 1] ?? null;
    setSelectedId(next?.id ?? null);

    // 6-second undo toast
    if (undoToast) clearTimeout(undoToast.timer);
    const timer = setTimeout(() => setUndoToast(null), 6000);
    setUndoToast({ visitId: selected.id, timer });
  }, [selected, noDate, manualDate, approveVisit, editVisitDate, recordOutreach, allowedPriority, queue, now, undoToast]);

  const doUndo = useCallback(() => {
    if (!undoToast) return;
    undoApproval(undoToast.visitId);
    clearTimeout(undoToast.timer);
    setUndoToast(null);
    setSelectedId(undoToast.visitId);
  }, [undoToast, undoApproval]);

  const doReject = useCallback(() => {
    if (!selected || !rejectReason) return;
    rejectVisit(selected.id, rejectReason);
    setRejectOpen(false);
    setRejectReason('');
    const idx = queue.findIndex((v) => v.id === selected.id);
    const next = queue[idx + 1] ?? queue[idx - 1] ?? null;
    setSelectedId(next?.id ?? null);
  }, [selected, rejectReason, rejectVisit, queue]);

  const renderQueueItem = (v: typeof visits[0]) => {
    const isSel = selectedId === v.id;
    return (
      <button
        key={v.id}
        type="button"
        onClick={() => setSelectedId(v.id)}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
          border: isSel ? '1px solid var(--accent)' : '1px solid transparent',
          borderRadius: 6, background: isSel ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
          cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: 2,
        }}
      >
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-2)', flexShrink: 0, paddingTop: 2 }}>{v.token}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: v.needs_review ? 'var(--hold)' : 'var(--ink)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {v.source_phrase ?? 'No clear time window'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{relTime(v.visit_date, now)}</span>
        </span>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.doctor_priority === 'High' ? 'var(--high)' : 'var(--ink-2)', flexShrink: 0, marginTop: 6 }} />
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--paper)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{role === 'Nurse' ? 'Nurse queue — Routine' : 'Doctor queue — High priority'}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>{fmtDate(now)}</span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT pane */}
        <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '6px 8px', gap: 4 }}>
            {(['needs-review', 'staged', 'done'] as Tab[]).map((t) => {
              const label = t === 'needs-review' ? 'Needs review' : t === 'staged' ? 'Staged' : 'Done today';
              const count = tabCounts[t === 'needs-review' ? 'needs' : t === 'staged' ? 'staged' : 'done'];
              return (
                <button key={t} type="button" onClick={() => { setTab(t); setSelectedId(null); }}
                  style={{ padding: '4px 8px', fontSize: 12, border: '1px solid', borderRadius: 6, cursor: 'pointer',
                    borderColor: tab === t ? 'var(--accent)' : 'var(--border)',
                    background: tab === t ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                    color: tab === t ? 'var(--accent)' : 'var(--ink-2)', fontWeight: tab === t ? 600 : 400 }}>
                  {label} <span style={{ fontFamily: 'var(--mono)' }}>{count}</span>
                </button>
              );
            })}
          </div>
          {/* Progress */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--ink-2)' }}>
            <span style={{ fontFamily: 'var(--mono)' }}>{reviewedToday}</span> of <span style={{ fontFamily: 'var(--mono)' }}>{totalQueue}</span> reviewed today
            <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, marginTop: 4 }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 1, width: totalQueue ? `${(reviewedToday / totalQueue) * 100}%` : '0%', transition: 'width 120ms ease-out' }} />
            </div>
          </div>
          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            {queue.length === 0
              ? <EmptyState title="No items" description={`No ${tab.replace('-', ' ')} items in this queue.`} />
              : <VirtualList items={queue} itemHeight={56} renderItem={renderQueueItem} />
            }
          </div>
        </div>

        {/* RIGHT pane */}
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 20 }}>
          {selected ? (
            <div style={{ maxWidth: 560 }}>
              {/* Missing priority flag */}
              {!selected.doctor_priority && (
                <div style={{ fontSize: 12, color: 'var(--hold)', marginBottom: 8 }}>Priority not tagged. Defaulting to Routine.</div>
              )}

              {/* Needs review banner */}
              {needsReview && (
                <Banner variant="warn">No clear time window in this note.</Banner>
              )}

              {/* Paper slip */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <textarea readOnly className="paper-slip" value={selected.note_text ?? ''} aria-label="Source note"
                  style={{ minHeight: 140 }} />
                {selected.source_phrase && (
                  <div style={{ position: 'absolute', bottom: 8, left: 20, right: 8, background: 'var(--mark)', padding: '2px 6px', fontSize: 11, borderRadius: 4, color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
                    "{selected.source_phrase}"
                  </div>
                )}
              </div>

              {/* Needs-review date input */}
              {needsReview && !selected.target_date && (
                <div style={{ marginBottom: 12, padding: 12, border: '1px solid var(--hold)', borderRadius: 6, background: 'color-mix(in srgb, var(--hold) 8%, transparent)' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--hold)', marginBottom: 6 }}>
                    Due date — approver must set
                  </label>
                  {selected.interval_days != null && (
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6 }}>
                      Candidate interval: {selected.interval_days} days
                      <button type="button" onClick={() => {
                        const d = new Date(selected.visit_date.getTime() + selected.interval_days! * 86400000);
                        setManualDate(d.toISOString().slice(0, 10));
                      }} style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Accept
                      </button>
                    </div>
                  )}
                  <input type="date" value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, width: '100%' }} />
                  <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>The AI never fills this date.</div>
                </div>
              )}

              {/* Field rows */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
                {[
                  { label: 'Interval', value: selected.interval_days != null ? `${selected.interval_days} days` : '—', chip: 'AI proposed' },
                  { label: 'Reason', value: selected.reason_category ?? '—', chip: 'AI proposed' },
                  { label: 'Due date', value: fmtDate(selected.target_date), chip: 'AI proposed' },
                  { label: 'Priority', value: selected.doctor_priority ?? 'Routine (default)', chip: 'Doctor tagged' },
                ].map(({ label, value, chip }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ width: 80, fontSize: 12, color: 'var(--ink-2)', flexShrink: 0 }}>{label}</span>
                    <span style={{ flex: 1, color: 'var(--ink)', fontFamily: label === 'Due date' || label === 'Interval' ? 'var(--mono)' : undefined }}>{value}</span>
                    <Chip variant="neutral" style={{ fontSize: 10 }}>{chip}</Chip>
                  </div>
                ))}
              </div>

              {/* Action bar */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" onClick={() => setRejectOpen(true)}
                  style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)' }}>
                  Reject to audit <Kbd>R</Kbd>
                </button>
                <button type="button" onClick={() => setDateOpen(true)}
                  style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)' }}>
                  Edit date <Kbd>E</Kbd>
                </button>
                <button type="button" onClick={doApprove} disabled={noDate}
                  title={noDate ? 'Set a due date first' : undefined}
                  style={{ padding: '6px 16px', fontSize: 12, border: '1px solid var(--ink)', borderRadius: 6, background: noDate ? 'var(--border)' : 'var(--ink)', color: noDate ? 'var(--ink-2)' : '#fff', cursor: noDate ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                  Approve <Kbd>A</Kbd>
                </button>
              </div>

              {/* Date picker popover */}
              {dateOpen && (
                <DatePicker open onClose={() => setDateOpen(false)}
                  selected={selected.target_date}
                  onSelect={(d) => { editVisitDate(selected.id, d); setDateOpen(false); }}
                  workingDays={[1,2,3,4,5,6]} />
              )}

              {/* Reject drawer */}
              {rejectOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(31,35,40,.2)' }} onClick={() => setRejectOpen(false)}>
                  <div style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 280, background: 'var(--bg)', borderLeft: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 4px 16px rgba(0,0,0,.08)' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Reject to audit</div>
                    <label style={{ fontSize: 12, color: 'var(--ink-2)' }}>Reason</label>
                    <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}>
                      <option value="">Select a reason</option>
                      {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setRejectOpen(false)}
                        style={{ flex: 1, padding: '6px 0', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>
                        Cancel
                      </button>
                      <button type="button" onClick={doReject} disabled={!rejectReason}
                        style={{ flex: 1, padding: '6px 0', fontSize: 12, border: '1px solid var(--high)', borderRadius: 6, background: 'var(--high)', color: '#fff', cursor: rejectReason ? 'pointer' : 'not-allowed' }}>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState title="No card selected" description="Pick a visit from the queue on the left to review it." />
          )}
        </main>
      </div>

      {/* Undo toast */}
      {undoToast && (
        <Toast message="Follow-up approved. Patient notified (simulated)." onUndo={doUndo} onDismiss={() => { clearTimeout(undoToast.timer); setUndoToast(null); }} />
      )}
    </div>
  );
}

// NurseScreen is the ApprovalScreen for Routine items
export function NurseScreen() {
  return <ApprovalScreen role="Nurse" />;
}
