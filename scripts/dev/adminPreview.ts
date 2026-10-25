/**
 * Local preview of the admin panel with canned API data (no database).
 * Run: npx tsx scripts/dev/adminPreview.ts → http://<lan-ip>:3005/secure-admin-a9k7x4p2/dashboard
 */
import express from 'express';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const H = 3_600_000, now = Date.now();
const at = (h: number) => new Date(now + h * H).toISOString();
const app = express();
app.use(express.json());
const json = (path: string, body: unknown | ((req: express.Request) => unknown)) =>
  app.all(path, (req, res) => res.json(typeof body === 'function' ? (body as (r: express.Request) => unknown)(req) : body));
const A = '/api/admin';
json(`${A}/me`, { id: 1 });
json(`${A}/help/unread-count`, { count: 3 });
json(`${A}/dashboard`, { total_users: 48210, users_today: 132, users_this_week: 900, users_this_month: 3120, active_users: 0, inactive_users: 0, active_subscriptions: 1874, subscriptions_expiring_soon: 64,
  payments_today: { UZS: 0, USD: 0, RUB: 0 }, payments_this_month: { UZS: 0, USD: 0, RUB: 0 }, total_revenue: { UZS: 0, USD: 0, RUB: 0 }, pending_payments: 0, refunded_payments_this_month: 0,
  referral_payouts_pending: 0, support_chats_open: 0, payment_statuses_this_month: { pending: 0, approved: 0, rejected: 0, refunded: 0 }, revenue_by_product_this_month: [], payments_daily_last_30: [], recent_payments: [], recent_users: [] });
json(`${A}/sales-ledger/period`, (req) => {
  const payments = [];
  for (let d = 0; d < 34; d++) {
    const n = (d * 7) % 9;
    for (let i = 0; i < n; i++) payments.push({ key: `r:${d}-${i}`, source: 'operator', status: i === 0 && d < 2 ? 'pending' : 'approved', paid_at: at(-24 * d - i), user_id: 1, client_name: 'X', operator_id: 1, operator_name: 'Op', via_rahmat: false, tariff: 'month', currency: i % 3 === 0 ? 'RUB' : 'UZS', amount: i % 3 === 0 ? 3990 : 349000, sale_date: '' });
  }
  return { from: req.query.from, to: req.query.to, rub_uzs_rate: 152.4, operators: [], sales: [], payments, debts: [] };
});
json(`${A}/registrations`, () => ({ days: Array.from({ length: 24 }, (_, i) => ({ day: `2026-10-${String(24 - i).padStart(2, '0')}`, count: 80 + ((i * 37) % 70) })), total: 2700, timezone: 'Asia/Tashkent' }));
json(`${A}/payment-methods`, [{ id: 1, currency: 'UZS', bank_name: 'Kapitalbank', card_number: '8600 1234 5678 4321', phone_number: null, card_holder_name: 'A', status: 'active', created_at: at(-900), updated_at: at(-9) },
  { id: 2, currency: 'RUB', bank_name: 'Sber', card_number: '2202 2000 1111 7788', phone_number: null, card_holder_name: 'B', status: 'active', created_at: at(-900), updated_at: at(-9) }]);
json(`${A}/tariff-prices`, [{ id: 1, tariff_type: 'month', currency: 'UZS', price: 349000 }, { id: 2, tariff_type: 'three_month', currency: 'UZS', price: 899000 }, { id: 3, tariff_type: 'six_month', currency: 'UZS', price: 1490000 }, { id: 4, tariff_type: 'month', currency: 'RUB', price: 3990 }]);
const names = ['Jasur Karimov', 'Malika Tosheva', 'Aziz Rahimov', 'Shahnoza Yusupova', 'Sardor Nazarov', 'Dilshod Umarov', 'Madina Ergasheva', 'Nilufar Qodirova'];
json(`${A}/users`, (req) => ({ total: 8, page: 1, pageSize: 50, items: names.map((n, i) => ({ id: 1000 + i, name: n, email: null, phone: `+99890000${1000 + i}`, registration_date: at(-24 * i * 9), subscription_type: i % 2 ? '1 OY' : '—', subscription_status: i % 2 ? 'active' : 'expired',
  reached_day: [0, 12, 64, 118, 140, 182, 3, 99][i], day_progress: i ? { day_number: 1, grammar_done: 2, grammar_total: 3, vocabulary_done: true, reading_done: false, speaking_level: 1 } : null, referral_earnings: 0, last_seen_at: i === 0 ? null : at(-[0, 0.2, 3, 30, 200, 5, 900, 50][i]) }))
  .sort((a, b) => (req.query.sort === 'day_desc' ? b.reached_day - a.reached_day : 0)) }));
json(`${A}/referrals/overview`, { settings: { enabled: true, launch_at: at(-72), reward_percent: 10, min_withdrawal_rub: 1000 }, totals: [{ currency: 'UZS', available: 120000, pending: 30000, reserved: 0, debt: 0, earned: 450000, paid_out: 300000, spent: 0 }], events: [{ status: 'done', n: 40 }], stuck_events: 0, open_flags: 1, withdrawals: [{ status: 'pending', currency: 'UZS', count: 2, amount: 90000 }], ledger_mismatches: 0 });
const leaders = names.slice(0, 6).map((n, i) => ({ user_id: 1000 + i, name: n, phone: `+99890000${1000 + i}`, invited: 24 - i * 4, purchased: 9 - i, last_at: at(-i * 20), balances: i < 3 ? [{ currency: 'UZS', earned: 90000 - i * 20000, available: 30000 }] : [] }));
json(`${A}/referrals/leaders`, { totals: { invited: 142, purchased: 37, inviters: 41, invited_30d: 58 }, leaders });
json(`${A}/referrals/links`, names.slice(0, 4).map((n, i) => ({ id: i + 1, created_at: at(-i * 30), status: 'active', outcome: i % 2 ? 'eligible' : null, outcome_reason: null, review_status: i === 3 ? 'pending' : 'none', review_note: null, first_source_type: i % 2 ? 'payment' : null, first_source_id: 77, first_confirmed_at: null, referrer_id: 1000, referred_user_id: 2000 + i, referrer_name: names[0], referrer_phone: '+998900001000', referred_name: names[i + 4], referred_phone: '+99890111222' + i, rewards: i % 2 ? [{ currency: 'UZS', amount: 34900 }] : null })));
json(`${A}/chat-blocks`, [{ id: 1, user_id: 1004, reason: 'Reklama tarqatdi', expires_at: at(24 * 6), blocked_by_name: 'Admin', created_at: at(-20), full_name: 'Sardor Nazarov', phone: '+998900001004', active: true }]);
json(`${A}/community-messages`, Array.from({ length: 14 }, (_, i) => ({ id: 100 - i, sender_user_id: 1000 + (i % 6), sender_name: names[i % 6], content: ['Ассалому алайкум! Сегодня урок будет?', 'Kelishiklarni qanday yodlash mumkin?', 'Я не понял задание 3', 'Rahmat, ustoz!', 'Kim bilan mashq qilsa bo‘ladi?'][i % 5], created_at: at(-i * 3), edited_at: i === 2 ? at(-1) : null })));

const rules = [
  { id: 1, code: 'no_study_today', trigger: 'no_study_today', param: 7, send_hour: 19, title: 'Bugungi darsingiz kutyapti', body: '10–15 daqiqa ajrating va bugungi kunni yoping.', url: '/', voice_text: 'Salom! Bugungi darsingiz sizni kutyapti.', audio_url: '/uploads/bildirishnoma-ovoz/preview.mp3', enabled: true, stats: { today: 214, week: 1380, opened: 402 } },
  { id: 2, code: 'inactive_3_days', trigger: 'inactive_days', param: 3, send_hour: 11, title: 'Sizni sog‘indik!', body: '3 kundan beri ko‘rinmadingiz.', url: '/', voice_text: 'Salom!', audio_url: null, enabled: false, stats: { today: 0, week: 0, opened: 0 } },
  { id: 4, code: 'day_completed', trigger: 'day_completed', param: 0, send_hour: 0, title: 'Barakalla! Yana bir kun ortda', body: 'Kunni yopdingiz.', url: '/', voice_text: 'Barakalla!', audio_url: '/uploads/bildirishnoma-ovoz/preview.mp3', enabled: false, stats: { today: 0, week: 0, opened: 0 } },
];
json(`${A}/notifications/overview`, { reach: { web_people: 1418, web_devices: 1542, app_people: 0 }, channels: { web: true, app: false }, rules,
  campaigns: [{ id: 3, segment: 'user', param: 1001, title: 'Sinov', total: 1, pushed: 1, opened: 1, created_at: at(-2) }] });
json(`${A}/notifications/preview`, { count: 1287 });
app.use('/uploads', express.static('uploads'));
json('/api/user/me', { id: 1001, firstName: 'Malika', lastName: 'T', accountType: 'student', phone: '+998900001001', email: null, totalPoints: 0, onboardingCompleted: true });
json('/api/notifications', { unseen: 1, items: [{ id: 77, title: 'Bugungi darsingiz kutyapti', body: '10–15 daqiqa ajrating va bugungi kunni yoping.', url: '/', audio_url: '/uploads/bildirishnoma-ovoz/preview.mp3', created_at: at(-0.1), seen_at: null, opened_at: null }] });

const vite = await createServer({ configFile: false, plugins: [react(), tailwindcss()], define: { 'import.meta.env.VITE_API_URL': '""' }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
app.use(vite.middlewares);
const html = `<!doctype html><html lang="uz"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" /><title>Admin preview</title>
<script>localStorage.setItem('adminToken','preview');localStorage.setItem('token','preview')</script></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`;
app.get('*', async (req, res) => res.type('html').send(await vite.transformIndexHtml(req.originalUrl, html)));
app.listen(3005, '0.0.0.0', () => console.log('Admin preview on :3005'));
