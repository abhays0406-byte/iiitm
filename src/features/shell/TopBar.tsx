import { useState } from 'react';
import { useClockStore } from '@/store/clock';
import { Icon } from '@/ui/Icon';

type Role = 'Doctor' | 'Nurse' | 'Records Desk' | 'ASHA' | 'Admin';

const ROLES: Role[] = ['Doctor', 'Nurse', 'Records Desk', 'ASHA', 'Admin'];

export function TopBar({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const { now } = useClockStore();

  const demoDate = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg)', padding: '10px 16px', flexShrink: 0 }}>
      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Follow-Up Assistant</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 4, padding: '2px 10px' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Viewing as</span>
          <select
            value={role}
            onChange={(e) => onChange(e.target.value as Role)}
            style={{ border: 'none', background: 'transparent', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            aria-label="Role switcher"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
          <span style={{ fontWeight: 500 }}>Demo date</span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{demoDate}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-2)' }}>
          <Icon name="wifi" size={12} />
          <span>Online</span>
        </div>
      </div>
    </header>
  );
}
