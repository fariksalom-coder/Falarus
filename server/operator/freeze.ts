import { pool } from '../lib/db.js';
import { enabled } from './service.js';
export async function isOperatorFrozen(userId: number): Promise<boolean> {
    if (!enabled())
        return false;
    if (!pool)
        throw new Error('Database unavailable');
    return Boolean((await pool.query('SELECT 1 FROM operator_freezes WHERE user_id=$1', [userId])).rowCount);
}
export async function checkOperatorAccess(req: any, res: any, next: any) {
    // Billing, own account and help remain available to resolve the debt.
    if (/^\/api\/(user\/(me|tariff-prices|payments|avatar)$|payments?(?:\/|$)|(?:support|help)(?:\/|$)|auth(?:\/|$))/.test(String(req.originalUrl || req.path).split('?')[0]))
        return next();
    try {
        if (await isOperatorFrozen(req.userId))
            return res.status(403).json({ error: 'To‘lov qarzi sabab hisob vaqtincha muzlatilgan. Operator bilan bog‘laning.', code: 'DEBT_FROZEN' });
        next();
    }
    catch {
        res.status(503).json({ error: 'Hisob holatini tekshirib bo‘lmadi.' });
    }
}
