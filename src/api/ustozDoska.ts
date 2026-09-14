import { apiUrl } from '../api';
import type {
  DoskaAyrilish,
  DoskaIkonka,
  DoskaNishonlar,
  DoskaTenglama,
} from '../../shared/nutqBolaklari';

/**
 * Doska — ustoz kun mavzusini jonli tushuntiradi.
 *
 * Barcha so'rovlar `/api/ustoz/*` orqali ketadi; model kaliti faqat serverda.
 */

export type DoskaMisol = { ru: string; uz: string; ikonka?: DoskaIkonka };

/** Kunning mashqi — dars aynan shular ustida quriladi. */
export type DoskaVazifa = {
  tur: 'test' | 'gap' | 'moslash';
  savol: string;
  variantlar?: string[];
  javob?: string;
};

/** Taqqoslash jadvalining bir ustuni: «ОН — u (erkak)» + misollar. */
export type DoskaUstun = { bosh: string; satrlar: string[]; ikonka?: DoskaIkonka };

/**
 * Doskadagi taqqoslash jadvali — ikki-uch shakl yonma-yon.
 * Mavzuda qarama-qarshilik bo'lmasa null keladi.
 */
export type DoskaTaqqoslash = { savol: string; ustunlar: DoskaUstun[] };

/** Tipik xato — doskada ❌ noto'g'ri / ✅ to'g'ri ko'rinishida. */
export type DoskaXato = { notogri: string; togri: string; izoh: string };

export type DoskaBosqich = {
  sarlavha: string;
  tushuntirish: string;
  qoida: string;
  taqqoslash?: DoskaTaqqoslash | null;
  xato?: DoskaXato | null;
  /** Bir necha xato juftligi — qo'lda yozilgan darslarda («To'g'ri / Xato»). */
  xatolar?: DoskaXato[];
  /** Qo'lda yozilgan darslarning maxsus maketlari (taqdimotdan). */
  ayrilish?: DoskaAyrilish | null;
  tenglama?: DoskaTenglama | null;
  nishonlar?: DoskaNishonlar;
  misollar: DoskaMisol[];
  /** Shu bosqich tayyorlayotgan vazifaning tahlili (bo'lmasa null). */
  vazifa: { savol: string; javob: string; izoh: string } | null;
};

/**
 * Darsning yakuniy testidagi savol.
 *
 * Bular AI'dan emas, kunning O'Z bazasidan (`daily_grammar_mcqs`) olinadi:
 * har kunda 10-20 ta tekshirilgan savol turibdi, model esa bittagina nazorat
 * savoli qaytaradi va u xato bo'lishi ham mumkin.
 */
export type DoskaTestSavol = {
  savol: string;
  variantlar: string[];
  togriIndex: number;
  izoh?: string;
};

export type DoskaNazorat = {
  savol: string;
  variantlar: string[];
  togriIndex: number;
  izoh: string;
};

export type DoskaDars = {
  sarlavha: string;
  maqsad: string;
  /** Kunning kalit savoli — doskada dars oxirigacha turadi. */
  kalitSavol?: string;
  bosqichlar: DoskaBosqich[];
  /** Tushuntirishdan keyingi og'zaki suhbat savollari. */
  savollar: string[];
  nazorat: DoskaNazorat | null;
  xulosa: string;
};

/** O'quvchining og'zaki javobiga ustoz bahosi. */
export type DoskaBaho = {
  transcript: string;
  baho: 'togri' | 'qisman' | 'xato';
  izoh: string;
  namuna: string;
};

export type DoskaJavob = {
  javob: string;
  misollar: DoskaMisol[];
};

export type DoskaMashqSavol = {
  savol: string;
  variantlar: string[];
  togriIndex: number;
  izoh: string;
};

export type DoskaMashq = {
  sarlavha: string;
  savollar: DoskaMashqSavol[];
};

async function post<T>(
  token: string,
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal,
  });

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    throw new Error(String((data as { error?: string }).error ?? "Ustoz javob bermadi"));
  }
  return data as T;
}

/*
 * DARS KESHI — BIR KUNGA BITTA SO'ROV.
 *
 * NIMA UCHUN: bitta grammatika kunida dars IKKI joyda kerak bo'ladi —
 * tushuntirish bosqichida va kunning oxiridagi savol-javob bosqichida.
 * Bosqichlar orasida yurilganda komponent har safar qaytadan mount bo'ladi
 * va har mount serverga yangi `POST /api/ustoz/dars` yuborardi. Marshrutda
 * esa daqiqasiga 6 ta chegara bor: bir necha marta oldinga-ortga yurilsa
 * (yoki ikkita oyna ochiq bo'lsa) chegara to'lib, «So'rovlar soni oshib
 * ketdi» chiqardi va bosqich UMUMAN OCHILMASDI.
 *
 * Dars serverda ham keshlanadi, ya'ni javob har safar bir xil — shuning
 * uchun uni klientda ham saqlash xavfsiz. Ayni damda ketayotgan so'rov
 * bo'lishiladi: bir vaqtda ikkita mount bitta javobni kutadi.
 *
 * Faqat OXIRGI dars saqlanadi (bir vaqtda bitta kun ochiq bo'ladi).
 */
const DARS_KESH_TTL_MS = 10 * 60_000;

let darsKesh: { kalit: string; vaqt: number; natija: Promise<DoskaDars> } | null = null;

function darsKaliti(
  params: { mavzu: string; nazariya?: string; kun?: number; vazifalar?: DoskaVazifa[] },
): string {
  return JSON.stringify([
    params.kun ?? '',
    params.mavzu,
    params.nazariya ?? '',
    (params.vazifalar ?? []).length,
  ]);
}

/*
 * DARS SO'ROVI CHEKSIZ OSILIB QOLMASIN.
 *
 * MUAMMO: `fetch` da timeout yo'q edi. Mobil tarmoq uzilib qolsa yoki
 * so'rov qotib qolsa, va'da (promise) HECH QACHON tugamasdi. Doskada esa
 * yuklanish ekrani ataylab yozuvsiz — foydalanuvchi cheksiz skeletni
 * ko'rar, na xato, na "Qayta urinish" tugmasi chiqardi. Yagona chora
 * orqaga qaytib qayta kirish edi (yangi mount).
 *
 * O'LCHOV (prod, 247 so'rov): median 7 ms, 90-foiz 10 ms — deyarli hammasi
 * server keshidan. Eng sekini 33 s — bu yangi dars yaratilgani. Shuning
 * uchun 60 s chegara xavfsiz: u faqat haqiqatan osilgan so'rovni uzadi.
 *
 * UZILGANDA BIR MARTA QAYTA SO'RAYMIZ: birinchi urinish server tomonda
 * odatda oxirigacha yetadi va dars keshga tushadi, ya'ni ikkinchi urinish
 * bir zumda qaytadi. Foydalanuvchi hech narsa sezmaydi.
 */
const DARS_TIMEOUT_MS = 60_000;

function uzilishmi(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true;
  // Tarmoq uzilishi: brauzerlar buni TypeError qilib beradi.
  return e instanceof TypeError;
}

async function darsSoroviBir(
  token: string,
  params: { mavzu: string; nazariya?: string; kun?: number; vazifalar?: DoskaVazifa[] },
): Promise<DoskaDars> {
  const ctrl = new AbortController();
  const soat = setTimeout(() => ctrl.abort(), DARS_TIMEOUT_MS);
  try {
    return await post<DoskaDars>(token, '/api/ustoz/dars', params, ctrl.signal);
  } finally {
    clearTimeout(soat);
  }
}

async function darsniSora(
  token: string,
  params: { mavzu: string; nazariya?: string; kun?: number; vazifalar?: DoskaVazifa[] },
): Promise<DoskaDars> {
  try {
    return await darsSoroviBir(token, params);
  } catch (e) {
    if (!uzilishmi(e)) throw e;
    return darsSoroviBir(token, params);
  }
}

/** Kun mavzusi va vazifalari bo'yicha to'liq dars tayyorlaydi. */
export function buildDoskaLesson(
  token: string,
  params: { mavzu: string; nazariya?: string; kun?: number; vazifalar?: DoskaVazifa[] },
): Promise<DoskaDars> {
  const kalit = darsKaliti(params);
  const hozir = Date.now();
  if (darsKesh && darsKesh.kalit === kalit && hozir - darsKesh.vaqt < DARS_KESH_TTL_MS) {
    return darsKesh.natija;
  }

  const natija = darsniSora(token, params);
  darsKesh = { kalit, vaqt: hozir, natija };
  // Xato keshda qolmasin: "Qayta urinish" haqiqatan ham qayta so'rasin.
  void natija.catch(() => {
    if (darsKesh?.natija === natija) darsKesh = null;
  });
  return natija;
}

/**
 * Suhbat savoli — QAYSI KUNGA tegishli ekani bilan.
 *
 * `manbaKun` javob bera olmagan o'quvchini qaytarish uchun: savol qaysi
 * kun materialidan olingan bo'lsa, u o'sha kunga yuboriladi.
 */
export type KunSavol = {
  savol: string;
  manbaKun: number;
  manbaMavzu: string;
};

/**
 * Kun yakunidagi og'zaki savol-javob savollari: joriy kunning to'rt
 * bo'limidan bittadan + ortdagi kunlardan bittadan.
 *
 * Material serverda bazadan olinadi, shuning uchun bu yerdan faqat kun
 * raqami yuboriladi.
 */
export async function fetchKunSavollari(token: string, kun: number): Promise<KunSavol[]> {
  const javob = await post<{ savollar?: unknown }>(token, '/api/ustoz/kun-savollari', { kun });
  if (!Array.isArray(javob.savollar)) return [];
  return javob.savollar
    .map((xom): KunSavol | null => {
      if (!xom || typeof xom !== 'object') return null;
      const r = xom as Record<string, unknown>;
      const savol = String(r.savol ?? '').trim();
      if (!savol) return null;
      return {
        savol,
        manbaKun: Number(r.manbaKun) || kun,
        manbaMavzu: String(r.manbaMavzu ?? ''),
      };
    })
    .filter((s): s is KunSavol => s !== null);
}

/** Og'zaki javobni baholaydi: ovoz yuboriladi, matn va baho qaytadi. */
export function suhbatJavobi(
  token: string,
  params: { savol: string; mavzu: string; audioBase64?: string; mimeType?: string; javob?: string },
): Promise<DoskaBaho> {
  return post<DoskaBaho>(token, '/api/ustoz/suhbat', {
    savol: params.savol,
    mavzu: params.mavzu,
    audio: params.audioBase64,
    mimeType: params.mimeType,
    javob: params.javob,
  });
}

/** Ustoz bilan suhbat kvotasi (savol berish uchun). */
export type DoskaKvota = {
  qolgan: number;
  jami: number;
  /** Bloklangan bo'lsa — necha soniyadan keyin ochiladi. */
  kutish: number;
  ruxsat: boolean;
};

/**
 * Qolgan savol sonini o'qiydi. Kvotani SARFLAMAYDI — faqat ko'rsatish uchun.
 * Xatolik bo'lsa null qaytadi va ekranda hech narsa ko'rsatilmaydi.
 */
export async function doskaKvota(token: string): Promise<DoskaKvota | null> {
  try {
    const res = await fetch(apiUrl('/api/ustoz/kvota'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as DoskaKvota;
  } catch {
    return null;
  }
}

/** Mavzu bo'yicha qo'shimcha grammatika mashqi. */
export function buildDoskaExercise(
  token: string,
  params: { mavzu: string; nazariya?: string; soni?: number },
): Promise<DoskaMashq> {
  return post<DoskaMashq>(token, '/api/ustoz/mashq', params);
}
