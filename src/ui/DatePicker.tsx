import { useState } from 'react';

interface DatePickerProps {
  open: boolean;
  onClose: () => void;
  selected: Date | null;
  onSelect: (date: Date) => void;
  workingDays: number[];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function DatePicker({ open, onClose, selected, onSelect, workingDays }: DatePickerProps) {
  const [focusDate, setFocusDate] = useState(() => selected ?? new Date());
  if (!open) return null;

  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(26,26,26,0.2)' }} onClick={onClose}>
      <div style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 300, background: 'var(--bg)', borderLeft: '1px solid var(--border)', zIndex: 60, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '10px 16px' }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => setFocusDate(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }} aria-label="Previous month">‹</button>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{MONTHS[month]} {year}</span>
            <button type="button" onClick={() => setFocusDate(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }} aria-label="Next month">›</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          {DAYS.map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-2)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 8px 16px' }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = new Date(year, month, i + 1);
            const isSel = selected && d.toDateString() === selected.toDateString();
            const working = workingDays.includes(d.getDay());
            return (
              <button key={i} type="button" onClick={() => { onSelect(d); onClose(); }} disabled={!working}
                style={{ height: 32, borderRadius: 4, fontSize: 12, border: 'none', cursor: working ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSel ? 'var(--accent)' : 'transparent',
                  color: isSel ? '#fff' : working ? 'var(--ink)' : 'var(--ink-3)' }}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', padding: '12px 16px', fontSize: 11, color: 'var(--ink-3)' }}>
          Non-working days are greyed and cannot be selected.
        </div>
      </div>
    </div>
  );
}
