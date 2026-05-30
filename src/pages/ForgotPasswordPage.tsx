import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authStrings } from '../constants/authStrings';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthGap, AuthPageScaffold, AuthScrollBody } from '../components/auth/AuthPageScaffold';
import { AuthPasswordField } from '../components/auth/AuthPasswordField';
import { AuthSectionTitle } from '../components/auth/AuthSectionTitle';
import { AuthSegmentedTabs } from '../components/auth/AuthSegmentedTabs';
import { AuthTextField } from '../components/auth/AuthTextField';
import { IntlPhoneInput } from '../components/auth/IntlPhoneInput';

type Phase = 0 | 1 | 2;
type ContactMode = 'phone' | 'email';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>(0);
  const [mode, setMode] = useState<ContactMode>('phone');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = () => {
    window.alert(authStrings.comingSoon);
    navigate('/login');
  };

  return (
    <AuthPageScaffold>
      <AuthScrollBody>
        <div className="flex flex-col pb-6">
          <AuthSectionTitle
            title={
              phase === 0
                ? authStrings.resetTitle
                : phase === 1
                  ? authStrings.enterCodeTitle
                  : authStrings.newPasswordTitle
            }
            subtitle={
              phase === 0
                ? authStrings.resetSubtitle
                : phase === 1
                  ? authStrings.enterCodeSubtitle
                  : undefined
            }
            onBack={() => (phase === 0 ? navigate('/login') : setPhase((p) => (p - 1) as Phase))}
          />

          {phase === 0 ? (
            <>
              <AuthSegmentedTabs
                value={mode}
                options={[
                  { value: 'phone', label: authStrings.phone },
                  { value: 'email', label: authStrings.email },
                ]}
                onChange={(value: ContactMode) => setMode(value)}
              />
              <AuthGap />
              {mode === 'phone' ? (
                <IntlPhoneInput />
              ) : (
                <AuthTextField
                  type="email"
                  placeholder={authStrings.emailHint}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
              <AuthGap />
              <AuthButton label={authStrings.sendCode} onClick={() => setPhase(1)} />
            </>
          ) : null}

          {phase === 1 ? (
            <>
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const next = [...otp];
                      next[index] = e.target.value.replace(/\D/g, '').slice(-1);
                      setOtp(next);
                    }}
                    className="h-12 w-10 rounded-xl border border-[#C8DCF3] bg-white text-center text-lg font-semibold outline-none focus:border-[#2563EB] focus:ring-[1.2px] focus:ring-[#2563EB] sm:w-11"
                  />
                ))}
              </div>
              <AuthGap />
              <button
                type="button"
                className="text-sm font-medium text-[#1E3A8A] underline underline-offset-2"
              >
                {authStrings.resendCode}
              </button>
              <AuthGap />
              <AuthButton label={authStrings.continueBtn} onClick={() => setPhase(2)} />
            </>
          ) : null}

          {phase === 2 ? (
            <>
              <AuthPasswordField
                label={authStrings.createPassword}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <AuthGap />
              <AuthPasswordField
                label={authStrings.rewritePassword}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <AuthGap />
              <AuthButton label={authStrings.savePassword} onClick={handleSave} />
            </>
          ) : null}
        </div>
      </AuthScrollBody>
    </AuthPageScaffold>
  );
}
