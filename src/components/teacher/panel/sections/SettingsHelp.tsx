import { useEffect, useState } from 'react';
import { LogOut, Mail, MessageCircle } from 'lucide-react';
import { requestPasswordReset } from '../../../../api/auth';
import { patchUserAccount, getMe } from '../../../../api/user';
import { adminContact } from '../../../../config/adminContact';
import { useAuth } from '../../../../context/AuthContext';
import { usePanel } from '../panelContext';
import { Card, ErrorNote, Field, GhostButton, PrimaryButton, inputClass } from '../ui';

export default function Settings() {
  const { t, lang, setLang, cabinet, token, toast } = usePanel();
  const { user, logout, updateUser } = useAuth();
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    phone: user?.phone ?? '',
    email: user?.email ?? '',
  });
  const [pass, setPass] = useState({ current: '', next: '', repeat: '' });
  // Google/Telegram orqali kirgan o'qituvchida parol yo'q — joriy parol so'ralmaydi.
  const [parolBor, setParolBor] = useState(true);

  useEffect(() => {
    let alive = true;
    getMe(token)
      .then((me) => alive && setParolBor(me.hasPassword !== false))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [token]);

  const email = user?.email ?? cabinet?.profile?.public_email ?? null;

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      {err ? <ErrorNote text={err} /> : null}

      <Card as="section" className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-[17px] font-extrabold text-app-text">{t.settingsLanguage}</h2>
          <p className="mt-0.5 text-[13px] text-app-text-muted">{t.settingsLanguageHint}</p>
        </div>
        <div role="group" aria-label={t.settingsLanguage} className="flex rounded-[14px] bg-app-bg-subtle p-1">
          {(['uz', 'ru'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`min-h-[44px] rounded-[11px] px-4 text-[14px] font-bold transition ${
                lang === l ? 'bg-app-surface text-app-text shadow-[0_1px_2px_rgba(15,23,42,0.1)]' : 'text-app-text-muted'
              }`}
            >
              {l === 'uz' ? 'Oʻzbekcha' : 'Русский'}
            </button>
          ))}
        </div>
      </Card>

      {/* Kirish ma'lumotlari. Ism va surat katalogda ko'rinadi — ular «Tahrirlash»da, moderatsiya bilan. */}
      <Card as="section" className="flex flex-col gap-3.5 p-5">
        <div>
          <h2 className="text-[17px] font-extrabold text-app-text">{t.accEdit}</h2>
          <p className="mt-0.5 text-[13px] text-app-text-muted">{t.accEditHint}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.settingsPhone}>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+998 90 123 45 67"
              className={inputClass}
            />
          </Field>
          <Field label={t.settingsEmail}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="pochta@gmail.com"
              className={inputClass}
            />
          </Field>
        </div>
        <PrimaryButton
          className="self-start"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr('');
            try {
              const me = await patchUserAccount(token, {
                phone: form.phone.trim(),
                email: form.email.trim(),
              });
              updateUser({
                phone: me.phone ?? null,
                email: me.email ?? null,
              });
              toast(t.accSaved);
            } catch (x) {
              setErr(x instanceof Error ? x.message : t.errorGeneric);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? t.saving : t.save}
        </PrimaryButton>
      </Card>

      {/* Parol — joriy parol bilan tasdiqlanadi. */}
      <Card as="section" className="flex flex-col gap-3 p-5">
        <h2 className="text-[17px] font-extrabold text-app-text">{t.passTitle}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {parolBor ? (
            <Field label={t.passCurrent}>
              <input
                type="password"
                value={pass.current}
                onChange={(e) => setPass((v) => ({ ...v, current: e.target.value }))}
                className={inputClass}
              />
            </Field>
          ) : null}
          <Field label={t.passNew}>
            <input
              type="password"
              value={pass.next}
              onChange={(e) => setPass((v) => ({ ...v, next: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label={t.passRepeat}>
            <input
              type="password"
              value={pass.repeat}
              onChange={(e) => setPass((v) => ({ ...v, repeat: e.target.value }))}
              className={inputClass}
            />
          </Field>
        </div>
        <GhostButton
          className="self-start"
          disabled={busy || (parolBor && !pass.current) || !pass.next || pass.next !== pass.repeat}
          onClick={async () => {
            setBusy(true);
            setErr('');
            try {
              await patchUserAccount(token, {
                ...(parolBor ? { currentPassword: pass.current } : {}),
                newPassword: pass.next,
                newPasswordConfirm: pass.repeat,
              });
              setPass({ current: '', next: '', repeat: '' });
              toast(t.passChanged);
            } catch (x) {
              setErr(x instanceof Error ? x.message : t.errorGeneric);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? t.saving : t.passChange}
        </GhostButton>

        <div className="mt-1 border-t border-app-bg-subtle pt-3.5">
          <p className="text-[12.5px] text-app-text-muted">
            {email ? t.settingsPasswordHint : t.settingsPasswordNoEmail}
          </p>
          {email ? (
            <GhostButton
              className="mt-2"
              disabled={busy || sent}
              onClick={async () => {
                setBusy(true);
                try {
                  await requestPasswordReset(email);
                  setSent(true);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : t.errorGeneric);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {sent ? t.settingsPasswordSent : t.settingsPasswordSend}
            </GhostButton>
          ) : null}
        </div>
      </Card>

      <button
        type="button"
        onClick={logout}
        className="flex min-h-[48px] items-center gap-2 self-start rounded-[12px] bg-[#FEF2F2] px-[18px] text-[14px] font-extrabold text-[#B91C1C] transition hover:bg-[#FEE2E2]"
      >
        <LogOut className="h-[18px] w-[18px]" />
        {t.logout}
      </button>
    </div>
  );
}

export function Help() {
  const { t } = usePanel();
  const [open, setOpen] = useState(0);
  const items = [
    { q: t.helpQ1, a: t.helpA1 },
    { q: t.helpQ2, a: t.helpA2 },
    { q: t.helpQ3, a: t.helpA3 },
    { q: t.helpQ4, a: t.helpA4 },
  ];

  return (
    <div className="flex max-w-[820px] flex-col gap-4">
      <p className="text-[14px] text-app-text-muted">{t.helpSubtitle}</p>

      <Card as="section" className="px-5 py-1.5">
        {items.map((it, i) => {
          const on = open === i;
          return (
            <div key={it.q} className="border-t border-app-bg-subtle first:border-t-0">
              <button
                type="button"
                onClick={() => setOpen(on ? -1 : i)}
                aria-expanded={on}
                className="flex min-h-[56px] w-full items-center justify-between gap-2.5 text-left text-[15px] font-extrabold text-app-text"
              >
                {it.q}
                <span className="text-[20px] text-app-primary">{on ? '−' : '+'}</span>
              </button>
              {on ? <p className="mb-3.5 text-[14px] leading-[1.6] text-app-text-secondary">{it.a}</p> : null}
            </div>
          );
        })}
      </Card>

      <section className="flex flex-wrap items-center gap-3 rounded-[22px] bg-app-icon-bg p-5">
        <div className="min-w-0 flex-[1_1_220px]">
          <p className="text-[15px] font-extrabold text-[#134E4A]">{t.helpNotFound}</p>
          <p className="mt-0.5 text-[14px] text-[#115E59]">{t.helpNotFoundHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={adminContact.telegram}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[48px] items-center gap-2 rounded-[12px] bg-app-primary px-5 text-[14px] font-extrabold text-white transition hover:bg-app-primary-deep"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            {t.helpContact}
          </a>
          <a
            href={`mailto:${adminContact.email}`}
            aria-label={adminContact.email}
            className="flex min-h-[48px] items-center gap-2 rounded-[12px] border border-[#CDEAE4] bg-white px-4 text-[14px] font-bold text-[#134E4A]"
          >
            <Mail className="h-[18px] w-[18px]" />
            Email
          </a>
        </div>
      </section>
    </div>
  );
}
