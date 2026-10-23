import { useState, type FormEvent } from 'react';
import { LockKeyhole, ArrowRight, UtensilsCrossed, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try { await onLogin(email.trim(), password); }
    catch (err) { setError(err instanceof Error ? err.message : t('auth.unexpected')); }
    finally { setBusy(false); }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex justify-end"><LanguageSwitcher /></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/70 sm:p-9">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200"><UtensilsCrossed size={27} /></div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Restaurant<span className="text-blue-600">OS</span></h1>
          <p className="mt-2 text-sm text-slate-500">{t('auth.subtitle')}</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div><label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">{t('auth.email')}</label>
              <input id="login-email" autoComplete="username" type="email" value={email} onChange={event => setEmail(event.target.value)} required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="you@restaurant.com" /></div>
            <div><label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700">{t('auth.password')}</label>
              <input id="login-password" autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="••••••••" /></div>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={19} /> : <><LockKeyhole size={17}/>{t('auth.login')}<ArrowRight size={18}/></>}</button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">{t('auth.securityNote')}</p>
        </div>
      </div>
    </main>
  );
}
