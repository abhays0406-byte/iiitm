import { useState, useRef, useEffect, useCallback } from 'react';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { extract } from '@/extractor/extract';
import { suggestPriority } from '@/config/priorityReference';
import { Kbd } from '@/ui/Kbd';
import { Chip } from '@/ui/Chip';

type Priority = 'Routine' | 'High';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function DoctorScreen() {
  const patients = useDomainStore((s) => s.patients);
  const visits = useDomainStore((s) => s.visits);
  const addVisit = useDomainStore((s) => s.addVisit);
  const now = useClockStore((s) => s.now);

  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [passive, setPassive] = useState<{ intervalDays: number | null; reasonCategory: string } | null>(null);
  const [suggestion, setSuggestion] = useState<{ suggested: Priority; matchedKeyword: string; basis: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [patientIdx, setPatientIdx] = useState(0);
  const patient = patients[patientIdx] ?? patients[0];

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const runPassive = useCallback((text: string) => {
    if (!text.trim()) { setPassive(null); setSuggestion(null); return; }
    const result = extract(text, now);
    setPassive(result.intervalDays !== null ? { intervalDays: result.intervalDays, reasonCategory: result.reasonCategory } : null);
    setSuggestion(suggestPriority(text));
  }, [now]);

  const onNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    setConfirm(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPassive(e.target.value), 600);
  };

  const saveVisit = useCallback((p: Priority) => {
    if (!note.trim()) return;
    const extraction = extract(note, now);
    addVisit({
      patient_id: patient.id,
      token: patient.token,
      visit_date: new Date(now),
      note_text: note,
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
    setNote('');
    setPassive(null);
    setSuggestion(null);
    setConfirm(true);
    setTimeout(() => setConfirm(false), 2500);
  }, [note, now, patient, addVisit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'Enter') { e.preventDefault(); saveVisit('High'); return; }
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); saveVisit('Routine'); }
  };

  const nextPatient = () => { setPatientIdx((i) => (i + 1) % patients.length); setConfirm(false); };
  const visitsToday = visits.filter((v) => v.patient_id === patient?.id && v.visit_date.toDateString() === now.toDateString()).length;
  const empty = !note.trim();
  const lastVisit = visits.filter((v) => v.patient_id === patient?.id).sort((a, b) => b.visit_date.getTime() - a.visit_date.getTime())[1];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left strip */}
      <aside style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', padding: 16, background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)', marginBottom: 2 }}>{patient?.token}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{patient?.name}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{patient?.age} / {patient?.sex}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}>Last visit: {lastVisit ? fmtDate(lastVisit.visit_date) : '—'}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>Visits today: {visitsToday}</div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea
          ref={textareaRef}
          className="paper-slip"
          placeholder="Write the follow-up note…"
          value={note}
          onChange={onNoteChange}
          onKeyDown={handleKeyDown}
          aria-label="Visit note"
        />

        {/* Passive extractor line */}
        {passive && (
          <div style={{ fontSize: 13, color: 'var(--ink-2)', minHeight: 20 }}>
            AI read: {passive.intervalDays} days · {passive.reasonCategory}
            {suggestion && (
              <span style={{ marginLeft: 12 }}>
                <Chip variant="neutral" title={suggestion.basis}>
                  Suggested: {suggestion.suggested}
                </Chip>
                <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--ink-2)' }}>Suggested from reference table. Your tap decides.</span>
              </span>
            )}
          </div>
        )}

        {confirm && (
          <div className="saved-confirm">Saved. Sent for approval.</div>
        )}

        {/* Segmented control */}
        <div className="segmented-control" style={{ marginTop: 4 }}>
          <button
            type="button"
            onClick={() => saveVisit('Routine')}
            disabled={empty}
            title={empty ? 'Write a note first' : undefined}
            aria-disabled={empty}
          >
            Routine <Kbd>Ctrl</Kbd><Kbd>Enter</Kbd>
          </button>
          <button
            type="button"
            className="high"
            onClick={() => saveVisit('High')}
            disabled={empty}
            title={empty ? 'Write a note first' : undefined}
            aria-disabled={empty}
            style={suggestion?.suggested === 'High' ? { outline: '2px solid var(--high)', outlineOffset: -2 } : undefined}
          >
            High priority <Kbd>Ctrl</Kbd><Kbd>Shift</Kbd><Kbd>Enter</Kbd>
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={nextPatient}
            style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)' }}
          >
            Next patient
          </button>
        </div>
      </main>
    </div>
  );
}
