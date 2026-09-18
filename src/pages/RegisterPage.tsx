import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { registerAccount, type AuthUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthFormBanner } from '../components/auth/AuthFormBanner';
import { AuthGap, AuthPageScaffold, AuthScrollBody } from '../components/auth/AuthPageScaffold';
import { AuthPasswordField } from '../components/auth/AuthPasswordField';
import { AuthHero } from '../components/auth/AuthHero';
import { AuthSwitchLink } from '../components/auth/AuthSwitchLink';
import { AuthTextField } from '../components/auth/AuthTextField';
import { IntlPhoneInput, type IntlPhoneInputHandle } from '../components/auth/IntlPhoneInput';
import { pathAfterAuth } from '../utils/postAuthPath';

function normalizeAuthUser(user: AuthUser) {
  return { ...user, progress: user.progress ?? 0, totalPoints: user.totalPoints ?? 0 };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refFromUrl = searchParams.get('ref') ?? '';
  const { login } = useAuth();
  const { t } = useLocale();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const phoneRef = useRef<IntlPhoneInputHandle>(null);

  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const confirmMismatch =
    confirmPassword.length > 0 && confirmPassword !== password
      ? t('auth.passwordsMismatch')
      : null;

  const canSubmit =
    !submitting &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    Boolean(phoneE164) &&
    password.length >= 6 &&
    confirmPassword.length > 0 &&
    !confirmMismatch;

  const validate = async (): Promise<{ identifier: string } | null> => {
    let hasError = false;
    let identifier: string | null = null;

    if (!firstName.trim()) {
      setFirstNameError(t('auth.nameRequired'));
      hasError = true;
    }
    if (!lastName.trim()) {
      setLastNameError(t('auth.surnameRequired'));
      hasError = true;
    }

    const e164 = await phoneRef.current?.getE164();
    if (!e164) {
      setIdentifierError(t('auth.phoneInvalid'));
      hasError = true;
    } else {
      identifier = e164;
    }

    if (password.length < 6) {
      setPasswordError(t('auth.passwordMinLength'));
      hasError = true;
    }
    if (confirmMismatch) {
      hasError = true;
    }

    return hasError || !identifier ? null : { identifier };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFirstNameError(null);
    setLastNameError(null);
    setIdentifierError(null);
    setPasswordError(null);
    setFormError(null);

    const validated = await validate();
    if (!validated) return;

    setSubmitting(true);
    try {
      const data = await registerAccount({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        identifier: validated.identifier,
        password,
        ref: refFromUrl || undefined,
      });
      login(data.token!, normalizeAuthUser(data.user!));
      navigate(pathAfterAuth({ isRegistration: true }), { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('auth.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageScaffold>
      <AuthScrollBody>
        <form onSubmit={handleSubmit} className="flex flex-col pb-6">
          <AuthHero
            title={`${t('auth.createAccountTitle')} ✨`}
            onBack={() => navigate('/')}
          />

          <div className="grid grid-cols-2 gap-3">
            <AuthTextField
              label={t('auth.name')}
              autoComplete="given-name"
              value={firstName}
              error={firstNameError ?? undefined}
              onChange={(e) => {
                setFirstName(e.target.value);
                setFirstNameError(null);
              }}
            />
            <AuthTextField
              label={t('auth.surname')}
              autoComplete="family-name"
              value={lastName}
              error={lastNameError ?? undefined}
              onChange={(e) => {
                setLastName(e.target.value);
                setLastNameError(null);
              }}
            />
          </div>

          <AuthGap />

          <IntlPhoneInput
            ref={phoneRef}
            initialCountry="ru"
            error={identifierError ?? undefined}
            onChange={async () => {
              const e164 = await phoneRef.current?.getE164();
              setPhoneE164(e164);
              setIdentifierError(null);
            }}
          />

          <AuthGap />

          <AuthPasswordField
            label={t('auth.createPassword')}
            autoComplete="new-password"
            value={password}
            error={passwordError ?? undefined}
            sharedVisible={showPasswords}
            onToggleShared={() => setShowPasswords((v) => !v)}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(null);
            }}
          />

          <AuthGap />

          <AuthPasswordField
            label={t('auth.rewritePassword')}
            autoComplete="new-password"
            value={confirmPassword}
            error={confirmMismatch ?? undefined}
            sharedVisible={showPasswords}
            onToggleShared={() => setShowPasswords((v) => !v)}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {formError ? (
            <>
              <div className="mt-2" />
              <AuthFormBanner message={formError} />
            </>
          ) : null}

          <AuthGap />

          <AuthButton
            type="submit"
            label={t('auth.register')}
            loading={submitting}
            disabled={!canSubmit}
            variant="success"
          />

          <AuthGap />

          <AuthSwitchLink
            prefix={t('auth.haveAccount')}
            action={t('auth.logIn')}
            onAction={() => navigate('/login')}
          />
        </form>
      </AuthScrollBody>
    </AuthPageScaffold>
  );
}
