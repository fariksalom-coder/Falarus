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

async function post<T>(token: string, path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    throw new Error(String((data as { error?: string }).error ?? "Ustoz javob bermadi"));
  }
  return data as T;
}

/** Kun mavzusi va vazifalari bo'yicha to'liq dars tayyorlaydi. */
export function buildDoskaLesson(
  token: string,
  params: { mavzu: string; nazariya?: string; kun?: number; vazifalar?: DoskaVazifa[] },
): Promise<DoskaDars> {
  return post<DoskaDars>(token, '/api/ustoz/dars', params);
}

/** Dars davomida berilgan savolga javob oladi. */
export function askDoska(
  token: string,
  params: { savol: string; mavzu: string; bosqich?: string },
): Promise<DoskaJavob> {
  return post<DoskaJavob>(token, '/api/ustoz/savol', params);
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
