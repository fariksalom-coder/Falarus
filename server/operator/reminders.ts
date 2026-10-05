import type { PoolClient } from 'pg';

export const REMINDER_HOURS = [9, 14, 18] as const;
export function reminderSlot(now = new Date()) {
    const local = new Date(now.getTime() + 5 * 3600000);
    const hour = [...REMINDER_HOURS].reverse().find(h => h <= local.getUTCHours());
    return hour === undefined ? null : `${local.toISOString().slice(0, 10)}:${hour}`;
}

// Include the whole local due date, even if the deadline is later today.
export async function dueDebts(c: Pick<PoolClient, 'query'>, now: Date, operatorId: number | null = null) {
    return (await c.query(`SELECT b.*,u.first_name,u.last_name,u.phone,u.email,o.telegram_id
        FROM operator_balances b JOIN users u ON u.id=b.user_id
        JOIN operator_accounts o ON o.id=b.operator_id
        WHERE b.debt>0 AND (b.paid>0 OR b.pending>0) AND o.active
        AND b.due_at < ((($1::timestamptz AT TIME ZONE 'Asia/Tashkent')::date + 1)::timestamp AT TIME ZONE 'Asia/Tashkent')
        AND ($2::bigint IS NULL OR b.operator_id=$2)
        ORDER BY b.due_at,b.id`, [now, operatorId])).rows;
}

export function debtReminderText(b: any) {
    return `QARZ ESLATMASI\nMijoz #${b.user_id}: ${b.first_name || '—'} ${b.last_name || ''}\nTelefon: ${b.phone || '—'}\nEmail: ${b.email || '—'}\nShartnoma #${b.id} · Tarif: ${b.tariff}\nManba: ${b.source}\nJami: ${b.total} ${b.currency}\nTasdiqlangan to‘lov: ${b.paid} ${b.currency}\nQarz: ${b.debt} ${b.currency}\nTekshiruvda: ${b.pending} ${b.currency}\nMuddat: ${new Date(b.due_at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\nMijoz bilan bog‘laning. Tekshiruvdagi to‘lov qarzni kamaytirmaydi.`;
}
