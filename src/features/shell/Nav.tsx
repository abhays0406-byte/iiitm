import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { useDomainStore } from '@/domain/store';
import { useClockStore, SIMULATED_NOW } from '@/store/clock';
import { reconcile } from '@/engine/reconcile';
import { NAV_BY_ROLE, STAFF_BY_ROLE, type Role } from '@/features/shell/roles';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Date from the app clock (it can run ahead for training) with the real time of day, ticking. */
function SidebarClock() {
  const appDate = useClockStore((s) => s.now);
  const [wall, setWall] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setWall(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const ahead = appDate.getTime() !== SIMULATED_NOW.getTime();
  const time = wall.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  return (
    <div className="side-clock" aria-label="Date and time">
      <div className="side-clock-time">{time}</div>
      <div className="side-clock-date">
        {WEEKDAYS[appDate.getDay()]}, {appDate.getDate()} {MONTHS[appDate.getMonth()]} {appDate.getFullYear()}
      </div>
      {ahead && <span className="side-clock-tag">Training date</span>}
    </div>
  );
}

/** Work waiting behind each link, shown as a small count. */
function useNavCounts(): Record<string, number> {
  const visits = useDomainStore((s) => s.visits);
  const patients = useDomainStore((s) => s.patients);
  const checkins = useDomainStore((s) => s.checkins);
  const now = useClockStore((s) => s.now);
  const pending = (high: boolean) => visits.filter((v) => (v.doctor_priority === 'High') === high && (v.status === 'Staged' || v.status === 'Needs Review')).length;
  const overdue = reconcile(visits, checkins, now);
  const unreachable = new Set(patients.filter((p) => p.unreachable_flag).map((p) => p.id));
  return {
    '/queue': pending(true),
    '/nurse': pending(false),
    '/records': overdue.filter((d) => !unreachable.has(d.visit.patient_id)).length,
    '/asha': unreachable.size,
  };
}

/**
 * Sidebar. On wide screens it is always shown; on narrow screens it slides in when `open`
 * and closes on a link tap, the backdrop, or Esc.
 */
export function Nav({ role, open = false, onClose, onTools }: { role: Role; open?: boolean; onClose?: () => void; onTools?: () => void }) {
  const items = NAV_BY_ROLE[role];
  const staff = STAFF_BY_ROLE[role];
  const counts = useNavCounts();
  const initials = staff.name.replace(/^(Dr|Sr)\.\s*/, '').split(' ').map((w) => w[0]).slice(0, 2).join('');

  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation sidebar">
        <div className="brand">
          <span className="brand-mark"><Icon name="cross" size={15} strokeWidth={2} /></span>
          <span style={{ minWidth: 0 }}>
            <div className="brand-name">District Hospital</div>
            <div className="brand-sub">OPD Follow-up</div>
          </span>
          <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
            <Icon name="x" size={18} />
          </button>
        </div>

        <SidebarClock />

        <nav aria-label={`${role} pages`} className="nav-section">
          <span className="nav-label">{role} workspace</span>
          {items.map((item) => (
            <NavLink key={item.label} to={item.to} className="nav-link" onClick={onClose}>
              <Icon name={item.icon} size={17} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {counts[item.to] > 0 && <span className="nav-count">{counts[item.to]}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className="side-tools" onClick={() => { onClose?.(); onTools?.(); }}>
            <Icon name="settings" size={16} />
            <span style={{ flex: 1, textAlign: 'left' }}>Clinic tools</span>
            <kbd className="side-kbd">Ctrl D</kbd>
          </button>
          <div className="side-user">
            <span className="side-avatar">{initials}</span>
            <span style={{ minWidth: 0 }}>
              <span className="side-user-name">{staff.name}</span>
              <span className="side-user-title">{staff.title}</span>
            </span>
          </div>
          <div className="sidebar-foot">Synthetic records for training</div>
        </div>
      </aside>
    </>
  );
}
