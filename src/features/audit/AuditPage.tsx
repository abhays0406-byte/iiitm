import { useMemo, useState } from 'react';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { Stat } from '@/ui/Stat';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/ui/Table';
import { Banner } from '@/ui/Banner';
import { Chip } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { PageHeader } from '@/ui/PageHeader';
import { fmtDate } from '@/features/records/selector';

function actionVariant(action: string): string {
  if (action.includes('approve')) return 'ok';
  if (action.includes('reject')) return 'high';
  if (action.includes('create') || action.includes('add')) return 'accent';
  if (action.includes('edit') || action.includes('undo')) return 'hold';
  return 'neutral';
}

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
    <div className="page">
      <PageHeader
        eyebrow="Admin · Compliance"
        title="Audit log"
        subtitle="Every change by every role, with what it was before and after."
      />

      <div className="page-body">
        <div className="stack">
          <div className="stat-grid">
            <Stat icon="fileText" value={audit.length} label="Entries" sub="Every change, by every role" />
            <Stat icon="clock" tone="hold" value={audit.filter((a) => fmtDate(a.timestamp) === fmtDate(now)).length} label="Today" sub={fmtDate(now)} />
            <Stat icon="checkCircle" tone="ok" value={audit.filter((a) => a.action.includes('approve')).length} label="Approvals" sub="Nurse and doctor" />
            <Stat icon="x" tone="high" value={audit.filter((a) => a.action.includes('reject')).length} label="Rejections" sub="Sent to audit with a reason" />
          </div>
          <Banner variant="info">This log is append-only.</Banner>

          <section className="card card-flush">
            <div className="card-header">
              <div className="toolbar" style={{ flex: 1 }}>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} aria-label="Filter by role" style={{ height: 36 }}>
                  <option value="All">All roles</option>
                  {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} aria-label="Filter by action" style={{ height: 36 }}>
                  <option value="All">All actions</option>
                  {actions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <div className="search">
                  <Icon name="calendar" size={15} />
                  <input type="text" placeholder="Filter by date (e.g. 12 Nov 2026)" value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)} aria-label="Filter by date" />
                </div>
              </div>
            </div>
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
                    <TableCell className="mono muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(a.timestamp)}</TableCell>
                    <TableCell style={{ fontWeight: 500 }}>{a.actor}</TableCell>
                    <TableCell><Chip variant="outline">{a.role}</Chip></TableCell>
                    <TableCell><Chip variant={actionVariant(a.action)}>{a.action}</Chip></TableCell>
                    <TableCell className="mono" style={{ fontSize: 12 }}>{a.entity}</TableCell>
                    <TableCell>
                      <span className="diff" title={`${a.before} → ${a.after}`}>
                        <span className="diff-before">{a.before ?? '—'}</span>
                        <Icon name="chevronRight" size={12} />
                        <span className="diff-after">{a.after ?? '—'}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="table-empty">
                      {audit.length === 0 ? 'No audit entries yet. Actions by any role will appear here.' : 'No entries match these filters.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>
        </div>
      </div>
    </div>
  );
}
