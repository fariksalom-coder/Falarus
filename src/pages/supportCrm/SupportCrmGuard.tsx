import { Outlet, Navigate } from 'react-router-dom';
import { useSupportCrmAuth } from '../../context/SupportCrmAuthContext';
import { supportCrmPath } from '../../constants/supportCrmPath';

export default function SupportCrmGuard() {
  const { isAgent, loading } = useSupportCrmAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg-muted">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-app-brand" />
      </div>
    );
  }

  if (!isAgent) {
    return <Navigate to={supportCrmPath('/login')} replace />;
  }

  return <Outlet />;
}
