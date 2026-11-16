import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Building2, LogOut, RefreshCw, UsersRound, UtensilsCrossed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createBillingOrganization, fetchMyOrganizations, type BillingOrganization } from '../api/billing';
import { ApiError } from '../api/client';
import { createRestaurant } from '../api/restaurants';
import LanguageSwitcher from '../components/LanguageSwitcher';
import StaffInvitationForm from '../components/StaffInvitationForm';

const secondaryButton = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

function restaurantSlug(name: string) {
  const readable = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100).replace(/^-|-$/g, '');
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${readable || 'restaurant'}-${suffix}`;
}

function FirstRestaurantForm({ token, onCreated }: { token: string; onCreated: () => void }) {
  const { t } = useTranslation();
  const nameId = useId();
  const [organization, setOrganization] = useState<BillingOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const pendingSlug = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    fetchMyOrganizations(token, controller.signal)
      .then(organizations => {
        if (controller.signal.aborted) return;
        const owned = organizations[0] ?? null;
        setOrganization(owned);
        if (owned) setName(current => current || owned.name);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(reason instanceof ApiError && reason.status === 401
          ? 'onboarding.signInAgain' : 'onboarding.organizationLoadFailed');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, reload]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || loadError || busy) return;
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 150) {
      setError('onboarding.businessNameLength');
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (!organization) {
        const created = await createBillingOrganization(token, cleanName);
        setOrganization(created);
        setName(created.name);
      } else {
        // Reuse the same unique slug after a lost response, so a retry cannot
        // silently create another location under a plan with spare capacity.
        pendingSlug.current ??= restaurantSlug(cleanName);
        await createRestaurant(token, {
          organizationId: organization.id,
          name: cleanName,
          slug: pendingSlug.current,
        });
        onCreated();
      }
    } catch (reason) {
      const status = reason instanceof ApiError ? reason.status : 0;
      if (!organization && status === 409) {
        // Another tab may already have created the organization. Load it before retrying.
        setReload(current => current + 1);
      }
      if (status === 401) setError('onboarding.signInAgain');
      else if (status === 409 && organization) setError('onboarding.restaurantConflict');
      else if (status === 404 && organization) setError('onboarding.organizationLoadFailed');
      else setError(organization ? 'onboarding.restaurantFailed' : 'onboarding.organizationFailed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3" aria-busy={busy || loading}>
      {organization && <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{organization.name}</p>}
      <h2 className="font-bold text-slate-900">
        {t(organization ? 'onboarding.restaurantTitle' : 'onboarding.organizationTitle')}
      </h2>
      <p className="text-sm leading-6 text-slate-500">{t(organization ? 'onboarding.restaurantHelp' : 'onboarding.trialHelp')}</p>
      {loading && <p role="status" className="text-sm text-slate-500">{t('onboarding.loading')}</p>}
      {loadError && (
        <div className="space-y-3">
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t(loadError)}</p>
          <button type="button" className={secondaryButton} onClick={() => setReload(current => current + 1)}>
            <RefreshCw size={16} aria-hidden="true" />{t('onboarding.refresh')}
          </button>
        </div>
      )}
      {!loading && !loadError && (
        <form className="space-y-3" onSubmit={submit}>
          <label htmlFor={nameId} className="block text-sm font-semibold text-slate-700">
            {t(organization ? 'onboarding.restaurantName' : 'onboarding.organizationName')}
          </label>
          <input id={nameId} value={name} onChange={event => setName(event.target.value)} disabled={busy}
            minLength={2} maxLength={150} required
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
          <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {t(busy ? 'onboarding.working' : organization ? 'onboarding.createRestaurant' : 'onboarding.startTrial')}
          </button>
        </form>
      )}
    </section>
  );
}

export default function WorkspaceSetup({ token, email, loading, accessError, onRefresh, onLogout }: {
  token: string;
  email: string;
  loading: boolean;
  accessError: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'business' | 'staff' | null>(null);

  return (
    <main className="min-h-screen bg-[#f6f8fc] px-4 py-8 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-xl bg-blue-600 p-3 text-white"><UtensilsCrossed size={20} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="font-bold text-slate-900">Restaurant<span className="text-blue-600">OS</span></p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LanguageSwitcher />
            <button type="button" onClick={onLogout} className={secondaryButton}>
              <LogOut size={15} aria-hidden="true" />{t('auth.logout')}
            </button>
          </div>
        </header>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('onboarding.welcome')}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t('onboarding.chooseHelp')}</p>
          {loading && <p role="status" className="mt-4 text-sm text-slate-500">{t('onboarding.loading')}</p>}
          {accessError && !loading && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{t('onboarding.accessLoadFailed')}</p>}
          {!loading && !accessError && (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" aria-pressed={mode === 'business'} onClick={() => setMode('business')}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${mode === 'business' ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                  <Building2 size={20} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold text-slate-900">{t('onboarding.startBusiness')}</span>
                    <span className="mt-1 block text-sm text-slate-500">{t('onboarding.startBusinessHint')}</span>
                  </span>
                </button>
                <button type="button" aria-pressed={mode === 'staff'} onClick={() => setMode('staff')}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${mode === 'staff' ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                  <UsersRound size={20} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold text-slate-900">{t('onboarding.joinTeam')}</span>
                    <span className="mt-1 block text-sm text-slate-500">{t('onboarding.joinTeamHint')}</span>
                  </span>
                </button>
              </div>
              {mode && <div className="mt-6 border-t border-slate-200 pt-6">
                {mode === 'business'
                  ? <FirstRestaurantForm token={token} onCreated={onRefresh} />
                  : <StaffInvitationForm token={token} onAccepted={onRefresh} />}
              </div>}
            </>
          )}
          <button type="button" onClick={onRefresh} disabled={loading} className={`mt-6 ${secondaryButton}`}>
            <RefreshCw size={16} aria-hidden="true" />{t('onboarding.refreshAccess')}
          </button>
        </div>
      </div>
    </main>
  );
}
