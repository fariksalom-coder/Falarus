import { useLocale } from '../../context/LocaleContext';

type Props = {
  label?: string;
};

export function OrDivider({ label }: Props) {
  const { t } = useLocale();
  const text = label ?? t('auth.or');

  return (
    <div className="flex items-center gap-3">
      <div className="h-[1.5px] flex-1 bg-[#EAF0FE]" />
      <span className="text-xs font-black uppercase tracking-[0.06em] text-[#A7B1C6]">{text}</span>
      <div className="h-[1.5px] flex-1 bg-[#EAF0FE]" />
    </div>
  );
}
