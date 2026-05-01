import { useMemo } from 'react';
import { parseClickPaymentUrlForForm } from '../../../shared/clickPayFormParse';
import styles from './ClickOfficialPayForm.module.css';

type Props = {
  paymentUrl: string;
  submitLabel?: string;
  className?: string;
};

/**
 * GET form to Click Shop pay URL — opens in new tab (`target="_blank"`).
 */
export function ClickOfficialPayForm({ paymentUrl, submitLabel = "CLICK orqali to‘lash", className }: Props) {
  const { action, fields } = useMemo(() => parseClickPaymentUrlForForm(paymentUrl), [paymentUrl]);

  return (
    <form action={action} method="get" target="_blank" rel="noopener noreferrer" className={className}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className={styles.click_logo}>
        <i aria-hidden />
        <span>{submitLabel}</span>
      </button>
    </form>
  );
}
