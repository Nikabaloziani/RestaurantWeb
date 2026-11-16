import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/client';
import { disableMyPin, getMyPinStatus, isCommonPin, setMyPin } from '../api/staffPin';
import type { MyPinStatus } from '../api/staffPin';

type Mode = 'set' | 'disable' | null;

export default function StaffPinSettings({ token, restaurantId }: { token: string; restaurantId: string }) {
  const { t } = useTranslation();
  const id = useId();
  const [status, setStatus] = useState<MyPinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [mode, setMode] = useState<Mode>(null);
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const request = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const passwordInput = useRef<HTMLInputElement>(null);

  // Never render raw server errors, which may include stack traces or submitted secrets.
  function handleError(reason: unknown) {
    const code = reason instanceof ApiError ? reason.status : 0;
    if (code === 429) {
      const seconds = Math.max(1, (reason as ApiError).retryAfterSeconds ?? 300);
      setCooldownUntil(Date.now() + seconds * 1000);
      setSecondsLeft(seconds);
    }
    setError(({ 400: 'invalidRequest', 401: 'unauthorized', 403: 'forbidden',
      404: 'notFound', 409: 'conflict', 429: 'rateLimited' } as Record<number, string>)[code]
      ?? (code >= 500 ? 'serverError' : 'networkError'));
    return code;
  }

  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (!remaining) setCooldownUntil(0);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setStatus(null); setError(null);
    getMyPinStatus(token, restaurantId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setStatus(result); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) handleError(reason); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, restaurantId, reload]);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (mode) passwordInput.current?.focus(); }, [mode]);

  function clearSecrets() { setPassword(''); setPin(''); setConfirmation(''); }
  function changeMode(next: Mode) {
    clearSecrets(); setError(null); setSuccess(null); setMode(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode || !status || submitting.current || loading || secondsLeft > 0) return;
    setError(null); setSuccess(null);
    if (!password.trim()) { setError('passwordRequired'); return; }
    if (mode === 'set') {
      if (!/^[0-9]{6}$/.test(pin)) { setError('invalidPin'); return; }
      if (isCommonPin(pin)) { setError('commonPin'); return; }
      if (pin !== confirmation) { setError('mismatch'); return; }
    }
    const controller = new AbortController();
    request.current = controller;
    submitting.current = true; setBusy(true);
    try {
      if (mode === 'set') {
        const result = await setMyPin(token, restaurantId, password, pin, controller.signal);
        if (controller.signal.aborted) return;
        setStatus(result); setSuccess('saved');
      } else {
        await disableMyPin(token, restaurantId, password, controller.signal);
        if (controller.signal.aborted) return;
        // 204 confirms disable. Do not spend another rate-limited GET for the badge.
        // No timestamp is displayed: the disable endpoint does not return one.
        setStatus({ hasPin: false, isEnabled: false, updatedAt: null });
        setSuccess('disabledSuccess');
      }
      setMode(null);
    } catch (reason: unknown) {
      if (controller.signal.aborted) return;
      const code = handleError(reason);
      // A lost response may follow a committed write. Refresh before another mutation.
      if (!code || code >= 500 || code === 409) { setStatus(null); setMode(null); }
    } finally {
      if (!controller.signal.aborted) {
        clearSecrets(); setBusy(false); submitting.current = false;
      }
    }
  }

  const disabled = busy || loading || secondsLeft > 0;
  const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50';
  const buttonClass = 'rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-blue-600 disabled:opacity-50';

  return (
    <section aria-labelledby={`${id}-title`} aria-busy={loading || busy} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><KeyRound size={20} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={`${id}-title`} className="font-bold text-slate-900">{t('staffPin.title')}</h2>
            {status && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.isEnabled && status.hasPin ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {t(status.isEnabled && status.hasPin ? 'staffPin.enabled' : status.hasPin ? 'staffPin.disabled' : 'staffPin.notSet')}
            </span>}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t('staffPin.description')}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{t('staffPin.scope')}</p>
          {loading && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={16} aria-hidden="true" />{t('staffPin.loading')}</p>}
          {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{t(`staffPin.errors.${error}`)}</div>}
          {secondsLeft > 0 && <p className="mt-2 text-sm text-amber-700">{t('staffPin.retryIn', { seconds: secondsLeft })}</p>}
          {success && <div role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><ShieldCheck size={18} className="shrink-0" aria-hidden="true" />{t(`staffPin.${success}`)}</div>}
          {!loading && !status && <button type="button" disabled={disabled} onClick={() => setReload((value) => value + 1)} className={`mt-4 inline-flex items-center gap-2 ${buttonClass}`}><RefreshCw size={15} aria-hidden="true" />{t('staffPin.retry')}</button>}
          {status && !mode && <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={disabled} onClick={() => changeMode('set')} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-blue-600 disabled:opacity-50">{t(status.hasPin ? 'staffPin.change' : 'staffPin.set')}</button>
            {(status.hasPin || status.isEnabled) && <button type="button" disabled={disabled} onClick={() => changeMode('disable')} className={buttonClass}>{t('staffPin.disable')}</button>}
          </div>}
          {status && mode && <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
            <fieldset disabled={disabled} className="min-w-0 space-y-4">
              <legend className="mb-3 text-sm font-semibold text-slate-800">{t(mode === 'disable' ? 'staffPin.disableTitle' : 'staffPin.setTitle')}</legend>
              {mode === 'disable' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t('staffPin.disableHint')}</p>}
              <div>
                <label htmlFor={`${id}-password`} className="text-sm font-medium text-slate-700">{t('staffPin.password')}</label>
                <input ref={passwordInput} id={`${id}-password`} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
              </div>
              {mode === 'set' && <>
                <div>
                  <label htmlFor={`${id}-pin`} className="text-sm font-medium text-slate-700">{t('staffPin.newPin')}</label>
                  <input id={`${id}-pin`} type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="new-password" required value={pin} onChange={(event) => setPin(event.target.value)} aria-describedby={`${id}-hint`} className={inputClass} />
                  <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{t('staffPin.pinHint')}</p>
                </div>
                <div>
                  <label htmlFor={`${id}-confirm`} className="text-sm font-medium text-slate-700">{t('staffPin.confirmPin')}</label>
                  <input id={`${id}-confirm`} type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} />
                </div>
              </>}
              <div className="flex flex-wrap gap-3">
                <button type="submit" className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${mode === 'disable' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {busy && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{t(busy ? 'staffPin.saving' : mode === 'disable' ? 'staffPin.confirmDisable' : 'staffPin.save')}
                </button>
                <button type="button" onClick={() => changeMode(null)} className={buttonClass}>{t('staffPin.cancel')}</button>
              </div>
            </fieldset>
          </form>}
        </div>
      </div>
    </section>
  );
}
