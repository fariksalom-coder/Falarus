import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Butun ilova uchun xato to'sig'i.
 *
 * NEGA KERAK: React'da ushlanmagan xato butun daraxtni yechib tashlaydi va
 * ekran OQ bo'lib qoladi — foydalanuvchi nima bo'lganini ham, nima qilishni
 * ham bilmaydi.
 *
 * Eng ko'p uchraydigan sabab — YANGI DEPLOY: sahifa ochiq turganda server
 * yangilanadi, eski bo'lak fayllari (`/assets/Sahifa-XXXX.js`) o'chib ketadi
 * va keyingi bo'lim yuklanmaydi. Bunday xatoda ilova o'zini qayta yuklaydi
 * (bir marta — aylanib qolmasligi uchun), chunki qayta yuklash yangi
 * `index.html` ni oladi va hammasi joyiga tushadi.
 */

const RELOAD_KEY = 'falarus:chunk-reload';

/** Xato yangi versiya sababli bo'lak yuklanmaganidanmi? */
function isChunkError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|Failed to fetch/i.test(
    text
  );
}

type Props = { children: ReactNode };
type State = { error: Error | null; reloading: boolean };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] ushlanmagan xato:', error, info.componentStack);

    if (isChunkError(error)) {
      let already = false;
      try {
        already = sessionStorage.getItem(RELOAD_KEY) === '1';
        sessionStorage.setItem(RELOAD_KEY, '1');
      } catch {
        /* sessionStorage yopiq bo'lsa ham davom etamiz */
      }
      if (!already) {
        this.setState({ reloading: true });
        window.location.reload();
      }
    }
  }

  private hardReload = () => {
    try {
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      /* muhim emas */
    }
    // Keshni ham tozalaymiz: eski bo'lak fayllari qolib ketmasin.
    void (async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* kesh tozalanmasa ham qayta yuklaymiz */
      }
      window.location.reload();
    })();
  };

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;

    if (reloading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F5F5FB] px-6 text-center">
          <p className="text-[14px] font-semibold text-[#3E4166]">Yangilanmoqda…</p>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5FB] px-6">
        <div className="w-full max-w-[380px] rounded-[22px] border border-[#EFEEF8] bg-white p-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FDECEC] text-[22px]">
            ⚠
          </span>
          <p className="text-[16px] font-bold text-[#171A3D]">Sahifa ochilmadi</p>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-[#6E7191]">
            Ilovani yangilang. Muammo takrorlansa, quyidagi matnni qo‘llab-quvvatlashga yuboring.
          </p>
          <button
            type="button"
            onClick={this.hardReload}
            className="mt-4 min-h-[48px] w-full rounded-[14px] bg-[#4B3BE4] text-[15px] font-semibold text-white"
          >
            Yangilash
          </button>
          <p className="mt-3 break-words text-left text-[11px] leading-[1.5] text-[#A0A1BC]">
            {error.message}
          </p>
        </div>
      </div>
    );
  }
}
