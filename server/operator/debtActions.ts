import { audit, enqueue, transaction } from './service.js';
import { dueDate, money, paymentFits } from './domain.js';

export const latestDeferralSql = `(SELECT jsonb_build_object('id',d.id,'status',d.status,
    'requested_due_at',d.requested_due_at,'reason',d.reason,'decision_reason',d.decision_reason)
    FROM operator_debt_deferrals d WHERE d.contract_id=b.id ORDER BY d.id DESC LIMIT 1)`;

function reasonText(raw: unknown): string {
    const value = String(raw ?? '').trim();
    if (value.length < 3 || value.length > 500) throw new Error('Sabab 3–500 belgidan iborat bo‘lsin.');
    return value;
}

export async function requestDebtDeferral(contractId: number, operatorId: number, rawDate: string, rawReason: unknown) {
    const requestedDue = dueDate(rawDate);
    const reason = reasonText(rawReason);
    return transaction(async c => {
        const contract = (await c.query('SELECT * FROM operator_contracts WHERE id=$1 FOR UPDATE', [contractId])).rows[0];
        if (!contract || Number(contract.operator_id) !== operatorId) throw new Error('Shartnoma topilmadi.');
        const balance = (await c.query('SELECT debt,paid,pending FROM operator_balances WHERE id=$1', [contractId])).rows[0];
        if (Number(balance.debt) <= 0 || (Number(balance.paid) <= 0 && Number(balance.pending) <= 0)) throw new Error('Bu shartnomada qarz yo‘q.');
        if (!contract.due_at || +new Date(requestedDue) <= +new Date(contract.due_at)) throw new Error('Yangi muddat joriy muddatdan keyin bo‘lsin.');
        if ((await c.query("SELECT 1 FROM operator_debt_deferrals WHERE contract_id=$1 AND status='pending'", [contractId])).rowCount) throw new Error('Bu qarz uchun so‘rov allaqachon tekshiruvda.');
        const row = (await c.query(`INSERT INTO operator_debt_deferrals(contract_id,operator_id,previous_due_at,requested_due_at,reason)
            VALUES($1,$2,$3,$4,$5) RETURNING id`, [contractId, operatorId, contract.due_at, requestedDue, reason])).rows[0];
        await audit(c, operatorId, null, contract.user_id, 'debt_deferral_requested', { request: row.id, contract: contractId, previous_due_at: contract.due_at, requested_due_at: requestedDue, reason });
        return row.id;
    });
}

export async function decideDebtDeferral(id: number, adminId: number, decision: string, rawReason: unknown) {
    if (!['approved', 'rejected'].includes(decision)) throw new Error('Qaror noto‘g‘ri.');
    const reason = decision === 'rejected' ? reasonText(rawReason) : String(rawReason ?? '').trim();
    if (reason.length > 500) throw new Error('Izoh 500 belgidan oshmasin.');
    return transaction(async c => {
        const ref = (await c.query('SELECT contract_id FROM operator_debt_deferrals WHERE id=$1', [id])).rows[0];
        if (!ref) throw new Error('So‘rov topilmadi.');
        // Use the same lock order as receipt approval and submission.
        const contract = (await c.query('SELECT * FROM operator_contracts WHERE id=$1 FOR UPDATE', [ref.contract_id])).rows[0];
        const request = (await c.query('SELECT * FROM operator_debt_deferrals WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (request.status !== 'pending') throw new Error('Bu so‘rov bo‘yicha qaror oldin qabul qilingan.');
        if (decision === 'approved') {
            const balance = (await c.query('SELECT debt,paid,pending FROM operator_balances WHERE id=$1', [contract.id])).rows[0];
            const op = (await c.query('SELECT active FROM operator_accounts WHERE id=$1', [request.operator_id])).rows[0];
            if (Number(balance.debt) <= 0 || (Number(balance.paid) <= 0 && Number(balance.pending) <= 0)) throw new Error('Qarz allaqachon yopilgan. So‘rovni rad eting.');
            if (!op?.active || Number(contract.operator_id) !== Number(request.operator_id)) throw new Error('Mas’ul operator o‘zgargan. So‘rovni rad eting.');
            if (+new Date(contract.due_at) !== +new Date(request.previous_due_at)) throw new Error('Joriy muddat o‘zgargan. So‘rovni rad eting.');
            if (+new Date(request.requested_due_at) <= Date.now()) throw new Error('So‘ralgan muddat o‘tgan. So‘rovni rad eting.');
            await c.query('UPDATE operator_contracts SET due_at=$2 WHERE id=$1', [contract.id, request.requested_due_at]);
            await c.query(`UPDATE operator_outbox SET delivered_at=now(),last_error='debt_deferred'
                WHERE contract_id=$1 AND delivered_at IS NULL
                AND (dedupe LIKE 'daily-debt:%' OR dedupe LIKE 'due:%' OR dedupe LIKE 'overdue:%')`, [contract.id]);
        }
        await c.query('UPDATE operator_debt_deferrals SET status=$2,admin_id=$3,decision_reason=$4,decided_at=now() WHERE id=$1', [id, decision, adminId, reason || null]);
        await audit(c, request.operator_id, adminId, contract.user_id, `debt_deferral_${decision}`, { request: id, contract: contract.id, previous_due_at: request.previous_due_at, requested_due_at: request.requested_due_at, reason });
        const op = (await c.query('SELECT telegram_id FROM operator_accounts WHERE id=$1 AND active', [request.operator_id])).rows[0];
        if (op?.telegram_id) await enqueue(c, 'sendMessage', { chat_id: op.telegram_id,
            text: `Qarz muddatini ko‘chirish #${id}: ${decision === 'approved' ? 'TASDIQLANDI' : 'RAD ETILDI'}\nMijoz #${contract.user_id}, shartnoma #${contract.id}\n${decision === 'approved' ? 'Yangi' : 'So‘ralgan'} muddat: ${new Date(request.requested_due_at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}${reason ? '\nSabab: ' + reason : ''}`,
        }, `deferral-decision:${id}`);
    });
}

export async function submitDebtReceipt(contractId: number, operatorId: number, rawAmount: unknown, receipt: { fileId: string; uniqueId: string; mime: string }) {
    const amount = money(rawAmount);
    return transaction(async c => {
        const contract = (await c.query('SELECT * FROM operator_contracts WHERE id=$1 FOR UPDATE', [contractId])).rows[0];
        if (!contract || Number(contract.operator_id) !== operatorId) throw new Error('Shartnoma topilmadi.');
        const balance = (await c.query('SELECT debt,paid,pending FROM operator_balances WHERE id=$1', [contractId])).rows[0];
        if (Number(balance.paid) <= 0 && Number(balance.pending) <= 0) throw new Error('Bu shartnomada qarz yo‘q.');
        if (!paymentFits(amount, balance.debt, balance.pending)) throw new Error('Summa mavjud qarzdan oshadi (tekshiruvdagi to‘lovlar hisobga olinadi).');
        if ((await c.query('SELECT 1 FROM operator_receipts WHERE file_unique_id=$1', [receipt.uniqueId])).rowCount) throw new Error('Bu chek oldin yuklangan.');
        const row = (await c.query(`INSERT INTO operator_receipts(contract_id,operator_id,amount,file_id,file_unique_id,mime)
            VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [contractId, operatorId, amount, receipt.fileId, receipt.uniqueId, receipt.mime])).rows[0];
        await audit(c, operatorId, null, contract.user_id, 'mini_debt_receipt_submitted', { receipt: row.id, contract: contractId, amount, currency: contract.currency });
        return row.id;
    });
}
