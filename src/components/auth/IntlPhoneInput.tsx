import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
/*
 * `intl-tel-input` — YADRO, `…WithUtils` EMAS.
 *
 * `intlTelInputWithUtils` ichida raqam tekshirish/formatlash kutubxonasi
 * (`utils`) allaqachon bog'langan: 304 KB min, yadroning o'zi esa 44 KB.
 * Ayni paytda quyida `loadUtils` ham turibdi — ya'ni o'sha utils ikkinchi
 * marta, endi alohida so'rov bilan yuklanardi.
 *
 * Bu kirish va ro'yxatdan o'tish sahifasi, ya'ni yangi foydalanuvchining
 * BIRINCHI ekrani. `loadUtils` o'z ishini qiladi: utils faqat kerak
 * bo'lganda va faqat bir marta keladi.
 */
import intlTelInput from 'intl-tel-input';
import 'intl-tel-input/styles';
import { ru as ruLabels, uz as uzLabels } from 'intl-tel-input/i18n';
import { useLocale } from '../../context/LocaleContext';
import { languageMeta } from '../../../shared/i18n/languages';

/** Qidiruv va yozuvlar tili: o'zbekcha, ruscha yoki (boshqa tillarda) inglizcha standart. */
const LABELS_BY_LOCALE: Record<string, typeof uzLabels> = { uz: uzLabels, uzc: uzLabels, tk: uzLabels, ru: ruLabels, tg: ruLabels, ky: ruLabels, kk: ruLabels };

export type IntlPhoneInputHandle = {
  /** E.164 including +, or null if empty/invalid */
  getE164: () => Promise<string | null>;
};

type Props = {
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  error?: string;
  onChange?: () => void;
  /** ISO2: uz | ru | kg | tj. Default: uz. */
  initialCountry?: 'uz' | 'ru' | 'kg' | 'tj';
};

/*
 * MAMLAKATLAR TARTIBI.
 *
 * Tepada — asosiy auditoriya (O'zbekiston, Rossiya, Tojikiston, Qirg'iziston).
 * Ostida — tez-tez so'raladiganlar (Turkmaniston, Ukraina, Yevropa, AQSh...),
 * keyin qolgan barcha mamlakatlar alifbo bo'yicha. Ro'yxat uzun bo'lgani
 * uchun qidiruv yoqilgan. Server ham istalgan haqiqiy raqamni qabul qiladi
 * ({@link shared/phoneE164}).
 */
const POPULAR_COUNTRIES = ['tm', 'kz', 'ua', 'az', 'by', 'tr', 'de', 'us', 'gb', 'kr'] as const;
export const IntlPhoneInput = forwardRef<IntlPhoneInputHandle, Props>(function IntlPhoneInput(
  { disabled, className = '', inputClassName = '', error, onChange, initialCountry = 'uz' },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { locale } = useLocale();
  const itiRef = useRef<ReturnType<typeof intlTelInput> | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    async getE164() {
      const iti = itiRef.current;
      const input = inputRef.current;
      if (!iti || !input) return null;
      await iti.promise.catch(() => {});
      if (!input.value.trim()) return null;
      if (iti.isValidNumber() !== true) return null;
      return iti.getNumber() || null;
    },
  }));

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const primary =
      initialCountry === 'ru' ? (['ru', 'uz', 'tj', 'kg'] as const) : (['uz', 'ru', 'tj', 'kg'] as const);

    const iti = intlTelInput(input, {
      initialCountry,
      countryOrder: [...primary, ...POPULAR_COUNTRIES],
      separateDialCode: true,
      strictMode: true,
      nationalMode: false,
      formatAsYouType: true,
      countrySearch: true,
      // Mamlakat nomlari ilova tilida ("Turkmaniston", "Германия").
      countryNameLocale: languageMeta(locale).bcp47,
      i18n: LABELS_BY_LOCALE[locale] ?? {},
      fixDropdownWidth: true,
      useFullscreenPopup: false,
      containerClass: 'w-full',
      loadUtils: () => import('intl-tel-input/utils'),
    });
    itiRef.current = iti;

    const handleInput = () => onChangeRef.current?.();
    input.addEventListener('input', handleInput);
    input.addEventListener('countrychange', handleInput);
    /*
     * Telefonda ro'yxat ochilganda qidiruv maydoni avtomatik fokuslanib
     * klaviaturani chiqarardi — klaviatura esa ro'yxatni yopib qo'yardi.
     * Endi avval ro'yxat ko'rinadi; qidirish uchun maydonni bosish kifoya.
     */
    const handleOpen = () => {
      const touch = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
      if (!touch) return;
      window.setTimeout(() => {
        const el = document.activeElement as HTMLElement | null;
        if (el?.classList.contains('iti__search-input')) el.blur();
      }, 0);
    };
    input.addEventListener('open:countrydropdown', handleOpen);

    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('countrychange', handleInput);
      input.removeEventListener('open:countrydropdown', handleOpen);
      iti.destroy();
      itiRef.current = null;
    };
  }, [initialCountry, locale]);

  return (
    <div className={['intl-phone-field w-full', className].filter(Boolean).join(' ')}>
      <input
        ref={inputRef}
        type="tel"
        name="phone"
        autoComplete="tel"
        disabled={disabled}
        className={[
          'block w-full min-h-[56px] px-4 py-3.5 rounded-[16px] border-[2px] bg-app-surface text-base font-bold text-app-text outline-none transition placeholder:text-[#B4BFD3]',
          error
            ? 'border-[#E5484D] focus:border-[#E5484D]'
            : 'border-app-border-strong focus:border-[#2F6BFF] focus:shadow-[0_0_0_4px_rgba(47,107,255,0.1)]',
          inputClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error ? <p className="mt-1.5 text-sm font-semibold text-[#E5484D]">{error}</p> : null}
    </div>
  );
});
