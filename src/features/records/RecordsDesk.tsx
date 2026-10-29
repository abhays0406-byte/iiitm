import { useState, useMemo } from 'react';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { buildSafeRows, neutralMessage, messageContainsForbidden } from '@/features/records/selector';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/ui/Table';
import { Chip } from '@/ui/Chip';
import { Drawer } from '@/ui/Drawer';

const PRIORITIES = ['High', 'Routine'] as const;

const pageStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' };
const headerStyle: React.CSSProperties = { borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '10px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 };
const bodyStyle: React.CSSProperties = { flex: 1, overflow: 'auto', padding: 16 };

export function RecordsDesk() {
  const visits = useDomainStore((s) => s.visits);
  const patients = useDomainStore((s) => s.patients);
  const checkins = useDomainStore((s) => s.checkins);
  const recordOutreach = useDomainStore((s) => s.recordOutreach);
  const now = useClockStore((s) => s.now);

  const [filterPriority, setFilterPriority] = useState<'High' | 'Routine' | 'All'>('All');
  const [search, setSearch] = useState('');
  const [drawerRow, setDrawerRow] = useState<{ visitId: string; token: string } | null>(null);

  const allRows = useMemo(() => buildSafeRows(visits, patients, checkins, now), [visits, patients, checkins, now]);
  const unreachableRows = allRows.filter((r) => r.unreachable);
  const phoneRows = allRows.filter((r) => !r.unreachable);

  const filtered = phoneRows.filter((r) => {
    if (filterPriority !== 'All' && r.priority !== filterPriority) return false;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.token.toLowerCase().includes(q);
  });

  const approveAndSend = (r: { visitId: string; token: string }) => {
    const message = neutralMessage(r.token);
    if (messageContainsForbidden(message)) return;
    recordOutreach({ patient_id: r.visitId, visit_id: r.visitId, channel: 'SMS', message, status: 'Sent', sent_at: now });
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Records Desk</h2>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>

      <div style={bodyStyle}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as 'High' | 'Routine' | 'All')}
            style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13 }}>
            <option value="All">All priority</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="text" placeholder="Search name or token" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13 }} />
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell><TableCell>Name</TableCell><TableCell>Contact</TableCell>
                <TableCell>Due date</TableCell><TableCell>Days overdue</TableCell><TableCell>Priority</TableCell>
                <TableCell>Diagnosis</TableCell><TableCell>Why this rank</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.visitId} onClick={() => setDrawerRow({ visitId: r.visitId, token: r.token })} style={{ cursor: 'pointer' }}>
                  <TableCell><span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{r.rank}</span></TableCell>
                  <TableCell><span style={{ fontSize: 13, color: 'var(--ink)' }}>{r.name}</span></TableCell>
                  <TableCell><span style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>{r.contact}</span></TableCell>
                  <TableCell><span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{r.dueDate}</span></TableCell>
                  <TableCell><span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{r.daysOverdue}</span></TableCell>
                  <TableCell>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.priority === 'High' ? 'var(--high)' : 'var(--ink-3)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{r.priority}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <div style={{ width: 96, height: 20, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--ink-3)' }}>
                      Hidden by policy
                    </div>
                  </TableCell>
                  <TableCell><span style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--mono)' }}>{r.whyThisRank}</span></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', padding: 16 }}>No matching defaulters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {unreachableRows.length > 0 && (
          <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>
              Moved to ASHA list ({unreachableRows.length})
            </div>
            <div style={{ padding: 8 }}>
              {unreachableRows.map((r) => (
                <div key={r.visitId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{r.token}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink)' }}>{r.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{r.dueDate}</span>
                  <Chip variant="neutral">Unreachable</Chip>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Drawer open={drawerRow != null} onClose={() => setDrawerRow(null)}>
        <div style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Contact details</h3>
          {drawerRow && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Token</div>
              <div style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--ink)', marginBottom: 8 }}>{drawerRow.token}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Message preview</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', wordBreak: 'break-word', marginBottom: 12 }}>{neutralMessage(drawerRow.token)}</div>
              <button type="button" onClick={() => approveAndSend(drawerRow)}
                style={{ padding: '6px 16px', fontSize: 13, border: '1px solid var(--ink)', borderRadius: 4, background: 'var(--ink)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Approve and send
              </button>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
