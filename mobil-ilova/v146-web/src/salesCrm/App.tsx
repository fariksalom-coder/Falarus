import { Navigate, Route, Routes } from 'react-router-dom';
import { getSalesCrmToken } from './api';
import { useSalesCrmAuth } from './auth';
import SalesCrmLayout from './Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import LeadsPage from './pages/LeadsPage';
import LeadPage from './pages/LeadPage';
import TasksPage from './pages/TasksPage';
import StatsPage from './pages/StatsPage';
import FunnelPage from './pages/FunnelPage';
import OperatorsPage from './pages/OperatorsPage';
import PlatformPage from './pages/PlatformPage';
import PromoAnalyticsPage from './pages/PromoAnalyticsPage';

function Guard({ children }: { children: React.ReactNode }) {
  const { agent, loading, authError, refresh, logout } = useSalesCrmAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Yuklanmoqda…
      </div>
    );
  }
  if (!agent && getSalesCrmToken() && authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Sales CRM</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Aloqa tiklanmoqda</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sessiya saqlandi, lekin CRM server yoki baza vaqtincha javob bermayapti. Sahifa sizni avtomatik chiqarib yubormaydi.
          </p>
          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{authError}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
              onClick={() => void refresh()}
            >
              Qayta urinish
            </button>
            <button
              type="button"
              className="min-h-11 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700"
              onClick={logout}
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!agent) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function SalesCrmApp() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Guard>
            <SalesCrmLayout />
          </Guard>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/:id" element={<LeadPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="plan" element={<FunnelPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="promo" element={<PromoAnalyticsPage />} />
        <Route path="platform" element={<PlatformPage />} />
        <Route path="operators" element={<OperatorsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
