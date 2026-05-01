/**
 * Click Merchant API — facade aligned with integration checklist.
 * HTTP + parsing live in `clickMerchantClient.ts`.
 */

export { buildClickMerchantAuthHeader as generateAuthHeader } from './clickMerchantClient.js';
/** Authenticated GET/POST/DELETE — same role as checklist `clickRequest` for secured endpoints */
export { clickMerchantAuthorizedRequest as clickRequest } from './clickMerchantClient.js';

export {
  clickInvoiceCreate as createInvoice,
  clickCardTokenRequest as createCardToken,
  clickCardTokenVerify as verifyCardToken,
  clickCardTokenPayment as payWithToken,
  clickPaymentStatus as getPaymentStatus,
  clickCardTokenDelete as deleteCardToken,
  clickSubmitOfdItems,
  clickFetchOfdReceipt,
} from './clickMerchantClient.js';

export type { ClickMerchantJson, ClickOfdItem } from './clickMerchantClient.js';
export {
  clickMerchantErrorCode,
  isClickMerchantSuccess,
  isClickPaymentSucceeded,
  isClickOfdSubmitSuccess,
  maskCardNumberInput,
  CLICK_MERCHANT_API_BASE,
} from './clickMerchantClient.js';
