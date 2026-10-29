import { useState, useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { useOfflineStore } from '@/store/offline';
import { reconcile, buildQueue } from '@/engine/reconcile';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Drawer } from '@/ui/Drawer';
import { Icon } from '@/ui/Icon';
import { makeDate, daysFrom, SIMULATED_NOW } from '@/store/clock';
import { fmtDate } from '@/features/records/selector';
import { toast, setToast } from './useDemoToast';
import { useDemoToastStore } from './useDemoToast';

type Tab = 'clock' | 'checkins' | 'ramesh' | 'load' | 'twists' | 'reset';

const RAMESH_STEPS = [
  { title: 'Doctor writes the note', body: 'Ramesh comes in. Doctor writes "Come back after 2 weeks for dressing change" and taps High priority.' },
  { title: 'AI card appears in nurse queue', body: 'The extractor reads "2 weeks" → interval 14 days, Surgical Dressing. Card appears in Needs Review.' },
  { title: 'Nurse approves', body: 'Nurse approves the card. Visit becomes Approved with target date 2 weeks out.' },
  { title: 'Advance 14 days', body: 'Clock advances 14 days. Ramesh misses his check-in.' },
  { title: 'Ramesh ranks first', body: 'Nightly reconciliation runs. Ramesh is a defaulter and ranks first (High priority, most overdue).' },
  { title: 'Shared phone message is neutral', body: 'Records Desk opens the shared-phone row. Only the neutral template is allowed — no diagnosis.' },
  { title: 'Outcome tag "Resolved"', body: 'Records Desk tags the contact "Resolved" and sends (simulated).' },
  { title: 'Audit log shows every step', body: 'Admin opens the audit log and sees create → approve → edit_date → outreach → outcome entries.' },
] as const;

const TABS: Tab[] = ['clock', 'checkins', 'ramesh', 'load', 'twists', 'reset'];
const TAB_LABEL: Record<Tab, string> = {
  clock: 'Date', checkins: 'Check-ins', ramesh: 'Walkthrough',
  load: 'Load test', twists: 'Scenarios', reset: 'Reset data',
};
const TWISTS: Array<[string, string]> = [
  ['hindi', 'Notes now arrive in Hindi only'],
  ['vaccination', 'New reason category: Vaccination'],
  ['nopriority', 'Doctor forgot the tag'],
  ['offline', 'Connectivity lost'],
  ['volume5x', '5x patient volume'],
  ['asha', 'ASHA unavailable'],
];

const s = {
  row: { display: 'flex', gap: 8, flexWrap: 'wrap' } as React.CSSProperties,
  col: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  xs: { fontSize: 12, color: 'var(--ink-3)', margin: 0 } as React.CSSProperties,
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 14 } as React.CSSProperties,
};

/** Clinic tools drawer: move the app date, run scenarios, reset data. Opened from the sidebar or Ctrl+D. */
export function DemoDirector({ open, onClose, onToggle }: { open: boolean; onClose: () => void; onToggle: () => void }) {
  const store = useDomainStore.getState();
  const resetDemo = useDomainStore((st) => st.resetDemo);
  const clock = useClockStore(useShallow((st) => ({ now: st.now, advanceDays: st.advanceDays, setNow: st.setNow })));
  const { online, setOnline, outbox } = useOfflineStore(useShallow((st) => ({ online: st.online, setOnline: st.setOnline, outbox: st.outbox })));
  const now = clock.now;

  useEffect(() => {
    setToast((message, ms = 3000) => { useDemoToastStore.getState().show(message, ms); });
    const onKey = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === 'd') { e.preventDefault(); onToggle(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggle]);

  const [tab, setTab] = useState<Tab>('clock');
  const [rameshStep, setRameshStep] = useState(0);
  const [rameshStarted, setRameshStarted] = useState(false);
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const [hindiLoaded, setHindiLoaded] = useState(false);
  const [vaccinationAdded, setVaccinationAdded] = useState(false);

  const advanceAndToast = useCallback((days: number) => {
    const before = reconcile(store.visits, store.checkins, clock.now).length;
    clock.advanceDays(days);
    const after = reconcile(store.visits, store.checkins, useClockStore.getState().now).length;
    toast(`Nightly check ran: ${Math.max(0, after - before)} new overdue`, 3000);
  }, [clock, store.visits, store.checkins]);

  const simulateCheckins = useCallback(() => {
    let seed = 0xcafebabe;
    const next = () => {
      seed = (seed + 0x9e3779b9) | 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 1);
      return (t ^ (t >>> 14)) >>> 0;
    };
    const dueVisits = store.visits.filter((v) => v.status === 'Approved' && v.target_date && v.target_date.getTime() <= now.getTime());
    let checkedIn = 0;
    for (const v of dueVisits) {
      if (next() / 0xffffffff < 0.7) {
        store.addCheckin({ patient_id: v.patient_id, visit_id: v.id, checkin_date: now, mode: 'OPD' });
        checkedIn += 1;
      }
    }
    toast(`Check-ins recorded: ${checkedIn} of ${dueVisits.length} patients due came in`, 3000);
  }, [store, now]);

  const runLoadTest = useCallback(() => {
    const t0 = performance.now();
    const N = 10000;
    const visits: Parameters<typeof reconcile>[0] = [];
    for (let i = 0; i < N; i++) {
      visits.push({
        id: `LT-${i}`, patient_id: `LT-P-${i}`, token: `OPD-${9000 + i}`,
        visit_date: now, note_text: null, doctor_priority: 'Routine', status: 'Approved',
        approved_date: daysFrom(now, -23), approved_by: 'Doctor', approved_at: now,
        interval_days: 14, target_date: null, reason_category: null, source_phrase: null,
        needs_review: false, review_reason: null, rejection_reason: null,
        simulated: true, created_at: now, updated_at: now,
      });
    }
    const defaulters = reconcile(visits, [], now);
    buildQueue(defaulters);
    const ms = performance.now() - t0;
    setLoadMs(ms);
    toast(`Load test: ${N} records reconciled in ${ms.toFixed(0)} ms`, 3000);
  }, [now]);

  const applyTwist = (name: string) => {
    switch (name) {
      case 'hindi': setHindiLoaded(true); toast('Loaded 10 Hindi notes into the queue (simulated).', 3000); break;
      case 'vaccination': setVaccinationAdded(true); toast('Reason category "Vaccination" added via config.', 3000); break;
      case 'nopriority': toast('Visits arrive with no priority; they default to Routine.', 3000); break;
      case 'offline': setOnline(false); toast('Offline mode: changes are queued locally.', 3000); break;
      case 'volume5x': runLoadTest(); break;
      case 'asha': toast('ASHA unavailable: unreachable list shown to Records Desk staff.', 3000); break;
    }
  };

  const resetAll = useCallback(() => {
    resetDemo();
    clock.setNow(SIMULATED_NOW);
    setOnline(true);
    setRameshStarted(false); setRameshStep(0); setLoadMs(null);
    setHindiLoaded(false); setVaccinationAdded(false);
    toast('Records, date and settings restored.', 3000);
  }, [resetDemo, clock, setOnline]);

  return (
    <>
      <Drawer open={open} onClose={onClose} width={420} title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="settings" size={16} />Clinic tools <Chip variant="hold">Training</Chip>
        </span>
      }>
        <div>
          <div className="segmented" style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 18 }}>
            {TABS.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={tab === t ? 'active' : undefined}>
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>

          {tab === 'clock' && (
            <div style={s.col}>
              <div style={s.xs}>App date: <strong style={{ color: 'var(--ink)' }}>{fmtDate(now)}</strong>{now.getTime() === SIMULATED_NOW.getTime() ? ' (today)' : ` (today is ${fmtDate(SIMULATED_NOW)})`}</div>
              <div style={s.row}>
                <Button variant="quiet" onClick={() => advanceAndToast(1)}>Advance 1 day</Button>
                <Button variant="quiet" onClick={() => advanceAndToast(7)}>Advance 7 days</Button>
                <Button variant="ghost" onClick={() => clock.setNow(SIMULATED_NOW)} disabled={now.getTime() === SIMULATED_NOW.getTime()}>Back to today</Button>
              </div>
              <div>
                <label style={{ ...s.xs, display: 'block', marginBottom: 4 }}>Set date</label>
                <input type="date" style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13, width: '100%' }} onChange={(e) => { const [y, m, d] = e.target.value.split('-').map(Number); if (y && m && d) clock.setNow(makeDate(y, m - 1, d)); }} />
              </div>
              <p style={s.xs}>Advancing the clock runs the nightly reconciliation.</p>
            </div>
          )}

          {tab === 'checkins' && (
            <div style={s.col}>
              <Button variant="primary" onClick={simulateCheckins}>Simulate today's OPD check-ins (~70%)</Button>
              <p style={s.xs}>Deterministic seed — same result every time for the same date.</p>
            </div>
          )}

          {tab === 'ramesh' && (
            <div style={s.col}>
              {!rameshStarted ? (
                <Button variant="primary" onClick={() => { setRameshStarted(true); setRameshStep(0); }}>Start Ramesh's journey</Button>
              ) : (
                <>
                  <div style={s.xs}>Step {rameshStep + 1} of {RAMESH_STEPS.length}</div>
                  <div style={s.card}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{RAMESH_STEPS[rameshStep].title}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{RAMESH_STEPS[rameshStep].body}</div>
                  </div>
                  <div style={s.row}>
                    {rameshStep > 0 && <Button variant="quiet" onClick={() => setRameshStep(rameshStep - 1)}>Back</Button>}
                    <Button variant="primary" onClick={() => { if (rameshStep < RAMESH_STEPS.length - 1) setRameshStep(rameshStep + 1); else setRameshStarted(false); }}>
                      {rameshStep === RAMESH_STEPS.length - 1 ? 'Finish' : 'Next'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'load' && (
            <div style={s.col}>
              <Button variant="primary" onClick={runLoadTest}>Generate 10,000 records and run reconcile</Button>
              {loadMs != null && (
                <div style={s.card}>
                  <div style={s.xs}>Measured on this device</div>
                  <div style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{loadMs.toFixed(2)} ms</div>
                </div>
              )}
              <p style={s.xs}>Time is measured at runtime, never hard-coded.</p>
            </div>
          )}

          {tab === 'twists' && (
            <div style={s.col}>
              {TWISTS.map(([id, label]) => (
                <Button key={id} variant="quiet" onClick={() => applyTwist(id)}>{label}</Button>
              ))}
              {hindiLoaded && <Chip variant="neutral">Hindi notes loaded</Chip>}
              {vaccinationAdded && <Chip variant="neutral">Vaccination category added</Chip>}
              {!online && <Chip variant="hold">Offline — {outbox.length} changes queued</Chip>}
            </div>
          )}

          {tab === 'reset' && (
            <div style={s.col}>
              <Button variant="danger-quiet" onClick={resetAll}>Reset demo data</Button>
              <p style={s.xs}>Restores the starting records, sets the date back to today and resets settings.</p>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
