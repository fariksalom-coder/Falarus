import '../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase.js';
import { setCors, handleOptions } from '../../_lib/cors.js';
import { requireAuth } from '../../_lib/auth.js';
import { parseBody } from '../../_lib/request.js';
import {
  isSubscriptionTariffType,
  normalizePaymentProductCode,
} from '../../../shared/paymentProducts.js';
import {
  buildClickPaymentUrl,
  getClickAmountForProduct,
} from '../../../shared/clickPayments.js';
import { isPaymentsProductCodeSchemaError } from '../../../shared/paymentsCompat.js';
import { getClickConfig } from '../../../shared/clickConfig.js';

async function fetchUzTariffPrices() {
  const { data: rows, error } = await supabase
    .from('tariff_prices')
    .select('tariff_type, price')
    .eq('currency', 'UZS')
    .in('tariff_type', ['month', 'three_months', 'year']);
  if (error) throw error;
  return {
    month: Number(rows?.find((r: { tariff_type: string }) => r.tariff_type === 'month')?.price ?? 0),
    three_months: Number(rows?.find((r: { tariff_type: string }) => r.tariff_type === 'three_months')?.price ?? 0),
    year: Number(rows?.find((r: { tariff_type: string }) => r.tariff_type === 'year')?.price ?? 0),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    const {
      serviceId: clickServiceId,
      merchantId: clickMerchantId,
      returnUrl: clickReturnUrl,
    } = getClickConfig();
    if (!clickServiceId || !clickMerchantId) {
      return res.status(503).json({ error: 'Click sozlanmagan. CLICK_SERVICE_ID va CLICK_MERCHANT_ID kerak.' });
    }

    const body = parseBody(req.body);
    const productCode = normalizePaymentProductCode(body.product_code);
    const tariffType = String(body.tariff_type ?? '').trim();
    if (productCode === 'russian' && !isSubscriptionTariffType(tariffType)) {
      return res.status(400).json({ error: 'tariff_type kerak: month, 3months, year' });
    }

    let { data: pending, error: pendingErr } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('product_code', productCode)
      .limit(1)
      .maybeSingle();
    if (pendingErr && isPaymentsProductCodeSchemaError(pendingErr)) {
      const legacy = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle();
      pending = legacy.data;
    }
    if (pending) {
      return res.status(400).json({
        error: 'PENDING_PAYMENT',
        message: "To'lovingiz tekshirilmoqda. Administrator tez orada to'lovni tasdiqlaydi. Tasdiqlangandan so'ng sizga kursga kirish ochiladi.",
      });
    }

    const tariffPrices = productCode === 'russian' ? await fetchUzTariffPrices() : null;
    const amount = getClickAmountForProduct({
      productCode,
      tariffType: productCode === 'russian' && isSubscriptionTariffType(tariffType) ? tariffType : null,
      tariffPrices,
    });
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "To'lov summasi aniqlanmadi" });
    }

    const insertBase: Record<string, unknown> = {
      user_id: userId,
      tariff_type: productCode === 'russian' ? tariffType : null,
      currency: 'UZS',
      amount,
      payment_proof_url: null,
      payment_time: new Date().toISOString(),
      status: 'pending',
    };
    let { data: row, error: insertErr } = await supabase
      .from('payments')
      .insert({ ...insertBase, product_code: productCode })
      .select('id')
      .single();
    if (insertErr && isPaymentsProductCodeSchemaError(insertErr)) {
      const legacyIns = await supabase
        .from('payments')
        .insert({
          ...insertBase,
          tariff_type: productCode === 'russian' ? tariffType : 'month',
        })
        .select('id')
        .single();
      row = legacyIns.data;
      insertErr = legacyIns.error;
    }
    if (insertErr || !row) {
      return res.status(500).json({ error: insertErr?.message || 'To‘lov yaratilmadi' });
    }

    const paymentId = Number((row as { id: number }).id);
    const paymentUrl = buildClickPaymentUrl({
      serviceId: clickServiceId,
      merchantId: clickMerchantId,
      amount,
      paymentId,
      returnUrl: clickReturnUrl,
    });
    await supabase.from('payments').update({ payment_proof_url: paymentUrl }).eq('id', paymentId);

    return res.status(200).json({
      success: true,
      payment_id: paymentId,
      payment_url: paymentUrl,
      amount,
      currency: 'UZS',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Click to‘lovi yaratilmadi';
    console.error('[POST /api/payments/click/create]', message);
    return res.status(500).json({ error: message });
  }
}
