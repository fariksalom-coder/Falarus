type Props = {
  message: string;
  variant?: 'error' | 'success';
};

export function AuthFormBanner({ message, variant = 'error' }: Props) {
  const isError = variant === 'error';
  return (
    <div
      className={[
        'w-full rounded-xl p-3 text-sm',
        isError ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#F0FDF4] text-[#22A552]',
      ].join(' ')}
      role="alert"
    >
      {message}
    </div>
  );
}
