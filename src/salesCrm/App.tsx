import { Navigate, Route, Routes } from 'react-router-dom';
import { useSalesCrmAuth } from './auth';
import SalesCrmLayout from './Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import LeadsPage from './pages/LeadsPage';
import LeadPage from './pages/LeadPage';
import TasksPage from './pages/TasksPage';
import StatsPage from './pages/StatsPage';

function Guard({ children }: { children: React.ReactNode }) {
  const { agent, loading } = useSalesCrmAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Yuklanmoqda…
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
        <Route path="stats" element={<StatsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
