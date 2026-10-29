import { useState } from 'react';
import { Icon } from './Icon';

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
    <>
      <div className="overlay" style={{ zIndex: 60 }} onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Pick a due date" style={{ width: 340, zIndex: 61 }} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div className="drawer-title">Pick a due date</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close date picker">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="drawer-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button type="button" className="icon-btn" onClick={() => setFocusDate(new Date(year, month - 1, 1))} aria-label="Previous month">
              <Icon name="chevronLeft" size={16} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{MONTHS[month]} {year}</span>
            <button type="button" className="icon-btn" onClick={() => setFocusDate(new Date(year, month + 1, 1))} aria-label="Next month">
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
          <div className="cal-grid">
            {DAYS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`pad-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = new Date(year, month, i + 1);
              const isSel = selected && d.toDateString() === selected.toDateString();
              const working = workingDays.includes(d.getDay());
              return (
                <button key={i} type="button" onClick={() => { onSelect(d); onClose(); }} disabled={!working}
                  className={`cal-day${isSel ? ' selected' : ''}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <p className="hint" style={{ marginTop: 16 }}>Non-working days are greyed and cannot be selected.</p>
        </div>
      </div>
    </>
  );
}
