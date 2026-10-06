import type { PoolClient } from 'pg';
import { audit, enqueue } from './service.js';

export const eligibleRahmatSql = `p.status='approved' AND p.payment_channel='rahmat'
 AND COALESCE(p.product_code,'russian')='russian' AND p.amount>1
 AND p.tariff_type IN ('month','three_month','six_month','year')
 AND p.currency IN ('UZS','RUB','USD')
 AND NOT EXISTS(SELECT 1 FROM operator_receipts r WHERE r.payment_id=p.id)`;

async function lockedPayment(c: PoolClient, paymentId: number) {
  // Submission and decision always lock payment before claim; callbacks also lock payments.
  return (await c.query(`SELECT p.*,(${eligibleRahmatSql}) eligible FROM payments p WHERE p.id=$1 FOR UPDATE`, [paymentId])).rows[0];
}

export async function submitRahmatClaim(c: PoolClient, operatorId: number, userId: number, paymentId: number,
  receipt: { fileId: string; uniqueId: string; mime: string }) {
  const p = await lockedPayment(c, paymentId);
  if (!p?.eligible || Number(p.user_id)!==userId) throw new Error('Tasdiqlangan Rahmat to‘lovi topilmadi.');
  const premium = await c.query(`SELECT 1 FROM users u WHERE u.id=$1 AND (u.plan_expires_at>now()
    OR EXISTS(SELECT 1 FROM subscriptions s WHERE s.user_id=u.id AND s.status='active' AND s.expires_at>now()))`, [userId]);
  if (!premium.rowCount) throw new Error('Faol premium hisobni tanlang.');
  if (!(await c.query('SELECT 1 FROM operator_accounts WHERE id=$1 AND active FOR SHARE', [operatorId])).rowCount)
    throw new Error('Operator faol emas.');
  const existing = (await c.query("SELECT id,operator_id,file_unique_id FROM operator_rahmat_claims WHERE payment_id=$1 AND status IN ('pending','approved')", [paymentId])).rows[0];
  if (existing) {
    if (Number(existing.operator_id)===operatorId && existing.file_unique_id===receipt.uniqueId) return existing.id;
    throw new Error('Bu to‘lov boshqa so‘rovga biriktirilgan.');
  }
  if ((await c.query('SELECT 1 FROM operator_receipts WHERE file_unique_id=$1', [receipt.uniqueId])).rowCount)
    throw new Error('Bu chek boshqa to‘lov uchun yuklangan.');
  const a = (await c.query(`INSERT INTO operator_rahmat_claims(payment_id,operator_id,file_id,file_unique_id,mime)
    VALUES($1,$2,$3,$4,$5) RETURNING id`, [paymentId,operatorId,receipt.fileId,receipt.uniqueId,receipt.mime])).rows[0];
  await audit(c,operatorId,null,userId,'rahmat_claim_submitted',{ claim:a.id,payment:paymentId });
  const op = (await c.query('SELECT telegram_id FROM operator_accounts WHERE id=$1', [operatorId])).rows[0];
  if (op?.telegram_id) await enqueue(c,'sendMessage',{chat_id:op.telegram_id,
    text:`Rahmat so‘rovi #${a.id} adminga yuborildi.\nMijoz #${userId}, to‘lov #${paymentId}: ${p.amount} ${p.currency}\nFaqat sotuv operatorga biriktiriladi. Premium qayta berilmaydi.`},`rahmat-submitted:${a.id}`);
  return a.id;
}

export async function decideRahmatClaim(c: PoolClient, id: number, adminId: number, decision: string, rawReason: unknown) {
  const reason=String(rawReason??'').trim();
  if (!['approved','rejected'].includes(decision) || reason.length>500 || (decision==='rejected' && reason.length<3))
    throw new Error('Qaror va sababni tekshiring (rad etish sababi 3–500 belgi).');
  const ref=(await c.query('SELECT payment_id FROM operator_rahmat_claims WHERE id=$1',[id])).rows[0];
  if (!ref) throw new Error('So‘rov topilmadi.');
  const p=await lockedPayment(c,Number(ref.payment_id));
  const a=(await c.query('SELECT * FROM operator_rahmat_claims WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if (a.status!=='pending') throw new Error('Bu so‘rov bo‘yicha qaror oldin qabul qilingan.');
  if (decision==='approved') {
    if (!p?.eligible) throw new Error('To‘lov holati o‘zgargan. So‘rovni rad eting.');
    if (!(await c.query('SELECT 1 FROM operator_accounts WHERE id=$1 AND active FOR SHARE',[a.operator_id])).rowCount)
      throw new Error('Operator faol emas. So‘rovni rad eting.');
  }
  await c.query('UPDATE operator_rahmat_claims SET status=$2,admin_id=$3,reason=$4,decided_at=now() WHERE id=$1',[id,decision,adminId,reason||null]);
  await audit(c,a.operator_id,adminId,p.user_id,`rahmat_claim_${decision}`,{claim:id,payment:p.id,reason});
  const op=(await c.query('SELECT telegram_id FROM operator_accounts WHERE id=$1 AND active',[a.operator_id])).rows[0];
  if(op?.telegram_id) await enqueue(c,'sendMessage',{chat_id:op.telegram_id,
    text:`Rahmat so‘rovi #${id}: ${decision==='approved'?'TASDIQLANDI':'RAD ETILDI'}\nMijoz #${p.user_id}, to‘lov #${p.id}: ${p.amount} ${p.currency}${reason?'\nSabab: '+reason:''}`},`rahmat-decision:${id}`);
}
