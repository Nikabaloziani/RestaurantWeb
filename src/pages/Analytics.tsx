import { useState } from 'react';
import { BarChart3, CheckCircle2, ClipboardList, RefreshCw, TrendingUp, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { formatGel, makePeriod, useInsights, type RangeDays } from '../api/insights';

export default function Analytics({ token, restaurantId }: { token: string; restaurantId: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith('ka') ? 'ka-GE' : i18n.resolvedLanguage?.startsWith('ru') ? 'ru-RU' : 'en-GB';
  const [days, setDays] = useState<RangeDays>(7);
  const { snapshot, loading, refresh } = useInsights(token, false, restaurantId);
  const price = (amount: number) => formatGel(amount, locale);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (days - 1));
  const bounds = start.getTime();
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const upperBound = tomorrow.getTime();
  const orders = snapshot?.orders;
  const payments = snapshot?.payments;
  const topProducts = snapshot?.topProducts;
  const periodOrders = orders?.filter(order => Date.parse(order.orderDate) >= bounds && Date.parse(order.orderDate) < upperBound) ?? null;
  const periodPayments = payments?.filter(payment => payment.status === 'completed' && Date.parse(payment.paymentDate) >= bounds && Date.parse(payment.paymentDate) < upperBound) ?? null;
  const realizedRevenue = periodPayments?.reduce((total, payment) => total + payment.amount, 0);
  const count = periodOrders?.length;
  const validOrders = periodOrders?.filter(order => order.status !== 'cancelled');
  const averageTicket = validOrders ? validOrders.length === 0 ? 0 : validOrders.reduce((total, order) => total + order.totalAmount, 0) / validOrders.length : undefined;
  const points = makePeriod(days, locale, payments ?? null, orders ?? null);
  const metric = (value: number | undefined, currency = false) => loading ? '…' : value === undefined ? '—' : currency ? price(value) : value.toLocaleString(locale);
  const errors = Object.entries(snapshot?.errors ?? {});

  return <div className="space-y-6">
    <PageHeader title={t('analytics.title')} subtitle={t('insights.analyticsSubtitle')}
      action={<div className="flex flex-wrap gap-2">
        <select aria-label={t('insights.period')} value={days} onChange={e => setDays(Number(e.target.value) as RangeDays)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500">
          <option value={7}>{t('insights.days7')}</option><option value={30}>{t('insights.days30')}</option><option value={90}>{t('insights.days90')}</option>
        </select>
        <button type="button" disabled={loading} onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>{t('insights.refresh')}</button>
      </div>} />

    {errors.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>{t('insights.partialFailure')}</strong> {errors.map(([key, message]) => `${t(`insights.sources.${key}`)}: ${message}`).join(' · ')}</div>}

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t('insights.periodRevenue')} value={metric(realizedRevenue, true)} icon={Wallet} accent="blue" hint={t('insights.completedPaymentsOnly')}/>
      <StatCard label={t('insights.createdOrders')} value={metric(count)} icon={ClipboardList} accent="violet" hint={t('insights.inSelectedPeriod')}/>
      <StatCard label={t('insights.avgOrderValue')} value={metric(averageTicket, true)} icon={TrendingUp} accent="amber" hint={t('insights.excludesCancelled')}/>
      <StatCard label={t('insights.completedPaymentCount')} value={metric(periodPayments?.length)} icon={CheckCircle2} accent="green" hint={t('insights.inSelectedPeriod')}/>
    </div>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-2"><TrendingUp className="text-blue-600" size={19}/><div><h2 className="font-bold text-slate-900">{t('analytics.revenueByDay')}</h2><p className="mt-1 text-xs text-slate-500">{t('insights.completedPaymentsOnly')}</p></div></div>
        {loading ? <p className="flex h-[290px] items-center justify-center text-sm text-slate-400">{t('insights.loading')}</p>
          : !payments ? <p className="flex h-[290px] items-center justify-center text-sm text-rose-600">{t('insights.dataUnavailable')}</p>
          : <div className="h-[290px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={points} margin={{ top: 10, right: 0, left: -5, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#edf2f7"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd"/><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={50}/><Tooltip formatter={(value) => [price(Number(value)), t('dashboard.revenue')]} /><Bar dataKey="revenue" fill="#2563eb" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>}
      </section>
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-2"><BarChart3 className="text-violet-600" size={19}/><div><h2 className="font-bold text-slate-900">{t('analytics.ordersByDay')}</h2><p className="mt-1 text-xs text-slate-500">{t('insights.orderCreatedDate')}</p></div></div>
        {loading ? <p className="flex h-[290px] items-center justify-center text-sm text-slate-400">{t('insights.loading')}</p>
          : !orders ? <p className="flex h-[290px] items-center justify-center text-sm text-rose-600">{t('insights.dataUnavailable')}</p>
          : <div className="h-[290px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={points} margin={{ top: 10, right: 0, left: -5, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#edf2f7"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd"/><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={50} allowDecimals={false}/><Tooltip formatter={(value) => [Number(value), t('dashboard.orders')]}/><Bar dataKey="orders" fill="#8b5cf6" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>}
      </section>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4"><h2 className="font-bold text-slate-900">{t('analytics.topDishes')}</h2><p className="mt-1 text-xs text-slate-500">{t('insights.topAllTime')}</p></div>
      {loading ? <p className="py-8 text-center text-sm text-slate-400">{t('insights.loading')}</p>
        : !topProducts ? <p className="py-8 text-center text-sm text-rose-600">{t('insights.dataUnavailable')}</p>
        : topProducts.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{t('insights.noProducts')}</p>
        : <div className="space-y-4">{topProducts.map((product, index) => <div key={`${product.productName}-${index}`} className="flex items-center gap-3"><span className="w-32 shrink-0 truncate text-sm font-medium text-slate-700 sm:w-48">{product.productName}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${topProducts[0].totalSoldQuantity > 0 ? (product.totalSoldQuantity / topProducts[0].totalSoldQuantity) * 100 : 0}%` }}/></div><span className="w-10 text-right text-sm font-semibold text-slate-600">{product.totalSoldQuantity}</span></div>)}</div>}
    </section>

    <p className="text-xs leading-5 text-slate-500">{t('insights.analyticsMethodology')} {t('insights.topProductsCaveat')}</p>
  </div>;
}
