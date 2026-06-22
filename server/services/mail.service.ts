import nodemailer from 'nodemailer';

export type MailSendResult = { ok: true } | { ok: false; error: string };

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.VITE_LEGAL_SUPPORT_EMAIL?.trim() ||
    'noreply@falarus.uz';

  if (!host || !user || !pass || !Number.isFinite(port) || port <= 0) {
    return null;
  }

  return { host, port, user, pass, from };
}

export function isMailConfigured(): boolean {
  return getSmtpConfig() !== null;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): { transporter: nodemailer.Transporter; from: string } | null {
  const cfg = getSmtpConfig();
  if (!cfg) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }

  return { transporter, from: cfg.from };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  firstName: string;
  newPassword: string;
}): Promise<MailSendResult> {
  const mail = getTransporter();
  if (!mail) {
    return { ok: false, error: 'SMTP not configured' };
  }

  const greeting = opts.firstName.trim() || 'Foydalanuvchi';
  const safeName = escapeHtml(greeting);
  const safePassword = escapeHtml(opts.newPassword);
  const subject = 'FalaRus — yangi parol / новый пароль';
  const text = [
    `Salom, ${greeting}!`,
    '',
    'FalaRus hisobingiz uchun yangi parol yaratildi:',
    opts.newPassword,
    '',
    'Kirishdan keyin Profil → Sozlamalar bo‘limida parolni o‘zgartirishingiz mumkin.',
    '',
    '---',
    '',
    `Здравствуйте, ${greeting}!`,
    '',
    'Для вашего аккаунта FalaRus создан новый пароль:',
    opts.newPassword,
    '',
    'После входа вы можете сменить пароль в Профиль → Настройки.',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#0F172A;max-width:520px">
      <p>Salom, <strong>${safeName}</strong>!</p>
      <p>FalaRus hisobingiz uchun yangi parol yaratildi:</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:0.04em;background:#F1F5F9;padding:12px 16px;border-radius:12px;display:inline-block">${safePassword}</p>
      <p style="color:#64748B;font-size:14px">Kirishdan keyin Profil → Sozlamalar bo‘limida parolni o‘zgartirishingiz mumkin.</p>
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0" />
      <p>Здравствуйте, <strong>${safeName}</strong>!</p>
      <p>Для вашего аккаунта FalaRus создан новый пароль:</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:0.04em;background:#F1F5F9;padding:12px 16px;border-radius:12px;display:inline-block">${safePassword}</p>
      <p style="color:#64748B;font-size:14px">После входа вы можете сменить пароль в Профиль → Настройки.</p>
    </div>
  `.trim();

  try {
    await mail.transporter.sendMail({
      from: mail.from,
      to: opts.to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
