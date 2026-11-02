import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import type { AppLocale } from '../../shared/i18n/languages';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function LanguagePickerModal({ open, onClose }: Props) {
  const { locale, setLocale, t, languages } = useLocale();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function pick(code: AppLocale) {
    setLocale(code);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-picker-title"
        className="w-full max-w-md rounded-t-[24px] border border-app-border bg-app-surface p-5 shadow-app-card sm:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="language-picker-title" className="text-lg font-extrabold text-app-text">
              {t('language.selectTitle')}
            </h2>
            <p className="mt-1 text-sm text-app-text-muted">{t('language.selectSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-icon-bg text-app-icon-fg"
            aria-label={t('common.cancel')}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <ul className="max-h-[min(60vh,420px)] space-y-2 overflow-y-auto">
          {languages.map((lang) => {
            const selected = lang.code === locale;
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  onClick={() => pick(lang.code)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                    selected
                      ? 'border-app-primary bg-app-primary/8'
                      : 'border-app-border bg-app-surface hover:bg-[var(--app-row-hover)]'
                  }`}
                >
                  <span className="text-[15px] font-semibold text-app-text">{lang.label}</span>
                  {selected ? (
                    <Check className="h-5 w-5 shrink-0 text-app-primary" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
