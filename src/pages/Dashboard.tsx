import { ArrowRight, CalendarCheck2, ClipboardList, Clock3, RefreshCw, Table2, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatGel, makePeriod, useInsights } from '../api/insights';
import type { Page } from '../types';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard({ token, restaurantId, onNavigate }: { token: string; restaurantId: string; onNavigate: (page: Page) => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith('ka') ? 'ka-GE' : i18n.resolvedLanguage?.startsWith('ru') ? 'ru-RU' : 'en-GB';
  const { snapshot, loading, refresh } = useInsights(token, true, restaurantId);
  const summary = snapshot?.summary;
  const orders = snapshot?.orders;
  const payments = snapshot?.payments;
  const topProducts = snapshot?.topProducts;
  const tables = snapshot?.tables;
  const chart = payments ? makePeriod(7, locale, payments, null) : [];
  const recent = orders?.slice().sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate)).slice(0, 5);
  const price = (amount: number) => formatGel(amount, locale);
  const metric = (value: number | undefined, currency = false) => loading ? '…' : value === undefined ? '—' : currency ? price(value) : value.toLocaleString(locale);
  const errors = snapshot?.errors ?? {};
  const broken = Object.entries(errors);
  const dateText = (value: string) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—';
  };

  return <div className="space-y-6">
    <PageHeader title={t('dashboard.title')} subtitle={t('insights.dashboardSubtitle')}
      action={<button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>{t('insights.refresh')}
      </button>}/>

    {broken.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>{t('insights.partialFailure')}</strong> {broken.map(([key, message]) => `${t(`insights.sources.${key}`)}: ${message}`).join(' · ')}
    </div>}
    <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500"/>{t('insights.liveNumbers')} · {t('insights.allTime')}</div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label={t('dashboard.revenue')} value={metric(summary?.totalRevenue, true)} icon={Wallet} accent="blue" hint={t('insights.completedPaymentsOnly')}/>
      <StatCard label={t('dashboard.orders')} value={metric(summary?.totalOrders)} icon={ClipboardList} accent="violet" hint={t('insights.allTime')}/>
      <StatCard label={t('insights.activeOrders')} value={metric(summary?.activeOrders)} icon={Clock3} accent="amber" hint={t('insights.notFinished')}/>
      <StatCard label={t('dashboard.reservations')} value={metric(summary?.totalReservations)} icon={CalendarCheck2} accent="green" hint={t('insights.allTime')}/>
      <StatCard label={t('insights.totalTables')} value={metric(tables?.length)} icon={Table2} accent="blue" hint={t('insights.tableHint')}/>
    </div>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
      <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="text-base font-bold text-slate-900">{t('dashboard.revenueChart')}</h2><p className="mt-1 text-xs text-slate-500">{t('insights.lastSeven')} · {t('insights.completedPaymentsOnly')}</p></div>
        {loading ? <div className="flex h-[285px] items-center justify-center text-sm text-slate-400">{t('insights.loading')}</div>
          : !payments ? <div className="flex h-[285px] items-center justify-center text-sm text-rose-600">{t('insights.dataUnavailable')}</div>
          : <div className="h-[285px] w-full"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
              <defs><linearGradient id="dashRevenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.22}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0.015}/></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#edf2f7" strokeDasharray="4 5"/>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10}/>
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={48}/>
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0' }} formatter={(value) => [price(Number(value)), t('dashboard.revenue')]}/>
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="url(#dashRevenueGradient)" activeDot={{ r: 5 }}/>
            </AreaChart>
          </ResponsiveContainer></div>}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="text-base font-bold text-slate-900">{t('dashboard.topProducts')}</h2><p className="mt-1 text-xs text-slate-500">{t('insights.topAllTime')}</p></div>
        {loading ? <div className="py-12 text-center text-sm text-slate-400">{t('insights.loading')}</div>
          : !topProducts ? <div className="py-12 text-center text-sm text-rose-600">{t('insights.dataUnavailable')}</div>
          : topProducts.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">{t('insights.noProducts')}</div>
          : <div className="space-y-5">{topProducts.map((product, index) => <div key={`${product.productName}-${index}`} className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">{index + 1}</div>
            <div className="min-w-0 flex-1"><div className="mb-1.5 flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-800">{product.productName}</span><span className="text-xs font-semibold text-slate-500">{product.totalSoldQuantity}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${topProducts[0].totalSoldQuantity > 0 ? (product.totalSoldQuantity / topProducts[0].totalSoldQuantity) * 100 : 0}%` }}/></div></div>
          </div>)}</div>}
      </section>
    </div>

    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <h2 className="font-bold text-slate-900">{t('dashboard.recentOrders')}</h2>
        <button type="button" onClick={() => onNavigate('orders')} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800">{t('dashboard.allOrders')}<ArrowRight size={16}/></button>
      </div>
      {loading ? <p className="p-8 text-center text-sm text-slate-400">{t('insights.loading')}</p>
        : !recent ? <p className="p-8 text-center text-sm text-rose-600">{t('insights.dataUnavailable')}</p>
        : recent.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{t('insights.noOrders')}</p>
        : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">{t('orders.orderId')}</th><th className="px-6 py-3">{t('orders.tableNo')}</th><th className="px-6 py-3">{t('orders.amount')}</th><th className="px-6 py-3">{t('orders.status')}</th><th className="px-6 py-3">{t('orders.created')}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{recent.map(order => <tr key={order.id} className="hover:bg-slate-50/70"><td className="px-6 py-4 font-semibold text-slate-800">#{order.id}</td><td className="px-6 py-4 text-slate-600">{t('common.table')} {tables?.find(table => table.id === order.tableId)?.tableNumber ?? order.tableId}</td><td className="px-6 py-4 font-semibold text-slate-800">{price(order.totalAmount)}</td><td className="px-6 py-4"><StatusBadge status={order.status}/></td><td className="px-6 py-4 text-slate-500">{dateText(order.orderDate)}</td></tr>)}</tbody>
        </table></div>}
    </section>
    <p className="text-xs leading-5 text-slate-500">{t('insights.topProductsCaveat')}</p>
  </div>;
}
