import { Suspense, lazy, type ComponentType, type LazyExoticComponent, type ReactElement } from 'react';

type PageModule = {
  default: ComponentType<Record<string, unknown>>;
};

type PageLoader = () => Promise<PageModule>;

const pageModules = import.meta.glob('./pages/**/*.tsx') as Record<string, PageLoader>;
const lazyPageCache = new Map<string, LazyExoticComponent<ComponentType<Record<string, unknown>>>>();
const preloadCache = new Map<string, Promise<PageModule>>();

function getPageLoader(modulePath: string): PageLoader {
  const loader = pageModules[modulePath];
  if (!loader) {
    throw new Error(`Route page not found: ${modulePath}`);
  }
  return loader;
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-5">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_16px_50px_rgba(148,163,184,0.14)]">
        <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-5 space-y-3">
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function lazyPage(modulePath: string) {
  const existing = lazyPageCache.get(modulePath);
  if (existing) return existing;

  const Component = lazy(getPageLoader(modulePath));
  lazyPageCache.set(modulePath, Component);
  return Component;
}

export function renderLazyPage(
  modulePath: string,
  props?: Record<string, unknown>,
  key?: string,
): ReactElement {
  const Component = lazyPage(modulePath);
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component key={key} {...props} />
    </Suspense>
  );
}

export function preloadPage(modulePath: string) {
  const existing = preloadCache.get(modulePath);
  if (existing) return existing;

  const pending = getPageLoader(modulePath)();
  preloadCache.set(modulePath, pending);
  return pending;
}

const ROUTE_PRELOAD_MAP: Record<string, string[]> = {
  '/': ['./pages/HomePage.tsx'],
  '/auth': ['./pages/AuthPage.tsx'],
  '/profile': ['./pages/ProfilePage.tsx'],
  '/russian': ['./pages/RussianCoursePage.tsx'],
  '/russian/grammar': ['./pages/Dashboard.tsx'],
  '/russian/speaking': ['./pages/SpeakingPage.tsx'],
  '/partner': ['./pages/PartnerPage.tsx'],
  '/vocabulary': ['./pages/VocabularyPage.tsx'],
  '/statistika': ['./pages/StatistikaPage.tsx'],
  '/kurslar': ['./pages/CoursesPage.tsx'],
  '/kurslar/patent': ['./pages/PatentCoursePage.tsx'],
  '/kurslar/vnzh': ['./pages/VnzhCoursePage.tsx'],
  '/tariflar': ['./pages/PricingPage.tsx'],
  '/payment': ['./pages/PaymentPage.tsx'],
};

export function prefetchRoutePath(path: string) {
  const normalized = path.split('?')[0] || path;
  const modules = ROUTE_PRELOAD_MAP[normalized];
  if (!modules) return;

  modules.forEach((modulePath) => {
    void preloadPage(modulePath);
  });
}
