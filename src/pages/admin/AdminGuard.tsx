import { Outlet, Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminPath } from '../../constants/adminPath';

export default function AdminGuard() {
  const { isAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-brand" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to={adminPath('/login')} replace />;
  }

  return <Outlet />;
}
