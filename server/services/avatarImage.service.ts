/**
 * avatarImage.service — profil rasmini SERVERDA me'yorlashtirish.
 *
 * MUAMMO: telefondan kelgan surat 1920×2560 bo'ladi, profilda esa 72px
 * doirachada ko'rsatiladi. Brauzer bunday katta rasmni kichraytirganda tez
 * (sifatsiz) filtr ishlatadi — natijada rasm xira ko'rinadi.
 *
 * Klientda ham kichraytirish bor (`src/utils/imageResize.ts`), lekin u
 * yagona himoya bo'la olmaydi: eski brauzerlar, API'ga to'g'ridan-to'g'ri
 * yuborilgan so'rovlar va boshqa ilovalar uni chetlab o'tadi. Shuning uchun
 * oxirgi so'z SERVERDA.
 *
 * Natija har doim bir xil: 512×512 kvadrat JPEG. 512px har qanday ekran
 * uchun yetarli (72px × 3x = 216px), JPEG esa barcha qurilmalarda ochiladi
 * (WebP eski iOS'da muammo qilardi).
 */
import sharp from 'sharp';

/** Saqlanadigan tomon uzunligi. */
const TARGET_SIZE = 512;
const JPEG_QUALITY = 90;
/** Bundan katta rasmni umuman ochmaymiz (xotira himoyasi). */
const MAX_PIXELS = 50_000_000;

export type NormalizedAvatar = {
  buffer: Buffer;
  mimetype: string;
  ext: string;
};

/**
 * Rasmni markazidan kvadrat qirqib, 512×512 JPEG ga keltiradi.
 *
 * Qo'llab-quvvatlanmagan format (masalan HEIC) yoki buzuq fayl bo'lsa —
 * `null` qaytaradi va chaqiruvchi asl faylni o'z holicha saqlaydi
 * (rasm yuklash umuman ishlamay qolishidan ko'ra shunisi yaxshi).
 */
export async function normalizeAvatar(buffer: Buffer): Promise<NormalizedAvatar | null> {
  try {
    const out = await sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: 'none' })
      // Telefon suratlari yonboshlab qolmasin.
      .rotate()
      .resize(TARGET_SIZE, TARGET_SIZE, {
        fit: 'cover',
        position: 'centre',
        // Kichik rasmni sun'iy kattalashtirmaymiz.
        withoutEnlargement: true,
        kernel: 'lanczos3',
      })
      // PNG shaffofligi qora bo'lib qolmasin.
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
      .toBuffer();

    if (!out || out.length === 0) return null;
    return { buffer: out, mimetype: 'image/jpeg', ext: 'jpg' };
  } catch {
    return null;
  }
}
