import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { parseBody } from '../_lib/request.js';
import {
  buildClickErrorResponse,
  buildClickPaymentUrl,
  buildClickSuccessResponse,
  inferPaymentProviderFromProofUrl,
  normalizeClickCallbackPayload,
  verifyClickSignature,
} from '../../shared/clickPayments.js';
import { isPaymentsProductCodeSchemaError } from '../../shared/paymentsCompat.js';
import { normalizePaymentProductCode } from '../../shared/paymentProducts.js';
import { activateApprovedPayment } from '../../shared/paymentActivation.js';
import { getClickConfig } from '../../shared/clickConfig.js';
import { invalidateAccessCache } from '../_lib/subscription.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = normalizeClickCallbackPayload(parseBody(req.body));
  const {
    secretKey: clickSecretKey,
    serviceId: clickServiceId,
    merchantId: clickMerchantId,
  } = getClickConfig();
  const paymentId = Number(payload.merchant_trans_id);

  if (!clickSecretKey || !clickServiceId) {
    return res.status(503).json(
      buildClickErrorResponse({ payload, error: -9, note: 'Click konfiguratsiyasi topilmadi' })
    );
  }
  if (payload.service_id !== clickServiceId || !verifyClickSignature(payload, clickSecretKey)) {
    return res.status(400).json(
      buildClickErrorResponse({
        payload,
        merchantPrepareId: paymentId || 0,
        error: -1,
        note: 'Imzo noto‘g‘ri',
      })
    );
  }
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    return res.status(400).json(
      buildClickErrorResponse({ payload, error: -5, note: 'To‘lov topilmadi' })
    );
  }

  let { data: payment, error } = await supabase
    .from('payments')
    .select('id, user_id, tariff_type, product_code, amount, status, payment_proof_url')
    .eq('id', paymentId)
    .maybeSingle();
  if (error && isPaymentsProductCodeSchemaError(error)) {
    const legacy = await supabase
      .from('payments')
      .select('id, user_id, tariff_type, amount, status, payment_proof_url')
      .eq('id', paymentId)
      .maybeSingle();
    payment = legacy.data as typeof payment;
    error = legacy.error;
  }
  if (error || !payment) {
    return res.status(404).json(
      buildClickErrorResponse({
        payload,
        merchantPrepareId: paymentId,
        error: -5,
        note: 'To‘lov topilmadi',
      })
    );
  }
  if (Number(payment.amount) !== Number(payload.amount)) {
    return res.status(400).json(
      buildClickErrorResponse({
        payload,
        merchantPrepareId: paymentId,
        error: -2,
        note: 'Summa mos emas',
      })
    );
  }
  if (String(payload.error || '0') !== '0') {
    await supabase.from('payments').update({ status: 'rejected' }).eq('id', paymentId).eq('status', 'pending');
    return res.status(200).json(
      buildClickErrorResponse({
        payload,
        merchantPrepareId: paymentId,
        error: -9,
        note: payload.error_note || 'To‘lov bekor qilindi',
      })
    );
  }
  if (payment.status === 'approved') {
    return res.status(200).json(
      buildClickSuccessResponse({
        payload,
        merchantPrepareId: paymentId,
      })
    );
  }

  const productCode = normalizePaymentProductCode((payment as { product_code?: string | null }).product_code);
  const { error: approveErr } = await supabase
    .from('payments')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      payment_proof_url:
        inferPaymentProviderFromProofUrl((payment as { payment_proof_url?: string | null }).payment_proof_url) === 'click'
          ? (payment as { payment_proof_url?: string | null }).payment_proof_url
          : buildClickPaymentUrl({
              serviceId: clickServiceId,
              merchantId: clickMerchantId,
              amount: Number(payment.amount),
              paymentId,
            }),
    })
    .eq('id', paymentId)
    .eq('status', 'pending');
  if (approveErr) {
    return res.status(500).json(
      buildClickErrorResponse({
        payload,
        merchantPrepareId: paymentId,
        error: -9,
        note: approveErr.message,
      })
    );
  }

  try {
    await activateApprovedPayment(supabase, {
      userId: Number((payment as { user_id: number }).user_id),
      productCode,
      tariffType: (payment as { tariff_type?: string | null }).tariff_type,
    });
    invalidateAccessCache(Number((payment as { user_id: number }).user_id));
  } catch (activationErr) {
    console.error('[click/complete activation]', activationErr);
  }

  return res.status(200).json(
    buildClickSuccessResponse({
      payload,
      merchantPrepareId: paymentId,
    })
  );
}
