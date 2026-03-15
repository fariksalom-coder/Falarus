import { Outlet, useLocation } from 'react-router-dom';
import AppNavBar from './AppNavBar';

/** Routes where we hide the top nav bar (payment = fullscreen, vocabulary nested = back only, invite = has back button). */
function hideNavBar(path: string): boolean {
  if (path === '/payment' || path.startsWith('/payment')) return true;
  if (path === '/tariflar') return true;
  if (path === '/payment-history') return true;
  if (path === '/invite') return true;
  if (path.startsWith('/vocabulary/')) return true;
  return false;
}

/** Fixed top nav + content with padding so content is not under the bar. */
export default function MainLayout() {
  const { pathname } = useLocation();
  const showNavBar = !hideNavBar(pathname);

  return (
    <>
      {showNavBar && <AppNavBar />}
      <div className={showNavBar ? 'min-h-screen pt-14' : 'min-h-screen'}>
        <Outlet />
      </div>
    </>
  );
}
