import { useEffect, useState } from 'react';
import { LogOut, Mail, MessageCircle } from 'lucide-react';
import { requestPasswordReset } from '../../../../api/auth';
import { patchUserAccount, uploadUserAvatar, bustAvatarUrl, getMe } from '../../../../api/user';
import { adminContact } from '../../../../config/adminContact';
import { useAuth } from '../../../../context/AuthContext';
import { usePanel } from '../panelContext';
import { Avatar, Card, ErrorNote, Field, GhostButton, PageHead, PrimaryButton, inputClass } from '../ui';

export default function Settings() {
  const { t, lang, setLang, cabinet, token, toast, refresh } = usePanel();
  const { user, logout, updateUser } = useAuth();
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
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
  const ism = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || t.teacherRole;

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHead title={t.settingsTitle} />
      {err ? <ErrorNote text={err} /> : null}

      <Card className="mb-4 p-5">
        <p className="mb-3 text-[15px] font-semibold text-[#171A3D]">{t.settingsLanguage}</p>
        <div className="flex gap-2">
          {(['uz', 'ru'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`min-h-[44px] flex-1 rounded-[12px] border text-[13px] font-semibold transition ${
                lang === l
                  ? 'border-[#4B3BE4] bg-[#4B3BE4] text-white'
                  : 'border-[#E4E3F2] bg-white text-[#5B5E86]'
              }`}
            >
              {l === 'uz' ? "O'zbekcha" : 'Русский'}
            </button>
          ))}
        </div>
      </Card>

      {/* Surat — profil rasmini shu yerdan ham almashtirish mumkin. */}
      <Card className="mb-4 flex items-center gap-4 p-5">
        <Avatar name={ism} url={user?.avatarUrl ?? null} size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[#171A3D]">{t.accPhoto}</p>
          <p className="mt-0.5 text-[12px] text-[#8A8CAE]">{t.photoFormats}</p>
        </div>
        <label className="min-h-[44px] cursor-pointer rounded-[12px] bg-[#4B3BE4] px-4 py-3 text-[12.5px] font-semibold text-white">
          {user?.avatarUrl ? t.photoReplace : t.photoUpload}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setBusy(true);
              setErr('');
              try {
                const me = await uploadUserAvatar(token, file);
                updateUser({ avatarUrl: bustAvatarUrl(me.avatarUrl) });
                // Panel tepasidagi va profildagi surat ham darhol yangilansin.
                refresh();
                toast(t.photoSaved);
              } catch (x) {
                setErr(x instanceof Error ? x.message : t.errorGeneric);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </Card>

      {/* Ism, telefon, email — tahrirlanadi. */}
      <Card className="mb-4 p-5">
        <p className="mb-3 text-[15px] font-semibold text-[#171A3D]">{t.accEdit}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.fFirstName}>
            <input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label={t.fLastName}>
            <input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className={inputClass}
            />
          </Field>
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
          className="mt-3"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr('');
            try {
              const me = await patchUserAccount(token, {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                phone: form.phone.trim(),
                email: form.email.trim(),
              });
              updateUser({
                firstName: me.firstName,
                lastName: me.lastName,
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
      <Card className="mb-4 p-5">
        <p className="mb-3 text-[15px] font-semibold text-[#171A3D]">{t.passTitle}</p>
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
        <PrimaryButton
          className="mt-3"
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
        </PrimaryButton>

        <div className="mt-4 border-t border-[#F1F0FA] pt-4">
          <p className="text-[12.5px] text-[#8A8CAE]">
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

      <Card className="p-5">
        <button
          type="button"
          onClick={logout}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#FFF6F6] text-[13px] font-semibold text-[#C23A3F]"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {t.logout}
        </button>
      </Card>
    </div>
  );
}

export function Help() {
  const { t } = usePanel();
  const items = [
    { q: t.helpQ1, a: t.helpA1 },
    { q: t.helpQ2, a: t.helpA2 },
    { q: t.helpQ3, a: t.helpA3 },
    { q: t.helpQ4, a: t.helpA4 },
  ];

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHead title={t.helpTitle} subtitle={t.helpSubtitle} />

      <div className="space-y-3">
        {items.map((it) => (
          <Card key={it.q} className="p-5">
            <p className="text-[14px] font-semibold text-[#171A3D]">{it.q}</p>
            <p className="mt-2 text-[13px] leading-[1.7] text-[#5B5E86]">{it.a}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4 p-5">
        <p className="mb-3 text-[15px] font-semibold text-[#171A3D]">{t.helpContact}</p>
        <div className="flex flex-wrap gap-2.5">
          <a
            href={adminContact.telegram}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[44px] items-center gap-2 rounded-[12px] bg-[#4B3BE4] px-4 text-[13px] font-semibold text-white"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            Telegram
          </a>
          <a
            href={`mailto:${adminContact.email}`}
            className="flex min-h-[44px] items-center gap-2 rounded-[12px] border border-[#E4E3F2] bg-white px-4 text-[13px] font-semibold text-[#3E4166]"
          >
            <Mail className="h-[18px] w-[18px]" />
            {adminContact.email}
          </a>
          <GhostButton onClick={() => window.open(`https://wa.me/${adminContact.whatsapp.replace(/\D/g, '')}`, '_blank')}>
            WhatsApp
          </GhostButton>
        </div>
      </Card>
    </div>
  );
}
