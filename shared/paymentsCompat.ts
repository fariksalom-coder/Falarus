/**
 * Production DB may lag migrations: PostgREST errors when selecting/inserting `payments.product_code`.
 */
export function isPaymentsProductCodeSchemaError(
  err: { message?: string } | null | undefined
): boolean {
  const msg = (err?.message ?? '').toLowerCase();
  if (!msg.includes('product_code')) return false;
  return (
    msg.includes('schema') ||
    msg.includes('column') ||
    msg.includes('cache') ||
    msg.includes('could not find')
  );
}
