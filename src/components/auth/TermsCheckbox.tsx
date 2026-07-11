import { Link } from 'react-router-dom';
import { useLocale } from '../../context/LocaleContext';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function TermsCheckbox({ checked, onChange }: Props) {
  const { t } = useLocale();

  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E1E7F1] bg-white text-[#2F6BFF] focus:ring-[#2F6BFF]"
      />
      <span className="text-[13px] leading-snug text-[#6B7BA8]">
        {t('auth.termsPrefix')}
        <Link to="/huquqiy/ommaviy-oferta" className="font-semibold underline">
          {t('auth.termsOfUse')}
        </Link>
        {t('auth.termsAnd')}
        <Link to="/huquqiy/maxfiylik" className="font-semibold underline">
          {t('auth.privacyPolicy')}
        </Link>
        {t('auth.termsSuffix')}
      </span>
    </label>
  );
}
