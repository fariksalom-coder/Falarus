import { Link } from 'react-router-dom';
import { authStrings } from '../../constants/authStrings';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function TermsCheckbox({ checked, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#C8DCF3] text-[#1E3A8A] focus:ring-[#2563EB]"
      />
      <span className="text-[13px] leading-snug text-[#0F172A]">
        {authStrings.termsPrefix}
        <Link to="/huquqiy/ommaviy-oferta" className="font-semibold underline">
          {authStrings.termsOfUse}
        </Link>
        {authStrings.termsAnd}
        <Link to="/huquqiy/maxfiylik" className="font-semibold underline">
          {authStrings.privacyPolicy}
        </Link>
        {authStrings.termsSuffix}
      </span>
    </label>
  );
}
