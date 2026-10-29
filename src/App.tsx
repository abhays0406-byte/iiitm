import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TopBar } from '@/features/shell/TopBar';
import { Nav } from '@/features/shell/Nav';
import { SimulatedStrip } from '@/features/shell/SimulatedStrip';
import { DoctorScreen } from '@/features/doctor/DoctorScreen';
import { NurseScreen } from '@/features/nurse/NurseScreen';
import { RecordsDesk } from '@/features/records/RecordsDesk';
import { ASHAPage } from '@/features/asha/ASHAPage';
import { AuditPage } from '@/features/audit/AuditPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { ConfigPage } from '@/features/admin/ConfigPage';
import { DemoToasts } from '@/features/demo/DemoToasts';
import { DemoDirector } from '@/features/demo/DemoDirector';

type Role = 'Doctor' | 'Nurse' | 'Records Desk' | 'ASHA' | 'Admin';


export default function App() {
  const [role, setRole] = useState<Role>('Doctor');

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TopBar role={role} onChange={setRole} />
        <SimulatedStrip />
        <DemoToasts />
        <DemoDirector />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Nav role={role} />
          <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
            <Routes>
              <Route path="/doctor" element={<DoctorScreen />} />
              <Route path="/nurse" element={<NurseScreen />} />
              <Route path="/records" element={<RecordsDesk />} />
              <Route path="/asha" element={<ASHAPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/config" element={<ConfigPage />} />
              <Route index element={<DoctorScreen />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
