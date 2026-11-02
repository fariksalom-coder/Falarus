import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../api/auth';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthFormBanner } from '../components/auth/AuthFormBanner';
import { AuthGap, AuthPageScaffold, AuthScrollBody } from '../components/auth/AuthPageScaffold';
import { AuthHero } from '../components/auth/AuthHero';
import { AuthTextField } from '../components/auth/AuthTextField';
import { EMAIL_REGEX } from '../constants/authStrings';
import { useLocale } from '../context/LocaleContext';

type Phase = 'form' | 'success';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>('form');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError(t('auth.emailRequired'));
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError(t('auth.emailInvalid'));
      return;
    }

    setSubmitting(true);
    setEmailError(null);
    setFormError(null);
    try {
      const result = await requestPasswordReset(trimmed);
      setSuccessMessage(result.message);
      setPhase('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.genericError');
      if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
        setFormError(t('auth.networkError'));
      } else {
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageScaffold>
      <AuthScrollBody>
        <div className="flex flex-col pb-6">
          <AuthHero
            title={phase === 'form' ? `${t('auth.resetTitle')} 🔑` : `${t('auth.resetSuccessTitle')} ✉️`}
            subtitle={phase === 'form' ? t('auth.resetSubtitle') : t('auth.resetSuccessSubtitle')}
            onBack={() => (phase === 'form' ? navigate('/login') : setPhase('form'))}
          />

          {phase === 'form' ? (
            <>
              <AuthTextField
                type="email"
                autoComplete="email"
                placeholder={t('auth.emailHint')}
                value={email}
                error={emailError ?? undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                  setFormError(null);
                }}
              />
              <AuthGap />
              {formError ? (
                <>
                  <AuthFormBanner message={formError} />
                  <AuthGap />
                </>
              ) : null}
              <AuthButton
                label={t('auth.resetSendPassword')}
                loading={submitting}
                onClick={() => void handleSubmit()}
              />
            </>
          ) : (
            <>
              {successMessage ? (
                <>
                  <AuthFormBanner message={successMessage} variant="success" />
                  <AuthGap />
                </>
              ) : null}
              <AuthButton label={t('auth.logInTitle')} onClick={() => navigate('/login')} />
            </>
          )}
        </div>
      </AuthScrollBody>
    </AuthPageScaffold>
  );
}
