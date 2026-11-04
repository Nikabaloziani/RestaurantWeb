import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Crown,
  LoaderCircle,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  createBillingOrganization,
  fetchBillingPlans,
  fetchMyOrganizations,
  fetchOrganizationSubscription,
  type BillingOrganization,
  type BillingPlan,
  type BillingSubscription,
  type SubscriptionStatus,
} from '../api/billing';

type SupportedLanguage = 'ka' | 'en' | 'ru';
type Section = 'subscription' | 'plans';

const messages = {
  ka: {
    title: 'გამოწერა და პაკეტები',
    subtitle: 'მართე RestaurantOS-ის გამოწერა, ლიმიტები და გეგმები.',
    subscription: 'ჩემი გამოწერა',
    plans: 'პაკეტების შედარება',
    refresh: 'განახლება',
    loading: 'მონაცემები იტვირთება…',
    retry: 'თავიდან ცდა',
    organization: 'ორგანიზაცია',
    chooseOrganization: 'აირჩიე ორგანიზაცია',
    noOrganization: 'ჯერ ორგანიზაცია არ გაქვს შექმნილი.',
    noOrgHelp: 'შექმენი ორგანიზაცია, რათა მიიღო 14-დღიანი Starter საცდელი პერიოდი.',
    organizationName: 'ორგანიზაციის სახელი',
    createOrganization: 'ორგანიზაციის შექმნა',
    creating: 'იქმნება…',
    nameRequired: 'შეიყვანე ორგანიზაციის სახელი (2–150 სიმბოლო).',
    currentPlan: 'მიმდინარე პაკეტი',
    perMonth: 'თვეში',
    trialUntil: 'საცდელი პერიოდის ბოლო',
    periodUntil: 'მოქმედების ვადის ბოლო',
    daysLeft: 'დარჩენილი დღეები',
    locations: 'ობიექტები',
    employees: 'თანამშრომლები',
    included: 'პაკეტში შედის',
    current: 'მიმდინარე პაკეტი',
    unavailableUpgrade: 'განახლება მალე დაემატება',
    upgradeInfo: 'პაკეტის შეცვლა და ავტომატური გადახდები ჯერ არ არის დაკავშირებული. აქედან თანხა არ ჩამოგეჭრება. QR Menu, KDS და Inventory ჯერ განვითარების პროცესშია.',
    noSubscription: 'გამოწერის ინფორმაცია ვერ მოიძებნა.',
    quotaInfo: 'ლიმიტებს Backend ამოწმებს. ეს გვერდი მხოლოდ აჩვენებს რეალურ მონაცემებს.',
    trialing: 'საცდელი პერიოდი',
    active: 'აქტიური',
    pastDue: 'ვადაგადაცილებული',
    canceled: 'გაუქმებული',
    expired: 'ვადაგასული',
    unknown: 'უცნობი',
    accessEnabled: 'წვდომა მოქმედებს',
    accessDisabled: 'წვდომა არ მოქმედებს',
    planFeatures: 'ფუნქციები',
    menuOrders: 'მენიუ, შეკვეთები და გადახდები',
    reservations: 'ჯავშნები',
    basicAnalytics: 'ძირითადი ანალიტიკა',
    advancedAnalytics: 'გაფართოებული ანალიტიკა',
    qrMenu: 'QR მენიუ',
    kitchenDisplay: 'სამზარეულოს ეკრანი (KDS)',
    inventory: 'მარაგების მართვა',
    multiBranchAnalytics: 'ფილიალების საერთო ანალიტიკა',
    choosePlan: 'შეადარე პაკეტები',
  },
  en: {
    title: 'Billing & subscription',
    subtitle: 'Manage your RestaurantOS plan, usage and subscription.',
    subscription: 'My subscription',
    plans: 'Compare plans',
    refresh: 'Refresh',
    loading: 'Loading…',
    retry: 'Try again',
    organization: 'Organization',
    chooseOrganization: 'Choose an organization',
    noOrganization: 'No organization yet.',
    noOrgHelp: 'Create an organization to start a 14-day Starter trial.',
    organizationName: 'Organization name',
    createOrganization: 'Create organization',
    creating: 'Creating…',
    nameRequired: 'Enter a name between 2 and 150 characters.',
    currentPlan: 'Current plan',
    perMonth: 'per month',
    trialUntil: 'Trial ends',
    periodUntil: 'Current period ends',
    daysLeft: 'Days remaining',
    locations: 'Locations',
    employees: 'Employees',
    included: 'Included in this plan',
    current: 'Current plan',
    unavailableUpgrade: 'Upgrades coming soon',
    upgradeInfo: 'Plan changes and recurring payments are not connected yet. No payment can be taken here. QR Menu, KDS and Inventory are still under development.',
    noSubscription: 'Subscription not found.',
    quotaInfo: 'The Backend enforces limits. This page displays the live usage returned by the API.',
    trialing: 'Trial',
    active: 'Active',
    pastDue: 'Past due',
    canceled: 'Canceled',
    expired: 'Expired',
    unknown: 'Unknown',
    accessEnabled: 'Access enabled',
    accessDisabled: 'Access disabled',
    planFeatures: 'Features',
    menuOrders: 'Menu, orders and payments',
    reservations: 'Reservations',
    basicAnalytics: 'Basic analytics',
    advancedAnalytics: 'Advanced analytics',
    qrMenu: 'QR menu',
    kitchenDisplay: 'Kitchen display (KDS)',
    inventory: 'Inventory management',
    multiBranchAnalytics: 'Multi-branch analytics',
    choosePlan: 'Compare available plans',
  },
  ru: {
    title: 'Подписка и тарифы',
    subtitle: 'Управляйте подпиской, лимитами и тарифами RestaurantOS.',
    subscription: 'Моя подписка',
    plans: 'Сравнение тарифов',
    refresh: 'Обновить',
    loading: 'Загрузка…',
    retry: 'Повторить',
    organization: 'Организация',
    chooseOrganization: 'Выберите организацию',
    noOrganization: 'Организация ещё не создана.',
    noOrgHelp: 'Создайте организацию для 14-дневного пробного периода Starter.',
    organizationName: 'Название организации',
    createOrganization: 'Создать организацию',
    creating: 'Создание…',
    nameRequired: 'Введите название длиной 2–150 символов.',
    currentPlan: 'Текущий тариф',
    perMonth: 'в месяц',
    trialUntil: 'Конец пробного периода',
    periodUntil: 'Конец периода',
    daysLeft: 'Осталось дней',
    locations: 'Объекты',
    employees: 'Сотрудники',
    included: 'Включено в тариф',
    current: 'Текущий тариф',
    unavailableUpgrade: 'Смена тарифа скоро появится',
    upgradeInfo: 'Смена тарифа и регулярные платежи ещё не подключены. Оплата здесь не производится. QR-меню, KDS и Inventory пока разрабатываются.',
    noSubscription: 'Подписка не найдена.',
    quotaInfo: 'Лимиты проверяет сервер. Здесь отображаются данные API.',
    trialing: 'Пробный период',
    active: 'Активна',
    pastDue: 'Просрочена',
    canceled: 'Отменена',
    expired: 'Истекла',
    unknown: 'Неизвестно',
    accessEnabled: 'Доступ активен',
    accessDisabled: 'Доступ закрыт',
    planFeatures: 'Возможности',
    menuOrders: 'Меню, заказы и платежи',
    reservations: 'Бронирования',
    basicAnalytics: 'Базовая аналитика',
    advancedAnalytics: 'Расширенная аналитика',
    qrMenu: 'QR-меню',
    kitchenDisplay: 'Экран кухни (KDS)',
    inventory: 'Учёт запасов',
    multiBranchAnalytics: 'Аналитика филиалов',
    choosePlan: 'Сравнить тарифы',
  },
} as const;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function statusLabel(status: SubscriptionStatus, t: Record<keyof typeof messages['en'], string>): string {
  switch (status) {
    case 1: return t.trialing;
    case 2: return t.active;
    case 3: return t.pastDue;
    case 4: return t.canceled;
    case 5: return t.expired;
    default: return t.unknown;
  }
}

function UsageBar({ label, used, maximum }: { label: string; used: number; maximum: number }) {
  const ratio = maximum > 0 ? Math.max(0, Math.min(1, used / maximum)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{used} / {maximum}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label}
        aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={used}>
        <div className={`h-full rounded-full transition-all ${ratio >= 1 ? 'bg-amber-500' : 'bg-blue-600'}`}
          style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export default function BillingSettings({ token }: { token: string }) {
  const { i18n } = useTranslation();
  const lang: SupportedLanguage = i18n.resolvedLanguage?.startsWith('ka')
    ? 'ka' : i18n.resolvedLanguage?.startsWith('ru') ? 'ru' : 'en';
  const t = messages[lang];

  const [section, setSection] = useState<Section>('subscription');
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [organizations, setOrganizations] = useState<BillingOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscriptionError, setSubscriptionError] = useState('');
  const [reload, setReload] = useState(0);
  const [organizationName, setOrganizationName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([
      fetchBillingPlans(controller.signal),
      fetchMyOrganizations(token, controller.signal),
    ]).then(([receivedPlans, receivedOrganizations]) => {
      if (controller.signal.aborted) return;
      setPlans(receivedPlans);
      setOrganizations(receivedOrganizations);
      setOrganizationId(current => receivedOrganizations.some(item => item.id === current)
        ? current : (receivedOrganizations[0]?.id ?? ''));
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(getErrorMessage(reason));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [token, reload]);

  useEffect(() => {
    if (!organizationId) {
      setSubscription(null);
      setSubscriptionError('');
      return;
    }
    const controller = new AbortController();
    setSubscription(null);
    setSubscriptionLoading(true);
    setSubscriptionError('');
    fetchOrganizationSubscription(token, organizationId, controller.signal)
      .then(value => {
        if (!controller.signal.aborted) setSubscription(value);
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) setSubscriptionError(getErrorMessage(reason));
      }).finally(() => {
        if (!controller.signal.aborted) setSubscriptionLoading(false);
      });
    return () => controller.abort();
  }, [token, organizationId, reload]);

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = organizationName.trim();
    if (name.length < 2 || name.length > 150) {
      setCreateError(t.nameRequired);
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const created = await createBillingOrganization(token, name);
      setOrganizationName('');
      setOrganizationId(created.id);
      setReload(current => current + 1);
    } catch (reason: unknown) {
      setCreateError(getErrorMessage(reason));
    } finally {
      setCreating(false);
    }
  }

  const activePlan = plans.find(plan => plan.code === subscription?.planCode);
  const trialDays = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((Date.parse(subscription.trialEndsAt) - Date.now()) / 86400000))
    : null;
  const locale = lang === 'ka' ? 'ka-GE' : lang === 'ru' ? 'ru-RU' : 'en-US';
  const dateValue = subscription?.status === 1 ? subscription.trialEndsAt : subscription?.currentPeriodEndsAt;
  const dateLabel = subscription?.status === 1 ? t.trialUntil : t.periodUntil;

  return (
    <section className="space-y-5" aria-label={t.title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <CreditCard size={13} /> RestaurantOS SaaS
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <button type="button" onClick={() => setReload(value => value + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <RefreshCw size={15} /> {t.refresh}
        </button>
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => setSection('subscription')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${section === 'subscription' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          {t.subscription}
        </button>
        <button type="button" onClick={() => setSection('plans')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${section === 'plans' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          {t.plans}
        </button>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <span className="flex items-center gap-2"><AlertCircle size={17} />{error}</span>
          <button type="button" onClick={() => setReload(v => v + 1)} className="font-semibold underline">{t.retry}</button>
        </div>
      )}

      {section === 'subscription' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <label htmlFor="billing-org-select" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t.organization}</label>
            {organizations.length > 0 ? (
              <select id="billing-org-select" value={organizationId} onChange={event => setOrganizationId(event.target.value)}
                className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                {organizations.map(organization => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            ) : !loading && !error ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-700">{t.noOrganization}</p>
                <p className="text-sm text-slate-500">{t.noOrgHelp}</p>
                <form className="flex flex-wrap gap-2" onSubmit={handleCreateOrganization}>
                  <input type="text" value={organizationName} maxLength={150} onChange={event => setOrganizationName(event.target.value)}
                    placeholder={t.organizationName} aria-label={t.organizationName}
                    className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  <button type="submit" disabled={creating}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    <PlusCircle size={16} />{creating ? t.creating : t.createOrganization}
                  </button>
                </form>
                {createError && <p className="text-sm text-red-700" role="alert">{createError}</p>}
              </div>
            ) : null}
          </div>

          {(loading || subscriptionLoading) && <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600"><LoaderCircle size={17} className="animate-spin" />{t.loading}</div>}
          {subscriptionError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{subscriptionError}</div>}
          {!loading && !subscriptionLoading && organizationId && !subscription && !subscriptionError && (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">{t.noSubscription}</p>
          )}

          {subscription && !subscriptionLoading && (
            <>
              <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                <article className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{t.currentPlan}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${subscription.isCurrentlyEntitled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {statusLabel(subscription.status, t)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="rounded-xl bg-blue-600 p-3 text-white"><Crown size={23} /></div>
                    <div>
                      <h3 className="text-2xl font-bold capitalize text-slate-900">{activePlan?.name ?? subscription.planCode}</h3>
                      {activePlan && <p className="text-sm text-slate-600">${Number(activePlan.monthlyPriceUsd).toFixed(2)} / {t.perMonth}</p>}
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-sm text-slate-700">
                    {subscription.isCurrentlyEntitled ? <CheckCircle2 size={17} className="text-emerald-600" /> : <AlertCircle size={17} className="text-amber-600" />}
                    {subscription.isCurrentlyEntitled ? t.accessEnabled : t.accessDisabled}
                  </div>
                  {dateValue && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} />{dateLabel}: {new Date(dateValue).toLocaleDateString(locale)}</p>}
                  {subscription.status === 1 && trialDays !== null && <p className="mt-2 text-sm font-semibold text-blue-700">{t.daysLeft}: {trialDays}</p>}
                </article>

                <article className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="flex items-center gap-2 font-bold text-slate-900"><Building2 size={18} className="text-blue-600" />{t.included}</h3>
                  <UsageBar label={t.locations} used={subscription.usedLocations} maximum={subscription.maxLocations} />
                  <UsageBar label={t.employees} used={subscription.usedEmployees} maximum={subscription.maxEmployees} />
                  <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />{t.quotaInfo}</p>
                </article>
              </div>
              <button type="button" onClick={() => setSection('plans')}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                {t.choosePlan}<ArrowUpRight size={16} />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl bg-white p-6 text-sm text-slate-600"><LoaderCircle size={17} className="animate-spin" />{t.loading}</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plans.map(plan => {
                const isCurrent = subscription?.planCode === plan.code;
                const features = [
                  t.menuOrders,
                  ...(plan.reservationsEnabled ? [t.reservations] : []),
                  ...(plan.basicAnalyticsEnabled ? [t.basicAnalytics] : []),
                  ...(plan.advancedAnalyticsEnabled ? [t.advancedAnalytics] : []),
                  ...(plan.qrMenuEnabled ? [t.qrMenu] : []),
                  ...(plan.kitchenDisplayEnabled ? [t.kitchenDisplay] : []),
                  ...(plan.inventoryEnabled ? [t.inventory] : []),
                  ...(plan.multiBranchAnalyticsEnabled ? [t.multiBranchAnalytics] : []),
                ];
                return (
                  <article key={plan.code} className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${isCurrent ? 'border-blue-400 ring-1 ring-blue-300' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      {isCurrent ? <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{t.current}</span> : <Sparkles size={19} className="text-slate-400" />}
                    </div>
                    <div className="mt-4 flex items-end gap-2">
                      <span className="text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">${Number(plan.monthlyPriceUsd).toFixed(2)}</span>
                      <span className="pb-1 text-xs text-slate-500">/ {t.perMonth}</span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Building2 size={16} className="text-blue-600" />{plan.maxLocations} {t.locations}</div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Users size={16} className="text-blue-600" />{plan.maxEmployees} {t.employees}</div>
                    </div>
                    <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">{t.planFeatures}</p>
                    <ul className="mt-3 mb-6 flex-1 space-y-2.5">
                      {features.map(feature => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-slate-700"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{feature}</li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-center text-xs font-semibold text-slate-600">
                      {isCurrent ? t.current : t.unavailableUpgrade}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />{t.upgradeInfo}
          </div>
        </div>
      )}
    </section>
  );
}
