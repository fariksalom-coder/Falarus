import { Outlet, useLocation } from 'react-router-dom';
import AppNavBar from './AppNavBar';
import LiveCallOverlay from './live/LiveCallOverlay';
import PushObunaFon from './live/PushObunaFon';
import EfirQongiroqSorovi from './live/EfirQongiroqSorovi';
import UpdateNotice from './UpdateNotice';
import { mainSectionIndex } from '../constants/mainSectionPaths';
import { appMainBottomOffsetCss } from '../constants/appLayout';
import { useAuth } from '../context/AuthContext';
import { useHeartbeat } from '../hooks/useHeartbeat';

/** Routes where we hide the global bottom nav — focus mode for lesson/exercise/game/course/payment drill-ins. */
function hideNavBar(path: string): boolean {
  if (path === '/') return true;
  if (path === '/payment' || path.startsWith('/payment')) return true;
  if (path === '/tariflar' || path === '/pricing') return true;
  if (path === '/payment-history') return true;
  if (path === '/invite') return true;
  if (path.startsWith('/kurslar/patent')) return true;
  if (path.startsWith('/kurslar/vnzh')) return true;
  if (path.startsWith('/kurslar/')) return true;
  if (path.startsWith('/help/')) return true;
  if (path.startsWith('/games/')) return true;
  // Jonli efir — to'liq ekranli xona. Pastki menyu qolsa, telefonda Jitsi
  // paneli bilan ustma-ust taxlanib ketadi.
  if (path === '/jonli-efir') return true;
  // Kunlik reja: hide on any drilled-in lesson (grammar, lug'at, o'qish, gapirish).
  if (/^\/kunlik-reja\/kun\/\d+\/.+/.test(path)) return true;
  if (path === '/kunlik-reja/xarita') return true;
  if (path === '/games/word-swipe/xarita') return true;
  if (path.startsWith('/profile/')) return true;
  if (path.startsWith('/u/')) return true;
  if (path.startsWith('/teachers/')) return true;
  if (path.startsWith('/help/') || path === '/help') return true;
  if (path.startsWith('/huquqiy')) return true;
  return false;
}

export default function MainLayout() {
  const { pathname } = useLocation();
  const { token } = useAuth();
  useHeartbeat(token);

  /*
   * So'rovnoma FAQAT RO'YXATDAN O'TISHDA so'raladi — `RegisterPage` muvaffaqiyatli
   * ro'yxatdan o'tgach `/onboarding` ga o'zi olib boradi.
   *
   * Ilgari shu yerda umumiy yo'naltirish turardi: `onboardingCompleted === false`
   * bo'lgan HAR QANDAY foydalanuvchi ilovaga kirganda so'rovnomaga tortilardi.
   * Natijada so'rovnomani o'tkazib yuborgan (yoki u paydo bo'lishidan oldin
   * ro'yxatdan o'tgan) odam HAR SAFAR tizimga kirganda qayta so'ralaverardi.
   * Shu sababli yo'naltirish olib tashlandi.
   */
  const showNavBar = !hideNavBar(pathname);
  const sectionIdx = mainSectionIndex(pathname);
  const motionKey = sectionIdx >= 0 ? `section-${sectionIdx}` : pathname;

  // Nav har doim pastda → tepada faqat status zonasi, scroll uchun pastdan padding.
  const bottomOffset = appMainBottomOffsetCss();

  return (
    <>
      <style>{`
        .app-layout-safe-pad {
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: 0;
        }
        .app-content-safe-min-h {
          min-height: calc(100dvh - env(safe-area-inset-top, 0px));
        }
        .nav-scroll-pad {
          padding-bottom: ${bottomOffset};
        }
      `}</style>
      {showNavBar && <AppNavBar />}
      {/*
        Efir qo'ng'irog'i — ILOVA BO'YLAB. U qaysi sahifada bo'lishidan qat'i
        nazar chiqishi kerak: o'quvchi mashq qilib o'tirganda efir boshlansa,
        banner (bosh sahifa) ham, chat bandi ham unga ko'rinmaydi.
      */}
      <LiveCallOverlay />
      <PushObunaFon />
      <EfirQongiroqSorovi />
      <div
        className={`min-h-screen app-layout-safe-pad${showNavBar ? ' app-with-navigation' : ''}`}
      >
        <div
          className="relative w-full overflow-hidden app-content-safe-min-h"
        >
          {/* Only the active page mounts; large game/media trees never overlap. */}
            <div
              key={motionKey}
              className={`absolute inset-0 w-full min-w-0 overflow-y-auto overflow-x-hidden bg-app-bg panel-scroll overscroll-y-contain${showNavBar ? ' nav-scroll-pad' : ''}`}
            >
              <div className="flex min-h-full flex-col">
                {/*
                  Yangilanish e'loni — kontent oqimida, sahifa tepasida.
                  Faqat asosiy ekranlarda: dars, o'yin va to'lov sahifalari
                  "fokus rejimi" (nav yashiriladi), u yerda e'lon xalaqit beradi.
                */}
                {showNavBar && <UpdateNotice />}
                <div className="flex-1 panel-content">
                  <Outlet />
                </div>
              </div>
            </div>
        </div>
      </div>
    </>
  );
}
