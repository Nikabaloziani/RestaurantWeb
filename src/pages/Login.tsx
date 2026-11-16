import { useState, type FormEvent } from 'react';
import { ArrowRight, LoaderCircle, UtensilsCrossed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { registerAccount } from '../api/auth';
import { ApiError } from '../api/client';
import LanguageSwitcher from '../components/LanguageSwitcher';

const inputClasses = 'w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClasses = 'mb-2 block text-sm font-semibold text-slate-700';

type LoginProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  initialMode?: 'login' | 'register';
};

export default function Login({ onLogin, initialMode = 'login' }: LoginProps) {
  const { t } = useTranslation();
  const [registering, setRegistering] = useState(initialMode === 'register');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setRegistered(false);
    if (registering && (!firstName.trim() || !lastName.trim())) {
      setError(t('onboarding.nameRequired'));
      return;
    }

    setBusy(true);
    try {
      if (registering) {
        await registerAccount({
          firstName: firstName.trim(), lastName: lastName.trim(),
          email: email.trim(), password,
        });
        setRegistering(false);
        setRegistered(true);
      } else {
        await onLogin(email.trim(), password);
      }
    } catch (reason) {
      if (registering) {
        setError(t(reason instanceof ApiError && reason.status === 400
          ? 'onboarding.registerRejected' : 'onboarding.registerFailed'));
      } else {
        setError(reason instanceof Error ? reason.message : t('auth.unexpected'));
      }
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  function toggleMode() {
    setRegistering(value => !value);
    setPassword('');
    setError('');
    setRegistered(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-5 flex justify-end"><LanguageSwitcher /></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/70 sm:p-9">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200"><UtensilsCrossed size={27} aria-hidden="true" /></div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Restaurant<span className="text-blue-600">OS</span></h1>
          <p className="mt-2 text-sm text-slate-500">{t(registering ? 'onboarding.registerSubtitle' : 'auth.subtitle')}</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            {registering && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="register-first-name" className={labelClasses}>{t('onboarding.firstName')}</label>
                  <input id="register-first-name" autoComplete="given-name" value={firstName}
                    onChange={event => setFirstName(event.target.value)} required maxLength={50}
                    disabled={busy} className={inputClasses} />
                </div>
                <div>
                  <label htmlFor="register-last-name" className={labelClasses}>{t('onboarding.lastName')}</label>
                  <input id="register-last-name" autoComplete="family-name" value={lastName}
                    onChange={event => setLastName(event.target.value)} required maxLength={50}
                    disabled={busy} className={inputClasses} />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="login-email" className={labelClasses}>{t('auth.email')}</label>
              <input id="login-email" autoComplete="username" type="email" value={email}
                onChange={event => setEmail(event.target.value)} required maxLength={256}
                disabled={busy} className={inputClasses} placeholder="you@restaurant.com" />
            </div>
            <div>
              <label htmlFor="login-password" className={labelClasses}>{t('auth.password')}</label>
              <input id="login-password" autoComplete={registering ? 'new-password' : 'current-password'}
                type="password" value={password} onChange={event => setPassword(event.target.value)}
                required minLength={registering ? 6 : undefined} disabled={busy}
                aria-describedby={registering ? 'register-password-hint' : undefined}
                className={inputClasses} />
              {registering && <p id="register-password-hint" className="mt-2 text-xs text-slate-500">{t('onboarding.passwordHint')}</p>}
            </div>
            {registered && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{t('onboarding.registered')}</p>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={busy} type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
              {busy ? <LoaderCircle className="animate-spin" size={19} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
              {t(busy ? 'onboarding.working' : registering ? 'onboarding.createAccount' : 'auth.login')}
            </button>
          </form>
          <div className="mt-5 text-center">
            <button type="button" disabled={busy} onClick={toggleMode} className="text-sm font-semibold text-blue-700 hover:underline">
              {t(registering ? 'onboarding.backToSignIn' : 'onboarding.createAccount')}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
