import { useMemo } from 'react';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { fmtDate } from '@/features/records/selector';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/ui/Table';
import { Button } from '@/ui/Button';
import { Kbd } from '@/ui/Kbd';

const OUTCOME_TAGS = [
  'Resolved', 'Went elsewhere', 'Too far',
  'Cost or leave issue', 'Number wrong or off', 'Could not reach',
] as const;

const pageStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' };
const headerStyle: React.CSSProperties = { borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '10px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 };

export function ASHAPage() {
  const patients = useDomainStore((s) => s.patients);
  const visits = useDomainStore((s) => s.visits);
  const outreach = useDomainStore((s) => s.outreach);
  const setOutcomeTag = useDomainStore((s) => s.setOutcomeTag);
  const now = useClockStore((s) => s.now);

  const unreachable = patients.filter((p) => p.unreachable_flag);

  const latestOutcome = new Map<string, string>();
  for (const o of outreach) {
    const cur = latestOutcome.get(o.patient_id);
    if (!cur || o.created_at.getTime() > new Date(cur).getTime()) {
      latestOutcome.set(o.patient_id, o.status);
    }
  }

  const lastDue = new Map<string, Date | null>();
  for (const v of visits) {
    if (v.status === 'Approved' && v.target_date) {
      const cur = lastDue.get(v.patient_id);
      if (!cur || v.target_date.getTime() > cur.getTime()) lastDue.set(v.patient_id, v.target_date);
    }
  }

  const rows = useMemo(
    () => unreachable.map((p) => ({ patient: p, outcome: latestOutcome.get(p.id) || '—', due: lastDue.get(p.id) })),
    [unreachable],
  );

  const setTag = (patientId: string, tag: string) => {
    const o = [...outreach].filter((x) => x.patient_id === patientId).sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
    if (o) setOutcomeTag(o.id, tag);
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>ASHA list</h2>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button variant="primary" onClick={exportCSV}><Kbd>E</Kbd> Export CSV</Button>
          <Button variant="quiet" onClick={() => window.print()}><Kbd>P</Kbd> Print</Button>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Area / ward</TableCell>
                <TableCell>Last due date</TableCell>
                <TableCell>Outcome tag</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ patient, outcome, due }) => (
                <TableRow key={patient.id}>
                  <TableCell><span style={{ fontSize: 13, color: 'var(--ink)' }}>{patient.name}</span></TableCell>
                  <TableCell><span style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--mono)' }}>{patient.ward || '—'}</span></TableCell>
                  <TableCell><span style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>{fmtDate(due ?? null)}</span></TableCell>
                  <TableCell>
                    <select value={outcome} onChange={(e) => setTag(patient.id, e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', fontSize: 12 }}>
                      <option value="—">—</option>
                      {OUTCOME_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={4} style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', padding: 16 }}>No unreachable patients.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--ink-3)' }}>
          Outcome tags are logistics only, never clinical. Read-only view for ASHA workers.
        </div>
      </div>
    </div>
  );
}

function exportCSV() {
  const blob = new Blob(['Name,Ward,Last due date,Outcome tag'], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'asha-list.csv'; a.click();
  URL.revokeObjectURL(url);
}
