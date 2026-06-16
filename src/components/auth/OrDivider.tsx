import { useLocale } from '../../context/LocaleContext';

type Props = {
  label?: string;
};

export function OrDivider({ label }: Props) {
  const { t } = useLocale();
  const text = label ?? t('auth.or');

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-px flex-1 bg-[#C8DCF3]" />
      <span className="text-sm font-medium text-[#0F172A]">{text}</span>
      <div className="h-px flex-1 bg-[#C8DCF3]" />
    </div>
  );
}
