import { useState, useMemo } from 'react';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { buildSafeRows, buildUpcomingRows, neutralMessage, messageContainsForbidden, fmtDate } from '@/features/records/selector';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/ui/Table';
import { Chip, PriorityBadge } from '@/ui/Chip';
import { Drawer } from '@/ui/Drawer';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Banner } from '@/ui/Banner';
import { PageHeader } from '@/ui/PageHeader';
import { Stat } from '@/ui/Stat';
import { NewPatientDrawer } from '@/features/patients/NewPatientDrawer';
import { toast } from '@/features/demo/useDemoToast';

type Filter = 'All' | 'High' | 'Routine';

export function RecordsDesk() {
  const visits = useDomainStore((s) => s.visits);
  const patients = useDomainStore((s) => s.patients);
  const checkins = useDomainStore((s) => s.checkins);
  const outreach = useDomainStore((s) => s.outreach);
  const recordOutreach = useDomainStore((s) => s.recordOutreach);
  const audit = useDomainStore((s) => s.audit);
  const now = useClockStore((s) => s.now);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const editing = editId ? patients.find((p) => p.id === editId) : undefined;
  // Patients registered at the desk or by a doctor, newest first. Only demographics: no clinical data.
  const registered = useMemo(() => {
    const ids = audit.filter((a) => a.action === 'register_patient').map((a) => a.entity_id).reverse();
    return ids.map((id) => patients.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  }, [audit, patients]);

  const [filterPriority, setFilterPriority] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [drawerRow, setDrawerRow] = useState<{ visitId: string; patientId: string; token: string; name: string; shared: boolean } | null>(null);

  // A reminder counts as sent once an outreach record exists for the visit, so it survives reloads.
  const sentIds = useMemo(() => new Set(outreach.filter((o) => o.status === 'Sent').map((o) => o.visit_id)), [outreach]);
  const allRows = useMemo(() => buildSafeRows(visits, patients, checkins, now), [visits, patients, checkins, now]);
  const upcoming = useMemo(() => buildUpcomingRows(visits, patients, checkins, now), [visits, patients, checkins, now]);
  const unreachableRows = allRows.filter((r) => r.unreachable);
  const phoneRows = allRows.filter((r) => !r.unreachable);
  const highCount = phoneRows.filter((r) => r.priority === 'High').length;

  const filtered = phoneRows.filter((r) => {
    if (filterPriority !== 'All' && r.priority !== filterPriority) return false;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.token.toLowerCase().includes(q);
  });

  const approveAndSend = (r: { visitId: string; patientId: string; token: string }) => {
    const message = neutralMessage(r.token);
    if (messageContainsForbidden(message)) return;
    recordOutreach({ patient_id: r.patientId, visit_id: r.visitId, channel: 'SMS', message, status: 'Sent', sent_at: now });
  };

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: 'All', label: 'All', count: phoneRows.length },
    { id: 'High', label: 'High', count: highCount },
    { id: 'Routine', label: 'Routine', count: phoneRows.length - highCount },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Records Desk"
        title="Overdue follow-ups"
        subtitle="Ranked by doctor priority, then days overdue, then token. Ranks missing here belong to patients on the ASHA list below. Diagnosis is never shown."
        actions={<Button variant="primary" icon="plus" onClick={() => setRegisterOpen(true)}>Register patient</Button>}
      />

      <div className="page-body">
        <div className="stack">
          <div className="stat-grid">
            <Stat icon="alertCircle" tone="high" value={phoneRows.length} label="Overdue, reachable by phone" sub={`${phoneRows.filter((r) => sentIds.has(r.visitId)).length} reminded so far`} />
            <Stat icon="activity" tone="hold" value={highCount} label="High priority among them" sub="Call these first" />
            <Stat icon="mapPin" tone="accent" value={unreachableRows.length} label="Moved to the ASHA list" sub="No working phone" />
            <Stat icon="calendar" tone="ok" value={upcoming.length} label="Upcoming follow-ups" sub={upcoming.length ? `Next: ${upcoming[0].dueDate}` : 'Nothing scheduled'} />
          </div>

          <section className="card card-flush">
            <div className="card-header" style={{ flexWrap: 'wrap' }}>
              <div className="segmented" role="tablist" aria-label="Filter by priority">
                {FILTERS.map((f) => (
                  <button key={f.id} type="button" role="tab" aria-selected={filterPriority === f.id}
                    className={filterPriority === f.id ? 'active' : undefined} onClick={() => setFilterPriority(f.id)}>
                    {f.label} <span className="count">{f.count}</span>
                  </button>
                ))}
              </div>
              <div className="search" style={{ maxWidth: 360 }}>
                <Icon name="search" size={15} />
                <input type="text" placeholder="Search name or token" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search name or token" />
              </div>
            </div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell><TableCell>Patient</TableCell><TableCell>Contact</TableCell>
                  <TableCell>Due date</TableCell><TableCell>Overdue</TableCell><TableCell>Priority</TableCell>
                  <TableCell>Diagnosis</TableCell><TableCell>Why this rank</TableCell><TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.visitId} onClick={() => setDrawerRow({ visitId: r.visitId, patientId: r.patientId, token: r.token, name: r.name, shared: r.shared })}>
                    <TableCell><span className="rank">{r.rank}</span></TableCell>
                    <TableCell>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div className="mono muted" style={{ fontSize: 11 }}>{r.token}</div>
                    </TableCell>
                    <TableCell>
                      <div className="mono">{r.contact}</div>
                      {r.shared && <Chip variant="outline" style={{ marginTop: 4 }}><Icon name="users" size={11} />Shared phone</Chip>}
                    </TableCell>
                    <TableCell className="mono">{r.dueDate}</TableCell>
                    <TableCell>
                      <Chip variant={r.daysOverdue >= 7 ? 'high' : 'hold'}><span className="mono">{r.daysOverdue}d</span></Chip>
                    </TableCell>
                    <TableCell><PriorityBadge priority={r.priority} /></TableCell>
                    <TableCell><Chip variant="outline"><Icon name="lock" size={11} />Hidden by policy</Chip></TableCell>
                    <TableCell className="muted" style={{ fontSize: 12 }}>{r.whyThisRank}</TableCell>
                    <TableCell style={{ textAlign: 'right' }}>
                      {sentIds.has(r.visitId)
                        ? <Chip variant="ok"><Icon name="check" size={11} />Sent</Chip>
                        : <Icon name="chevronRight" size={16} style={{ color: 'var(--ink-3)' }} />}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="table-empty">No matching defaulters. Try another filter or search.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          {unreachableRows.length > 0 && (
            <section className="card card-flush">
              <div className="card-header">
                <div>
                  <div className="card-title">Moved to ASHA list</div>
                  <div className="card-sub">No working phone. An ASHA worker will visit.</div>
                </div>
                <Chip variant="neutral">{unreachableRows.length}</Chip>
              </div>
              {unreachableRows.map((r) => (
                <div key={r.visitId} className="list-row">
                  <span className="rank" title="Rank in the overall queue">{r.rank}</span>
                  <span className="mono muted" style={{ fontSize: 11 }}>{r.token}</span>
                  <span style={{ fontWeight: 500 }}>{r.name}</span>
                  <span className="mono muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{r.dueDate}</span>
                  <Chip variant="hold">Unreachable</Chip>
                </div>
              ))}
            </section>
          )}

          {registered.length > 0 && (
            <section className="card card-flush">
              <div className="card-header">
                <div>
                  <div className="card-title">Recently registered</div>
                  <div className="card-sub">New patients get a token now and appear in the lists above once the doctor writes a follow-up.</div>
                </div>
                <Chip variant="accent">{registered.length}</Chip>
              </div>
              {registered.slice(0, 8).map((p) => (
                <div key={p.id} className="list-row">
                  <span className="mono muted" style={{ fontSize: 11 }}>{p.token}</span>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{p.age} / {p.sex}</span>
                  <span className="mono muted" style={{ fontSize: 12 }}>{p.phone || 'No phone'}</span>
                  {p.unreachable_flag && <Chip variant="hold">ASHA</Chip>}
                  {p.ward && <span className="muted" style={{ fontSize: 12 }}>{p.ward}</span>}
                  {(() => {
                    // Status only, from the patient's latest visit: the note itself never reaches this desk.
                    const latest = visits.filter((v) => v.patient_id === p.id).at(-1);
                    const label = !latest ? 'No follow-up yet'
                      : latest.status === 'Approved' ? `Due ${latest.target_date ? fmtDate(latest.target_date) : 'date set'}`
                      : latest.status === 'Rejected' ? 'Closed'
                      : 'Awaiting approval';
                    const variant = !latest ? 'outline' : latest.status === 'Approved' ? 'ok' : latest.status === 'Rejected' ? 'neutral' : 'accent';
                    return <Chip variant={variant} style={{ marginLeft: 'auto' }}>{label}</Chip>;
                  })()}
                  <button type="button" className="icon-btn" onClick={() => setEditId(p.id)} aria-label={`Edit details for ${p.name}`} title="Edit details">
                    <Icon name="pen" size={15} />
                  </button>
                </div>
              ))}
            </section>
          )}

          <section className="card card-flush">
            <div className="card-header">
              <div>
                <div className="card-title">Upcoming follow-ups</div>
                <div className="card-sub">Approved by the nurse or doctor and not due yet. They move to the list above if the patient misses the date.</div>
              </div>
              <Chip variant="accent">{upcoming.length}</Chip>
            </div>
            {upcoming.length === 0 && (
              <div className="list-row muted" style={{ justifyContent: 'center', padding: 24 }}>
                Nothing scheduled yet. Follow-ups appear here as soon as they are approved.
              </div>
            )}
            {upcoming.map((r) => (
              <div key={r.visitId} className="list-row">
                <span className="mono muted" style={{ fontSize: 11 }}>{r.token}</span>
                <span style={{ fontWeight: 600 }}>{r.name}</span>
                <span className="mono muted" style={{ fontSize: 12 }}>{r.contact}</span>
                <PriorityBadge priority={r.priority} />
                {r.unreachable && <Chip variant="hold">ASHA</Chip>}
                <span className="mono muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{r.dueDate}</span>
                <Chip variant={r.daysUntilDue === 0 ? 'hold' : 'outline'}>
                  {r.daysUntilDue === 0 ? 'Due today' : `In ${r.daysUntilDue}d`}
                </Chip>
              </div>
            ))}
          </section>
        </div>
      </div>

      <NewPatientDrawer
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onCreated={(p) => { setRegisterOpen(false); toast(`Registered ${p.name} as ${p.token}.`, 4000); }}
      />

      {editing && (
        <NewPatientDrawer
          key={`edit-${editing.id}-${editing.updated_at.getTime()}`}
          patient={editing}
          open
          onClose={() => setEditId(null)}
          onCreated={(p) => { setEditId(null); toast(`Saved changes to ${p.name} (${p.token}).`, 3000); }}
        />
      )}

      <Drawer open={drawerRow != null} onClose={() => setDrawerRow(null)} title="Send reminder">
        {drawerRow && (
          <div className="stack" style={{ gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar">{drawerRow.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{drawerRow.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>Token {drawerRow.token}</div>
              </div>
              <Button variant="ghost" size="small" icon="pen" style={{ marginLeft: 'auto' }}
                onClick={() => { const id = drawerRow.patientId; setDrawerRow(null); setEditId(id); }}>
                Edit details
              </Button>
            </div>
            {drawerRow.shared && (
              <Banner variant="info">Privacy-safe template. Diagnosis cannot be included.</Banner>
            )}
            <div>
              <div className="field-label">SMS preview</div>
              <div className="sms-bubble">{neutralMessage(drawerRow.token)}</div>
              <div className="hint" style={{ marginTop: 6 }}>Neutral template. No diagnosis, department or reason.</div>
            </div>
            {sentIds.has(drawerRow.visitId) ? (
              <Banner variant="ok">Reminder approved. Sent (simulated).</Banner>
            ) : (
              <Button variant="primary" size="large" icon="send" onClick={() => approveAndSend(drawerRow)} style={{ width: '100%' }}>
                Approve and send
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
