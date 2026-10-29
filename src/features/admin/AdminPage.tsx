import { useMemo } from 'react';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { reconcile } from '@/engine/reconcile';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/ui/Table';

const OUTCOME_TAGS = [
  'Resolved', 'Went elsewhere', 'Too far',
  'Cost or leave issue', 'Number wrong or off', 'Could not reach',
] as const;

const pageStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' };
const headerStyle: React.CSSProperties = { borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '10px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 };

export function AdminPage() {
  const visits = useDomainStore((s) => s.visits);
  const patients = useDomainStore((s) => s.patients);
  const checkins = useDomainStore((s) => s.checkins);
  const outreach = useDomainStore((s) => s.outreach);
  const now = useClockStore((s) => s.now);

  const approved = visits.filter((v) => v.status === 'Approved').length;
  const defaulters = reconcile(visits, checkins, now).length;

  const weekAgoMs = now.getTime() - 7 * 86400000;
  const weekOutreach = outreach.filter((o) => o.created_at.getTime() >= weekAgoMs);
  const sent = weekOutreach.filter((o) => o.status === 'Sent').length;
  const pctContacted = weekOutreach.length ? Math.round((sent / weekOutreach.length) * 100) : 0;

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of OUTCOME_TAGS) counts[t] = 0;
    for (const o of outreach) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    }
    return counts;
  }, [outreach]);

  const totalTags = OUTCOME_TAGS.reduce((s, t) => s + (tagCounts[t] ?? 0), 0);
  const maxCount = Math.max(...OUTCOME_TAGS.map((t) => tagCounts[t] ?? 0), 1);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Admin overview</h2>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <Stat number={approved} label="Follow-ups approved" />
          <Stat number={defaulters} label="Overdue defaulters now" />
          <Stat number={`${pctContacted}%`} label="Contacted this week" />
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 16, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>Why patients did not return</h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--ink-3)' }}>Based on simulated outcomes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {OUTCOME_TAGS.map((tag) => {
              const count = tagCounts[tag] ?? 0;
              const width = totalTags ? (count / maxCount) * 100 : 0;
              return (
                <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 150, fontSize: 13, color: 'var(--ink)', flexShrink: 0 }}>{tag}</span>
                  <div style={{ flex: 1, height: 20, background: 'var(--surface)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ height: '100%', background: 'var(--accent)', width: `${width}%`, transition: 'width 120ms ease-out' }} />
                  </div>
                  <span style={{ width: 32, fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--mono)', textAlign: 'right' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow><TableCell>Metric</TableCell><TableCell>Value</TableCell></TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell><span style={{ fontSize: 13 }}>Patients</span></TableCell>
                <TableCell><span style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>{patients.length}</span></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><span style={{ fontSize: 13 }}>Approved visits</span></TableCell>
                <TableCell><span style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>{approved}</span></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><span style={{ fontSize: 13 }}>Outreach attempts</span></TableCell>
                <TableCell><span style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>{outreach.length}</span></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function Stat({ number, label }: { number: string | number; label: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 12, textAlign: 'center', minWidth: 120 }}>
      <div style={{ fontSize: 24, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--ink)' }}>{number}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
