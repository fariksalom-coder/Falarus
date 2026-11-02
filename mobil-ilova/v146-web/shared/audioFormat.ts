/**
 * Yozib olingan ovozning haqiqiy formatini ANIQLAYDI.
 *
 * NEGA KERAK: Whisper (OpenAI) formatni FAYL NOMIDAGI kengaytma bo'yicha
 * tanlaydi. Biz esa uni brauzer aytgan `mime` ga ishonib qo'yardik. Ba'zi
 * qurilmalarda ular MOS KELMAYDI:
 *   • Safari `audio/mp4` yozadi, lekin eski kodda nomi `.webm` edi;
 *   • ba'zi Android brauzerlari `mime` ni umuman yubormaydi;
 *   • ayrimlari `audio/aac` yoki `audio/3gpp` deb yozadi.
 * Natija — "Invalid file format" va foydalanuvchida ovozli javob umuman
 * ishlamaydi (2026-08-30 da bitta odam ketma-ket 4 marta urindi).
 *
 * Yechim: baytlarning boshidagi imzoga qarab formatni O'ZIMIZ aniqlaymiz.
 * Imzo tanilmasa — brauzer aytgan `mime` ga qaytamiz.
 */

/** Whisper qabul qiladigan kengaytmalar. */
export type QollabQuvvatlanadiganFormat =
  | 'webm'
  | 'mp4'
  | 'mp3'
  | 'wav'
  | 'ogg'
  | 'flac';

/*
 * Diskriminatsiyalangan birlashma (union) EMAS: loyihaning `tsconfig` da
 * `strictNullChecks` o'chirilgan va TypeScript `ok` bo'yicha turni torayta
 * olmaydi. Shuning uchun maydonlar ixtiyoriy qilib bitta turga yig'ildi.
 */
export type FormatNatija = {
  ok: boolean;
  /** `ok` bo'lsa — fayl kengaytmasi. */
  kengaytma?: QollabQuvvatlanadiganFormat;
  /** `ok` bo'lmasa — nega. */
  sabab?: 'qollanmaydi' | 'notanish';
  /** Qo'llab-quvvatlanmaydigan formatning nomi (AMR, 3GP). */
  nomi?: string;
};

function baytlarMi(buf: Uint8Array, offset: number, belgilar: string): boolean {
  for (let i = 0; i < belgilar.length; i += 1) {
    if (buf[offset + i] !== belgilar.charCodeAt(i)) return false;
  }
  return true;
}

/** Faqat baytlarga qarab format aniqlaydi. Tanilmasa — `null`. */
export function imzodanFormat(buf: Uint8Array): FormatNatija | null {
  if (buf.length < 12) return null;

  // Matroska / WebM
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { ok: true, kengaytma: 'webm' };
  }
  // ISO BMFF: MP4 / M4A — 4-baytdan keyin "ftyp"
  if (baytlarMi(buf, 4, 'ftyp')) {
    // 3GPP (telefon diktofoni) ham "ftyp" bilan boshlanadi, lekin brendi boshqa.
    if (baytlarMi(buf, 8, '3gp') || baytlarMi(buf, 8, '3g2')) {
      return { ok: false, sabab: 'qollanmaydi', nomi: '3GP' };
    }
    return { ok: true, kengaytma: 'mp4' };
  }
  if (baytlarMi(buf, 0, 'OggS')) return { ok: true, kengaytma: 'ogg' };
  if (baytlarMi(buf, 0, 'RIFF') && baytlarMi(buf, 8, 'WAVE')) {
    return { ok: true, kengaytma: 'wav' };
  }
  if (baytlarMi(buf, 0, 'fLaC')) return { ok: true, kengaytma: 'flac' };
  if (baytlarMi(buf, 0, 'ID3')) return { ok: true, kengaytma: 'mp3' };
  // ADTS AAC ham 0xff bilan boshlanadi; uni MP3 deb belgilamaslik kerak.
  if (buf[0] === 0xff && (buf[1] & 0xf6) === 0xf0) {
    return { ok: false, sabab: 'qollanmaydi', nomi: 'AAC' };
  }
  // MPEG audio: sync, version va layer bitlari haqiqiy bo'lishi kerak.
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 &&
      (buf[1] & 0x18) !== 0x08 && (buf[1] & 0x06) !== 0) {
    return { ok: true, kengaytma: 'mp3' };
  }
  // AMR — telefon diktofonlari, Whisper qabul qilmaydi.
  if (baytlarMi(buf, 0, '#!AMR')) return { ok: false, sabab: 'qollanmaydi', nomi: 'AMR' };

  return null;
}

/** `mime` satridan kengaytma (imzo tanilmaganda zaxira yo'l). */
export function mimedanFormat(mime: string): QollabQuvvatlanadiganFormat | null {
  const m = String(mime ?? '').split(';')[0].trim().toLowerCase();
  if (m === 'audio/webm' || m === 'video/webm') return 'webm';
  if (m === 'audio/mp4' || m === 'audio/m4a' || m === 'audio/x-m4a' || m === 'video/mp4') return 'mp4';
  if (m === 'audio/mpeg' || m === 'audio/mp3') return 'mp3';
  if (m === 'audio/wav' || m === 'audio/x-wav' || m === 'audio/wave') return 'wav';
  if (m === 'audio/ogg' || m === 'audio/oga' || m === 'application/ogg') return 'ogg';
  if (m === 'audio/flac' || m === 'audio/x-flac') return 'flac';
  return null;
}

/**
 * Yakuniy qaror: avval baytlar, keyin `mime`.
 *
 * Ikkalasi ham natija bermasa xato qaytariladi; noma'lum baytlarni WebM
 * deb tashqi transkripsiya xizmatiga yubormaymiz.
 */
export function ovozFormati(buf: Uint8Array, mime?: string | null): FormatNatija {
  const imzo = imzodanFormat(buf);
  if (imzo) return imzo;
  const m = mimedanFormat(mime ?? '');
  if (m) return { ok: true, kengaytma: m };
  return { ok: false, sabab: 'notanish' };
}
