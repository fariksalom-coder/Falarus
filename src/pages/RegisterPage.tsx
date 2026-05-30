import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginWithGoogle, registerAccount, type AuthUser } from '../api/auth';
import { authStrings, EMAIL_REGEX } from '../constants/authStrings';
import { useAuth } from '../context/AuthContext';
import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';
import { logGoogleOriginHint, useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthFormBanner } from '../components/auth/AuthFormBanner';
import { AuthGap, AuthPageScaffold, AuthScrollBody } from '../components/auth/AuthPageScaffold';
import { AuthPasswordField } from '../components/auth/AuthPasswordField';
import { AuthSectionTitle } from '../components/auth/AuthSectionTitle';
import { AuthSegmentedTabs } from '../components/auth/AuthSegmentedTabs';
import { AuthSwitchLink } from '../components/auth/AuthSwitchLink';
import { AuthTextField } from '../components/auth/AuthTextField';
import { IntlPhoneInput, type IntlPhoneInputHandle } from '../components/auth/IntlPhoneInput';
import { OrDivider } from '../components/auth/OrDivider';
import { SocialAuthButton } from '../components/auth/SocialAuthButton';
import { TermsCheckbox } from '../components/auth/TermsCheckbox';

type ContactMode = 'phone' | 'email';

function normalizeAuthUser(user: AuthUser) {
  return { ...user, progress: user.progress ?? 0, totalPoints: user.totalPoints ?? 0 };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refFromUrl = searchParams.get('ref') ?? '';
  const metrics = useAuthLayoutMetrics();
  const { login } = useAuth();
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
        setFormError(err instanceof Error ? err.message : authStrings.genericError);
      } finally {
        setSocialLoading(false);
      }
    },
    [refFromUrl, login, navigate],
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
      const message = err instanceof Error ? err.message : authStrings.genericError;
      if (!message.includes('bekor') && !message.includes('cancel')) {
        setFormError(message);
      }
    }
  };

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mode, setMode] = useState<ContactMode>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
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
      ? authStrings.passwordsMismatch
      : null;

  const hasRequiredFields =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    (mode === 'email' ? email.trim().length > 0 : Boolean(phoneE164));

  const canSubmit =
    !submitting &&
    termsAccepted &&
    hasRequiredFields &&
    password.length >= 6 &&
    confirmPassword.length > 0 &&
    !confirmMismatch;

  const validate = async (): Promise<{ identifier: string } | null> => {
    let hasError = false;
    let identifier: string | null = null;

    if (!firstName.trim()) {
      setFirstNameError(authStrings.nameRequired);
      hasError = true;
    }
    if (!lastName.trim()) {
      setLastNameError(authStrings.surnameRequired);
      hasError = true;
    }

    if (mode === 'email') {
      const trimmed = email.trim();
      if (!trimmed) {
        setIdentifierError(authStrings.emailRequired);
        hasError = true;
      } else if (!EMAIL_REGEX.test(trimmed)) {
        setIdentifierError(authStrings.emailInvalid);
        hasError = true;
      } else {
        identifier = trimmed;
      }
    } else {
      const e164 = await phoneRef.current?.getE164();
      if (!e164) {
        setIdentifierError(authStrings.phoneInvalid);
        hasError = true;
      } else {
        identifier = e164;
      }
    }

    if (password.length < 6) {
      setPasswordError(authStrings.passwordMinLength);
      hasError = true;
    }
    if (confirmMismatch) {
      hasError = true;
    }
    if (!termsAccepted) {
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
      navigate('/');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : authStrings.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageScaffold>
      <AuthScrollBody>
        <form onSubmit={handleSubmit} className="flex flex-col pb-6">
          <AuthSectionTitle
            title={authStrings.createAccountTitle}
            onBack={() => navigate('/')}
          />

          <div className="grid grid-cols-2 gap-3">
            <AuthTextField
              label={authStrings.name}
              value={firstName}
              error={firstNameError ?? undefined}
              onChange={(e) => {
                setFirstName(e.target.value);
                setFirstNameError(null);
              }}
            />
            <AuthTextField
              label={authStrings.surname}
              value={lastName}
              error={lastNameError ?? undefined}
              onChange={(e) => {
                setLastName(e.target.value);
                setLastNameError(null);
              }}
            />
          </div>

          <AuthGap />

          <AuthSegmentedTabs
            value={mode}
            options={[
              { value: 'phone', label: authStrings.phone },
              { value: 'email', label: authStrings.email },
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
              autoComplete="email"
              placeholder={authStrings.emailHint}
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
            label={authStrings.createPassword}
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
            label={authStrings.rewritePassword}
            autoComplete="new-password"
            value={confirmPassword}
            error={confirmMismatch ?? undefined}
            sharedVisible={showPasswords}
            onToggleShared={() => setShowPasswords((v) => !v)}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <div style={{ height: metrics.isCompact ? 6 : 10 }} />

          <TermsCheckbox checked={termsAccepted} onChange={setTermsAccepted} />

          {formError ? (
            <>
              <div className="mt-2" />
              <AuthFormBanner message={formError} />
            </>
          ) : null}

          <AuthGap />

          <AuthButton
            type="submit"
            label={authStrings.register}
            loading={submitting}
            disabled={!canSubmit}
          />

          <AuthGap />
          <OrDivider />
          <AuthGap />

          <SocialAuthButton
            label={authStrings.continueWithGoogle}
            loading={socialLoading}
            disabled={submitting}
            onClick={handleGoogleClick}
            googleButtonRef={googleButtonRef}
            googleButtonReady={googleButtonReady}
          />

          <AuthGap />

          <AuthSwitchLink
            prefix={authStrings.haveAccount}
            action={authStrings.logIn}
            onAction={() => navigate('/login')}
          />
        </form>
      </AuthScrollBody>
    </AuthPageScaffold>
  );
}
