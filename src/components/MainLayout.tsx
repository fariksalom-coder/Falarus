import { Outlet, useLocation } from 'react-router-dom';
import AppNavBar from './AppNavBar';

/** Routes where the page has a back button — hide the top section bar. */
function isNestedRouteWithBack(path: string): boolean {
  if (path.startsWith('/vocabulary/')) return true;
  return false;
}

/** Fixed top nav + content with padding so content is not under the bar. */
export default function MainLayout() {
  const { pathname } = useLocation();
  const showNavBar = !isNestedRouteWithBack(pathname);

  return (
    <>
      {showNavBar && <AppNavBar />}
      <div className={showNavBar ? 'min-h-screen pt-14' : 'min-h-screen'}>
        <Outlet />
      </div>
    </>
  );
}
