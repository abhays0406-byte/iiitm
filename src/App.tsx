import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from '@/features/shell/TopBar';
import { Nav } from '@/features/shell/Nav';
import { NAV_BY_ROLE, STAFF_BY_ROLE, roleForPath, type Role } from '@/features/shell/roles';
import { useDomainStore } from '@/domain/store';
import { SimulatedStrip } from '@/features/shell/SimulatedStrip';
import { PageTransition } from '@/ui/PageTransition';
import { LandingPortal } from '@/features/portal/LandingPortal';
import { DoctorScreen } from '@/features/doctor/DoctorScreen';
import { NurseScreen, ApprovalScreen } from '@/features/nurse/NurseScreen';
import { RecordsDesk } from '@/features/records/RecordsDesk';
import { ASHAPage } from '@/features/asha/ASHAPage';
import { AuditPage } from '@/features/audit/AuditPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { ConfigPage } from '@/features/admin/ConfigPage';
import { DemoToasts } from '@/features/demo/DemoToasts';
import { DemoDirector } from '@/features/demo/DemoDirector';

const isDemoToolsEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_TOOLS === 'true';

function RequireRole({
  allowedRoles,
  currentRole,
  children,
}: {
  allowedRoles: Role[];
  currentRole: Role;
  children: React.ReactNode;
}) {
  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to={NAV_BY_ROLE[currentRole][0].to} replace />;
  }
  return <>{children}</>;
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [chosenRole, setChosenRole] = useState<Role>(() => roleForPath(location.pathname) ?? 'Doctor');
  // Sidebar drawer on narrow screens.
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  // Clinic tools drawer, opened from the sidebar or Ctrl+D.
  const [toolsOpen, setToolsOpen] = useState(false);
  const closeTools = useCallback(() => setToolsOpen(false), []);
  const toggleTools = useCallback(() => setToolsOpen((o) => !o), []);

  const isPortal = location.pathname === '/';

  // Keep the role in step with the URL when a page outside the chosen role is opened directly,
  // but prevent automatic privilege escalation to Admin from non-admin roles.
  const inRole = NAV_BY_ROLE[chosenRole].some((item) => item.to === location.pathname);
  const pathRole = roleForPath(location.pathname);
  const isPrivileged = pathRole === 'Admin';
  const role = inRole ? chosenRole : isPrivileged && chosenRole !== 'Admin' ? chosenRole : (pathRole ?? chosenRole);

  // The audit log records who did what: keep the store's actor in step with the active role.
  useEffect(() => {
    if (!isPortal) {
      useDomainStore.getState().setActor(STAFF_BY_ROLE[role].name, role);
    }
  }, [role, isPortal]);

  const changeRole = (next: Role) => {
    setChosenRole(next);
    navigate(NAV_BY_ROLE[next][0].to);
  };

  if (isPortal) {
    return <LandingPortal onSelectRole={changeRole} />;
  }

  return (
    <div className="app-shell">
      <Nav role={role} open={navOpen} onClose={closeNav} onTools={isDemoToolsEnabled ? () => setToolsOpen(true) : undefined} />
      {isDemoToolsEnabled && <DemoToasts />}
      {isDemoToolsEnabled && <DemoDirector open={toolsOpen} onClose={closeTools} onToggle={toggleTools} />}
      <div className="app-column">
        <TopBar role={role} onChange={changeRole} onMenu={() => setNavOpen(true)} />
        {isDemoToolsEnabled && <SimulatedStrip />}
        <main className="app-main">
          <PageTransition>
          <Routes>
            <Route path="/doctor" element={<DoctorScreen />} />
            <Route path="/queue" element={<ApprovalScreen role="Doctor" />} />
            <Route path="/nurse" element={<NurseScreen />} />
            <Route path="/records" element={<RecordsDesk />} />
            <Route path="/asha" element={<ASHAPage />} />
            <Route
              path="/audit"
              element={
                <RequireRole allowedRoles={['Admin']} currentRole={role}>
                  <AuditPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireRole allowedRoles={['Admin']} currentRole={role}>
                  <AdminPage />
                </RequireRole>
              }
            />
            <Route
              path="/config"
              element={
                <RequireRole allowedRoles={['Admin']} currentRole={role}>
                  <ConfigPage />
                </RequireRole>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
