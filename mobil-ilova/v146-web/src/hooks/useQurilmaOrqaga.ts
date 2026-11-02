import { useCallback, useEffect, useRef } from 'react';

/**
 * QURILMANING "ORTGA" TUGMASI — ILOVA ICHIDAGI QADAM UCHUN.
 *
 * MUAMMO: ilova ichidagi bosqichlar (tanlov -> video dars -> vazifalar,
 * yoki ochilib turgan oynacha) URL'ni o'zgartirmaydi — ular oddiy React
 * holati. Telefonning "ortga" tugmasi esa faqat brauzer TARIXI bo'yicha
 * yuradi. Natijada o'quvchi bitta qadam ortga qaytmoqchi bo'lganda butun
 * sahifadan chiqib, asosiy menyuga tushib ketardi.
 *
 * YECHIM: bosqich ochilganda tarixga bitta soxta yozuv qo'yiladi. "Ortga"
 * bosilganda brauzer o'sha yozuvni oladi, biz esa sahifadan chiqmasdan
 * oldingi bosqichga qaytamiz.
 *
 * @param faol   Bosqich hozir ochiqmi (yozuv faqat ochilganda qo'yiladi).
 * @param orqaga Ortga bosilganda bajariladigan ish — bosqichni yopish.
 * @returns Ekrandagi tugmalar uchun yopish funksiyasi. Bosqichni ILOVA
 *   ICHIDAN yopganda aynan shuni chaqiring: u qo'yilgan tarix yozuvini ham
 *   iste'mol qiladi. To'g'ridan-to'g'ri holatni o'zgartirsangiz, tarixda
 *   ishlatilmagan yozuv qolib, keyingi "ortga" bosilishi behuda ketardi.
 */
export function useQurilmaOrqaga(faol: boolean, orqaga: () => void): () => void {
  /*
   * Ishlov beruvchi `ref` da saqlanadi: effekt faqat `faol` o'zgarganda
   * qayta ishga tushsin. Aks holda har renderda yangi funksiya kelib,
   * tarixga takroriy yozuvlar qo'yilardi va bitta "ortga" yetmasdi.
   */
  const orqagaRef = useRef(orqaga);
  orqagaRef.current = orqaga;
  /** Yozuv haqiqatan qo'yildimi — `history.back()` shunga qarab chaqiriladi. */
  const yozuvQoyildi = useRef(false);

  useEffect(() => {
    if (!faol || typeof window === 'undefined') return;

    window.history.pushState({ falarusQadam: true }, '');
    yozuvQoyildi.current = true;

    const onPop = () => {
      yozuvQoyildi.current = false;
      orqagaRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      yozuvQoyildi.current = false;
    };
  }, [faol]);

  return useCallback(() => {
    /*
     * Yozuv hali qo'yilmagan bo'lsa (bosqich ochilishi bilan darhol
     * yopilgan nodir holat) `history.back()` sahifadan CHIQIB ketardi —
     * shuning uchun bunday paytda holat oddiy yo'l bilan yopiladi.
     */
    if (yozuvQoyildi.current && typeof window !== 'undefined') {
      window.history.back();
      return;
    }
    orqagaRef.current();
  }, []);
}
