import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { parseBody } from '../_lib/request.js';
import {
  buildClickErrorResponse,
  buildClickSuccessResponse,
  normalizeClickCallbackPayload,
  verifyClickSignature,
} from '../../shared/clickPayments.js';
import { getClickConfig } from '../../shared/clickConfig.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = normalizeClickCallbackPayload(parseBody(req.body));
  const { secretKey: clickSecretKey, serviceId: clickServiceId } = getClickConfig();
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

  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, amount, status')
    .eq('id', paymentId)
    .maybeSingle();
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

  return res.status(200).json(
    buildClickSuccessResponse({
      payload,
      merchantPrepareId: paymentId,
    })
  );
}
