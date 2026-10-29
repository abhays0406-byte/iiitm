import { useState } from 'react';
import { useConfigStore } from '@/config/store';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@/ui/Table';

const inputStyle: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13 };
const sectionStyle: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 4, padding: 12, marginBottom: 16 };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8, display: 'block' };

export function ConfigPage() {
  const cfg = useConfigStore((s) => ({
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
  }));

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '10px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Config (Admin)</h2>
        <Chip variant="neutral">Editable without code changes</Chip>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={sectionStyle}>
          <span style={labelStyle}>Reason categories</span>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Vaccination" style={{ ...inputStyle, flex: 1 }} />
            <Button variant="primary" onClick={addCat}>Add category</Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {cfg.reasonCategories.map((c) => <Chip key={c} variant="neutral">{c}</Chip>)}
          </div>
        </div>

        <div style={sectionStyle}>
          <span style={labelStyle}>Time-phrase patterns</span>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <input value={newPattern} onChange={(e) => setNewPattern(e.target.value)} placeholder="regex pattern" style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as 'fixed' | 'multiplier' | 'vague_quantity')} style={inputStyle}>
              <option value="fixed">fixed days</option>
              <option value="multiplier">number × unit</option>
              <option value="vague_quantity">vague quantity</option>
            </select>
            <input value={newDays} onChange={(e) => setNewDays(e.target.value)} placeholder="days/unit" style={{ ...inputStyle, width: 72 }} />
            <Button variant="primary" onClick={addPattern}>Add pattern</Button>
          </div>
          <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pattern</TableCell><TableCell>Kind</TableCell><TableCell>Days/unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cfg.timePhrasePatterns.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell><span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{p.pattern}</span></TableCell>
                    <TableCell><span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.kind}</span></TableCell>
                    <TableCell><span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{(p as { days?: number; unitDays?: number }).days ?? (p as { days?: number; unitDays?: number }).unitDays ?? '—'}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div style={sectionStyle}>
          <span style={labelStyle}>Clinic settings</span>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>Default priority</div>
              <select value={cfg.defaultPriority} onChange={(e) => cfg.setDefaultPriority(e.target.value as 'Routine' | 'High')} style={inputStyle}>
                <option value="Routine">Routine</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>Month length (days)</div>
              <input type="number" value={cfg.monthDays} onChange={(e) => cfg.setMonthDays(Number(e.target.value) || 30)} style={{ ...inputStyle, width: 80 }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>Working days</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1,2,3,4,5,6,0].map((d) => {
                  const name = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d];
                  const active = cfg.workingDays.includes(d);
                  return (
                    <button key={d} type="button"
                      onClick={() => cfg.setWorkingDays(active ? cfg.workingDays.filter((x) => x !== d) : [...cfg.workingDays, d].sort((a, b) => a - b))}
                      style={{ borderRadius: 4, border: '1px solid', padding: '2px 6px', fontSize: 11, cursor: 'pointer', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--ink-3)' }}>
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {msg && <div style={{ fontSize: 12, color: 'var(--ink)' }}>{msg}</div>}
      </div>
    </div>
  );
}
