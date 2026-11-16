import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/client';
import { acceptStaffInvite } from '../api/staff';

export default function StaffInvitationForm({ token, onAccepted }: {
  token: string;
  onAccepted: () => void;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const [invitation, setInvitation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const code = invitation.trim();
    setAccepted(false);
    if (!/^[0-9a-fA-F]{64}$/.test(code)) {
      setError('onboarding.inviteInvalid');
      return;
    }

    setError('');
    setBusy(true);
    try {
      await acceptStaffInvite(token, code);
      setInvitation('');
      setAccepted(true);
      onAccepted();
    } catch (reason) {
      const status = reason instanceof ApiError ? reason.status : 0;
      const messages: Record<number, string> = {
        400: 'onboarding.inviteInvalid',
        401: 'onboarding.signInAgain',
        403: 'onboarding.inviteEmail',
        404: 'onboarding.inviteMissing',
        409: 'onboarding.inviteConflict',
      };
      setError(messages[status] ?? 'onboarding.inviteFailed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`} className="font-bold text-slate-900">{t('onboarding.joinTitle')}</h2>
      <p id={`${inputId}-help`} className="text-sm leading-6 text-slate-500">{t('onboarding.joinHelp')}</p>
      <form className="space-y-3" onSubmit={submit}>
        <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700">{t('onboarding.inviteCode')}</label>
        <input id={inputId} type="password" autoComplete="off" autoCapitalize="none" spellCheck={false}
          aria-describedby={`${inputId}-help`} value={invitation}
          onChange={event => setInvitation(event.target.value)} disabled={busy} required
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
        {accepted && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{t('onboarding.inviteAccepted')}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {t(busy ? 'onboarding.working' : 'onboarding.acceptInvite')}
        </button>
      </form>
    </section>
  );
}
