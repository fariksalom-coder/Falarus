import bcrypt from 'bcryptjs';
import { customerName, customerPhone, customerEmail, matchingCustomer, createOperatorCustomer } from './customer.js';
import { issueOperatorReset } from './passwordReset.js';
import type { PoolClient } from 'pg';
import { pool } from '../lib/db.js';
import { cents, money, dueDate, paymentFits, receiptFile } from './domain.js';
export const enabled = () => process.env.OPERATOR_BOT_ENABLED === 'true';
export async function transaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    if (!pool)
        throw new Error('Baza mavjud emas');
    const c = await pool.connect();
    try {
        await c.query('BEGIN');
        const result = await fn(c);
        await c.query('COMMIT');
        return result;
    }
    catch (e) {
        await c.query('ROLLBACK');
        throw e;
    }
    finally {
        c.release();
    }
}
export async function audit(c: PoolClient, operator: number | null, admin: number | null, user: number | null, action: string, detail: any = {}) {
    await c.query('INSERT INTO operator_audit(operator_id,admin_id,user_id,action,detail) VALUES($1,$2,$3,$4,$5)', [operator, admin, user, action, JSON.stringify(detail)]);
}
export async function enqueue(c: PoolClient, method: string, payload: any, dedupe: string | null = null, contract: number | null = null) {
    await c.query(`INSERT INTO operator_outbox(method,payload,dedupe,contract_id,operator_id) VALUES($1,$2,$3,$4,(SELECT id FROM operator_accounts WHERE telegram_id=$5 AND active)) ON CONFLICT(dedupe) DO NOTHING`, [method, JSON.stringify(payload), dedupe, contract, payload.chat_id ?? null]);
}
const TARIFF_CHOICES: [string, string][] = [
  ['1 oy — 3 000 ₽', 'tariff:month'],
  ['3 oy — 4 000 ₽', 'tariff:three_month'],
  ['6 oy — 6 000 ₽', 'tariff:six_month'],
];
const TARIFF_CODES = new Set(['month', 'three_month', 'six_month']);

const menu = [['Yangi foydalanuvchi qo‘shish', 'create_customer'], ['Qidirish', 'search'], ['Barcha foydalanuvchilar', 'list:0'], ['Qarzlarim', 'debts'], ['Hisobotim', 'report'], ['Parolni almashtirish', 'password'], ['Chiqish', 'logout']];
const buttons = (items: string[][]) => ({ inline_keyboard: items.map(([text, callback_data]) => [{ text, callback_data }]) });
const date = (d: any) => d ? new Date(d).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }) : '—';
const userFields = 'id,first_name,last_name,phone,email,plan_name,plan_expires_at,created_at';
export async function handleUpdate(update: any) {
    const m = update.message ?? update.callback_query?.message;
    const tg = update.callback_query?.from?.id ?? m?.from?.id;
    if (!Number.isSafeInteger(update.update_id) || !Number.isSafeInteger(tg) || m?.chat?.type !== 'private' || m.chat.id !== tg)
        return;
    await transaction(async (c) => {
        const fresh = await c.query('INSERT INTO operator_updates(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id', [update.update_id]);
        if (!fresh.rowCount)
            return;
        await c.query('INSERT INTO operator_sessions(telegram_id) VALUES($1) ON CONFLICT DO NOTHING', [tg]);
        let s = (await c.query('SELECT * FROM operator_sessions WHERE telegram_id=$1 FOR UPDATE', [tg])).rows[0];
        let state = s.state ?? {};
        const text = String(update.message?.text ?? '').trim().slice(0, 500);
        const action = String(update.callback_query?.data ?? '');
        const say = async (t: string, items?: string[][]) => enqueue(c, 'sendMessage', { chat_id: tg, text: t, ...(items ? { reply_markup: buttons(items) } : {}) });
        const save = async (v: any) => { state = v; await c.query('UPDATE operator_sessions SET state=$2,updated_at=now() WHERE telegram_id=$1', [tg, JSON.stringify(v)]); };
        if (update.callback_query)
            await enqueue(c, 'answerCallbackQuery', { callback_query_id: update.callback_query.id });
        const op = s.operator_id ? (await c.query('SELECT id,name,telegram_id,active FROM operator_accounts WHERE id=$1', [s.operator_id])).rows[0] : null;
        const authed = op?.active && String(op.telegram_id) === String(tg) && new Date(s.expires_at).getTime() > Date.now();
        if (!authed) {
            await c.query('UPDATE operator_sessions SET operator_id=NULL WHERE telegram_id=$1', [tg]);
            if (s.locked_until && new Date(s.locked_until).getTime() > Date.now()) {
                await say('Kirish vaqtincha cheklangan. 15 daqiqadan keyin urinib ko‘ring.');
                return;
            }
            if (state.step === 'login_password' && text && !text.startsWith('/')) {
                await enqueue(c, 'deleteMessage', { chat_id: tg, message_id: m.message_id });
                const a = (await c.query('SELECT * FROM operator_accounts WHERE login=$1 FOR UPDATE', [state.login])).rows[0];
                // Constant-cost hash comparison even for an unknown login.
                const ok = await bcrypt.compare(text, a?.password_hash ?? '$2b$12$C6UzMDM.H6dfI/f/IKcEe.6JCGzaMnIcZnlhxOTOBnIpJHFGoSl0q');
                if (!ok || !a?.active || (a.telegram_id && String(a.telegram_id) !== String(tg))) {
                    await c.query("UPDATE operator_sessions SET failures=failures+1, locked_until=CASE WHEN failures>=4 THEN now()+interval '15 minutes' ELSE locked_until END,state='{}' WHERE telegram_id=$1", [tg]);
                    await say('Login yoki parol noto‘g‘ri, hisob o‘chirilgan yoki boshqa Telegramga bog‘langan. /start');
                    return;
                }
                await c.query('UPDATE operator_accounts SET telegram_id=$2 WHERE id=$1', [a.id, tg]);
                await c.query("UPDATE operator_sessions SET operator_id=$2,expires_at=now()+interval '12 hours',failures=0,locked_until=NULL,state='{}' WHERE telegram_id=$1", [tg, a.id]);
                await audit(c, a.id, null, null, 'login');
                await say(`Xush kelibsiz, ${a.name}. To‘lovlarni faqat platforma admini tasdiqlaydi.`, menu);
                return;
            }
            if (state.step === 'login_name' && /^[a-zA-Z0-9_.-]{3,40}$/.test(text)) {
                await save({ step: 'login_password', login: text.toLowerCase() });
                await say('Parolingizni yuboring. Xabar qayta ishlangach o‘chiriladi.');
                return;
            }
            await save({ step: 'login_name' });
            await say('FalaRus operator botiga kirish. Admin bergan loginni kiriting:');
            return;
        }
        const oid = Number(op.id);
        // A savepoint keeps the update id + authenticated session while rolling back a failed action.
        await c.query('SAVEPOINT action');
        try {
            if (text === '/start' || text === '/cancel' || action === 'menu') {
                await save({});
                await say('Operator menyusi', menu);
                return;
            }
            if (action === 'logout') {
                await c.query("UPDATE operator_sessions SET operator_id=NULL,expires_at=NULL,state='{}' WHERE telegram_id=$1", [tg]);
                await audit(c, oid, null, null, 'logout');
                await say('Hisobdan chiqdingiz. /start');
                return;
            }
            if (action === 'password') {
                await save({ step: 'change_password' });
                await say('Yangi parol: kamida 12 belgi, harf va raqam. /cancel');
                return;
            }
            if (state.step === 'change_password' && text) {
                await enqueue(c, 'deleteMessage', { chat_id: tg, message_id: m.message_id });
                if (text.length < 12 || Buffer.byteLength(text, 'utf8') > 72 || !/[A-Za-z]/.test(text) || !/[0-9]/.test(text))
                    throw new Error('Kamida 12 belgi, harf va raqam kiriting.');
                await c.query('UPDATE operator_accounts SET password_hash=$2 WHERE id=$1', [oid, await bcrypt.hash(text, 12)]);
                await audit(c, oid, null, null, 'password_changed');
                await save({});
                await say('Parol yangilandi.', menu);
                return;
            }
            if (action === 'create_customer' || text === '/newuser') {
                await save({ step: 'customer_first' });
                await say('Yangi O‘QUVCHI hisobini yaratamiz. Ismini yozing. Bekor qilish: /cancel');
                return;
            }
            if (state.step === 'customer_first' && text) {
                await save({ step: 'customer_last', firstName: customerName(text) });
                await say('O‘quvchining familiyasini yozing:');
                return;
            }
            if (state.step === 'customer_last' && text) {
                await save({ ...state, step: 'customer_phone', lastName: customerName(text) });
                await say('Telefonini davlat kodi bilan yozing (masalan +998901234567):');
                return;
            }
            if (state.step === 'customer_phone' && text) {
                await save({ ...state, ...customerPhone(text), step: 'customer_email' });
                await say('Email/Gmail manzilini yozing. Email bo‘lmasa - yuboring:');
                return;
            }
            if (state.step === 'customer_email' && text) {
                const email = customerEmail(text);
                const matches = await matchingCustomer(c, state.phone, email);
                if (matches.length) {
                    await save({});
                    await say('Bu telefon yoki email bilan hisob allaqachon mavjud. Tegishli foydalanuvchini tanlang; yangi hisob yaratilmaydi.',
                        [...matches.map(u => [`Mavjud foydalanuvchi #${u.id}`, `user:${u.id}`]), ['Menyu', 'menu']]);
                    return;
                }
                await save({ ...state, email, step: 'customer_confirm' });
                await say(`Yangi o‘quvchi:\n${state.firstName} ${state.lastName}\nTelefon: ${state.phone}\nEmail: ${email ?? 'yo‘q'}\nHisob yaratilgach tarif va chek kiritiladi. Pullik tarif faqat admin tasdig‘idan keyin ochiladi.`,
                    [['Hisob yaratish va to‘lovga o‘tish', 'customer_confirm'], ['Bekor qilish', 'menu']]);
                return;
            }
            if (state.step === 'customer_confirm' && action === 'customer_confirm') {
                const uid = await createOperatorCustomer(c, oid, state);
                const link = await issueOperatorReset(c, uid, oid);
                await enqueue(c, 'sendMessage', { chat_id: tg,
                    text: `O‘quvchi #${uid} yaratildi: ${state.firstName} ${state.lastName}\nKirish: ${state.phone}${state.email ? ' yoki ' + state.email : ''}\nO‘quvchi o‘z parolini o‘rnatishi uchun havola (30 daqiqa, bir marta):\n${link}\nFaqat shu o‘quvchiga yuboring. Tarif hali faollashtirilmagan.`,
                    link_preview_options: { is_disabled: true } }, `reset-link:${update.update_id}`);
                await save({ step: 'tariff', uid });
                await say('Endi shu o‘quvchi uchun tarifni tanlang:', [...TARIFF_CHOICES, ['Mijoz kartasi', `user:${uid}`]]);
                return;
            }
            if (action === 'search') {
                await save({ step: 'search' });
                await say('Ism, familiya, telefon, email yoki ID yozing:');
                return;
            }
            if (action.startsWith('list:') || action.startsWith('results:') || (state.step === 'search' && text)) {
                const page = Math.max(0, Math.min(100000, Number(action.split(':')[1]) || 0));
                const term = action.startsWith('list:') ? '' : action.startsWith('results:') ? String(state.term ?? '') : text;
                const pattern = '%' + term.replace(/[\\%_]/g, '\\$&') + '%';
                const rows = (await c.query(`SELECT ${userFields} FROM users WHERE ($1='' OR concat_ws(' ',first_name,last_name,email,phone) ILIKE $2 OR id::text=$1 OR (length($4::text)>=7 AND regexp_replace(COALESCE(phone,''),'[^0-9]','','g') LIKE '%'||$4||'%')) ORDER BY id DESC LIMIT 9 OFFSET $3`, [term, pattern, page * 8, term.replace(/\D/g, '')])).rows;
                await save({ step: 'results', term });
                await audit(c, oid, null, null, 'search', { term_length: term.length, page });
                await say(rows.length ? 'Foydalanuvchini tanlang:' : 'Natija topilmadi.', [...rows.slice(0, 8).map(u => [`${u.id} · ${u.first_name ?? ''} ${u.last_name ?? ''}`.slice(0, 60), `user:${u.id}`]), ...(page > 0 ? [['← Oldingi', `${term ? 'results' : 'list'}:${page - 1}`]] : []), ...(rows.length > 8 ? [['Keyingi →', `${term ? 'results' : 'list'}:${page + 1}`]] : []), ['Menyu', 'menu']]);
                return;
            }
            if (action.startsWith('user:')) {
                const uid = Number(action.split(':')[1]);
                const u = (await c.query(`SELECT ${userFields} FROM users WHERE id=$1`, [uid])).rows[0];
                if (!u)
                    throw new Error('Foydalanuvchi topilmadi.');
                const balances = (await c.query('SELECT * FROM operator_balances WHERE user_id=$1 ORDER BY id DESC LIMIT 10', [uid])).rows;
                const frozen = (await c.query('SELECT 1 FROM operator_freezes WHERE user_id=$1', [uid])).rowCount;
                await audit(c, oid, null, uid, 'view_customer');
                await save({});
                await say(`#${u.id} ${u.first_name ?? ''} ${u.last_name ?? ''}\nTelefon: ${u.phone ?? '—'}\nEmail: ${u.email ?? '—'}\nRo‘yxat: ${date(u.created_at)}\nTarif: ${u.plan_name ?? '—'} · ${date(u.plan_expires_at)}\nQarz muzlatishi: ${frozen ? 'bor' : 'yo‘q'}\n` + balances.map(b => `Shartnoma #${b.id}: ${b.tariff}, ${b.total} ${b.currency}; tasdiqlangan ${b.paid}, qarz ${b.debt}, tekshiruvda ${b.pending}. Muddat ${date(b.due_at)}`).join('\n'), [['Yangi to‘lov', `new:${uid}`], ...balances.filter(b => Number(b.debt) > 0).map(b => [`Qarzga to‘lov #${b.id}`, `settle:${b.id}`]), ...(frozen ? [["Qarz muzlatishini ochish", `unfreeze:${uid}`]] : balances.filter(b => b.activated_at && b.due_at && +new Date(b.due_at) + 72 * 3600000 < Date.now() && Number(b.debt) > 0).map(b => [`Qarz uchun muzlatish #${b.id}`, `freeze:${b.id}`])), ['Parol tiklash', `reset:${uid}`], ['Menyu', 'menu']]);
                return;
            }
            if (action.startsWith('reset:')) {
                const uid = Number(action.split(':')[1]);
                await save({ step: 'reset_confirm', uid });
                await say('Mijoz shaxsini tekshiring. Parolni o‘zi yangilashi uchun 30 daqiqalik bir martalik havola yaratiladi. Davom etilsinmi?', [['Tiklash havolasini yaratish', 'reset_confirm'], ['Bekor qilish', 'menu']]);
                return;
            }
            if (action === 'reset_confirm' && state.step === 'reset_confirm') {
                const link = await issueOperatorReset(c, Number(state.uid), oid);
                await enqueue(c, 'sendMessage', {chat_id: tg, text: `Mijoz #${state.uid} uchun parol tiklash havolasi (30 daqiqa, bir marta):\n${link}\nFaqat shu mijozning o‘ziga yuboring. Havola ochilmaguncha amaldagi parol o‘zgarmaydi.`, link_preview_options: {is_disabled: true}}, `reset-link:${update.update_id}`);
                await save({});
                return;
            }
            if (action === 'report' || action.startsWith('report:')) {
                const period = action.split(':')[1] ?? 'all';
                const day = new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10);
                const from = period === 'today' ? day + 'T00:00:00+05:00' : period === 'month' ? day.slice(0, 7) + '-01T00:00:00+05:00' : null;
                const rows = (await c.query(`SELECT b.currency,count(distinct b.user_id) clients,count(distinct b.id) contracts,coalesce(sum(b.debt),0) debt,coalesce(sum(b.debt) FILTER(WHERE b.due_at<now()),0) overdue FROM operator_balances b WHERE b.operator_id=$1 GROUP BY b.currency`, [oid])).rows;
                const payments = (await c.query(`SELECT c.currency,r.status,count(*) receipts,sum(r.amount) amount FROM operator_receipts r JOIN operator_contracts c ON c.id=r.contract_id WHERE r.operator_id=$1 AND ($2::timestamptz IS NULL OR r.created_at>=$2) GROUP BY c.currency,r.status`, [oid, from])).rows;
                const actions = (await c.query('SELECT count(*) actions,count(distinct user_id) clients FROM operator_audit WHERE operator_id=$1 AND ($2::timestamptz IS NULL OR created_at>=$2)', [oid, from])).rows[0];
                await say(`Hisobot — ${op.name} (${period === 'today' ? 'bugun' : period === 'month' ? 'shu oy' : 'barcha vaqt'})\nXizmat ko‘rsatilgan mijozlar: ${actions.clients}. Amallar: ${actions.actions}.\n` + rows.map(r => `${r.currency}: mijoz ${r.clients}, shartnoma ${r.contracts}, qarz ${r.debt}, muddati o‘tgan ${r.overdue}`).join('\n') + '\n' + payments.map(r => `${r.currency} · ${r.status}: ${r.receipts} chek, ${r.amount}`).join('\n'), [['Bugun', 'report:today'], ['Shu oy', 'report:month'], ['Barcha vaqt', 'report:all'], ['Menyu', 'menu']]);
                return;
            }
            if (action === 'debts' || action.startsWith('debts:')) {
                const page = Math.max(0, Number(action.split(':')[1]) || 0);
                const rows = (await c.query('SELECT * FROM operator_balances WHERE operator_id=$1 AND debt>0 ORDER BY due_at NULLS LAST,id LIMIT 9 OFFSET $2', [oid, page * 8])).rows;
                await say('Qarzlar (tasdiqlanmagan summalar qarzni kamaytirmaydi):\n' + rows.slice(0, 8).map(b => `#${b.id}: ${b.debt} ${b.currency}, muddat ${date(b.due_at)}`).join('\n'), [...rows.slice(0, 8).map(b => [`Mijoz #${b.user_id} · qarz #${b.id}`, `user:${b.user_id}`]), ...(page > 0 ? [['Oldingi', `debts:${page - 1}`]] : []), ...(rows.length > 8 ? [['Keyingi', `debts:${page + 1}`]] : []), ['Menyu', 'menu']]);
                return;
            }
            if (action.startsWith('freeze:') || action.startsWith('unfreeze:')) {
                await save({ step: 'freeze_reason', kind: action.split(':')[0], target: Number(action.split(':')[1]) });
                await say('Amal sababini yozing (kamida 5 belgi). Muzlatish tarif muddatini uzaytirmaydi. /cancel');
                return;
            }
            if (state.step === 'freeze_reason' && text) {
                if (text.length < 5)
                    throw new Error('Sababni to‘liq yozing.');
                if (state.kind === 'freeze') {
                    await c.query('SELECT id FROM operator_contracts WHERE id=$1 FOR UPDATE', [state.target]);
                    const b = (await c.query('SELECT * FROM operator_balances WHERE id=$1', [state.target])).rows[0];
                    if (!b?.activated_at || Number(b.debt) <= 0 || !b.due_at || +new Date(b.due_at) + 72 * 3600000 > Date.now())
                        throw new Error('Faqat tasdiqlangan shartnomaning 72 soatdan oshgan qarzi uchun muzlatish mumkin.');
                    await c.query('INSERT INTO operator_freezes(user_id,contract_id,operator_id,reason) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO NOTHING', [b.user_id, b.id, oid, text]);
                    await audit(c, oid, null, b.user_id, 'freeze', { contract: b.id, reason: text });
                }
                else {
                    const rows = (await c.query('SELECT b.debt FROM operator_freezes f JOIN operator_balances b ON b.id=f.contract_id WHERE f.user_id=$1', [state.target])).rows;
                    if (rows.some(b => Number(b.debt) > 0))
                        throw new Error('Qarz to‘lovi avval platforma admini tomonidan tasdiqlanishi kerak.');
                    await c.query('DELETE FROM operator_freezes WHERE user_id=$1', [state.target]);
                    await audit(c, oid, null, state.target, 'unfreeze', { reason: text });
                }
                await save({});
                await say('Amal saqlandi.', menu);
                return;
            }
            if (action.startsWith('new:')) {
                const uid = Number(action.split(':')[1]);
                if (!(await c.query('SELECT 1 FROM users WHERE id=$1', [uid])).rowCount)
                    throw new Error('Foydalanuvchi topilmadi.');
                await save({ step: 'tariff', uid });
                await say('Tarifni tanlang:', TARIFF_CHOICES);
                return;
            }
            if (action.startsWith('settle:')) {
                const id = Number(action.split(':')[1]);
                const b = (await c.query('SELECT * FROM operator_balances WHERE id=$1', [id])).rows[0];
                if (!b || Number(b.debt) <= Number(b.pending))
                    throw new Error('Qarz yo‘q yoki qoldiq to‘lov tekshiruvda.');
                await save({ step: 'amount', contract: id, uid: b.user_id, currency: b.currency, total: b.debt, pending: b.pending });
                await say(`Qarz ${b.debt} ${b.currency}; tekshiruvda ${b.pending}. Qancha to‘landi? Faqat ${b.currency} valyutasida.`);
                return;
            }
            if (state.step === 'tariff' && action.startsWith('tariff:')) {
                const tariff = action.split(':')[1];
                if (!TARIFF_CODES.has(tariff))
                    throw new Error('Tarif noto‘g‘ri.');
                await save({ ...state, tariff, step: 'source' });
                await say('Mijoz qayerdan kelgan?', ['Instagram', 'Telegram', 'WhatsApp', 'IMO', 'MAX', 'Boshqa'].map(x => [x, `source:${x}`]));
                return;
            }
            if (state.step === 'source' && action.startsWith('source:')) {
                const source = action.slice(7);
                if (!['Instagram', 'Telegram', 'WhatsApp', 'IMO', 'MAX', 'Boshqa'].includes(source))
                    throw new Error('Manba noto‘g‘ri.');
                if (source === 'Boshqa') {
                    await save({ ...state, step: 'other_source' });
                    await say('Manba nomini yozing:');
                    return;
                }
                await save({ ...state, source, step: 'currency' });
                await say('To‘lov valyutasi:', ['UZS', 'RUB', 'USD'].map(x => [x, `currency:${x}`]));
                return;
            }
            if (state.step === 'other_source' && text) {
                await save({ ...state, source: text.slice(0, 100), step: 'currency' });
                await say('To‘lov valyutasi:', ['UZS', 'RUB', 'USD'].map(x => [x, `currency:${x}`]));
                return;
            }
            if (state.step === 'currency' && action.startsWith('currency:')) {
                const currency = action.slice(9);
                if (!['UZS', 'RUB', 'USD'].includes(currency))
                    throw new Error('Valyuta noto‘g‘ri.');
                await save({ ...state, currency, step: 'total' });
                await say('Kelishilgan JAMI tarif summasini kiriting:');
                return;
            }
            if (state.step === 'total' && text) {
                await save({ ...state, total: money(text), step: 'amount' });
                await say('Haqiqatan to‘langan summani kiriting (to‘liq, yarmi yoki boshqa):');
                return;
            }
            if (state.step === 'amount' && text) {
                const amount = money(text);
                if (!paymentFits(amount, state.total, state.pending ?? 0))
                    throw new Error('To‘lov jami/qoldiq summadan oshmasligi kerak.');
                const partial = cents(amount) < cents(state.total);
                await save({ ...state, amount, step: partial && !state.contract ? 'due' : 'receipt' });
                await say(partial && !state.contract ? 'Qolgan qarz qachon to‘lanadi? YYYY-MM-DD HH:MM, Toshkent vaqti.' : 'Chek rasmini yoki PDF faylni yuboring (8 MB gacha):');
                return;
            }
            if (state.step === 'due' && text) {
                await save({ ...state, due: dueDate(text), step: 'receipt' });
                await say('Chek rasmini yoki PDF faylni yuboring (8 MB gacha):');
                return;
            }
            if (state.step === 'receipt' && !action) {
                const file = receiptFile(m);
                if ((await c.query('SELECT 1 FROM operator_receipts WHERE file_unique_id=$1', [file.file_unique_id])).rowCount)
                    throw new Error('Bu chek oldin yuklangan.');
                await save({ ...state, ...file, step: 'confirm' });
                await say(`Tekshiring:\nMijoz #${state.uid}\n${state.contract ? 'Qarz #' + state.contract : state.tariff + ' · ' + state.source}\nTo‘lov ${state.amount} ${state.currency}\nJami/qoldiq ${state.total} ${state.currency}\nMuddat ${date(state.due)}\nOperator: ${op.name}\nBu amal to‘lovni TASDIQLAMAYDI.`, [['Adminga yuborish', 'submit'], ['Bekor qilish', 'menu']]);
                return;
            }
            if (state.step === 'confirm' && action === 'submit') {
                let cid = state.contract;
                if (cid) {
                    await c.query('SELECT id FROM operator_contracts WHERE id=$1 FOR UPDATE', [cid]);
                    const b = (await c.query('SELECT * FROM operator_balances WHERE id=$1', [cid])).rows[0];
                    if (!b || !paymentFits(state.amount, b.debt, b.pending))
                        throw new Error('Qoldiq o‘zgargan. Mijoz kartasidan qayta boshlang.');
                }
                else {
                    cid = (await c.query('INSERT INTO operator_contracts(user_id,operator_id,tariff,currency,total,source,due_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id', [state.uid, oid, state.tariff, state.currency, state.total, state.source, state.due ?? null])).rows[0].id;
                }
                const r = (await c.query('INSERT INTO operator_receipts(contract_id,operator_id,amount,file_id,file_unique_id,mime) VALUES($1,$2,$3,$4,$5,$6) RETURNING id', [cid, oid, state.amount, state.file_id, state.file_unique_id, state.mime])).rows[0];
                await audit(c, oid, null, state.uid, 'receipt_submitted', { receipt: r.id, contract: cid, amount: state.amount, currency: state.currency });
                await save({});
                await say(`Chek #${r.id} platforma adminiga yuborildi. Holat: tekshiruvda.`, menu);
                return;
            }
            await say('Amalni menyudan tanlang. Jarayonni bekor qilish: /cancel', menu);
        }
        catch (e) {
            await c.query('ROLLBACK TO SAVEPOINT action');
            const err = e as any;
            const message = err.code === '23505' ? 'Bu chek yoki yozuv avval saqlangan.' : err.code ? 'Amal saqlanmadi. Qayta urinib ko‘ring.' : err.message;
            await say(message ?? 'Amal bajarilmadi.');
        }
    });
}
