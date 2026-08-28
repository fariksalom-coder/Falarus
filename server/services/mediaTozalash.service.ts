import fs from 'node:fs/promises';
import path from 'node:path';
import type { DbClient } from '../types/dbClient';
import { logError, logInfo } from '../lib/logger.js';

/**
 * DISKNI TOZALASH.
 *
 * Ikki ish bajaradi:
 *   1. Muloqot chatidagi media fayllar — 100 soatdan keyin o'chiriladi.
 *      Xabarning O'ZI qoladi: matn arzon (388 xabar = 176 kB), joyni
 *      yeydigan narsa fayllar. Chatda o'rnida "muddati tugadi" chiqadi.
 *   2. O'chirilgan rels va xabarlar — muhlatdan keyin baza va diskdan
 *      BUTUNLAY yo'q qilinadi. Ilgari `deleted_at` qo'yilib, yozuv
 *      abadiy yotaverardi.
 *   3. Yetim fayllar — bazada hech bir yozuv ko'rsatmayotgan fayllar.
 *      Ular yuklash yarim uzilganda yoki eski xatolardan qoladi va
 *      hech qachon o'z-o'zidan ketmaydi.
 *   4. TTS ovoz keshi — juda eski fayllar olib tashlanadi.
 *
 * NIMA UCHUN ALOHIDA, `cronScheduler` ICHIDA EMAS: u `ENABLE_INTERNAL_CRON`
 * ortida turadi va u bilan birga to'lovlarni avto-yangilash cronlari ham
 * yonadi. Tozalash esa moliyaga tegmaydi va har doim ishlashi kerak,
 * shuning uchun o'z bayrog'i bilan mustaqil yuradi.
 */

/** Chat mediasi shuncha soatdan keyin o'chadi. */
const CHAT_MEDIA_SOAT = Number(process.env.CHAT_MEDIA_TTL_HOURS ?? 100);

/**
 * TTS keshi shuncha kundan keyin o'chadi.
 *
 * Ancha uzoq muddat ataylab: kesh o'chirilsa, o'sha matn keyingi safar
 * qayta sintez qilinadi va bu OpenAI'ga pul to'lash demakdir. Shuning
 * uchun faqat haqiqatan tashlandiq fayllar olinadi.
 */
const TTS_KESH_KUN = Number(process.env.TTS_CACHE_TTL_DAYS ?? 60);

/**
 * O'chirilgan yozuv shuncha soat "yumshoq" turadi, keyin butunlay ketadi.
 *
 * Nol qo'yilsa keyingi yurishdayoq o'chadi. Sukutdagi 24 soat — tasodifan
 * o'chirilgan narsani qaytarish uchun oyna; undan keyin hech qanday iz
 * qolmaydi (mazmunsiz jurnaldan tashqari).
 */
const OCHIRILGAN_SAQLASH_SOAT = Number(process.env.OCHIRILGAN_SAQLASH_SOAT ?? 24);

/** Yetim fayl shuncha soat yosh bo'lsa tegilmaydi — yuklanayotgan bo'lishi mumkin. */
const YETIM_TEGMA_SOAT = 6;

/** Muloqot chatidagi fayllar shu chelakda yotadi. */
const CHAT_BUCKET = 'community-media';

/** Bir yurishda ko'pi bilan shuncha yozuv — baza va disk bo'g'ilmasin. */
const BIR_YURISHDA = 500;

/**
 * `/uploads/...` manzilini diskdagi yo'lga o'giradi.
 *
 * Faqat `uploads` ichidan chiqmaslikni ta'minlaydi: manzil bazadan keladi,
 * unga to'liq ishonib bo'lmaydi. `..` bo'lgan har qanday yo'l rad etiladi.
 */
function diskYoli(uploadsDir: string, mediaUrl: string): string | null {
  const belgi = '/uploads/';
  const i = mediaUrl.indexOf(belgi);
  if (i === -1) return null;
  const nisbiy = mediaUrl.slice(i + belgi.length);
  if (!nisbiy || nisbiy.includes('\0')) return null;
  const toliq = path.resolve(uploadsDir, nisbiy);
  const ildiz = path.resolve(uploadsDir);
  if (toliq !== ildiz && !toliq.startsWith(ildiz + path.sep)) return null;
  return toliq;
}

export async function tozalaChatMediasi(
  supabase: DbClient,
  uploadsDir: string,
): Promise<{ korildi: number; ochirildi: number; topilmadi: number }> {
  const chegara = new Date(Date.now() - CHAT_MEDIA_SOAT * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('community_group_messages')
    .select('id, media_url')
    .not('media_url', 'is', null)
    .is('media_deleted_at', null)
    .lt('created_at', chegara)
    .limit(BIR_YURISHDA);
  if (error) throw error;

  const qatorlar = (data ?? []) as Array<{ id: number; media_url: string }>;
  let ochirildi = 0;
  let topilmadi = 0;

  for (const q of qatorlar) {
    const yol = diskYoli(uploadsDir, String(q.media_url));
    if (yol) {
      try {
        await fs.unlink(yol);
        ochirildi += 1;
      } catch (e) {
        // Fayl allaqachon yo'q — bu xato emas, yozuvni baribir belgilaymiz.
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') topilmadi += 1;
        else throw e;
      }
    } else {
      topilmadi += 1;
    }
    /*
     * Belgi fayl o'chgandan KEYIN qo'yiladi. Aksi bo'lsa, o'chirish
     * yiqilganda yozuv "tozalangan" deb belgilanib, fayl abadiy qolib
     * ketardi.
     */
    await supabase
      .from('community_group_messages')
      .update({ media_deleted_at: new Date().toISOString() })
      .eq('id', q.id);
  }

  return { korildi: qatorlar.length, ochirildi, topilmadi };
}

/**
 * Xabar o'chirilganda uning media faylini DARHOL diskdan oladi.
 *
 * Soatlik tozalash ham buni qilardi, ammo bir necha soat kechikib.
 * Fayl esa joyni shu daqiqadan yeb turadi, shuning uchun o'chirish
 * bosilishi bilanoq olib tashlanadi — rels bilan bir xil tartib.
 *
 * Ikkala o'chirish yo'li (admin paneli va moderator paneli) shu bitta
 * funksiyani chaqiradi: mantiq ikki joyda takrorlansa, biri yangilanmay
 * qolib, fayl jimgina qolib ketardi.
 */
export async function ochirXabarMediasi(supabase: DbClient, id: number): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('community_group_messages')
      .select('media_url')
      .eq('id', id)
      .maybeSingle();
    const url = (data as { media_url?: string | null } | null)?.media_url;
    if (!url) return false;

    const belgi = '/uploads/storage/' + CHAT_BUCKET + '/';
    const i = String(url).indexOf(belgi);
    if (i === -1) return false;

    await supabase.storage.from(CHAT_BUCKET).remove([String(url).slice(i + belgi.length)]);
    await supabase
      .from('community_group_messages')
      .update({ media_deleted_at: new Date().toISOString() })
      .eq('id', id);
    return true;
  } catch {
    // Fayl ketmasa ham xabar o'chishi kerak — soatlik tozalash keyin oladi.
    return false;
  }
}

/** Faylni diskdan oladi. Yo'q bo'lsa `false` — bu xato emas. */
async function faylniOchir(yol: string | null): Promise<boolean> {
  if (!yol) return false;
  try {
    await fs.unlink(yol);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw e;
  }
}

/**
 * O'CHIRILGANLARNI BUTUNLAY YO'Q QILISH.
 *
 * `deleted_at` qo'yilgan rels va xabarlar muhlatdan keyin bazadan qattiq
 * o'chiriladi, fayli esa diskdan olinadi.
 *
 * Bog'liq yozuvlar qo'lda tozalanmaydi — chet kalitlar `ON DELETE CASCADE`
 * bilan qo'yilgan, ya'ni rels ketganda uning layklari va kommentariyalari,
 * xabar ketganda esa reaksiyalari o'z-o'zidan yo'qoladi. Buni takrorlash
 * xatoga yo'l ochardi: bittasini unutsak, osilib qolgan yozuv qolardi.
 *
 * TARTIB MUHIM: avval jurnalga yoziladi, keyin o'chiriladi. Aksi bo'lsa
 * o'chirish o'tib, jurnal yozuvi yiqilsa — iz butunlay yo'qolardi.
 */
export async function tozalaOchirilganlarni(
  supabase: DbClient,
  uploadsDir: string,
): Promise<{ rels: number; xabar: number; fayl: number }> {
  const chegara = new Date(Date.now() - OCHIRILGAN_SAQLASH_SOAT * 3600_000).toISOString();
  let rels = 0;
  let xabar = 0;
  let fayl = 0;

  const { data: relsData, error: relsErr } = await supabase
    .from('community_reels')
    .select('id, author_user_id, video_url, poster_url, deleted_at, deleted_by')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', chegara)
    .limit(BIR_YURISHDA);
  if (relsErr) throw relsErr;

  for (const r of (relsData ?? []) as Array<{
    id: number;
    author_user_id: number | null;
    video_url: string | null;
    poster_url: string | null;
    deleted_at: string;
    deleted_by: number | null;
  }>) {
    let ketdi = await faylniOchir(r.video_url ? diskYoli(uploadsDir, String(r.video_url)) : null);
    if (r.poster_url) {
      const posterKetdi = await faylniOchir(diskYoli(uploadsDir, String(r.poster_url)));
      ketdi = ketdi || posterKetdi;
    }

    await supabase.from('community_deletion_log').insert({
      entity_type: 'reel',
      entity_id: r.id,
      author_user_id: r.author_user_id,
      deleted_by: r.deleted_by,
      deleted_at: r.deleted_at,
      file_removed: ketdi,
    });

    await supabase.from('community_reels').delete().eq('id', r.id);
    rels += 1;
    if (ketdi) fayl += 1;
  }

  const { data: xabarData, error: xabarErr } = await supabase
    .from('community_group_messages')
    .select('id, sender_user_id, media_url, deleted_at')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', chegara)
    .limit(BIR_YURISHDA);
  if (xabarErr) throw xabarErr;

  for (const m of (xabarData ?? []) as Array<{
    id: number;
    sender_user_id: number | null;
    media_url: string | null;
    deleted_at: string;
  }>) {
    const ketdi = await faylniOchir(m.media_url ? diskYoli(uploadsDir, String(m.media_url)) : null);

    await supabase.from('community_deletion_log').insert({
      entity_type: 'message',
      entity_id: m.id,
      author_user_id: m.sender_user_id,
      deleted_by: null,
      deleted_at: m.deleted_at,
      file_removed: ketdi,
    });

    await supabase.from('community_group_messages').delete().eq('id', m.id);
    xabar += 1;
    if (ketdi) fayl += 1;
  }

  return { rels, xabar, fayl };
}

/**
 * YETIM FAYLLAR — bazada hech kim ko'rsatmayotgan fayllar.
 *
 * Ular yuklash yarim uzilganda, ilova qayta ishga tushganda yoki eski
 * xatolardan qoladi. Hech bir yozuv ularga ishora qilmagani uchun
 * yuqoridagi tozalashlar ularni ABADIY ko'rmaydi — faqat shu supurgi topadi.
 *
 * `YETIM_TEGMA_SOAT` dan yosh fayllarga tegilmaydi: ayni shu daqiqada
 * yuklanayotgan fayl hali bazaga yozilmagan bo'lishi mumkin va uni
 * o'chirsak, foydalanuvchining yangi xabarini o'ldirgan bo'lardik.
 */
export async function tozalaYetimFayllarni(
  supabase: DbClient,
  uploadsDir: string,
): Promise<{ korildi: number; ochirildi: number }> {
  const chegara = Date.now() - YETIM_TEGMA_SOAT * 3600_000;
  let korildi = 0;
  let ochirildi = 0;

  // Bazada tirik turgan barcha manzillar — bir marta yig'iladi.
  const tirik = new Set<string>();
  const yigib = (qiymat: unknown) => {
    if (typeof qiymat === 'string' && qiymat) {
      const yol = diskYoli(uploadsDir, qiymat);
      if (yol) tirik.add(yol);
    }
  };

  const { data: mediaRows } = await supabase
    .from('community_group_messages')
    .select('media_url')
    .not('media_url', 'is', null)
    .is('media_deleted_at', null);
  for (const r of (mediaRows ?? []) as Array<{ media_url: string | null }>) yigib(r.media_url);

  const { data: relsRows } = await supabase
    .from('community_reels')
    .select('video_url, poster_url')
    .is('deleted_at', null);
  for (const r of (relsRows ?? []) as Array<{ video_url: string | null; poster_url: string | null }>) {
    yigib(r.video_url);
    yigib(r.poster_url);
  }

  for (const bucket of ['community-media', 'community-reels']) {
    const ildiz = path.join(uploadsDir, 'storage', bucket);
    let fayllar: string[];
    try {
      fayllar = await fs.readdir(ildiz, { recursive: true });
    } catch {
      continue;
    }

    for (const nisbiy of fayllar) {
      const yol = path.join(ildiz, String(nisbiy));
      try {
        const st = await fs.stat(yol);
        if (!st.isFile()) continue;
        korildi += 1;
        if (tirik.has(yol)) continue;
        if (st.mtimeMs > chegara) continue;
        await fs.unlink(yol);
        ochirildi += 1;
      } catch {
        /* fayl shu orada o'chgan bo'lishi mumkin — e'tiborsiz */
      }
    }
  }

  return { korildi, ochirildi };
}

export async function tozalaTtsKeshi(
  uploadsDir: string,
): Promise<{ korildi: number; ochirildi: number }> {
  const katalog = path.join(uploadsDir, 'tts-cache');
  const chegara = Date.now() - TTS_KESH_KUN * 24 * 60 * 60 * 1000;
  let korildi = 0;
  let ochirildi = 0;

  let fayllar: string[];
  try {
    fayllar = await fs.readdir(katalog);
  } catch {
    return { korildi: 0, ochirildi: 0 };
  }

  for (const nom of fayllar) {
    const yol = path.join(katalog, nom);
    try {
      const st = await fs.stat(yol);
      if (!st.isFile()) continue;
      korildi += 1;
      if (st.mtimeMs < chegara) {
        await fs.unlink(yol);
        ochirildi += 1;
      }
    } catch {
      /* fayl shu orada o'chgan bo'lishi mumkin — e'tiborsiz */
    }
  }

  return { korildi, ochirildi };
}

/** Ikkala tozalashni birga yuritadi; biri yiqilsa ikkinchisi baribir ishlaydi. */
export async function tozalashniYurgiz(supabase: DbClient, uploadsDir: string): Promise<void> {
  try {
    const natija = await tozalaChatMediasi(supabase, uploadsDir);
    if (natija.korildi > 0) logInfo('tozalash.chat_media', { ...natija, soat: CHAT_MEDIA_SOAT });
  } catch (e) {
    logError('tozalash.chat_media_failed', e as Error, {});
  }

  try {
    const natija = await tozalaOchirilganlarni(supabase, uploadsDir);
    if (natija.rels + natija.xabar > 0) {
      logInfo('tozalash.ochirilganlar', { ...natija, soat: OCHIRILGAN_SAQLASH_SOAT });
    }
  } catch (e) {
    logError('tozalash.ochirilganlar_failed', e as Error, {});
  }

  try {
    const natija = await tozalaYetimFayllarni(supabase, uploadsDir);
    if (natija.ochirildi > 0) logInfo('tozalash.yetim_fayllar', natija);
  } catch (e) {
    logError('tozalash.yetim_fayllar_failed', e as Error, {});
  }

  try {
    const natija = await tozalaTtsKeshi(uploadsDir);
    if (natija.ochirildi > 0) logInfo('tozalash.tts_kesh', { ...natija, kun: TTS_KESH_KUN });
  } catch (e) {
    logError('tozalash.tts_kesh_failed', e as Error, {});
  }
}
