import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ADMIN_BASE_PATH } from '../../constants/adminPath';

export type PanelScene = 'learning' | 'games' | 'statistics' | 'conversation' | 'teachers' | 'profile' | 'courses' | 'game-letters' | 'game-basket' | 'game-chain' | 'game-verbs';

export function panelSceneForPath(path: string): PanelScene | null {
  // Games keep their original page backgrounds instead of panel artwork.
  if (path === '/games' || path.startsWith('/games/')) return null;
  if (path === '/statistika' || path.startsWith(ADMIN_BASE_PATH + '/')) return 'statistics';
  if (path === '/partner' || path === '/help' || path.startsWith('/help/')) return 'conversation';
  if (path === '/teachers' || path.startsWith('/teachers/') || path === '/teacher-cabinet') return 'teachers';
  if (path === '/profile' || path.startsWith('/profile/') || path.startsWith('/u/')) return 'profile';
  if (path === '/kurslar' || path.startsWith('/kurslar/')) return 'courses';
  if (path === '/' || path.startsWith('/kunlik-reja')) return 'learning';
  return null;
}

const SceneContext = createContext<PanelScene | null>('learning');
export const usePanelScene = () => useContext(SceneContext);

export function PanelSceneProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const scene = panelSceneForPath(pathname);
  useLayoutEffect(() => {
    if (scene) document.documentElement.dataset.panelScene = scene;
    else delete document.documentElement.dataset.panelScene;
    return () => { delete document.documentElement.dataset.panelScene; };
  }, [scene]);
  return <SceneContext.Provider value={scene}>{children}</SceneContext.Provider>;
}
