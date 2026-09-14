type Props = {
  prefix: string;
  action: string;
  onAction: () => void;
};

export function AuthSwitchLink({ prefix, action, onAction }: Props) {
  return (
    <p className="text-center text-sm font-medium text-app-brand">
      {prefix}
      <button type="button" onClick={onAction} className="underline underline-offset-2">
        {action}
      </button>
    </p>
  );
}
