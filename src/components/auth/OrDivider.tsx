import { authStrings } from '../../constants/authStrings';

type Props = {
  label?: string;
};

export function OrDivider({ label = authStrings.or }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-px flex-1 bg-[#C8DCF3]" />
      <span className="text-sm font-medium text-[#0F172A]">{label}</span>
      <div className="h-px flex-1 bg-[#C8DCF3]" />
    </div>
  );
}
