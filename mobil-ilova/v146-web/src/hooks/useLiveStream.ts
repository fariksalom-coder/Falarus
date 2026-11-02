import { useEffect, useState } from 'react';
import { getLiveStreamState, type LiveStreamState, type PublicLiveStream } from '../api/liveStream';
import { useAuth } from '../context/AuthContext';

/**
 * Jonli efir holati — bir nechta joyda ko'rsatiladi (bosh sahifadagi banner,
 * "Suhbat" chatlar ro'yxati, pastki menyu nishoni).
 *
 * Har bir joy alohida so'rov yuborsa, server bir xil qatorni bir necha marta
 * o'qib chiqardi. Shuning uchun so'rov MODUL DARAJASIDA bitta: birinchi
 * obunachi taymerni yoqadi, oxirgisi o'chiradi, natija hammaga tarqaladi.
 *
 * Efirni support istalgan paytda boshlaydi, talaba esa ilovani ochiq qoldirgan
 * bo'lishi mumkin — shuning uchun daqiqada bir marta va sahifa ko'rinadigan
 * holatga qaytganda tekshiramiz.
 */

/*
 * 25 soniya: telefon qo'ng'irog'iday sezilishi kerak. Bir daqiqada bir marta
 * tekshirilganda efir boshlangani bilan ekran chiqishi orasida yarim daqiqa
 * jimlik bo'lardi. So'rov kichik va faqat sahifa KO'RINIB turganda yuboriladi.
 */
const TEKSHIRISH_ORALIGI_MS = 25_000;
/**
 * Rejalashtirilgan efir boshlanishiga yaqin qolganda tez-tez tekshiramiz.
 *
 * Sabab: support efirni boshlaganda o'quvchi kirish tugmasini bir daqiqagacha
 * kutib turishi mumkin edi. Boshlanish vaqti yaqin bo'lsa (yoki o'tib ketgan
 * bo'lsa) 15 soniyada bir tekshirsak, tugma deyarli darhol ochiladi.
 */
const TEZ_ORALIQ_MS = 15_000;
const TEZLASHISH_OYNASI_MS = 15 * 60_000;

let joriyHolat: LiveStreamState | null = null;
let joriyToken: string | null = null;
let timer: number | null = null;
let korinishKuzatuvi = false;

const obunachilar = new Set<(s: LiveStreamState | null) => void>();

function tarqat() {
  obunachilar.forEach((f) => f(joriyHolat));
}

async function yukla(tokenNusxa: string) {
  try {
    const d = await getLiveStreamState(tokenNusxa);
    // Javob kelguncha foydalanuvchi chiqib ketgan bo'lishi mumkin.
    if (joriyToken !== tokenNusxa) return;
    joriyHolat = d;
    tarqat();
    taymerniMoslash();
  } catch {
    // Efir ko'rsatkichi qo'shimcha imkoniyat: yuklanmasa jim o'tamiz.
  }
}

/** Rejalashtirilgan efir yaqin bo'lsa yoki vaqti kelgan bo'lsa — tez tekshirish. */
function kerakliOraliq(): number {
  const boshlanish = joriyHolat?.upcoming?.[0]?.starts_at;
  if (joriyHolat?.live || !boshlanish) return TEKSHIRISH_ORALIGI_MS;
  const qolgan = new Date(boshlanish).getTime() - Date.now();
  if (Number.isNaN(qolgan)) return TEKSHIRISH_ORALIGI_MS;
  return qolgan <= TEZLASHISH_OYNASI_MS ? TEZ_ORALIQ_MS : TEKSHIRISH_ORALIGI_MS;
}

let joriyOraliq = TEKSHIRISH_ORALIGI_MS;

function taymerniMoslash() {
  const kerak = kerakliOraliq();
  if (timer !== null && kerak === joriyOraliq) return;
  if (timer !== null) window.clearInterval(timer);
  joriyOraliq = kerak;
  timer = window.setInterval(() => {
    if (document.visibilityState !== 'visible' || !joriyToken) return;
    void yukla(joriyToken);
  }, kerak);
}

/**
 * Holatni KUTMASDAN yangilaydi.
 *
 * Push kelganda service worker ochiq oynaga xabar beradi — o'sha zahoti
 * so'rov yuboriladi va qo'ng'iroq ekrani chiqadi, keyingi taymergacha
 * kutilmaydi.
 */
export function efirniDarholTekshir(): void {
  if (joriyToken) void yukla(joriyToken);
}

function korinishOzgardi() {
  if (document.visibilityState === 'visible' && joriyToken) void yukla(joriyToken);
}

function boshla(token: string) {
  if (joriyToken !== token) {
    joriyToken = token;
    joriyHolat = null;
    tarqat();
  }
  taymerniMoslash();
  if (!korinishKuzatuvi) {
    document.addEventListener('visibilitychange', korinishOzgardi);
    korinishKuzatuvi = true;
  }
  void yukla(token);
}

function toxtat() {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
  if (korinishKuzatuvi) {
    document.removeEventListener('visibilitychange', korinishOzgardi);
    korinishKuzatuvi = false;
  }
}

/**
 * Efir holati: hozir jonli turgani va eng yaqin rejalashtirilgani.
 *
 * Rejalashtirilgani ham kerak: o'quvchi efir qachon boshlanishini oldindan
 * bilishi va sanoqni ko'rishi kerak. Support boshlagan zahoti (`live`)
 * ro'yxat o'zi qizil "JONLI" holatiga o'tadi.
 */
export function useLiveStreamState(): { live: PublicLiveStream | null; keyingi: PublicLiveStream | null } {
  const holat = useLiveStreamHolat();
  const live = holat?.live ?? null;
  // Server `upcoming` ni boshlanish vaqti bo'yicha tartiblab yuboradi.
  const keyingi = holat?.upcoming?.[0] ?? null;
  return { live, keyingi };
}

/**
 * Serverdagi to'liq holat: domen, jonli efir va rejalashtirilganlar.
 *
 * Efir sahifasi ham shundan foydalanadi — ilgari uning o'z taymeri bor edi va
 * support efirni boshlaganda kutib turgan o'quvchi bir daqiqagacha eski
 * ekranda qolardi.
 */
export function useLiveStreamHolat(): LiveStreamState | null {
  const { token } = useAuth();
  const [holat, setHolat] = useState<LiveStreamState | null>(joriyHolat);

  useEffect(() => {
    if (!token) {
      joriyToken = null;
      joriyHolat = null;
      setHolat(null);
      return;
    }

    obunachilar.add(setHolat);
    boshla(token);

    return () => {
      obunachilar.delete(setHolat);
      if (obunachilar.size === 0) toxtat();
    };
  }, [token]);

  return holat;
}

/** Hozir jonli turgan efir (bo'lmasa yoki mehmon bo'lsa — null). */
export function useLiveStream(): PublicLiveStream | null {
  return useLiveStreamHolat()?.live ?? null;
}
