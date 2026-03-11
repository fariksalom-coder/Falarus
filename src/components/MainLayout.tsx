import { Outlet } from 'react-router-dom';
import AppNavBar from './AppNavBar';

/** Fixed top nav + content with padding so content is not under the bar. */
export default function MainLayout() {
  return (
    <>
      <AppNavBar />
      <div className="min-h-screen pt-14">
        <Outlet />
      </div>
    </>
  );
}
