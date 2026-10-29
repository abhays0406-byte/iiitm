import { useMemo, useState } from 'react';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/ui/Table';
import { Banner } from '@/ui/Banner';
import { fmtDate } from '@/features/records/selector';

const pageStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' };
const headerStyle: React.CSSProperties = { borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '10px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 };
const inputStyle: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13 };

export function AuditPage() {
  const audit = useDomainStore((s) => s.audit);
  const now = useClockStore((s) => s.now);

  const [filterRole, setFilterRole] = useState('All');
  const [filterAction, setFilterAction] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  const roles = [...new Set(audit.map((a) => a.role))].sort();
  const actions = [...new Set(audit.map((a) => a.action))].sort();

  const filtered = useMemo(() => audit.filter((a) => {
    if (filterRole !== 'All' && a.role !== filterRole) return false;
    if (filterAction !== 'All' && a.action !== filterAction) return false;
    if (filterDate && !fmtDate(a.timestamp).includes(filterDate)) return false;
    return true;
  }), [audit, filterRole, filterAction, filterDate]);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Audit log</h2>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <Banner variant="info"><span style={{ fontSize: 13, fontWeight: 500 }}>This log is append-only.</span></Banner>

        <div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={inputStyle}>
            <option value="All">All roles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={inputStyle}>
            <option value="All">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="text" placeholder="Filter by date (e.g. 12 Nov 2026)" value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell><TableCell>Actor</TableCell><TableCell>Role</TableCell>
                <TableCell>Action</TableCell><TableCell>Entity</TableCell><TableCell>Before → After</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell><span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-2)' }}>{fmtDate(a.timestamp)}</span></TableCell>
                  <TableCell><span style={{ fontSize: 13 }}>{a.actor}</span></TableCell>
                  <TableCell><span style={{ fontSize: 13 }}>{a.role}</span></TableCell>
                  <TableCell><span style={{ fontSize: 13 }}>{a.action}</span></TableCell>
                  <TableCell><span style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>{a.entity}</span></TableCell>
                  <TableCell><span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-2)' }} title={`${a.before} → ${a.after}`}>{a.before} → {a.after}</span></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', padding: 16 }}>No audit entries.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
