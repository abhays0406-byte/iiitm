import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useConfigStore } from '@/config/store';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Banner } from '@/ui/Banner';
import { PageHeader } from '@/ui/PageHeader';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/ui/Table';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ConfigPage() {
  const cfg = useConfigStore(useShallow((s) => ({
    reasonCategories: s.reasonCategories,
    timePhrasePatterns: s.timePhrasePatterns,
    defaultPriority: s.defaultPriority,
    workingDays: s.workingDays,
    monthDays: s.monthDays,
    addReasonCategory: s.addReasonCategory,
    addTimePhrasePattern: s.addTimePhrasePattern,
    setWorkingDays: s.setWorkingDays,
    setDefaultPriority: s.setDefaultPriority,
    setMonthDays: s.setMonthDays,
    reset: s.reset,
  })));

  const [newCat, setNewCat] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newKind, setNewKind] = useState<'fixed' | 'multiplier' | 'vague_quantity'>('fixed');
  const [newDays, setNewDays] = useState('');
  const [msg, setMsg] = useState('');

  const addCat = () => {
    if (!newCat.trim()) return;
    cfg.addReasonCategory(newCat.trim());
    setMsg(`Added category "${newCat.trim()}".`);
    setNewCat('');
    setTimeout(() => setMsg(''), 2500);
  };

  const addPattern = () => {
    if (!newPattern.trim()) return;
    const p: Parameters<typeof cfg.addTimePhrasePattern>[0] = { pattern: newPattern.trim(), kind: newKind } as never;
    if (newKind === 'fixed') (p as never as { days: number }).days = Number(newDays) || 30;
    else (p as never as { unitDays: number }).unitDays = Number(newDays) || 1;
    cfg.addTimePhrasePattern(p);
    setMsg(`Added phrase pattern "${newPattern.trim()}".`);
    setNewPattern('');
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Admin"
        title="Configuration"
        subtitle="Tune what the extractor understands and how the clinic works. Changes apply immediately, without code changes."
      />

      <div className="page-body">
        <div className="stack" style={{ maxWidth: 1000 }}>
          {msg && <Banner variant="ok">{msg}</Banner>}

          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Reason categories</div>
                <div className="card-sub">Labels the extractor can attach to a note</div>
              </div>
              <Chip variant="neutral">{cfg.reasonCategories.length}</Chip>
            </div>
            <div className="card-body">
              <div className="toolbar" style={{ marginBottom: 14 }}>
                <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCat(); }}
                  placeholder="e.g. Vaccination" aria-label="New reason category" style={{ flex: 1, height: 36 }} />
                <Button variant="primary" icon="plus" onClick={addCat}>Add category</Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cfg.reasonCategories.map((c) => <Chip key={c} variant="accent">{c}</Chip>)}
              </div>
            </div>
          </section>

          <section className="card card-flush">
            <div className="card-header">
              <div>
                <div className="card-title">Time-phrase patterns</div>
                <div className="card-sub">Regular expressions that turn words like "next week" into days</div>
              </div>
              <Chip variant="neutral">{cfg.timePhrasePatterns.length}</Chip>
            </div>
            <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="toolbar">
                <input value={newPattern} onChange={(e) => setNewPattern(e.target.value)} placeholder="Regex pattern, e.g. \bdo hafte\b"
                  aria-label="New pattern" style={{ flex: 1, minWidth: 180, height: 36, fontFamily: 'var(--mono)' }} />
                <select value={newKind} onChange={(e) => setNewKind(e.target.value as 'fixed' | 'multiplier' | 'vague_quantity')} aria-label="Pattern kind" style={{ height: 36 }}>
                  <option value="fixed">fixed days</option>
                  <option value="multiplier">number × unit</option>
                  <option value="vague_quantity">vague quantity</option>
                </select>
                <input value={newDays} onChange={(e) => setNewDays(e.target.value)} placeholder="Days" aria-label="Days or unit days" style={{ width: 80, height: 36 }} />
                <Button variant="primary" icon="plus" onClick={addPattern}>Add pattern</Button>
              </div>
            </div>
            <div style={{ maxHeight: 320, overflow: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Pattern</TableCell><TableCell>Kind</TableCell><TableCell style={{ textAlign: 'right' }}>Days / unit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cfg.timePhrasePatterns.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="mono" style={{ fontSize: 12 }}>{p.pattern}</TableCell>
                      <TableCell><Chip variant={p.kind === 'fixed' ? 'outline' : p.kind === 'multiplier' ? 'accent' : 'hold'}>{p.kind}</Chip></TableCell>
                      <TableCell className="mono" style={{ textAlign: 'right' }}>{(p as { days?: number; unitDays?: number }).days ?? (p as { days?: number; unitDays?: number }).unitDays ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Clinic settings</div>
                <div className="card-sub">Used when the nurse picks or checks a due date</div>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <label className="field-label" htmlFor="default-priority">Default priority</label>
                  <select id="default-priority" value={cfg.defaultPriority} onChange={(e) => cfg.setDefaultPriority(e.target.value as 'Routine' | 'High')} style={{ height: 36, minWidth: 140 }}>
                    <option value="Routine">Routine</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="month-days">Month length (days)</label>
                  <input id="month-days" type="number" value={cfg.monthDays} onChange={(e) => cfg.setMonthDays(Number(e.target.value) || 30)} style={{ width: 100, height: 36, fontFamily: 'var(--mono)' }} />
                </div>
                <div>
                  <span className="field-label">Working days</span>
                  <div className="day-toggles">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                      const active = cfg.workingDays.includes(d);
                      return (
                        <button key={d} type="button" aria-pressed={active} className={active ? 'on' : undefined}
                          onClick={() => cfg.setWorkingDays(active ? cfg.workingDays.filter((x) => x !== d) : [...cfg.workingDays, d].sort((a, b) => a - b))}>
                          {DAY_NAMES[d]}
                        </button>
                      );
                    })}
                  </div>
                  {!cfg.workingDays.includes(0) && <div className="hint" style={{ marginTop: 6 }}>Sunday. OPD closed</div>}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
