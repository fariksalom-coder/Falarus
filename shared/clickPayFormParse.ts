/** Browser-safe helpers for Click Shop GET pay forms (no Node crypto). */

export const CLICK_PAY_ENDPOINT = 'https://my.click.uz/services/pay';

export function parseClickPaymentUrlForForm(paymentUrl: string): { action: string; fields: Record<string, string> } {
  try {
    const u = new URL(paymentUrl);
    const fields: Record<string, string> = {};
    u.searchParams.forEach((value, key) => {
      fields[key] = value;
    });
    return { action: `${u.origin}${u.pathname}`, fields };
  } catch {
    return { action: CLICK_PAY_ENDPOINT, fields: {} };
  }
}
