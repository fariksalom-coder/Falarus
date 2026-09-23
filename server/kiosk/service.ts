import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { KioskConfig, KioskCoupon, KioskDashboard, KioskSession } from '../../shared/kiosk.js';
import { KIOSK_QUESTIONS, type PrivateQuestion } from './questions.js';

export class KioskError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Query = (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
export type KioskDb = { query: Query; connect: () => Promise<{ query: Query; release: () => void }> };
const fail = (message: string): never => { throw new KioskError(400, message); };
const iso = (value: string | Date) => new Date(value).toISOString();
const number = (value: unknown, min: number, max: number, label: string) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) fail(label);
  return value as number;
};
export function validateKioskConfig(input: any): KioskConfig {
  if (!input || typeof input.enabled !== 'boolean') fail('Укажите, включена ли акция.');
  const text = (value: unknown, max: number) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail('Проверьте названия курса и акции.');
    return (value as string).trim();
  };
  const campaignKey = text(input.campaignKey, 60);
  if (!/^[a-z0-9_-]+$/.test(campaignKey)) fail('Код акции: латинские буквы, цифры, дефис.');
  if (!['RUB', 'UZS'].includes(input.currency)) fail('Выберите валюту RUB или UZS.');
  if (input.originalPrice !== null && (typeof input.originalPrice !== 'number' || !Number.isFinite(input.originalPrice) || input.originalPrice < 1 || input.originalPrice > 1e9)) fail('Проверьте цену курса.');
  return {
    enabled: input.enabled, campaignKey,
    courseTitle: text(input.courseTitle, 160), courseTitleUz: text(input.courseTitleUz, 160),
    discountPercent: number(input.discountPercent, 1, 90, 'Скидка должна быть от 1 до 90%.'),
    minimumCorrect: number(input.minimumCorrect, 0, 10, 'Порог: от 0 до 10 правильных ответов.'),
    validityHours: number(input.validityHours, 1, 720, 'Срок: от 1 до 720 часов.'),
    questionSeconds: number(input.questionSeconds, 10, 120, 'Время на вопрос: от 10 до 120 секунд.'),
    originalPrice: input.originalPrice === null ? null : Math.round(input.originalPrice * 100) / 100,
    currency: input.currency,
  };
}
export function normalizeKioskPhone(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length > 40) fail('Введите телефон с кодом страны.');
  const phone = parsePhoneNumberFromString((raw as string).trim());
  if (!phone?.isValid()) fail('Введите действительный телефон с кодом страны (+998, +7…).');
  return phone.number;
}
function tokenHash(token: string): string {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new KioskError(401, 'Сессия не найдена. Начните тест заново.');
  return createHash('sha256').update(token).digest('hex');
}
export function publicCoupon(row: any): KioskCoupon | null {
  if (!row) return null;
  const price = row.original_price == null ? null : Number(row.original_price);
  return {
    id: row.id, code: row.code, discountPercent: row.discount_percent,
    courseTitle: row.course_title, courseTitleUz: row.course_title_uz,
    originalPrice: price, finalPrice: price == null ? null : Math.round(price * (100 - row.discount_percent)) / 100,
    currency: row.currency, expiresAt: iso(row.expires_at), redeemedAt: row.redeemed_at ? iso(row.redeemed_at) : null,
  };
}
function session(row: any, coupon: any, now: Date): KioskSession {
  const config: KioskConfig = row.config;
  const q: PrivateQuestion | undefined = row.questions[row.answers.length];
  return {
    id: row.id, status: row.status, name: row.name, locale: row.locale, audience: row.audience,
    index: row.answers.length, total: row.questions.length, correctCount: row.correct_count,
    question: row.status === 'started' && q ? { id: q.id, category: q.category, categoryUz: q.categoryUz, text: q.text, options: q.options } : null,
    questionDeadline: row.status === 'started' ? new Date(new Date(row.question_started_at).getTime() + config.questionSeconds * 1000).toISOString() : null,
    serverTime: now.toISOString(), coupon: publicCoupon(coupon), config,
  };
}
export class KioskService {
  constructor(private db: KioskDb, private now = () => new Date()) {}
  async config(): Promise<KioskConfig> {
    const { rows } = await this.db.query('SELECT config FROM kiosk_settings WHERE id = 1');
    if (!rows[0]) throw new KioskError(503, 'Тест временно недоступен. Попробуйте позже.');
    return validateKioskConfig(rows[0].config);
  }
  async updateConfig(input: unknown): Promise<KioskConfig> {
    const config = validateKioskConfig(input);
    await this.db.query('UPDATE kiosk_settings SET config = $1::jsonb, updated_at = now() WHERE id = 1', [JSON.stringify(config)]);
    return config;
  }
  async start(token: string, input: any): Promise<KioskSession> {
    const hash = tokenHash(token);
    const existing = await this.db.query('SELECT * FROM kiosk_attempts WHERE token_hash = $1', [hash]);
    if (existing.rows[0]) return this.state(token);
    const config = await this.config();
    if (!config.enabled) throw new KioskError(403, 'Акция пока недоступна. / Aksiya hozir mavjud emas.');
    if (typeof input?.name !== 'string' || input.name.trim().length < 2 || input.name.trim().length > 80) fail('Введите имя (от 2 до 80 символов).');
    const audience = input.audience ?? 'adult';
    if (!['child', 'teen', 'adult'].includes(audience)) fail('Выберите детский, подростковый или взрослый тест.');
    const phone = normalizeKioskPhone(input.phone);
    if (input.consent !== true) fail('Нужно согласие на обработку данных для участия.');
    if (!['ru', 'uz'].includes(input.locale)) fail('Выберите язык.');
    const source = typeof input.source === 'string' ? input.source.slice(0, 80) : 'website';
    const now = this.now();
    // Correct answers and offer terms remain private and immutable for this attempt.
    await this.db.query(`INSERT INTO kiosk_attempts
      (id, token_hash, name, phone, locale, source, marketing_consent, config, questions, question_started_at, created_at, consent_at, audience)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$10,$10,$11)
      ON CONFLICT (token_hash) DO NOTHING`,
      [randomUUID(), hash, input.name.trim(), phone, input.locale, source, input.marketingConsent === true, JSON.stringify(config), JSON.stringify(KIOSK_QUESTIONS), now, audience]);
    return this.state(token);
  }
  async state(token: string): Promise<KioskSession> {
    const { rows } = await this.db.query('SELECT * FROM kiosk_attempts WHERE token_hash = $1', [tokenHash(token)]);
    const row = rows[0];
    if (!row) throw new KioskError(404, 'Сессия не найдена. Начните тест заново.');
    const coupon = row.coupon_id ? (await this.db.query('SELECT * FROM kiosk_coupons WHERE id = $1', [row.coupon_id])).rows[0] : null;
    return session(row, coupon, this.now());
  }
  async answer(token: string, input: any): Promise<KioskSession> {
    const hash = tokenHash(token);
    const index = number(input?.index, 0, 9, 'Некорректный номер вопроса.');
    const selected = input?.selected === null ? null : number(input?.selected, 0, 3, 'Выберите вариант ответа.');
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT * FROM kiosk_attempts WHERE token_hash = $1 FOR UPDATE', [hash]);
      const row = rows[0];
      if (!row) throw new KioskError(404, 'Сессия не найдена.');
      if (index > row.answers.length) throw new KioskError(409, 'Сначала ответьте на текущий вопрос.');
      // A retried/double-clicked answer never changes score or coupon validity.
      if (row.status === 'completed' || index < row.answers.length) {
        const coupon = row.coupon_id ? (await client.query('SELECT * FROM kiosk_coupons WHERE id = $1', [row.coupon_id])).rows[0] : null;
        await client.query('COMMIT');
        return session(row, coupon, this.now());
      }
      const now = this.now();
      const question: PrivateQuestion = row.questions[index];
      const timedOut = now.getTime() >= new Date(row.question_started_at).getTime() + row.config.questionSeconds * 1000;
      const correct = !timedOut && selected === question.correctIndex;
      row.answers.push({ index, selected: timedOut ? null : selected, correct, timedOut, at: now.toISOString() });
      row.correct_count += correct ? 1 : 0;
      row.status = row.answers.length === row.questions.length ? 'completed' : 'started';
      let coupon: any = null;
      if (row.status === 'completed' && row.correct_count >= row.config.minimumCorrect) {
        const config: KioskConfig = row.config;
        await client.query(`INSERT INTO kiosk_coupons
          (id,campaign_key,phone,code,discount_percent,course_title,course_title_uz,original_price,currency,created_at,expires_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (campaign_key,phone) DO NOTHING`,
          [randomUUID(),config.campaignKey,row.phone,`FR-${randomBytes(6).toString('hex').toUpperCase()}`,config.discountPercent,
            config.courseTitle,config.courseTitleUz,config.originalPrice,config.currency,now,new Date(now.getTime()+config.validityHours*3600000)]);
        coupon = (await client.query('SELECT * FROM kiosk_coupons WHERE campaign_key=$1 AND phone=$2', [config.campaignKey,row.phone])).rows[0];
      }
      const updated = await client.query(`UPDATE kiosk_attempts SET answers=$2::jsonb,correct_count=$3,status=$4,
        question_started_at=$5,completed_at=$6,coupon_id=$7 WHERE id=$1 RETURNING *`,
        [row.id,JSON.stringify(row.answers),row.correct_count,row.status,now,row.status==='completed'?now:null,coupon?.id??null]);
      await client.query('COMMIT');
      return { ...session(updated.rows[0],coupon,now), feedback: { correct,timedOut,explanation:question.explanation,explanationUz:question.explanationUz } };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async redeem(id: string, adminId: number, note: unknown): Promise<KioskCoupon> {
    if (!/^[a-f0-9-]{36}$/.test(id)) fail('Некорректный купон.');
    if (typeof note !== 'string' || note.trim().length < 3 || note.length > 500) fail('Укажите номер заказа или комментарий (3–500 символов).');
    const result = await this.db.query(`UPDATE kiosk_coupons SET redeemed_at=$2,redeemed_by=$3,redemption_note=$4
      WHERE id=$1 AND redeemed_at IS NULL AND expires_at > $2 RETURNING *`, [id,this.now(),adminId,(note as string).trim()]);
    if (!result.rows[0]) throw new KioskError(409, 'Купон не найден, уже использован или срок действия истёк.');
    return publicCoupon(result.rows[0])!;
  }
  async dashboard(params: { days: number; page: number; search: string; status: string; audience?: string }): Promise<KioskDashboard> {
    const days = number(params.days,1,365,'Период: от 1 до 365 дней.');
    const page = number(params.page,1,100000,'Некорректная страница.');
    const since = new Date(this.now().getTime()-days*86400000);
    const search = params.search.trim().slice(0,100);
    const status = ['all','started','completed','issued','redeemed'].includes(params.status) ? params.status : 'all';
    const audience = params.audience ?? 'all';
    if (!['all','child','teen','adult'].includes(audience)) fail('Некорректная возрастная группа.');
    const period = `created_at >= $1 AND ($2='all' OR audience=$2)`;
    const filter = `a.created_at >= $1 AND ($2='' OR a.name ILIKE '%'||$2||'%' OR a.phone ILIKE '%'||$2||'%' OR c.code ILIKE '%'||$2||'%')
      AND ($3='all' OR a.status=$3 OR ($3='issued' AND c.id IS NOT NULL) OR ($3='redeemed' AND c.redeemed_at IS NOT NULL))
      AND ($4='all' OR a.audience=$4)`;
    const [summary,coupons,daily,scores,participants,count,audiences] = await Promise.all([
      this.db.query(`SELECT count(*)::int AS started,count(*) FILTER (WHERE status='completed')::int AS completed,
        count(DISTINCT phone)::int AS contacts,coalesce(round(avg(correct_count) FILTER (WHERE status='completed'),1),0) AS average
        FROM kiosk_attempts WHERE ${period}`,[since,audience]),
      this.db.query(`SELECT count(*)::int AS issued,count(*) FILTER (WHERE redeemed_at IS NOT NULL)::int AS redeemed
        FROM kiosk_coupons c WHERE c.created_at >= $1
        AND ($2='all' OR EXISTS (SELECT 1 FROM kiosk_attempts a WHERE a.coupon_id=c.id AND a.audience=$2))`,[since,audience]),
      this.db.query(`SELECT to_char(created_at AT TIME ZONE 'Asia/Tashkent','YYYY-MM-DD') AS day,count(*)::int AS started,
        count(*) FILTER (WHERE status='completed')::int AS completed FROM kiosk_attempts WHERE ${period} GROUP BY 1 ORDER BY 1`,[since,audience]),
      this.db.query(`SELECT correct_count AS score,count(*)::int AS count FROM kiosk_attempts
        WHERE ${period} AND status='completed' GROUP BY correct_count ORDER BY correct_count`,[since,audience]),
      this.db.query(`SELECT a.id,a.name,a.phone,a.audience,a.marketing_consent,a.locale,a.source,a.status,a.correct_count,jsonb_array_length(a.answers) AS answer_count,
        a.created_at,a.completed_at,c.code AS coupon_code,c.discount_percent,c.expires_at,c.redeemed_at,c.id AS coupon_id
        FROM kiosk_attempts a LEFT JOIN kiosk_coupons c ON a.coupon_id=c.id WHERE ${filter}
        ORDER BY a.created_at DESC,a.id LIMIT 25 OFFSET $5`,[since,search,status,audience,(page-1)*25]),
      this.db.query(`SELECT count(*)::int AS total FROM kiosk_attempts a LEFT JOIN kiosk_coupons c ON a.coupon_id=c.id WHERE ${filter}`,[since,search,status,audience]),
      this.db.query(`SELECT audience,count(*)::int AS started,count(*) FILTER (WHERE status='completed')::int AS completed
        FROM kiosk_attempts WHERE created_at >= $1 GROUP BY audience ORDER BY audience`,[since]),
    ]);
    const s=summary.rows[0];
    return { summary:{ started:s.started,completed:s.completed,contacts:s.contacts,averageScore:Number(s.average),...coupons.rows[0] },
      audiences:audiences.rows,daily:daily.rows,scores:scores.rows,participants:participants.rows,total:count.rows[0].total,page,pageSize:25 };
  }
}
