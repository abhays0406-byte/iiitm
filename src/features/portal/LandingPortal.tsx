import { useNavigate } from 'react-router-dom';
import { ROLES, STAFF_BY_ROLE, NAV_BY_ROLE, type Role } from '@/features/shell/roles';
import { Icon } from '@/ui/Icon';
import { useDomainStore } from '@/domain/store';

interface LandingPortalProps {
  onSelectRole: (role: Role) => void;
}

export function LandingPortal({ onSelectRole }: LandingPortalProps) {
  const navigate = useNavigate();

  const handleEnter = (role: Role) => {
    onSelectRole(role);
    useDomainStore.getState().setActor(STAFF_BY_ROLE[role].name, role);
    navigate(NAV_BY_ROLE[role][0].to);
  };

  return (
    <main className="portal-gate" style={{ maxWidth: 860, margin: '40px auto', padding: '0 20px' }}>
      <header style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 'var(--radius)',
            background: 'var(--accent)',
            color: '#fff',
          }}>
            <Icon name="cross" size={18} />
          </span>
          <div>
            <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-2)', fontWeight: 600 }}>
              District Hospital Health Portal
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              OPD Follow-Up Assistant
            </h1>
          </div>
        </div>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, maxWidth: 640 }}>
          Clinical note extraction, appointment interval calculation, and defaulter tracking for district hospital outpatient departments.
        </p>
      </header>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 16,
        marginBottom: 28,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <span style={{ color: 'var(--accent)', marginTop: 2 }}>
          <Icon name="shield" size={18} />
        </span>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: 2 }}>
            Authorized clinical staff access only
          </strong>
          This system contains protected health information. Patient identifiers, notes, and records are restricted to authenticated hospital personnel. Every action is audited per healthcare governance regulations.
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--ink)' }}>
          Select staff workspace to enter
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {ROLES.map((role) => {
            const staff = STAFF_BY_ROLE[role];
            const iconName = role === 'Doctor' ? 'pen'
              : role === 'Nurse' ? 'checkSquare'
              : role === 'Records Desk' ? 'phone'
              : role === 'ASHA' ? 'mapPin'
              : 'settings';

            return (
              <button
                key={role}
                type="button"
                onClick={() => handleEnter(role)}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 16,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color 120ms ease-out, box-shadow 120ms ease-out',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--ink)', fontSize: 15 }}>
                    <Icon name={iconName} size={16} />
                    {role}
                  </span>
                  <span style={{ color: 'var(--ink-2)' }}>
                    <Icon name="chevronRight" size={14} />
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  Active personnel: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{staff.name}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {staff.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <footer style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--ink-3)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>District Hospital Health Governance System</span>
        <span>Simulated clinical environment · Append-only audit logging</span>
      </footer>
    </main>
  );
}
