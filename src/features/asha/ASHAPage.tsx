import { useMemo } from 'react';
import { useDomainStore } from '@/domain/store';
import { fmtDate } from '@/features/records/selector';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/ui/Table';
import { Button } from '@/ui/Button';
import { Banner } from '@/ui/Banner';
import { Chip } from '@/ui/Chip';
import { PageHeader } from '@/ui/PageHeader';
import { Stat } from '@/ui/Stat';

const OUTCOME_TAGS = [
  'Resolved', 'Went elsewhere', 'Too far',
  'Cost or leave issue', 'Number wrong or off', 'Could not reach',
] as const;

export function ASHAPage() {
  const patients = useDomainStore((s) => s.patients);
  const visits = useDomainStore((s) => s.visits);
  const outreach = useDomainStore((s) => s.outreach);
  const setOutcomeTag = useDomainStore((s) => s.setOutcomeTag);

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
    <div className="page asha-print">
      <PageHeader
        eyebrow="ASHA · Field visits"
        title="Unreachable patients"
        subtitle="Patients with no working phone. Visit them at home and record a logistics outcome."
        actions={
          <>
            <Button variant="quiet" icon="printer" kbd="P" onClick={() => window.print()}>Print</Button>
            <Button variant="primary" icon="download" kbd="E" onClick={exportCSV}>Export CSV</Button>
          </>
        }
      />

      <div className="page-body">
        <div className="stack">
          <div className="stat-grid">
            <Stat icon="mapPin" value={rows.length} label="Patients to visit" sub="No working phone" />
            <Stat icon="checkCircle" tone="ok" value={rows.filter((r) => r.outcome !== '—').length} label="Outcome recorded" sub="Visited or resolved" />
            <Stat icon="clock" tone="hold" value={rows.filter((r) => r.outcome === '—').length} label="Not visited yet" sub="Still on the list" />
          </div>
          <section className="card card-flush">
            <div className="card-header">
              <div>
                <div className="card-title">Visit list</div>
                <div className="card-sub">Sorted as received from the Records Desk</div>
              </div>
              <Chip variant="neutral">{rows.length} patients</Chip>
            </div>
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
                    <TableCell>
                      <div style={{ fontWeight: 600 }}>{patient.name}</div>
                      <div className="mono muted" style={{ fontSize: 11 }}>{patient.token}</div>
                    </TableCell>
                    <TableCell className={patient.ward ? undefined : 'muted'}>{patient.ward || 'Not recorded'}</TableCell>
                    <TableCell className="mono">{fmtDate(due ?? null)}</TableCell>
                    <TableCell>
                      <select value={outcome} onChange={(e) => setTag(patient.id, e.target.value)} aria-label={`Outcome for ${patient.name}`} style={{ minWidth: 190 }}>
                        <option value="—">Not visited yet</option>
                        {OUTCOME_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="table-empty">No unreachable patients. Everyone on the list has a working phone.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          <Banner variant="info">Outcome tags are logistics only, never clinical. Read-only view for ASHA workers.</Banner>
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
