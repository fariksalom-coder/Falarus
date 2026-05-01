import { Link } from 'react-router-dom';
import { getLegalEntityMeta, LEGAL_PATHS } from '../../config/legalPublic';

type Variant = 'full' | 'compact';

type Props = { variant?: Variant; /** Ichki sahifa futeri (masalan Landing) — tashqi `<footer>` qo‘ymaydi */ embedded?: boolean };

export function SiteLegalFooter({ variant = 'full', embedded = false }: Props) {
  const meta = getLegalEntityMeta();
  const compact = variant === 'compact';
  const telClean = meta.phone.replace(/\s/g, '');

  const inner = (
    <div className={`mx-auto max-w-6xl px-4 ${compact ? '' : 'sm:px-6'}`}>
        <nav
          className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 ${compact ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}
          aria-label="Huquqiy hujjatlar"
        >
          <Link
            to={LEGAL_PATHS.offer}
            className="transition hover:text-blue-600 hover:underline underline-offset-2"
          >
            Ommaviy oferta
          </Link>
          <span className="text-slate-300" aria-hidden>
            |
          </span>
          <Link
            to={LEGAL_PATHS.privacy}
            className="transition hover:text-blue-600 hover:underline underline-offset-2"
          >
            Maxfiylik siyosati
          </Link>
          <span className="text-slate-300" aria-hidden>
            |
          </span>
          <Link
            to={LEGAL_PATHS.refund}
            className="transition hover:text-blue-600 hover:underline underline-offset-2"
          >
            Qaytarish siyosati
          </Link>
        </nav>

        <div
          className={`mx-auto mt-4 max-w-xl ${compact ? 'text-[11px] leading-relaxed' : 'text-xs leading-relaxed'} text-center text-slate-500`}
        >
          <p className="font-semibold text-slate-600">Tadbirkor haqida ma’lumot</p>
          <p className="mt-1">{meta.proprietorLabel}</p>
          <p className="mt-0.5">INN / STIR: {meta.innLabel}</p>
          <p className="mt-0.5">
            Email:{' '}
            <a className="text-blue-600 hover:underline" href={`mailto:${meta.email}`}>
              {meta.email}
            </a>
          </p>
          <p className="mt-0.5">
            Telefon:{' '}
            <a className="text-blue-600 hover:underline" href={telClean ? `tel:${telClean}` : undefined}>
              {meta.phone}
            </a>
          </p>
        </div>
      </div>
  );

  if (embedded) return inner;

  return (
    <footer
      className={`border-t border-slate-200/90 bg-white/95 ${compact ? 'py-4' : 'py-8'} shrink-0`}
    >
      {inner}
    </footer>
  );
}
