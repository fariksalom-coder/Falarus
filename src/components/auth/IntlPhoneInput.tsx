import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import intlTelInput from 'intl-tel-input/intlTelInputWithUtils';
import 'intl-tel-input/styles';

export type IntlPhoneInputHandle = {
  /** E.164 including +, or null if empty/invalid */
  getE164: () => Promise<string | null>;
};

type Props = {
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
};

/**
 * UZ / RU / TJ / KG only — mirrors {@link shared/phoneE164} rules server-side.
 */
export const IntlPhoneInput = forwardRef<IntlPhoneInputHandle, Props>(function IntlPhoneInput(
  { disabled, className = '', inputClassName = '' },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const itiRef = useRef<ReturnType<typeof intlTelInput> | null>(null);

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

    const iti = intlTelInput(input, {
      initialCountry: 'uz',
      onlyCountries: ['uz', 'ru', 'kg', 'tj'],
      countryOrder: ['uz', 'ru', 'tj', 'kg'],
      separateDialCode: true,
      strictMode: true,
      nationalMode: false,
      formatAsYouType: true,
      countrySearch: true,
      fixDropdownWidth: true,
      containerClass: 'w-full',
      loadUtils: () => import('intl-tel-input/utils'),
    });
    itiRef.current = iti;

    return () => {
      iti.destroy();
      itiRef.current = null;
    };
  }, []);

  return (
    <div className={['intl-phone-field w-full', className].filter(Boolean).join(' ')}>
      <input
        ref={inputRef}
        type="tel"
        name="phone"
        autoComplete="tel"
        disabled={disabled}
        className={[
          'block w-full min-h-11 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm outline-none transition',
          'focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15',
          inputClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  );
});
