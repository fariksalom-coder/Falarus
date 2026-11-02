/**
 * imageResize.ts — profil rasmini yuklashdan OLDIN tayyorlash.
 *
 * MUAMMO: telefondan kelgan surat 1920×2560 bo'ladi, profilda esa 72px
 * doirachada ko'rsatiladi. Brauzer 9 barobar kichraytirganda tez (sifatsiz)
 * filtr ishlatadi va rasm xira ko'rinadi. Ustiga, 500 KB fayl sekin
 * internetda uzoq yuklanadi.
 *
 * YECHIM: yuklashdan oldin markazidan KVADRAT qirqib, 512×512 ga sifatli
 * kichraytiramiz. 512px har qanday ekran uchun yetarli (72px × 3x = 216px),
 * hajmi esa ~10 barobar kichrayadi.
 *
 * Brauzer qo'llab-quvvatlamasa — asl fayl o'zgarishsiz yuboriladi.
 */

/** Saqlanadigan tomon uzunligi. */
const TARGET_SIZE = 512;
const QUALITY = 0.92;

/** Telefon suratidagi EXIF burilishini hisobga olib bitmap ochadi. */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      // `imageOrientation` — aks holda telefon suratlari yonboshlab qoladi.
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* pastdagi zaxira yo'l */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Rasm o‘qilmadi'));
      img.src = url;
    });
  } finally {
    // Brauzer rasmni allaqachon o'qib bo'ldi.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Rasmni markazidan kvadrat qirqib, `TARGET_SIZE` ga keltiradi.
 * Xatolik bo'lsa — asl faylni qaytaradi (yuklash to'xtab qolmasin).
 */
export async function prepareAvatarFile(file: File): Promise<File> {
  try {
    const bitmap = await loadBitmap(file);
    const w = 'width' in bitmap ? bitmap.width : 0;
    const h = 'height' in bitmap ? bitmap.height : 0;
    if (!w || !h) return file;

    // Markazdan kvadrat: doiracha ichida rasm to'g'ri joylashsin.
    const side = Math.min(w, h);
    const sx = Math.round((w - side) / 2);
    const sy = Math.round((h - side) / 2);
    // Kichik rasmni sun'iy kattalashtirmaymiz.
    const target = Math.min(TARGET_SIZE, side);

    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap as CanvasImageSource, sx, sy, side, side, 0, 0, target, target);
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

    // WebP kichikroq; qo'llab-quvvatlanmasa JPEG.
    let type = 'image/webp';
    let blob = await canvasToBlob(canvas, type);
    if (!blob || blob.type !== type) {
      type = 'image/jpeg';
      blob = await canvasToBlob(canvas, type);
    }
    if (!blob || blob.size === 0) return file;

    // Natija aslidan kattalashib ketgan bo'lsa — asl faylni qoldiramiz.
    if (blob.size >= file.size && side <= TARGET_SIZE) return file;

    const ext = type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], `avatar.${ext}`, { type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
