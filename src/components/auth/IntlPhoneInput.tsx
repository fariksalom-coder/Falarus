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
  error?: string;
  onChange?: () => void;
};

/**
 * UZ / RU / TJ / KG only — mirrors {@link shared/phoneE164} rules server-side.
 */
export const IntlPhoneInput = forwardRef<IntlPhoneInputHandle, Props>(function IntlPhoneInput(
  { disabled, className = '', inputClassName = '', error, onChange },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
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

    const iti = intlTelInput(input, {
      initialCountry: 'uz',
      onlyCountries: ['uz', 'ru', 'kg', 'tj'],
      countryOrder: ['uz', 'ru', 'tj', 'kg'],
      separateDialCode: true,
      strictMode: true,
      nationalMode: false,
      formatAsYouType: true,
      countrySearch: false,
      fixDropdownWidth: true,
      useFullscreenPopup: false,
      containerClass: 'w-full',
      loadUtils: () => import('intl-tel-input/utils'),
    });
    itiRef.current = iti;

    const handleInput = () => onChangeRef.current?.();
    input.addEventListener('input', handleInput);
    input.addEventListener('countrychange', handleInput);

    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('countrychange', handleInput);
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
          'block w-full min-h-[56px] px-4 py-3.5 rounded-[16px] border-[2px] bg-white text-base font-bold text-[#17224A] outline-none transition placeholder:text-[#B4BFD3]',
          error
            ? 'border-[#E5484D] focus:border-[#E5484D]'
            : 'border-[#E1E7F1] focus:border-[#2F6BFF] focus:shadow-[0_0_0_4px_rgba(47,107,255,0.1)]',
          inputClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error ? <p className="mt-1.5 text-sm font-semibold text-[#E5484D]">{error}</p> : null}
    </div>
  );
});
