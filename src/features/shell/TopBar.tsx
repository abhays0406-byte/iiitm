import { useClockStore } from '@/store/clock';
import { useOfflineStore } from '@/store/offline';
import { Icon } from '@/ui/Icon';
import { fmtDate } from '@/features/records/selector';
import { ROLES, STAFF_BY_ROLE, type Role } from '@/features/shell/roles';

export function TopBar({ role, onChange, onMenu }: { role: Role; onChange: (r: Role) => void; onMenu?: () => void }) {
  const now = useClockStore((s) => s.now);
  const online = useOfflineStore((s) => s.online);
  const queued = useOfflineStore((s) => s.outbox.length);

  return (
    <header className="topbar">
      {/* Only shown on narrow screens, where the sidebar is hidden. */}
      <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu">
        <Icon name="menu" size={20} />
      </button>
      <div className="topbar-context">
        <Icon name="home" size={15} />
        <strong>District Hospital</strong>
        <span>· OPD follow-ups</span>
      </div>
      <div className="topbar-right">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="role-chip" aria-hidden="true">
            <span className="avatar">{STAFF_BY_ROLE[role].name.replace(/^(Dr|Sr)\.\s*/, '').split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
            {STAFF_BY_ROLE[role].name}
          </span>
          <select
            className="role-select"
            value={role}
            onChange={(e) => onChange(e.target.value as Role)}
            style={{ fontWeight: 600 }}
            aria-label="Switch role"
            title={`Today: ${fmtDate(now)}`}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        {online ? (
          <span className="status-pill ok" title="Online"><Icon name="wifi" size={13} /><span className="pill-label">Online</span></span>
        ) : (
          <span className="status-pill warn" title={`Offline, ${queued} changes queued`}><Icon name="wifiOff" size={13} /><span className="pill-label">Offline, {queued} changes queued</span></span>
        )}
      </div>
    </header>
  );
}
