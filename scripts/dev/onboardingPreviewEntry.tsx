// Local preview only: the onboarding wizard (/onb), the admin teachers hub (/onb-admin) and the student catalog (/ustozlar, as student 20).
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import '../../src/index.css';
import '../../src/styles/platform-theme.css';
import { PanelProvider } from '../../src/components/teacher/panel/panelContext';
import { PANEL_TEXTS, type PanelLang } from '../../src/components/teacher/panel/lang';
import OnboardingWizard from '../../src/components/teacher/onboarding/OnboardingWizard';
import Commission from '../../src/components/teacher/onboarding/Commission';
import AdminTeacherHubPage from '../../src/pages/admin/AdminTeacherHubPage';
import Balance from '../../src/components/teacher/panel/sections/Balance';
import { AuthProvider } from '../../src/context/AuthContext';
import TeachersPage from '../../src/pages/TeachersPage';
import TeacherProfilePage from '../../src/pages/TeacherProfilePage';

localStorage.setItem('adminToken', 'preview');

function Teacher() {
  const [lang, setLang] = useState<PanelLang>('uz');
  return (
    <PanelProvider value={{ token: 'preview', lang, setLang, t: PANEL_TEXTS[lang], go: () => {}, toast: () => {}, summary: null, cabinet: null, notifications: [], unread: 0, refresh: () => {} }}>
      <div className="min-h-screen bg-app-bg-subtle px-4 py-5">
        <div className="mx-auto mb-3 flex max-w-3xl justify-end gap-2">
          {(['uz', 'ru'] as const).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className="min-h-11 rounded-xl border px-3 text-sm font-semibold">{l}</button>)}
        </div>
        {location.pathname === '/onb-commission' ? <div className="mx-auto max-w-md"><Commission /></div>
          : location.pathname === '/onb-balance' ? <div className="mx-auto max-w-3xl"><Balance /></div>
          : location.pathname === '/onb-focus' ? <OnboardingWizard focus />
          : <OnboardingWizard />}
      </div>
    </PanelProvider>
  );
}

if (location.pathname.startsWith('/ustozlar')) localStorage.setItem('token', 'preview');

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    {location.pathname.startsWith('/ustozlar') ? (
      <AuthProvider>
        <Routes>
          <Route path="/ustozlar" element={<TeachersPage />} />
          <Route path="/ustozlar/:teacherId" element={<TeacherProfilePage />} />
        </Routes>
      </AuthProvider>
    ) : location.pathname.startsWith('/onb-admin') || location.pathname.startsWith('/onb-money') ? <div className="min-h-screen bg-app-bg-subtle p-4"><AdminTeacherHubPage /></div> : <Teacher />}
  </BrowserRouter>,
);
