import { NavLink } from 'react-router-dom';

type Role = 'Doctor' | 'Nurse' | 'Records Desk' | 'ASHA' | 'Admin';

const NAV_BY_ROLE: Record<Role, { label: string; to: string }[]> = {
  Doctor: [
    { label: 'Today', to: '/doctor' },
    { label: 'Queue', to: '/nurse' },
  ],
  Nurse: [
    { label: 'Validation', to: '/nurse' },
    { label: 'Records', to: '/records' },
  ],
  'Records Desk': [
    { label: 'Defaulters', to: '/records' },
    { label: 'ASHA', to: '/asha' },
  ],
  ASHA: [
    { label: 'Unreachable', to: '/asha' },
  ],
  Admin: [
    { label: 'Audit', to: '/audit' },
    { label: 'Admin', to: '/admin' },
    { label: 'Config', to: '/config' },
  ],
};

export function Nav({ role }: { role: Role }) {
  const items = NAV_BY_ROLE[role];
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, borderRight: '1px solid var(--border)', flexShrink: 0, width: 120 }}>
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          style={({ isActive }) => ({
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            border: '1px solid',
            borderColor: isActive ? 'var(--border)' : 'transparent',
            background: isActive ? 'var(--surface)' : 'transparent',
            color: isActive ? 'var(--ink)' : 'var(--ink-3)',
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
