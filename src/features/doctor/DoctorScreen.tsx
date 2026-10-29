import { useState, useRef, useEffect, useCallback } from 'react';
import { useInRouterContext, useNavigate } from 'react-router-dom';
import { useDomainStore } from '@/domain/store';
import { readSlipFile, formatBytes, SLIP_ACCEPT, type SlipFile } from '@/lib/slip';
import { useClockStore } from '@/store/clock';
import { extract } from '@/extractor/extract';
import { suggestPriority } from '@/config/priorityReference';
import { Kbd } from '@/ui/Kbd';
import { Chip } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { Stat } from '@/ui/Stat';
import { NewPatientDrawer } from '@/features/patients/NewPatientDrawer';
import { toast } from '@/features/demo/useDemoToast';
import { reconcile } from '@/engine/reconcile';
import { useGSAP, motionAllowed, enter } from '@/ui/motion';
import { suggestReason, type MlCategorySuggestion } from '@/extractor/mlCategoryModel';
import { useConfigStore } from '@/config/store';

type Priority = 'Routine' | 'High';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Where a saved note went, so the confirmation can say so and link to it. */
interface Saved { priority: Priority; needsReview: boolean; withSlip: boolean }

/** Button to the queue that received the note. Rendered only inside a router. */
function OpenQueueButton({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" size="small" onClick={() => navigate(to)} style={{ marginLeft: 'auto' }}>
      {label} <Icon name="chevronRight" size={13} />
    </Button>
  );
}

export function DoctorScreen() {
  const patients = useDomainStore((s) => s.patients);
  const visits = useDomainStore((s) => s.visits);
  const checkins = useDomainStore((s) => s.checkins);
  const audit = useDomainStore((s) => s.audit);
  const addVisit = useDomainStore((s) => s.addVisit);
  const attachSlip = useDomainStore((s) => s.attachSlip);
  const now = useClockStore((s) => s.now);
  const inRouter = useInRouterContext();

  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState<Saved | null>(null);
  const [slip, setSlip] = useState<SlipFile | null>(null);
  const [slipError, setSlipError] = useState('');
  const [slipBusy, setSlipBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [passive, setPassive] = useState<{
    intervalDays: number | null;
    reasonCategory: string;
    isMl?: boolean;
    mlBasis?: string;
    mlConfidence?: string;
  } | null>(null);
  const [suggestion, setSuggestion] = useState<{ suggested: Priority; matchedKeyword: string; basis: string } | null>(null);
  const [mlCategory, setMlCategory] = useState<MlCategorySuggestion | null>(null);
  const reasonCategories = useConfigStore((s) => s.reasonCategories);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const patientRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the patient by id: a newly registered patient is appended, and the list can change in another tab.
  const [patientId, setPatientId] = useState<string | null>(null);
  const patient = patients.find((p) => p.id === patientId) ?? patients[0];
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const runPassive = useCallback((text: string) => {
    if (!text.trim()) { setPassive(null); setSuggestion(null); setMlCategory(null); return; }
    const result = extract(text, now);
    setPassive(result.intervalDays !== null
      ? { intervalDays: result.intervalDays, reasonCategory: result.reasonCategory }
      : result.mlSuggestion
        ? { intervalDays: result.mlSuggestion.suggestedDays, reasonCategory: result.reasonCategory, isMl: true, mlBasis: result.mlSuggestion.basis, mlConfidence: result.mlSuggestion.confidence }
        : null
    );
    setSuggestion(suggestPriority(text));
    void suggestReason(text, reasonCategories).then(setMlCategory);
  }, [now, reasonCategories]);

  const onNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    setConfirm(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPassive(e.target.value), 600);
  };

  const takeSlipFile = async (file: File | undefined) => {
    if (!file) return;
    setSlipError('');
    setSlipBusy(true);
    try {
      setSlip(await readSlipFile(file));
      setConfirm(null);
    } catch (err) {
      setSlipError(err instanceof Error ? err.message : 'Could not attach this file.');
    } finally {
      setSlipBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void takeSlipFile(e.dataTransfer.files[0]);
  };

  const saveVisit = useCallback((p: Priority) => {
    // A slip on its own is enough: with no typed note the visit goes to Needs Review for the nurse.
    if (!note.trim() && !slip) return;
    const extraction = extract(note, now);
    const visitId = addVisit({
      patient_id: patient.id,
      token: patient.token,
      visit_date: new Date(now),
      note_text: note.trim() ? note : null,
      doctor_priority: p,
      status: extraction.needsReview ? 'Needs Review' : 'Staged',
      approved_date: null,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      interval_days: extraction.intervalDays,
      target_date: extraction.targetDate,
      reason_category: extraction.reasonCategory,
      source_phrase: extraction.sourcePhrase,
      needs_review: extraction.needsReview,
      review_reason: extraction.reviewReason,
    });
    if (slip) attachSlip(visitId, slip);
    setNote('');
    setPassive(null);
    setSuggestion(null);
    setSlip(null);
    setSlipError('');
    setConfirm({ priority: p, needsReview: extraction.needsReview, withSlip: !!slip });
  }, [note, slip, now, patient, addVisit, attachSlip]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'Enter') { e.preventDefault(); saveVisit('High'); return; }
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); saveVisit('Routine'); }
  };

  const choosePatient = (id: string) => { setPatientId(id); setConfirm(null); setSlip(null); setSlipError(''); };
  const nextPatient = () => {
    const i = patients.findIndex((p) => p.id === patient?.id);
    choosePatient(patients[(i + 1) % patients.length].id);
  };
  const registeredIds = new Set(audit.filter((a) => a.action === 'register_patient').map((a) => a.entity_id));
  const visitsToday = visits.filter((v) => v.patient_id === patient?.id && v.visit_date.toDateString() === now.toDateString()).length;
  const empty = !note.trim() && !slip;
  const lastVisit = visits.filter((v) => v.patient_id === patient?.id).sort((a, b) => b.visit_date.getTime() - a.visit_date.getTime())[1];

  // Dashboard figures for the doctor's day. "Today's notes" are the ones written in the app
  // (they carry a 'create' audit entry), not the seeded demo backlog.
  const pending = (v: typeof visits[0]) => v.status === 'Staged' || v.status === 'Needs Review';
  const today = now.toDateString();
  const writtenIds = new Set(audit.filter((a) => a.action === 'create').map((a) => a.entity_id));
  const notesToday = visits.filter((v) => writtenIds.has(v.id) && v.visit_date.toDateString() === today);
  const withNurse = visits.filter((v) => (v.doctor_priority ?? 'Routine') === 'Routine' && pending(v)).length;
  const myQueue = visits.filter((v) => v.doctor_priority === 'High' && pending(v));
  const overdue = reconcile(visits, checkins, now).length;
  const nameOf = (id: string) => patients.find((p) => p.id === id)?.name ?? id;

  // The confirmation and the patient card fade in quietly when they change.
  useGSAP(() => {
    if (!confirm || !motionAllowed()) return;
    enter(confirmRef.current, { y: -4, autoAlpha: 0, duration: 0.25, ease: 'power2.out' });
  }, { dependencies: [confirm] });
  useGSAP(() => {
    if (!motionAllowed()) return;
    enter(patientRef.current, { autoAlpha: 0, duration: 0.25, ease: 'power2.out' });
  }, { dependencies: [patient?.id], revertOnUpdate: true });

  const initials = (patient?.name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="page">
      <PageHeader
        eyebrow="Doctor · OPD"
        title="Today's consultation"
        subtitle="Write the follow-up note in English, Hinglish or Hindi, then tag the priority. The nurse confirms every date."
      />
      <div className="page-body">
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <Stat icon="pen" value={notesToday.length} label="Notes today" sub={notesToday.length ? `${notesToday.filter((v) => v.doctor_priority === 'High').length} tagged High` : 'None written yet'} />
          <Stat icon="checkSquare" tone="ok" value={withNurse} label="Waiting with the nurse" sub="Routine, not yet approved" />
          <Stat icon="inbox" tone="high" value={myQueue.length} label="In your High queue" sub={myQueue.length ? 'Needs your approval' : 'All clear'} />
          <Stat icon="alertCircle" tone="hold" value={overdue} label="Overdue patients" sub="Being followed up by Records" />
        </div>
        <div className="doctor-layout">
          {/* Note and priority come first in the DOM so the priority buttons are the first controls. */}
          <div className="stack">
            <section className="card composer">
              <div className="composer-head">
                <div>
                  <div className="card-title">Follow-up note</div>
                  <div className="card-sub">For {patient?.name} · <span style={{ fontFamily: 'var(--mono)' }}>{patient?.token}</span></div>
                </div>
                {/* A label, not a button: it opens the file picker and keeps the priority buttons first. */}
                <label className={`btn btn-quiet btn-sm slip-picker${slipBusy ? ' busy' : ''}`}>
                  <Icon name="download" size={14} style={{ transform: 'rotate(180deg)' }} />
                  {slip ? 'Replace paper slip' : 'Attach paper slip'}
                  <input
                    type="file"
                    accept={SLIP_ACCEPT}
                    className="visually-hidden"
                    onChange={(e) => { void takeSlipFile(e.target.files?.[0]); e.target.value = ''; }}
                  />
                </label>
              </div>

              <div
                className={`slip-drop${dragOver ? ' over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <textarea
                  ref={textareaRef}
                  className="paper-slip composer-slip"
                  placeholder='Write the follow-up note… e.g. "Come back after 2 weeks for dressing change". Or drop a photo of the paper slip here.'
                  value={note}
                  onChange={onNoteChange}
                  onKeyDown={handleKeyDown}
                  aria-label="Visit note"
                />
                {dragOver && <div className="slip-drop-hint"><Icon name="fileText" size={20} />Drop the slip photo or PDF to attach it</div>}
              </div>

              {(slip || slipError || slipBusy) && (
                <div className="slip-row">
                  {slipBusy && <span className="hint">Preparing the slip…</span>}
                  {slipError && <span className="slip-error"><Icon name="alertCircle" size={14} />{slipError}</span>}
                  {slip && !slipBusy && (
                    <>
                      {slip.type.startsWith('image/')
                        ? <img className="slip-thumb" src={slip.data_url} alt="Attached paper slip" />
                        : <span className="slip-thumb pdf"><Icon name="fileText" size={18} />PDF</span>}
                      <span style={{ minWidth: 0 }}>
                        <span className="slip-name">{slip.name}</span>
                        <span className="hint">{formatBytes(slip.size)} · goes to the nurse with this note</span>
                      </span>
                      <button type="button" className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setSlip(null)} aria-label="Remove paper slip">
                        <Icon name="x" size={15} />
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="ai-line">
                <span className="ai-badge"><Icon name="sparkle" size={12} />AI</span>
                {passive ? (
                  <>
                    <span>{(passive as { isMl?: boolean }).isMl ? 'Suggested:' : 'Read:'}</span>
                    <Chip variant="accent"><span style={{ fontFamily: 'var(--mono)' }}>{passive.intervalDays} days</span></Chip>
                    <Chip variant="accent">{passive.reasonCategory}</Chip>
                    {(passive as { isMl?: boolean }).isMl && (
                      <Chip variant="hold" title={(passive as { mlBasis?: string }).mlBasis}>
                        {(passive as { mlConfidence?: string }).mlConfidence === 'high' ? '●●●' : (passive as { mlConfidence?: string }).mlConfidence === 'medium' ? '●●○' : '●○○'} Suggested · not decided
                      </Chip>
                    )}
                    {mlCategory && (
                      <Chip variant="accent" title={`Model confidence: ${(mlCategory.confidence * 100).toFixed(0)}%`}>
                        Suggested: {mlCategory.reasonCategory}
                      </Chip>
                    )}
                    {suggestion && (
                      <>
                        <Chip variant={suggestion.suggested === 'High' ? 'high' : 'neutral'} title={suggestion.basis}>
                          Suggested: {suggestion.suggested}
                        </Chip>
                        <span className="hint">From the reference table. Your tap decides.</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="hint">Reads the time window as you type. It only proposes; it never decides.</span>
                )}
              </div>

              <div className="composer-foot">
                <div className="composer-foot-label">
                  <span>Tag priority to save</span>
                  {empty && <span className="hint">Write a note or attach the paper slip first</span>}
                </div>
                <div className="priority-options">
                  <button
                    type="button"
                    className="priority-option"
                    onClick={() => saveVisit('Routine')}
                    disabled={empty}
                    title={empty ? 'Write a note first' : undefined}
                    aria-disabled={empty}
                  >
                    <span className="po-dot" />
                    <span>
                      <span className="po-title">Routine</span>
                      <span className="po-sub">Goes to the nurse queue</span>
                    </span>
                    <span className="po-keys"><Kbd>Ctrl</Kbd><Kbd>Enter</Kbd></span>
                  </button>
                  <button
                    type="button"
                    className={`priority-option high${suggestion?.suggested === 'High' ? ' suggested' : ''}`}
                    onClick={() => saveVisit('High')}
                    disabled={empty}
                    title={empty ? 'Write a note first' : undefined}
                    aria-disabled={empty}
                  >
                    <span className="po-dot" />
                    <span>
                      <span className="po-title">High priority</span>
                      <span className="po-sub">Goes to the doctor queue</span>
                    </span>
                    <span className="po-keys"><Kbd>Ctrl</Kbd><Kbd>Shift</Kbd><Kbd>Enter</Kbd></span>
                  </button>
                </div>
              </div>
            </section>

            {confirm && (
              <div ref={confirmRef} className="saved-confirm banner banner-ok" style={{ alignItems: 'center' }}>
                <Icon name="checkCircle" size={16} />
                <div style={{ flex: 1 }}>
                  <strong>{confirm.priority === 'High' ? 'Saved. Sent to the doctor queue.' : 'Saved. Sent to nurse.'}</strong>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {confirm.needsReview
                      ? 'It is in the Needs review tab: no clear time window, so the approver sets the date.'
                      : 'It is in the Staged tab, waiting for approval.'}
                    {confirm.withSlip && ' Paper slip attached.'}
                  </div>
                </div>
                {inRouter && (
                  <OpenQueueButton
                    to={confirm.priority === 'High' ? '/queue' : '/nurse'}
                    label={confirm.priority === 'High' ? 'Open doctor queue' : 'Open nurse queue'}
                  />
                )}
              </div>
            )}
          </div>

          <aside className="stack" aria-label="Patient information panel">
            <section className="card patient-card">
              <div className="patient-picker">
                <label className="visually-hidden" htmlFor="patient-select">Current patient</label>
                <select id="patient-select" value={patient?.id ?? ''} onChange={(e) => choosePatient(e.target.value)}>
                  {[...patients].reverse().map((p) => (
                    <option key={p.id} value={p.id}>{p.token} · {p.name}{registeredIds.has(p.id) ? ' (new)' : ''}</option>
                  ))}
                </select>
                <Button variant="primary" size="small" icon="plus" onClick={() => setRegisterOpen(true)}>New patient</Button>
              </div>
              <div ref={patientRef}>
                <div className="patient-head">
                  <div className="avatar">{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="patient-name">{patient?.name}</div>
                    <div className="patient-token">{patient?.token}</div>
                    <div className="patient-token" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {patient?.phone ? (
                        <>
                          <span>+91 {showPhone ? patient.phone : `${patient.phone.slice(0, 5)} •••••`}</span>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ padding: 2, height: 'auto', width: 'auto' }}
                            onClick={() => setShowPhone((s) => !s)}
                            aria-label={showPhone ? 'Hide phone number' : 'Show full phone number'}
                            title={showPhone ? 'Hide phone number' : 'Show full phone number'}
                          >
                            <Icon name={showPhone ? 'eyeOff' : 'eye'} size={12} />
                          </button>
                        </>
                      ) : (
                        'No working phone'
                      )}
                    </div>
                  </div>
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {registeredIds.has(patient?.id ?? '')
                      ? <Chip variant="accent">New</Chip>
                      : <Chip variant="ok">In OPD</Chip>}
                    <button type="button" className="icon-btn" onClick={() => setEditOpen(true)} aria-label="Edit patient details" title="Edit patient details">
                      <Icon name="pen" size={15} />
                    </button>
                  </span>
                </div>
                <div className="patient-stats">
                  <div>
                    <span className="ps-label">Age / sex</span>
                    <span className="ps-value">{patient?.age} / {patient?.sex}</span>
                  </div>
                  <div>
                    <span className="ps-label">Last visit</span>
                    <span className="ps-value mono">{lastVisit ? fmtDate(lastVisit.visit_date) : '—'}</span>
                  </div>
                  <div>
                    <span className="ps-label">Notes today</span>
                    <span className="ps-value mono">{visitsToday}</span>
                  </div>
                </div>
              </div>
              <div className="patient-foot">
                <Button variant="quiet" onClick={nextPatient} style={{ width: '100%' }}>
                  Next patient <Icon name="chevronRight" size={15} />
                </Button>
              </div>
            </section>

            <section className="card card-flush">
              <div className="card-header">
                <div className="card-title" style={{ fontSize: 13 }}>Today's notes</div>
                <Chip variant="neutral">{notesToday.length}</Chip>
              </div>
              {notesToday.length === 0 ? (
                <div className="hint" style={{ padding: '16px 18px' }}>Notes you save today appear here with where they are.</div>
              ) : (
                [...notesToday].reverse().slice(0, 6).map((v) => {
                  const where = v.status === 'Approved' ? { text: 'Approved', variant: 'ok' }
                    : v.status === 'Rejected' ? { text: 'Rejected', variant: 'high' }
                    : v.doctor_priority === 'High' ? { text: 'In your queue', variant: 'high' }
                    : { text: v.status === 'Needs Review' ? 'Nurse: set date' : 'With nurse', variant: v.status === 'Needs Review' ? 'hold' : 'accent' };
                  return (
                    <div key={v.id} className="mini-row">
                      <span className={`qi-dot${v.doctor_priority === 'High' ? ' high' : ''}`} aria-hidden="true" />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span className="mini-name">{nameOf(v.patient_id)}</span>
                        <span className="mini-sub">{v.token}{v.source_phrase ? ` · “${v.source_phrase}”` : ''}</span>
                      </span>
                      <Chip variant={where.variant}>{where.text}</Chip>
                    </div>
                  );
                })
              )}
            </section>

            <section className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="card-title" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="activity" size={14} />Keyboard shortcuts
                </div>
                <div className="shortcut-row"><span>Save as Routine</span><span><Kbd>Ctrl</Kbd> <Kbd>Enter</Kbd></span></div>
                <div className="shortcut-row"><span>Save as High</span><span><Kbd>Ctrl</Kbd> <Kbd>Shift</Kbd> <Kbd>Enter</Kbd></span></div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <NewPatientDrawer
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onCreated={(p) => {
          setRegisterOpen(false);
          choosePatient(p.id);
          toast(`Registered ${p.name} as ${p.token}. You can write their note now.`, 4000);
          textareaRef.current?.focus();
        }}
      />

      {patient && (
        <NewPatientDrawer
          key={`edit-${patient.id}-${patient.updated_at.getTime()}`}
          patient={patient}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onCreated={(p) => { setEditOpen(false); toast(`Saved changes to ${p.name} (${p.token}).`, 3000); }}
        />
      )}
    </div>
  );
}
