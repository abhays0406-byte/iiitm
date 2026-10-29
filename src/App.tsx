import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from '@/features/shell/TopBar';
import { Nav } from '@/features/shell/Nav';
import { NAV_BY_ROLE, STAFF_BY_ROLE, roleForPath, type Role } from '@/features/shell/roles';
import { useDomainStore } from '@/domain/store';
import { SimulatedStrip } from '@/features/shell/SimulatedStrip';
import { PageTransition } from '@/ui/PageTransition';
import { DoctorScreen } from '@/features/doctor/DoctorScreen';
import { NurseScreen, ApprovalScreen } from '@/features/nurse/NurseScreen';
import { RecordsDesk } from '@/features/records/RecordsDesk';
import { ASHAPage } from '@/features/asha/ASHAPage';
import { AuditPage } from '@/features/audit/AuditPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { ConfigPage } from '@/features/admin/ConfigPage';
import { DemoToasts } from '@/features/demo/DemoToasts';
import { DemoDirector } from '@/features/demo/DemoDirector';

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

  // Keep the role in step with the URL when a page outside the chosen role is opened directly.
  const inRole = NAV_BY_ROLE[chosenRole].some((item) => item.to === location.pathname);
  const role = inRole ? chosenRole : (roleForPath(location.pathname) ?? chosenRole);

  // The audit log records who did what: keep the store's actor in step with the active role.
  useEffect(() => {
    useDomainStore.getState().setActor(STAFF_BY_ROLE[role].name, role);
  }, [role]);

  const changeRole = (next: Role) => {
    setChosenRole(next);
    navigate(NAV_BY_ROLE[next][0].to);
  };

  return (
    <div className="app-shell">
      <Nav role={role} open={navOpen} onClose={closeNav} onTools={() => setToolsOpen(true)} />
      <DemoToasts />
      <DemoDirector open={toolsOpen} onClose={closeTools} onToggle={toggleTools} />
      <div className="app-column">
        <TopBar role={role} onChange={changeRole} onMenu={() => setNavOpen(true)} />
        <SimulatedStrip />
        <main className="app-main">
          <PageTransition>
          <Routes>
            <Route path="/doctor" element={<DoctorScreen />} />
            <Route path="/queue" element={<ApprovalScreen role="Doctor" />} />
            <Route path="/nurse" element={<NurseScreen />} />
            <Route path="/records" element={<RecordsDesk />} />
            <Route path="/asha" element={<ASHAPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="*" element={<Navigate to="/doctor" replace />} />
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
