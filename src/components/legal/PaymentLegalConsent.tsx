import { Link } from 'react-router-dom';
import { LEGAL_PATHS } from '../../config/legalPublic';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  idPrefix?: string;
};

export function PaymentLegalConsentCheckbox({ checked, onChange, idPrefix = 'payment' }: Props) {
  const id = `${idPrefix}-legal-consent`;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3">
      <label htmlFor={id} className="flex cursor-pointer gap-3 text-left">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-[#0B2A6B] focus:ring-[#123A8F]"
        />
        <span className="text-sm leading-snug text-slate-700">
          Men{' '}
          <Link
            to={LEGAL_PATHS.offer}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#0B2A6B] underline decoration-blue-600/30 underline-offset-2 hover:text-[#071B5E]"
            onClick={(e) => e.stopPropagation()}
          >
            ommaviy oferta
          </Link>{' '}
          shartlariga roziman va{' '}
          <Link
            to={`${LEGAL_PATHS.offer}#avtomatik-tolov`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#0B2A6B] underline decoration-blue-600/30 underline-offset-2 hover:text-[#071B5E]"
            onClick={(e) => e.stopPropagation()}
          >
            avtomatik to‘lovga
          </Link>{' '}
          rozilik bildiraman.
        </span>
      </label>
    </div>
  );
}
