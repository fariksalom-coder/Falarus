import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { parseContactIdentifier, sanitizePhoneRaw } from '../../shared/authIdentifiers.js';
import { audit } from './service.js';

export function customerName(raw: string): string {
    const name = raw.trim();
    if (name.length < 2 || name.length > 80 || /[\r\n\x00-\x1f]/.test(name))
        throw new Error('Ism/familiyani 2–80 belgi bilan yozing.');
    return name;
}
export function customerPhone(raw: string) {
    const parsed = parseContactIdentifier(raw);
    if (!parsed.ok || !parsed.phone) throw new Error('Telefonni davlat kodi bilan kiriting, masalan +998901234567.');
    return { phone: parsed.phone, phoneRaw: sanitizePhoneRaw(raw), country: parsed.phoneCountryIso ?? null };
}
export function customerEmail(raw: string): string | null {
    if (raw.trim() === '-') return null;
    const parsed = parseContactIdentifier(raw);
    if (!parsed.ok || !parsed.email) throw new Error('To‘g‘ri email yozing yoki email bo‘lmasa - yuboring.');
    return parsed.email;
}
export async function matchingCustomer(c: PoolClient, phone: string, email: string | null) {
    return (await c.query(`SELECT id FROM users WHERE phone_normalized=$1 OR
        regexp_replace(COALESCE(phone,''),'[^0-9]','','g')=$2 OR
        ($3::text IS NOT NULL AND lower(email)=$3) ORDER BY id LIMIT 2`,
        [phone, phone.replace(/\D/g, ''), email])).rows;
}
export async function createOperatorCustomer(c: PoolClient, operator: number, input: any): Promise<number> {
    const first = customerName(input.firstName), last = customerName(input.lastName);
    const contact = customerPhone(input.phone);
    const email = input.email == null ? null : customerEmail(input.email);
    // PostgreSQL's existing unique contact indexes also guard concurrent registration.
    if ((await matchingCustomer(c, contact.phone, email)).length)
        throw new Error('Bu telefon yoki email bilan hisob mavjud. Qidirish orqali mavjud foydalanuvchini tanlang.');
    const password = await bcrypt.hash(randomBytes(32).toString('base64url'), 12);
    const row = (await c.query(`INSERT INTO users
        (first_name,last_name,phone,phone_raw,phone_normalized,country_code,phone_verified,phone_invalid,
         email,password,account_type,onboarded,plan_name,plan_expires_at)
        VALUES($1,$2,$3,$4,$3,$5,false,false,$6,$7,'student',1,NULL,NULL) RETURNING id`,
        [first, last, contact.phone, input.phoneRaw ?? contact.phoneRaw, contact.country, email, password])).rows[0];
    await c.query('INSERT INTO leaderboard(user_id,total_points,rank,updated_at) VALUES($1,0,0,now()) ON CONFLICT(user_id) DO NOTHING', [row.id]);
    await audit(c, operator, null, Number(row.id), 'customer_created', { channel: 'operator_bot' });
    return Number(row.id);
}
