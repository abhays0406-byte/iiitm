import { useMemo } from 'react';
import { useDomainStore } from '@/domain/store';
import { useClockStore } from '@/store/clock';
import { reconcile } from '@/engine/reconcile';
import { PageHeader } from '@/ui/PageHeader';
import { Stat } from '@/ui/Stat';

const OUTCOME_TAGS = [
  'Resolved', 'Went elsewhere', 'Too far',
  'Cost or leave issue', 'Number wrong or off', 'Could not reach',
] as const;

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
    <div className="page">
      <PageHeader
        eyebrow="Admin"
        title="Overview"
        subtitle="How follow-ups are moving through the clinic this week."
      />

      <div className="page-body">
        <div className="stack">
          <div className="stat-grid">
            <Stat icon="checkCircle" tone="ok" value={approved} label="Follow-ups approved" sub="Dates confirmed by staff" />
            <Stat icon="alertCircle" tone="high" value={defaulters} label="Overdue defaulters now" sub="Past their due date" />
            <Stat icon="send" tone="accent" value={`${pctContacted}%`} label="Contacted this week" sub={`${sent} of ${weekOutreach.length} reminders sent`} />
            <Stat icon="users" tone="hold" value={patients.length} label="Patients on record" sub="Registered at this OPD" />
          </div>

          <div className="admin-grid">
            <section className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Why patients did not return</div>
                  <div className="card-sub">Based on simulated outcomes</div>
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {OUTCOME_TAGS.map((tag) => {
                  const count = tagCounts[tag] ?? 0;
                  const width = totalTags ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={tag} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 36px', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13 }}>{tag}</span>
                      <div className="meter" style={{ height: 8 }}><span style={{ width: `${width}%` }} /></div>
                      <span style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--mono)', textAlign: 'right' }}>{count}</span>
                    </div>
                  );
                })}
                {totalTags === 0 && (
                  <div className="hint">No outcomes tagged yet. They appear once the Records Desk or ASHA tags a contact.</div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <div className="card-title">Totals</div>
              </div>
              <div className="card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
                <dl className="def-list" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div><dt>Patients</dt><dd style={{ fontFamily: 'var(--mono)' }}>{patients.length}</dd></div>
                  <div><dt>Approved visits</dt><dd style={{ fontFamily: 'var(--mono)' }}>{approved}</dd></div>
                  <div><dt>Outreach attempts</dt><dd style={{ fontFamily: 'var(--mono)' }}>{outreach.length}</dd></div>
                  <div><dt>Contacted this week</dt><dd style={{ fontFamily: 'var(--mono)' }}>{sent} of {weekOutreach.length}</dd></div>
                </dl>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
