/**
 * QO'LDA YOZILGAN DOSKA DARSLARI.
 *
 * Odatda doska darsini AI tuzadi (`buildLesson`). Lekin ba'zi kunlar uchun
 * dars QO'LDA, metodik tartibda tayyorlangan bo'ladi — o'shanda AI'ga umuman
 * borilmaydi: dars har safar AYNAN bir xil, tartibi kafolatlangan, tayyorlash
 * bepul va bir zumda bo'ladi.
 *
 * 1-kun manbasi — `dars-1-vizual.html` taqdimoti (12 slayd). Slaydlar shu
 * yerda o'sha tartibda, doskaning o'z shakllariga solingan:
 *   slayd sarlavhasi   -> bosqich sarlavhasi
 *   izoh/tushuntirish  -> `tushuntirish` (ustoz shuni ovoz bilan aytadi)
 *   ustunli taqqoslash -> `taqqoslash`
 *   ✓/✕ juftliklari    -> `xatolar`
 *   gap kartochkalari  -> `misollar`
 *
 * YANGI KUN QO'SHISH: shu ro'yxatga kun raqami bilan yozing. Dars matni
 * doskada KO'RINADI va o'sha matn ovoz bilan O'QILADI — ikkisi bitta manbadan
 * (`shared/nutqBolaklari.ts`), shuning uchun ular hech qachon ajralib
 * qolmaydi. Aytilishi kerak bo'lgan hamma narsa maydonlarga yozilishi shart:
 * doskada yo'q narsa aytilmaydi ham.
 */
import type { DoskaDars } from '../services/ustozDoska.service.js';

/**
 * 1-KUN — Shaxs olmoshlari va tanishuv.
 *
 * Darsning maqsadi bitta: dars oxirida o'quvchi o'zini rus tilida tanishtira
 * olsin («Меня зовут…, я из Узбекистана, я строитель»). Har bosqich shu
 * gapga olib boradi.
 */
const KUN_1: DoskaDars = {
  sarlavha: 'Shaxs olmoshlari va tanishuv',
  kalitSavol: 'КАК ВАС ЗОВУТ? — Ismingiz nima?',
  maqsad: "Dars oxirida o'quvchi rus tilida o'zini tanishtira oladi.",
  bosqichlar: [
    /* 01 — Muqova: maqsadni aytamiz. */
    {
      sarlavha: 'Bugungi dars',
      tushuntirish:
        "Bugun rus tilida o'zingizni tanishtirishni o'rganamiz. Dars oxirida siz " +
        "«Меня зовут», «Я из Узбекистана», «Я строитель» deb ayta olasiz. " +
        "Buning uchun avval shaxs olmoshlarini o'rganamiz.",
      qoida: '',
      taqqoslash: null,
      xato: null,
      misollar: [],
      vazifa: null,
    },

    /* 02 — Yetti olmosh. */
    {
      sarlavha: '7 ta «shaxs olmoshi»',
      tushuntirish:
        "Rus tilida yettita shaxs olmoshi bor. Ularning talaffuzi yozilishidan " +
        "farq qiladi: «она» — «ana», «они» — «ani».",
      qoida: 'Я · Ты · Он · Она · Мы · Вы · Они',
      taqqoslash: null,
      xato: null,
      misollar: [
        { ru: 'Я', uz: 'Men', ikonka: 'ozim' },
        { ru: 'Ты', uz: 'Sen', ikonka: 'korsat' },
        { ru: 'Он', uz: 'U — erkak', ikonka: 'erkak' },
        { ru: 'Она', uz: 'U — ayol', ikonka: 'ayol' },
        { ru: 'Мы', uz: 'Biz', ikonka: 'juft' },
        { ru: 'Вы', uz: 'Siz, sizlar', ikonka: 'guruh' },
        { ru: 'Они', uz: 'Ular', ikonka: 'guruh' },
      ],
      vazifa: null,
    },

    /* 03 — Bitta «u» ikkiga bo'linadi. Kunning eng ko'p xatosi shu yerda. */
    {
      sarlavha: 'Bitta «u» — ikkita so‘z',
      tushuntirish:
        "O'zbek tilida bitta «u» bor: u ham erkak, ham ayol haqida ishlatiladi. " +
        "Rus tilida esa u ikkiga bo'linadi — erkak haqida «Он», ayol haqida «Она». " +
        "Ismga qarab tanlanadi.",
      qoida: 'Erkak — Он. Ayol — Она.',
      ayrilish: {
        soz: 'U',
        tarmoqlar: [
          { soz: 'ОН', izoh: 'Сергей · Акмал', ikonka: 'erkak' },
          { soz: 'ОНА', izoh: 'Мария · Дилноза', ikonka: 'ayol' },
        ],
      },
      /*
       * USTUNLAR OLIB TASHLANDI (2026-08-14).
       *
       * Yuqoridagi `ayrilish` allaqachon aynan shu juftlikni — ОН/ОНА va
       * ularning ismlarini — ko'rsatib turadi. Ustunlar qo'shilganda bitta
       * ekranda BIR XIL narsa ikki marta chizilardi va slayd tartibsiz
       * ko'rinardi. Taqdimotning 3-slaydida ham faqat ayrilish bor.
       */
      taqqoslash: null,
      xato: {
        notogri: 'Мария — он врач.',
        togri: 'Мария — она врач.',
        izoh: "Ism ayolniki bo'lsa, olmosh ham ayolniki bo'ladi.",
      },
      misollar: [],
      vazifa: null,
    },

    /* 04 — Gapda qanday ishlaydi. */
    {
      sarlavha: 'Gapda qanday ishlaydi',
      tushuntirish:
        "Endi shu ikki so'zni gapda ko'ramiz. Avval odamning ismini aytamiz, " +
        "keyingi gapda esa ism o'rniga olmosh qo'yamiz.",
      qoida: '',
      taqqoslash: null,
      xato: null,
      misollar: [
        { ru: 'Это Сергей. Он строитель.', uz: 'Bu Sergey. U quruvchi.', ikonka: 'quruvchi' },
        { ru: 'Это Мария. Она студентка.', uz: 'Bu Mariya. U talaba.', ikonka: 'talaba' },
      ],
      vazifa: null,
    },

    /* 05 — «Быть» aytilmaydi: o'zbekchadagi qo'shimchaning o'rni bo'sh qoladi. */
    {
      sarlavha: 'O‘rtada hech narsa yo‘q',
      tushuntirish:
        "O'zbekchada «quruvchiMAN» deymiz — so'z oxirida qo'shimcha bor. " +
        "Ruschada bunday qo'shimcha yo'q va o'rtaga hech narsa qo'yilmaydi: " +
        "«Я строитель». «Есть» so'zi yozilmaydi ham, aytilmaydi ham.",
      qoida: 'Я + kim/nima. O‘rtaga «есть» qo‘yilmaydi.',
      taqqoslash: null,
      tenglama: {
        qatorlar: [
          {
            nom: "o'zbekcha",
            bloklar: [
              { matn: 'Men' },
              { matn: 'quruvchi' },
              { matn: 'MAN', tur: 'urgu' },
            ],
          },
          {
            nom: 'ruscha',
            bloklar: [
              { matn: 'Я', tur: 'urgu' },
              { matn: "bo'sh", tur: 'bosh' },
              { matn: 'строитель', tur: 'urgu' },
            ],
          },
          {
            nom: 'shuning uchun',
            bloklar: [
              { matn: 'есть', tur: 'ochirilgan' },
              { matn: 'yozilmaydi ham, aytilmaydi ham' },
            ],
          },
        ],
      },
      xato: null,
      misollar: [],
      vazifa: null,
    },

    /* 06 — To'g'ri / Xato mashqi: bitta qoida uch xil gapda. */
    {
      sarlavha: 'To‘g‘ri va xato',
      tushuntirish:
        "Quyida bitta xato uch xil gapda takrorlanadi. Har juftlikda tepadagisi — " +
        "xato, pastdagisi — to'g'ri. Farqi bittagina: ortiqcha «есть».",
      qoida: '',
      taqqoslash: null,
      xato: null,
      xatolar: [
        { notogri: 'Я есть строитель.', togri: 'Я строитель.' },
        { notogri: 'Он есть врач.', togri: 'Он врач.' },
        { notogri: 'Мы есть из Узбекистана.', togri: 'Мы из Узбекистана.' },
      ],
      misollar: [],
      vazifa: null,
    },

    /* 07 — ВЫ / ТЫ: bu grammatika emas, hurmat. */
    {
      sarlavha: 'Kimga «ВЫ», kimga «ТЫ»',
      tushuntirish:
        "Bu grammatika emas — bu hurmat. Rus tilida notanish odamga «Вы» deyiladi, " +
        "yaqin odamga esa «Ты». Noto'g'ri tanlansa, odam xafa bo'lishi mumkin.",
      qoida: 'Notanish odamga — ВЫ. Yaqin odamga — ТЫ.',
      taqqoslash: {
        savol: 'КАК ОБРАЩАТЬСЯ? — Qanday murojaat qilamiz?',
        ustunlar: [
          {
            ikonka: 'boshliq',
            bosh: 'ВЫ — hurmat',
            satrlar: ['Notanish odam', 'Boshliq, shifokor', 'Yoshi katta odam'],
          },
          {
            ikonka: 'dostlar',
            bosh: 'ТЫ — yaqinlik',
            satrlar: ["Do'st, tengdosh", 'Yosh qarindosh', 'Bola'],
          },
        ],
      },
      xato: null,
      misollar: [],
      vazifa: null,
    },

    /* 08 — Amaldagi vaziyatlar: bu qoida ish joyida qimmatga tushadi. */
    {
      sarlavha: 'Amalda',
      tushuntirish:
        "Hujjat tekshiruvida yoki ish joyida «ты» deb murojaat qilish jiddiy muammo " +
        "bo'lishi mumkin. Notanish odam bilan har doim «Вы» dan boshlang. " +
        "Agar u o'zi «давай на ты» desa — o'shanda «Ты» ga o'tasiz.",
      qoida: '',
      taqqoslash: null,
      xato: null,
      nishonlar: [
        { kim: 'Boshliq', izoh: 'начальник', togri: 'ВЫ', notogri: 'ТЫ', ikonka: 'boshliq' },
        { kim: 'Politsiya', izoh: 'полиция', togri: 'ВЫ', notogri: 'ТЫ', ikonka: 'politsiya' },
        { kim: "Do'st", izoh: 'друг', togri: 'ТЫ', notogri: 'ВЫ', ikonka: 'dostlar' },
      ],
      misollar: [],
      vazifa: null,
    },

    /* 09 — «Вы» ning ikki ma'nosi. */
    {
      sarlavha: '«Вы» — ikki ma‘noda',
      tushuntirish:
        "«Вы» so'zi ikki xil ma'noda keladi va buni faqat vaziyat aytib beradi. " +
        "Bitta odamga qarab aytsangiz — bu hurmat. Bir necha odamga aytsangiz — bu ko'plik.",
      qoida: '',
      taqqoslash: {
        savol: 'Вы = ?',
        ustunlar: [
          { ikonka: 'odam', bosh: 'Вы = Siz', satrlar: ['bitta odam', 'hurmat bilan'] },
          { ikonka: 'guruh', bosh: 'Вы = Sizlar', satrlar: ['bir necha odam', "ko'plik"] },
        ],
      },
      xato: null,
      misollar: [],
      vazifa: null,
    },

    /* 10 — Tanishuv iboralari: butunligicha yodlanadi. */
    {
      sarlavha: 'Tanishuv',
      tushuntirish:
        "Endi eng kerakli iboralar. Ular so'zma-so'z tarjima qilinmaydi — " +
        "butunligicha, bir bo'lak bo'lib eslab qolinadi.",
      qoida: 'Меня зовут… — Mening ismim…',
      taqqoslash: null,
      xato: null,
      misollar: [
        { ru: 'Меня зовут Фармон.', uz: 'Mening ismim Farmon.', ikonka: 'hujjat' },
        { ru: 'Как вас зовут?', uz: 'Ismingiz nima? — notanish odamga, hurmat bilan', ikonka: 'savol' },
        { ru: 'Как тебя зовут?', uz: "Isming nima? — do'stga, tengdoshga", ikonka: 'savol' },
      ],
      vazifa: null,
    },

    /* 11 — меня / вас / тебя: kelishik emas, yo'nalish. */
    {
      sarlavha: 'Kim haqida gapiryapsiz?',
      tushuntirish:
        "Kelishiklarni hozir o'rganmaymiz. Faqat yo'nalishni eslab qoling: " +
        "gap o'zim haqimda bo'lsa «меня», «Вы» deydigan odam haqida bo'lsa «вас», " +
        "«Ты» deydigan odam haqida bo'lsa «тебя».",
      qoida: '',
      taqqoslash: {
        savol: 'Меня · Вас · Тебя',
        ustunlar: [
          { ikonka: 'ozim', bosh: 'меня', satrlar: ["o'zim haqimda"] },
          { ikonka: 'boshliq', bosh: 'вас', satrlar: ['«Вы» degan odam'] },
          { ikonka: 'dostlar', bosh: 'тебя', satrlar: ['«Ты» degan odam'] },
        ],
      },
      xato: null,
      misollar: [],
      vazifa: null,
    },

    /* 12 — Bugun yod olinadigan ikki ibora. */
    {
      sarlavha: 'Bugun yod olamiz',
      tushuntirish:
        "Mana shu ikki ibora bilan o'zingizni tanishtira olasiz. Ikkinchisida " +
        "«строитель» o'rnida sizning kasbingiz turadi: «Я повар» — men oshpazman, " +
        "«Я водитель» — men haydovchiman.",
      qoida: '',
      taqqoslash: null,
      xato: null,
      misollar: [
        { ru: 'Я из Узбекистана.', uz: "Men O'zbekistondanman.", ikonka: 'joy' },
        { ru: 'Я строитель.', uz: 'Men quruvchiman.', ikonka: 'quruvchi' },
      ],
      vazifa: null,
    },
  ],
  savollar: [
    'Как вас зовут?',
    'Вы из Узбекистана?',
    'Кем вы работаете? Javobingizni «Я…» bilan boshlang.',
  ],
  nazorat: {
    savol: 'Мария — … врач.',
    variantlar: ['он', 'она', 'оно'],
    togriIndex: 1,
    izoh: 'Мария — ayol ismi, shuning uchun «она».',
  },
  xulosa:
    "Bugun yettita shaxs olmoshini o'rgandik, rus tilida «есть» qo'yilmasligini bildik " +
    "va «Вы» bilan «Ты» farqini ko'rdik. Endi o'zingizni tanishtira olasiz: " +
    "«Меня зовут…, я из Узбекистана, я строитель».",
};

/** Kun raqami -> qo'lda yozilgan dars. Bu yerda yo'q kun AI'ga boradi. */
export const QOLDA_DARSLAR: Record<number, DoskaDars> = {
  1: KUN_1,
};

export function qoldaDars(kun?: number): DoskaDars | null {
  if (!kun) return null;
  return QOLDA_DARSLAR[kun] ?? null;
}
