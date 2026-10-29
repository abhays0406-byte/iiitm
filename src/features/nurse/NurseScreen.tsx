import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { VirtualList } from '@/ui/VirtualList';
import { DatePicker } from '@/ui/DatePicker';
import { Kbd } from '@/ui/Kbd';
import { Chip, PriorityBadge } from '@/ui/Chip';
import { Banner } from '@/ui/Banner';
import { EmptyState } from '@/ui/EmptyState';
import { Toast } from '@/ui/Toast';
import { Button } from '@/ui/Button';
import { Drawer } from '@/ui/Drawer';
import { Icon } from '@/ui/Icon';
import { PageHeader } from '@/ui/PageHeader';
import { Stat } from '@/ui/Stat';
import { gsap, useGSAP, motionAllowed, enter } from '@/ui/motion';
import { neutralDateMessage, neutralMessage, messageContainsForbidden } from '@/features/records/selector';
import { formatBytes, openSlipInNewTab } from '@/lib/slip';

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
  const audit = useDomainStore((s) => s.audit);
  const slips = useDomainStore((s) => s.slips);
  const now = useClockStore((s) => s.now);

  // Role enforcement: nurse sees only Routine, doctor sees only High
  const allowedPriority = role === 'Nurse' ? 'Routine' : 'High';

  // Visits written in the app (not seed data) carry a 'create' audit entry; they show as New until opened.
  const createdIds = useMemo(() => new Set(audit.filter((a) => a.action === 'create').map((a) => a.entity_id)), [audit]);
  const [openedIds, setOpenedIds] = useState<Set<string>>(() => new Set());
  const isNew = (id: string) => createdIds.has(id) && !openedIds.has(id);

  // Open on the tab holding the newest note from the doctor, so it is the first thing the approver sees.
  const [tab, setTab] = useState<Tab>(() => {
    const newest = [...visits].reverse().find((v) => createdIds.has(v.id) && (v.doctor_priority ?? 'Routine') === allowedPriority);
    return newest?.status === 'Needs Review' ? 'needs-review' : 'staged';
  });
  const [selectedId, setSelectedIdRaw] = useState<string | null>(null);
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdRaw(id);
    if (id) setOpenedIds((s) => (s.has(id) ? s : new Set(s).add(id)));
  }, []);
  const [dateOpen, setDateOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [undoToast, setUndoToast] = useState<{ visitId: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [manualDate, setManualDate] = useState('');
  const detailRef = useRef<HTMLElement>(null);
  const [slipZoom, setSlipZoom] = useState(false);

  // Newest first: a note the doctor just saved lands at the top of its tab.
  const queue = useMemo(() => {
    const base = visits.filter((v) => {
      const p = v.doctor_priority ?? 'Routine';
      return p === allowedPriority;
    });
    const inTab = tab === 'needs-review'
      ? base.filter((v) => v.status === 'Needs Review')
      : tab === 'staged'
        ? base.filter((v) => v.status === 'Staged')
        : base.filter((v) => v.status === 'Approved' || v.status === 'Rejected');
    return inTab.reverse();
  }, [visits, tab, allowedPriority]);

  const newByTab = useMemo(() => {
    const fresh = visits.filter((v) => (v.doctor_priority ?? 'Routine') === allowedPriority && createdIds.has(v.id) && !openedIds.has(v.id));
    return {
      'needs-review': fresh.filter((v) => v.status === 'Needs Review').length,
      staged: fresh.filter((v) => v.status === 'Staged').length,
      done: 0,
    } as Record<Tab, number>;
  }, [visits, allowedPriority, createdIds, openedIds]);

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
  const reviewedToday = visits.filter((v) => (v.doctor_priority ?? 'Routine') === allowedPriority && (v.status === 'Approved' || v.status === 'Rejected') && v.updated_at?.toDateString() === now.toDateString()).length;
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
  }, [queue, selectedId, noDate, selected, setSelectedId]);

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
  }, [selected, noDate, manualDate, approveVisit, editVisitDate, recordOutreach, allowedPriority, queue, now, undoToast, setSelectedId]);

  const doUndo = useCallback(() => {
    if (!undoToast) return;
    undoApproval(undoToast.visitId);
    clearTimeout(undoToast.timer);
    setUndoToast(null);
    setSelectedId(undoToast.visitId);
  }, [undoToast, undoApproval, setSelectedId]);

  const doReject = useCallback(() => {
    if (!selected || !rejectReason) return;
    rejectVisit(selected.id, rejectReason);
    setRejectOpen(false);
    setRejectReason('');
    const idx = queue.findIndex((v) => v.id === selected.id);
    const next = queue[idx + 1] ?? queue[idx - 1] ?? null;
    setSelectedId(next?.id ?? null);
  }, [selected, rejectReason, rejectVisit, queue, setSelectedId]);

  const renderQueueItem = (v: typeof visits[0]) => {
    const isSel = selectedId === v.id;
    const name = patients.find((p) => p.id === v.patient_id)?.name;
    return (
      <button
        key={v.id}
        type="button"
        onClick={() => setSelectedId(v.id)}
        className={`queue-item${isSel ? ' selected' : ''}`}
      >
        <span className={`qi-dot${v.doctor_priority === 'High' ? ' high' : ''}`} aria-hidden="true" />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="qi-top">
            <span className="qi-token">{v.token}</span>
            {name && <span className="qi-name">{name}</span>}
            {isNew(v.id) && <span className="new-pill">NEW</span>}
          </span>
          <span className={`qi-phrase${v.needs_review ? ' hold' : ''}`}>
            {slips[v.id] && <Icon name="fileText" size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />}
            {v.source_phrase ? `“${v.source_phrase}”` : 'No clear time window'}
          </span>
        </span>
        <span className="qi-time">{createdIds.has(v.id) ? 'Just now' : relTime(v.visit_date, now)}</span>
      </button>
    );
  };

  // Picking a card fades its details in.
  useGSAP(() => {
    if (!motionAllowed() || !selectedId) return;
    const q = gsap.utils.selector(detailRef);
    enter(q('.card-header, .detail-scroll'), { autoAlpha: 0, y: 4, duration: 0.25, ease: 'power2.out' });
  }, { scope: detailRef, dependencies: [selectedId], revertOnUpdate: true });

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'needs-review', label: 'Needs review', count: tabCounts.needs },
    { id: 'staged', label: 'Staged', count: tabCounts.staged },
    { id: 'done', label: 'Done', count: tabCounts.done },
  ];
  const progress = totalQueue ? Math.min(100, (reviewedToday / totalQueue) * 100) : 0;
  const notePhrase = selected?.source_phrase ?? null;
  const noteText = selected?.note_text ?? '';
  const phraseAt = notePhrase ? noteText.toLowerCase().indexOf(notePhrase.toLowerCase()) : -1;

  return (
    <div className="page">
      <PageHeader
        eyebrow={role === 'Nurse' ? 'Nurse · Validation' : 'Doctor · Approval'}
        title={role === 'Nurse' ? 'Routine follow-ups' : 'High-priority follow-ups'}
        subtitle="Check what the AI read from each note, then approve, edit the date, or reject. Nothing is sent without your click."
      />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
        <div className={`stat-grid compact queue-stats${selected ? ' with-selection' : ''}`}>
          <Stat icon="sparkle" value={newByTab['needs-review'] + newByTab.staged} label="New from the doctor" sub="Marked NEW in the list" />
          <Stat icon="alertTriangle" tone="hold" value={tabCounts.needs} label="Needs review" sub="Date must be set by you" />
          <Stat icon="inbox" value={tabCounts.staged} label="Staged" sub="AI read a time window" />
          <div className="card stat">
            <div className="stat-top ok"><Icon name="checkCircle" size={15} /><span className="stat-label">Reviewed today</span></div>
            <div className="stat-value">{reviewedToday}<span className="stat-of"> / {totalQueue}</span></div>
            <div className="meter" style={{ marginTop: 2 }}><span style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
        {/* On phones only one pane shows: the list, or the selected card's details. */}
        <div className={`queue-layout${selected ? ' has-selection' : ''}`}>
          {/* LEFT pane */}
          <section className="card queue-pane">
            <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
              <div className="segmented" style={{ width: '100%' }}>
                {TABS.map((t) => (
                  <button key={t.id} type="button" className={tab === t.id ? 'active' : undefined} style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { setTab(t.id); setSelectedId(null); }}>
                    {newByTab[t.id] > 0 && <span className="new-dot" title={`${newByTab[t.id]} new from the doctor`} />}
                    {t.label} <span className="count">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 6 }}>
              {queue.length === 0
                ? <EmptyState icon="checkCircle" title="Nothing here" description={`No ${tab.replace('-', ' ')} items in this queue.`} />
                : <VirtualList items={queue} itemHeight={64} renderItem={renderQueueItem} />
              }
            </div>
            <div className="queue-foot">
              <span><Kbd>J</Kbd> <Kbd>K</Kbd> move</span>
              <span><Kbd>A</Kbd> approve</span>
              <span><Kbd>E</Kbd> edit</span>
              <span><Kbd>R</Kbd> reject</span>
            </div>
          </section>

          {/* RIGHT pane */}
          <section ref={detailRef} className="card detail-pane">
            {selected ? (
              <>
                <div className="card-header detail-head">
                  <button type="button" className="btn btn-ghost btn-sm back-btn" onClick={() => setSelectedId(null)}>
                    <Icon name="chevronLeft" size={15} />Queue
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div className="avatar" style={{ width: 38, height: 38, fontSize: 13 }}>
                      {(selectedPatient?.name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="card-title" style={{ fontSize: 15 }}>{selectedPatient?.name ?? 'Unknown patient'}</div>
                      <div className="card-sub" style={{ fontFamily: 'var(--mono)' }}>{selected.token} · seen {fmtDate(selected.visit_date)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PriorityBadge priority={selected.doctor_priority ?? 'Routine'} missing={!selected.doctor_priority} />
                    <Chip variant={selected.status === 'Needs Review' ? 'hold' : selected.status === 'Approved' ? 'ok' : selected.status === 'Rejected' ? 'high' : 'accent'}>{selected.status}</Chip>
                  </div>
                </div>

                <div className="detail-scroll">
                  <div className="stack" style={{ gap: 14, maxWidth: 640 }}>
                    {!selected.doctor_priority && (
                      <Banner variant="warn">Priority not tagged. Defaulting to Routine.</Banner>
                    )}
                    {needsReview && (
                      <Banner variant="warn">No clear time window in this note.</Banner>
                    )}

                    <div>
                      <div className="field-label">Doctor's note</div>
                      <div className="paper-slip" role="document" aria-label="Source note" style={{ minHeight: 0 }}>
                        {phraseAt >= 0 && notePhrase ? (
                          <>
                            {noteText.slice(0, phraseAt)}
                            <mark className="phrase-mark">{noteText.slice(phraseAt, phraseAt + notePhrase.length)}</mark>
                            {noteText.slice(phraseAt + notePhrase.length)}
                          </>
                        ) : (noteText || (slips[selected.id] ? 'No typed note. Read the paper slip below.' : '—'))}
                      </div>
                      {notePhrase && phraseAt < 0 && (
                        <div className="hint" style={{ marginTop: 6 }}>AI read: <mark className="phrase-mark">{notePhrase}</mark></div>
                      )}
                    </div>

                    {slips[selected.id] && (() => {
                      const s = slips[selected.id];
                      const isImage = s.type.startsWith('image/');
                      return (
                        <div>
                          <div className="field-label">Paper slip from the doctor</div>
                          <div className="slip-view">
                            {isImage
                              ? <img src={s.data_url} alt={`Paper slip for ${selected.token}`} onClick={() => setSlipZoom(true)} />
                              : <span className="slip-thumb pdf" style={{ width: 64, height: 64 }}><Icon name="fileText" size={22} />PDF</span>}
                            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <span className="slip-name">{s.name}</span>
                              <span className="hint">{formatBytes(s.size)} · attached {fmtDate(s.attached_at)}</span>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {isImage && <Button variant="quiet" size="small" icon="search" onClick={() => setSlipZoom(true)}>View larger</Button>}
                                <Button variant="ghost" size="small" icon="fileText" onClick={() => openSlipInNewTab(s.data_url)}>Open in new tab</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {needsReview && !selected.target_date && (
                      <div className="set-date-box">
                        <label className="field-label" style={{ color: 'var(--hold-ink)', fontWeight: 600 }} htmlFor="manual-date">
                          Due date (approver must set)
                        </label>
                        {selected.interval_days != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-2)', marginBottom: 8 }}>
                            Candidate interval: <span style={{ fontFamily: 'var(--mono)' }}>{selected.interval_days} days</span>
                            <Button variant="ghost" size="small" onClick={() => {
                              const d = new Date(selected.visit_date.getTime() + selected.interval_days! * 86400000);
                              setManualDate(d.toISOString().slice(0, 10));
                            }}>Use this</Button>
                          </div>
                        )}
                        <input id="manual-date" type="date" value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                          style={{ width: '100%', maxWidth: 240 }} />
                        <div className="hint" style={{ marginTop: 6 }}>The AI never fills this date.</div>
                      </div>
                    )}

                    <div>
                      <div className="field-label">What the AI proposed</div>
                      <div className="card" style={{ padding: '0 16px', boxShadow: 'none' }}>
                        <dl className="def-list">
                          {[
                            { label: 'Interval', value: selected.interval_days != null ? `${selected.interval_days} days` : '—', chip: 'AI proposed', mono: true },
                            { label: 'Reason', value: selected.reason_category ?? '—', chip: 'AI proposed', mono: false },
                            { label: 'Due date', value: fmtDate(selected.target_date), chip: 'AI proposed', mono: true },
                            { label: 'Priority', value: selected.doctor_priority ?? 'Routine (default)', chip: 'Doctor tagged', mono: false },
                          ].map(({ label, value, chip, mono }) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd style={mono ? { fontFamily: 'var(--mono)', fontSize: 13 } : undefined}>{value}</dd>
                              <span className="def-tag"><Chip variant={chip === 'Doctor tagged' ? 'outline' : 'accent'}>{chip === 'AI proposed' && <Icon name="sparkle" size={11} />}{chip}</Chip></span>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="action-bar">
                  <Button variant="danger-quiet" icon="x" kbd="R" onClick={() => setRejectOpen(true)}>Reject to audit</Button>
                  <Button variant="quiet" icon="calendar" kbd="E" onClick={() => setDateOpen(true)}>Edit date</Button>
                  <Button variant="primary" icon="check" kbd="A" onClick={doApprove} disabled={noDate}
                    title={noDate ? 'Set a due date first' : undefined} style={{ marginLeft: 'auto', minWidth: 140 }}>
                    Approve
                  </Button>
                </div>

                {dateOpen && (
                  <DatePicker open onClose={() => setDateOpen(false)}
                    selected={selected.target_date}
                    onSelect={(d) => { editVisitDate(selected.id, d); setDateOpen(false); }}
                    workingDays={[1,2,3,4,5,6]} />
                )}

                <Drawer open={slipZoom && !!slips[selected.id]} onClose={() => setSlipZoom(false)} title={`Paper slip · ${selected.token}`} width={760}>
                  <div>
                    {slips[selected.id] && <img className="slip-full" src={slips[selected.id].data_url} alt={`Paper slip for ${selected.token}`} />}
                  </div>
                </Drawer>

                <Drawer open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject to audit" width={360}>
                  <div className="stack" style={{ gap: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)' }}>
                      The visit leaves the queue and the reason is written to the audit log.
                    </p>
                    <div>
                      <label className="field-label" htmlFor="reject-reason">Reason</label>
                      <select id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ width: '100%', height: 36 }}>
                        <option value="">Select a reason</option>
                        {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="quiet" onClick={() => setRejectOpen(false)} style={{ flex: 1 }}>Cancel</Button>
                      <Button variant="danger" onClick={doReject} disabled={!rejectReason} style={{ flex: 1 }}>Reject</Button>
                    </div>
                  </div>
                </Drawer>
              </>
            ) : (
              <EmptyState icon="fileText" title="No card selected" description="Pick a visit from the queue on the left to review it, or press J." />
            )}
          </section>
        </div>
      </div>

      {undoToast && (
        <Toast open message="Follow-up approved. Patient notified (simulated)." onUndo={doUndo} onDismiss={() => { clearTimeout(undoToast.timer); setUndoToast(null); }} />
      )}
    </div>
  );
}

// NurseScreen is the ApprovalScreen for Routine items
export function NurseScreen() {
  return <ApprovalScreen role="Nurse" />;
}
