import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginWithGoogle, loginWithPassword, type AuthUser } from '../api/auth';
import { EMAIL_REGEX } from '../constants/authStrings';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { logGoogleOriginHint, useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthFormBanner } from '../components/auth/AuthFormBanner';
import { AuthGap, AuthPageScaffold, AuthScrollBody } from '../components/auth/AuthPageScaffold';
import { AuthPasswordField } from '../components/auth/AuthPasswordField';
import { AuthHero } from '../components/auth/AuthHero';
import { AuthSegmentedTabs } from '../components/auth/AuthSegmentedTabs';
import { AuthSwitchLink } from '../components/auth/AuthSwitchLink';
import { AuthTextField } from '../components/auth/AuthTextField';
import { IntlPhoneInput, type IntlPhoneInputHandle } from '../components/auth/IntlPhoneInput';
import { OrDivider } from '../components/auth/OrDivider';
import { SocialAuthButton } from '../components/auth/SocialAuthButton';

type ContactMode = 'phone' | 'email';

function normalizeAuthUser(user: AuthUser) {
  return { ...user, progress: user.progress ?? 0, totalPoints: user.totalPoints ?? 0 };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refFromUrl = searchParams.get('ref') ?? '';
  const { login } = useAuth();
  const { t } = useLocale();

  const [mode, setMode] = useState<ContactMode>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const phoneRef = useRef<IntlPhoneInputHandle>(null);

  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      setSocialLoading(true);
      setFormError(null);
      try {
        const data = await loginWithGoogle(idToken, refFromUrl || undefined);
        login(data.token!, normalizeAuthUser(data.user!));
        navigate('/');
      } catch (err) {
        setFormError(err instanceof Error ? err.message : t('auth.genericError'));
      } finally {
        setSocialLoading(false);
      }
    },
    [refFromUrl, login, navigate, t],
  );

  const { triggerSignIn, googleButtonRef, googleButtonReady } = useGoogleSignIn(handleGoogleCredential);

  useEffect(() => {
    logGoogleOriginHint();
  }, []);

  const handleGoogleClick = async () => {
    if (submitting || socialLoading) return;
    setFormError(null);
    try {
      await triggerSignIn();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.genericError');
      if (!message.includes('bekor') && !message.includes('cancel')) {
        setFormError(message);
      }
    }
  };

  const hasIdentifier = mode === 'email' ? email.trim().length > 0 : Boolean(phoneE164);
  const canSubmit = !submitting && hasIdentifier && password.length > 0;

  const validate = async (): Promise<string | null> => {
    let hasError = false;
    let identifier: string | null = null;

    if (mode === 'email') {
      const trimmed = email.trim();
      if (!trimmed) {
        setIdentifierError(t('auth.emailRequired'));
        hasError = true;
      } else if (!EMAIL_REGEX.test(trimmed)) {
        setIdentifierError(t('auth.emailInvalid'));
        hasError = true;
      } else {
        identifier = trimmed;
      }
    } else {
      const e164 = await phoneRef.current?.getE164();
      if (!e164) {
        setIdentifierError(t('auth.phoneInvalid'));
        hasError = true;
      } else {
        identifier = e164;
      }
    }

    if (!password) {
      setPasswordError(t('auth.passwordRequired'));
      hasError = true;
    }

    return hasError ? null : identifier;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setIdentifierError(null);
    setPasswordError(null);
    setFormError(null);

    const identifier = await validate();
    if (!identifier) return;

    setSubmitting(true);
    try {
      const data = await loginWithPassword(identifier, password);
      login(data.token!, normalizeAuthUser(data.user!));
      navigate('/');
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
            title={t('auth.logInTitle')}
            subtitle="Hisobingizga kirib, davom eting"
            onBack={() => navigate('/')}
          />

          <AuthSegmentedTabs
            value={mode}
            options={[
              { value: 'phone', label: t('auth.phone') },
              { value: 'email', label: t('auth.email') },
            ]}
            onChange={(value) => {
              setMode(value);
              setIdentifierError(null);
            }}
          />

          <AuthGap />

          {mode === 'phone' ? (
            <IntlPhoneInput
              ref={phoneRef}
              error={identifierError ?? undefined}
              onChange={async () => {
                const e164 = await phoneRef.current?.getE164();
                setPhoneE164(e164);
                setIdentifierError(null);
              }}
            />
          ) : (
            <AuthTextField
              type="email"
              autoComplete="username"
              placeholder={t('auth.emailHint')}
              value={email}
              error={identifierError ?? undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                setIdentifierError(null);
              }}
            />
          )}

          <AuthGap />

          <AuthPasswordField
            label={t('auth.password')}
            autoComplete="current-password"
            value={password}
            error={passwordError ?? undefined}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(null);
            }}
          />

          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="px-1 py-1 text-sm font-bold text-[#2F6BFF]"
            >
              {t('auth.forgotPassword')}
            </button>
          </div>

          {formError ? (
            <>
              <div className="mt-2" />
              <AuthFormBanner message={formError} />
            </>
          ) : null}

          <AuthGap />

          <AuthButton type="submit" label={t('auth.logIn')} loading={submitting} disabled={!canSubmit} />

          <AuthGap />
          <OrDivider />
          <AuthGap />

          <SocialAuthButton
            label={t('auth.continueWithGoogle')}
            loading={socialLoading}
            disabled={submitting}
            onClick={handleGoogleClick}
            googleButtonRef={googleButtonRef}
            googleButtonReady={googleButtonReady}
          />

          <AuthGap />

          <AuthSwitchLink
            prefix={t('auth.noAccount')}
            action={t('auth.signUp')}
            onAction={() => navigate('/register')}
          />
        </form>
      </AuthScrollBody>
    </AuthPageScaffold>
  );
}
